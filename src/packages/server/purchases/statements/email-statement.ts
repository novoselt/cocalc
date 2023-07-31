/*
Email the full statement with given id to its owner, including *all* transactions.

If force is not true (always with API), this will fail if an attempt was made
to email this statement within the last hour.
*/

import getPool from "@cocalc/database/pool";
import type { Statement } from "@cocalc/util/db-schema/statements";
import type { Purchase } from "@cocalc/util/db-schema/purchases";
import dayjs from "dayjs";
import type { Message } from "@cocalc/server/email/message";
import sendEmail from "@cocalc/server/email/send-email";
import getLogger from "@cocalc/backend/logger";

const logger = getLogger("purchases:email-statement");

export default async function emailStatement(opts: {
  account_id: string;
  statement_id: number;
  force?: boolean; // if not set, will send email at most once every 6 hours.
  dryRun?: boolean; // if set, returns html content of email only, but doesn't send email (useful for unit testing)
}): Promise<Message> {
  logger.debug("emailStatement ", opts);
  const { account_id, statement_id, force, dryRun } = opts;
  const { name, email_address: to } = await getUser(account_id);
  if (!to) {
    throw Error(`no email address on file for ${name}`);
  }
  const statement = await getStatement(statement_id);
  if (statement.account_id != account_id) {
    throw Error(
      `statement ${statement_id} does not belong to your account. Sign into the correct account.`
    );
  }
  if (!force && statement.last_sent != null) {
    const hoursAgo = dayjs().diff(dayjs(statement.last_sent), "hour", true);
    if (hoursAgo <= 1) {
      throw Error(`statement already sent recently (wait at least an hour)`);
    }
  }

  // We do this before sending because it's partly to avoid abuse.
  await setLastSent(statement_id);

  const purchases = await getPurchasesOnStatement(statement_id);
  const subject = `Statement Ending ${new Date(statement.time).toISOString()}`;
  const html = `
Dear ${name},

<h3>Statement</h3>
<pre>
${JSON.stringify(statement, undefined, 2)}
</pre>

<h3>Transactions</h3>
<pre>
${JSON.stringify(purchases, undefined, 2)}
</pre>
`;

  const text = `
Dear ${name},

---

Statement:

${JSON.stringify(statement, undefined, 2)}

---

Transactions:

${JSON.stringify(purchases, undefined, 2)}
`;

  const mesg = { to, subject, html, text };

  if (!dryRun) {
    // actually send email
    await sendEmail(mesg);
  }

  return mesg;
}

async function setLastSent(statement_id: number): Promise<void> {
  const pool = getPool();
  await pool.query("UPDATE statements SET last_sent=NOW() WHERE id=$1", [
    statement_id,
  ]);
}

async function getStatement(statement_id: number): Promise<Statement> {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT id, interval, account_id, time, balance, total_charges, num_charges, total_credits, num_credits, last_sent FROM statements WHERE id=$1",
    [statement_id]
  );
  if (rows.length != 1) {
    throw Error(`no statement with id ${statement_id}`);
  }
  return rows[0];
}

async function getPurchasesOnStatement(
  statement_id: number
): Promise<Purchase[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT id, time, cost, cost_per_hour, period_start, period_end, pending, service, description, project_id FROM purchases WHERE day_statement_id=$1 OR month_statement_id=$1 ORDER BY time desc",
    [statement_id]
  );
  return rows;
}

async function getUser(
  account_id: string
): Promise<{ name: string; email_address: string }> {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT first_name, last_name, email_address FROM accounts WHERE account_id=$1",
    [account_id]
  );
  if (rows.length != 1) {
    throw Error(`no account with id ${account_id}`);
  }
  const { first_name, last_name, email_address } = rows[0];
  return { name: `${first_name} ${last_name}`, email_address };
}