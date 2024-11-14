import getConn from "@cocalc/server/stripe/connection";
import { getStripeCustomerId, getAccountIdFromStripeCustomerId } from "./util";
import getLogger from "@cocalc/backend/logger";
import createCredit from "@cocalc/server/purchases/create-credit";
import { LineItem } from "@cocalc/util/stripe/types";
import { stripeToDecimal } from "@cocalc/util/stripe/calc";
import { shoppingCartCheckout } from "@cocalc/server/purchases/shopping-cart-checkout";
import studentPay from "@cocalc/server/purchases/student-pay";
import {
  AUTO_CREDIT,
  SHOPPING_CART_CHECKOUT,
  STUDENT_PAY,
} from "@cocalc/util/db-schema/purchases";

const logger = getLogger("purchases:stripe:process-payment-intents");

export default async function processPaymentIntents({
  paymentIntents,
  account_id,
}: {
  account_id?: string;
  paymentIntents?;
}): Promise<number> {
  if (paymentIntents == null) {
    if (account_id == null) {
      // nothing to do
      return 0;
    }
    const customer = await getStripeCustomerId({ account_id, create: false });
    if (!customer) {
      return 0;
    }

    const stripe = await getConn();

    // all recent ones for this customer
    const recentPaymentIntents = await stripe.paymentIntents.list({ customer });

    // older ones that might have been missed:  this WILL miss newest from above due to time to update the stripe query index!
    // get payment intents with the new purpose metadata field set,
    // which are successful, and which have not been processed.
    // note that the index is slow to update, so we do not filter on status:"succeeded"
    // here, and instead do that in the loop below.
    const query = `customer:"${customer}" AND status:"succeeded" AND -metadata["processed"]:"true" -metadata["purpose"]:null`;
    const olderPaymentIntents = await stripe.paymentIntents.search({
      query,
      limit: 100,
    });
    paymentIntents = recentPaymentIntents.data.concat(olderPaymentIntents.data);
  }

  const seen = new Set<string>();
  const purchase_ids = new Set<number>([]);
  for (const paymentIntent of paymentIntents) {
    if (seen.has(paymentIntent.id)) {
      continue;
    }
    seen.add(paymentIntent.id);
    if (isReadyToProcess(paymentIntent)) {
      try {
        const id = await processPaymentIntent(paymentIntent);
        if (id) {
          purchase_ids.add(id);
        }
      } catch (err) {
        // There are a number of things that are expected to go wrong, hopefully ephemeral.  We log
        // them.  Examples:
        //   - Problem creating an item a user wants to buy because they spend too much right when
        //     the purchase is happening. Result: they have their credit and try to do the purchase
        //     again and get their thing.
        //   - The line "await stripe.invoices.retrieve(paymentIntent.invoice);" below fails, since
        //     invoice isn't actually quite created.  It will be the next time we try in a minute.
        logger.debug(
          `WARNING: issue processing a payment intent ${paymentIntent.id} -- ${err}`,
        );
      }
    }
  }
  return purchase_ids.size;
}

export function isReadyToProcess(paymentIntent) {
  return (
    paymentIntent.status == "succeeded" &&
    paymentIntent.metadata["processed"] != "true" &&
    paymentIntent.metadata["purpose"] &&
    paymentIntent.invoice
  );
}

// NOT a critical assumption.  We do NOT assume processPaymentIntent is never run twice at
// the same time for the same payment, either in the same process or on the cluster.
// If $n$ attempts to run this happen at once, the createCredit call will succeed for
// one of them and fail for all others due to the unique index on the invoice_id field.
// The credit thus gets created at most once, and no items are created except by the
// thread that created the credit.

export async function processPaymentIntent(
  paymentIntent,
): Promise<number | undefined> {
  let account_id = paymentIntent.metadata.account_id;
  logger.debug("processPaymentIntent", { id: paymentIntent.id, account_id });
  if (!account_id) {
    // this should never happen, but in case it does, we lookup the account_id
    // in our database, based on the customer id.
    account_id = await getAccountIdFromStripeCustomerId(paymentIntent.customer);
    if (!account_id) {
      // no possible way to process this.
      // This will happen in *test mode* since I use the exact same test credentials with
      // many unrelated cocalc dev servers and they might all try to process the same payments.
      logger.debug(
        "processPaymentIntent: unknown stripe customer",
        paymentIntent.customer,
      );
      return;
    }
  }

  // IMPORTANT: There is just no way in general to know directly from the payment intent
  // and invoice exactly what we were trying to charge the customer!  The problem is that
  // the invoice (and line items) in some cases (e.g., stripe checkout) is in a non-US currency.
  // We thus set the metadata to have the total in **US PENNIES** (!). Users can't touch
  // this metadata, and we depend on it for how much the invoice is worth to us.
  const total_excluding_tax_usd =
    paymentIntent.metadata.total_excluding_tax_usd;
  if (total_excluding_tax_usd == null) {
    // cannot be processed further.
    return;
  }
  const amount = stripeToDecimal(parseInt(total_excluding_tax_usd));

  const stripe = await getConn();
  const invoice = await stripe.invoices.retrieve(paymentIntent.invoice);

  // credit the account.  If the account was already credited for this (e.g.,
  // by another process doing this at the same time), that should be detected
  // and is a no-op, due to the invoice_id being unique amount purchases records
  // for this account (MAKE SURE!).
  const credit_id = await createCredit({
    account_id,
    invoice_id: paymentIntent.id,
    amount,
    description: {
      line_items: getInvoiceLineItems(invoice),
      description: paymentIntent.description,
      purpose: paymentIntent.metadata.purpose,
    },
    service:
      paymentIntent.metadata.purpose == AUTO_CREDIT ? "auto-credit" : "credit",
  });

  // make metadata so we won't consider this payment intent ever again
  await stripe.paymentIntents.update(paymentIntent.id, {
    metadata: { ...paymentIntent.metdata, processed: "true", credit_id },
  });

  if (paymentIntent.metadata.purpose == SHOPPING_CART_CHECKOUT) {
    // The purpose of this payment was to buy certain items from the store.  We use the credit we just got above
    // to provision each of those items.
    await shoppingCartCheckout({
      account_id,
      payment_intent: paymentIntent.id,
      amount,
      cart_ids:
        paymentIntent.metadata.cart_ids != null
          ? JSON.parse(paymentIntent.metadata.cart_ids)
          : undefined,
    });
  } else if (paymentIntent.metadata.purpose == STUDENT_PAY) {
    // Student pay for a course
    await studentPay({
      account_id,
      project_id: paymentIntent.metadata.project_id,
      allowOther: true,
      amount,
    });
  }

  return credit_id;
}

// This allows for a periodic check that we have processed all recent payment
// intents across all users.  It should be called periodically.
// This should be called periodically as a maintenance task.
export async function processAllRecentPaymentIntents(): Promise<number> {
  const stripe = await getConn();

  // payments that might have been missed. This might miss something from up to 1-2 minutes ago
  // due to time to update the index, but that is fine given the point of this function.
  // We also use a small limit, since in almost all cases this will be empty, and if it is
  // not empty, we would just call it again to get more results.
  const query = `status:"succeeded" AND -metadata["processed"]:"true" AND -metadata["purpose"]:null`;
  const paymentIntents = await stripe.paymentIntents.search({
    query,
    limit: 10,
  });
  logger.debug(
    `processAllRecentPaymentIntents: considering ${paymentIntents.data.length} payments...`,
  );
  const purchase_ids = new Set<number>([]);
  for (const paymentIntent of paymentIntents.data) {
    if (isReadyToProcess(paymentIntent)) {
      const id = await processPaymentIntent(paymentIntent);
      if (id) {
        purchase_ids.add(id);
      }
    }
  }
  return purchase_ids.size;
}

export async function maintainPaymentIntents() {
  logger.debug("maintainPaymentIntents");
  // Right now we just call this. We could put in a longer interval between
  // calls (i.e. refuse to call too frequently if necessary).  Right now
  // this gets called every 5 minutes, which seems fine.
  await processAllRecentPaymentIntents();
}

function getInvoiceLineItems(invoice): LineItem[] {
  const data = invoice.lines?.data;
  if (data == null) {
    return [];
  }
  const v: LineItem[] = data.map(({ description, amount }) => {
    return { description: description ?? "", amount: stripeToDecimal(amount) };
  });
  if (invoice.tax) {
    v.push({
      description: "Tax",
      amount: stripeToDecimal(invoice.tax),
      tax: true,
    });
  }
  return v;
}
