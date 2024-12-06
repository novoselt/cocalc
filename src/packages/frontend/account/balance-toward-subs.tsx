// slightly weird props since this will be used in the nextjs app

import { Card, Checkbox, Tooltip } from "antd";
import { Icon } from "@cocalc/frontend/components/icon";

export default function UseBalanceTowardSubscriptions({
  style,
  use_balance_toward_subscriptions,
  set_use_balance_toward_subscriptions,
}) {
  return (
    <Card
      style={style}
      title={
        <>
          <Icon name="calendar" /> Use Balance Toward Subscriptions
        </>
      }
    >
      <Tooltip title="Enable this if you do not need to maintain a positive balance for pay as you go purchases.  If you are using compute servers you probably do not want to enable this. However, if you primarily put credit on your account to pay for subscriptions, consider enabling this.  The entire amount for the subscription renewal must be available.">
        <Checkbox
          checked={use_balance_toward_subscriptions}
          onChange={(e) => {
            set_use_balance_toward_subscriptions(e.target.checked);
          }}
        >
          Use Balance - pay subscription using balance on your account, if
          possible
        </Checkbox>
      </Tooltip>
    </Card>
  );
}