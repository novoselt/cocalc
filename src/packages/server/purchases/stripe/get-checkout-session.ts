import getConn from "@cocalc/server/stripe/connection";
import getLogger from "@cocalc/backend/logger";
import { getStripeCustomerId, sanityCheckAmount } from "./util";
import type {
  CheckoutSessionSecret,
  CheckoutSessionOptions,
} from "@cocalc/util/stripe/types";
import base_path from "@cocalc/backend/base-path";
import { getServerSettings } from "@cocalc/database/settings/server-settings";

const logger = getLogger("purchases:stripe:get-checkout-session");

interface Options extends CheckoutSessionOptions {
  // user that is paying: assumed already authenticated/valid
  account_id: string;
}

export default async function getCheckoutSession({
  account_id,
  purpose,
  description,
  lineItems,
  return_url,
  metadata,
}: Options): Promise<CheckoutSessionSecret> {
  logger.debug("getCheckoutSession", {
    account_id,
    purpose,
    description,
    lineItems,
    return_url,
    metadata,
  });
  if (!purpose) {
    throw Error("purpose must be set");
  }
  if (
    metadata?.purpose != null ||
    metadata?.account_id != null ||
    metadata?.confirm != null ||
    metadata?.processed != null
  ) {
    throw Error(
      "metadata must not include 'purpose', 'account_id', 'confirm' or 'processed' as a key",
    );
  }

  let total = 0;
  for (const { amount } of lineItems) {
    total += amount;
  }
  await sanityCheckAmount(total);

  const stripe = await getConn();
  const customer = await getStripeCustomerId({ account_id, create: true });
  if (!customer) {
    throw Error("bug");
  }

  metadata = {
    ...metadata,
    purpose,
    account_id,
  };

  if (!return_url) {
    const { dns } = await getServerSettings();
    return_url = `https://${dns}${base_path}`;
  }

  const openSessions = await stripe.checkout.sessions.list({
    status: "open",
    customer,
  });
  for (const session of openSessions.data) {
    if (session.metadata?.purpose == purpose && session.client_secret) {
      // TODO!!!! if the line items change, then we expire it and can't use it.
      return { clientSecret: session.client_secret };
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer,
    ui_mode: "embedded",
    line_items: lineItems.map(({ amount, description }) => {
      return {
        price_data: {
          unit_amount: Math.ceil(amount * 100),
          currency: "usd",
          product_data: {
            name: description,
          },
        },
        quantity: 1,
      };
    }),
    mode: "payment",
    return_url,
    automatic_tax: { enabled: true },
    metadata,
    payment_intent_data: {
      description,
      setup_future_usage: "off_session",
      metadata,
    },
  });

  if (!session.client_secret) {
    throw Error("unable to create session");
  }

  return { clientSecret: session.client_secret };
}
