import getAccountId from "lib/account/get-account";
import { getAllOpenPaymentIntents } from "@cocalc/server/purchases/payment-intent";
import throttle from "@cocalc/server/api/throttle";
import getParams from "lib/api/get-params";
import userIsInGroup from "@cocalc/server/accounts/is-in-group";

export default async function handle(req, res) {
  try {
    res.json(await get(req));
  } catch (err) {
    res.json({ error: `${err.message}` });
    return;
  }
}

async function get(req) {
  const account_id = await getAccountId(req);
  if (account_id == null) {
    throw Error("must be signed in");
  }
  const { user_account_id } = getParams(req);
  if (user_account_id) {
    // This user MUST be an admin:
    if (!(await userIsInGroup(account_id, "admin"))) {
      throw Error("only admins can get other user's open payments");
    }
    const data = await getAllOpenPaymentIntents(user_account_id);
    return { success: true, data };
  }

  throttle({
    account_id,
    endpoint: "get-open-payment-intents",
    interval: 2000,
  });
  const data = await getAllOpenPaymentIntents(account_id);
  return { success: true, data };
}
