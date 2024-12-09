/* Status
 */

import { Flex } from "antd";
import MinBalance from "./min-balance";
import SpendRate from "./spend-rate";
import { useEffect, useState } from "react";
import {
  getMinBalance as getMinBalanceUsingApi,
  getSpendRate as getSpendRateUsingApi,
} from "./api";
import ShowError from "@cocalc/frontend/components/error";
import { SectionDivider } from "./util";
import AutoBalance from "./auto-balance";

const MAX_WIDTH = "900px";

export default function AutomaticPayments({
  compact,
  style,
}: {
  compact?;
  style?;
}) {
  const [loading, setLoading] = useState<boolean>(true);
  const [minBalance, setMinBalance] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [spendRate, setSpendRate] = useState<number | null>(null);

  const getSpendRate = async () => {
    setSpendRate(await getSpendRateUsingApi());
  };
  const getMinBalance = async () => {
    setMinBalance(await getMinBalanceUsingApi());
  };

  const handleRefresh = async () => {
    try {
      setError("");
      setLoading(true);
      setMinBalance(null);
      setSpendRate(null);
      await Promise.all([getSpendRate(), getMinBalance()]);
    } catch (err) {
      setError(`${err}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <div style={style}>
      <SectionDivider onRefresh={handleRefresh} loading={loading}>
        Automatic Deposits, Spend Rate and Minimum Balance
      </SectionDivider>
      <ShowError
        error={error}
        setError={setError}
        style={{ marginBottom: "15px" }}
      />
      <div>
        <div style={{ margin: "auto", maxWidth: MAX_WIDTH }}>
          <Flex>
            <AutoBalance style={{ color: "#666", height: "135px" }} />
            <div style={{ flex: 1 }} />
            <SpendRate spendRate={spendRate} />
            <div style={{ flex: 1 }} />
            {!compact && (
              <>
                <div style={{ width: "30px" }} />
                <MinBalance minBalance={minBalance} />
              </>
            )}
          </Flex>
        </div>
      </div>
    </div>
  );
}
