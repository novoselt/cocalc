import getLogger from "@cocalc/backend/logger";
import { currency, round2 } from "@cocalc/util/misc";
import getConn from "@cocalc/server/stripe/connection";
import getPool from "@cocalc/database/pool";
import stripeName from "@cocalc/util/stripe/name";
import { setStripeCustomerId } from "@cocalc/database/postgres/stripe";
import { getServerSettings } from "@cocalc/database/settings/server-settings";
import { MAX_COST } from "@cocalc/util/db-schema/purchases";

const MINIMUM_STRIPE_TRANSACTION = 0.5; // Stripe requires transactions to be at least $0.50.

const logger = getLogger("purchases:stripe-util");

async function createStripeCustomer(account_id: string): Promise<string> {
  logger.debug("createStripeCustomer", account_id);
  const db = getPool();
  const { rows } = await db.query(
    "SELECT email_address, first_name, last_name FROM accounts WHERE account_id=$1",
    [account_id],
  );
  if (rows.length == 0) {
    throw Error(`no account ${account_id}`);
  }
  const email = rows[0].email_address;
  const description = stripeName(rows[0].first_name, rows[0].last_name);
  const stripe = await getConn();
  const { id } = await stripe.customers.create({
    description,
    name: description,
    email,
    metadata: {
      account_id,
    },
  });
  logger.debug("createStripeCustomer", "created ", {
    id,
    description,
    email,
    account_id,
  });
  await setStripeCustomerId(account_id, id);
  return id;
}

export async function getStripeCustomerId({
  account_id,
  create,
}: {
  account_id: string;
  create: boolean;
}): Promise<string | undefined> {
  const db = getPool();
  const { rows } = await db.query(
    "SELECT stripe_customer_id FROM accounts WHERE account_id=$1",
    [account_id],
  );
  const stripe_customer_id = rows[0]?.stripe_customer_id;
  if (stripe_customer_id) {
    logger.debug(
      "getStripeCustomerId",
      "customer already exists",
      stripe_customer_id,
    );
    return stripe_customer_id;
  }
  if (create) {
    return await createStripeCustomer(account_id);
  } else {
    return undefined;
  }
}

export async function sanityCheckAmount(amount) {
  if (!amount) {
    throw Error("Amount must be nonzero.");
  }
  const { pay_as_you_go_min_payment } = await getServerSettings();
  const minAllowed = Math.max(
    MINIMUM_STRIPE_TRANSACTION,
    pay_as_you_go_min_payment ?? 0,
  );
  if (amount < minAllowed) {
    throw Error(
      `Amount ${currency(round2(amount))} must be at least ${currency(minAllowed)}.`,
    );
  }
  if (amount > MAX_COST) {
    throw Error(
      `Amount ${currency(round2(amount))} exceeds the maximum allowed amount of ${currency(MAX_COST)}.  Please contact support.`,
    );
  }
}