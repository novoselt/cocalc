/*
Page that you show user after they start a purchase and are waiting
for the payment to be completed and items to be allocated.
*/

import ShowError from "@cocalc/frontend/components/error";
import { Alert, Button, Divider, Spin, Table } from "antd";
import Loading from "components/share/loading";
import useIsMounted from "lib/hooks/mounted";
import A from "components/misc/A";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@cocalc/frontend/components/icon";
import { type CheckoutParams } from "@cocalc/server/purchases/shopping-cart-checkout";
import Payments from "@cocalc/frontend/purchases/payments";
import { getColumns } from "./checkout";
import { getShoppingCartCheckoutParams } from "@cocalc/frontend/purchases/api";

export default function Processing() {
  const [finished, setFinished] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [params, setParams] = useState<CheckoutParams | null>(null);
  const refreshPaymentsRef = useRef<any>(null);
  const updateParams = async () => {
    try {
      setError("");
      setLoading(true);
      const params = await getShoppingCartCheckoutParams({
        processing: true,
      });
      setParams(params);
    } catch (err) {
      setError(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params?.cart != null && params.cart.length == 0) {
      setFinished(true);
    }
  }, [params]);

  const lastRefreshRef = useRef<number>(0);
  const refreshRef = useRef<Function>(() => {});
  refreshRef.current = () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 3000) {
      return;
    }
    lastRefreshRef.current = now;
    updateParams();
    refreshPaymentsRef.current?.();
  };

  // exponential backoff auto-refresh
  const isMounted = useIsMounted();
  const timeoutRef = useRef<any>(null);
  useEffect(() => {
    if (finished) {
      // nothing left to do
      return;
    }
    let delay = 5000;
    const f = () => {
      if (!isMounted.current) {
        return;
      }
      delay = Math.min(5 * 60 * 1000, 1.3 * delay);
      timeoutRef.current = setTimeout(f, delay);
      refreshRef.current();
    };
    f();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [finished]);

  function renderBody() {
    if (error) {
      return <ShowError error={error} setError={setError} />;
    }
    if (finished) {
      return (
        <Alert
          type="success"
          showIcon
          style={{ margin: "30px auto", maxWidth: "700px" }}
          message="Success"
          description=<>
            Congratulations, all your purchases have been processed and are
            ready to use!
            <br />
            <br />
            <A href="/store/congrats">Congrats! View Your Items...</A>
          </>
        />
      );
    }

    return (
      <>
        <Alert
          type="warning"
          showIcon
          style={{ margin: "30px auto", maxWidth: "700px" }}
          message="Action Required"
          description=<>
            Ensure outstanding payments listed below go through so that your
            items can be added to your account.
          </>
        />

        <Payments
          created={{ gt: Math.round(Date.now() / 1000 - 3600) }}
          refresh={() => {
            refreshRef.current();
          }}
          refreshPaymentsRef={refreshPaymentsRef}
        />

        <Divider orientation="left" style={{ marginTop: "30px" }}>
          Your Items
        </Divider>
        {params != null && (
          <Table
            showHeader={false}
            columns={getColumns()}
            dataSource={params?.cart}
            rowKey={"id"}
            pagination={{ hideOnSinglePage: true }}
          />
        )}
      </>
    );
  }

  return (
    <div>
      <Button
        style={{ float: "right" }}
        disabled={loading}
        onClick={() => {
          refreshRef.current();
        }}
      >
        Refresh {loading && <Spin />}
      </Button>
      <h3>
        <Icon name="run" /> Processing Your Order
      </h3>
      {loading && <Loading large center />}
      {renderBody()}
    </div>
  );
}
