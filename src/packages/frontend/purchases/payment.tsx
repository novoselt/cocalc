import { Button, Divider, Modal, Spin, Tag } from "antd";
import { Icon } from "@cocalc/frontend/components/icon";
import { useEffect, useState } from "react";
import { currency } from "@cocalc/util/misc";
import { zIndexPayAsGo } from "./zindex";
import { open_new_tab } from "@cocalc/frontend/misc/open-browser-tab";
import { delay } from "awaiting";
import * as api from "./api";
import PaymentConfig from "./payment-config";
import StripePayment from "./stripe-payment";

const zIndex = zIndexPayAsGo + 1;
export const zIndexTip = zIndex + 1;

const DEFAULT_AMOUNT = 10;

interface Props {
  balance: number;
  update?: () => Promise<void>;
  cost?: number; // optional amount that we want to encourage the user to pay
}

export default function Payment({ balance, update, cost }: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(
    Math.max(DEFAULT_AMOUNT, balance != null && balance < 0 ? -balance : 0),
  );
  const [session, setSession] = useState<
    { id: string; url: string } | null | "loading"
  >("loading");
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [amount, setAmount] = useState<number>(0);

  const [minPayment, setMinPayment] = useState<number | undefined>(undefined);
  const updateMinPayment = () => {
    (async () => {
      setMinPayment(await api.getMinimumPayment());
    })();
  };
  useEffect(() => {
    updateMinPayment();
  }, []);

  const updateSession = async () => {
    setSession(await api.getCurrentCheckoutSession());
  };

  const doUpdate = async () => {
    if (update == null) return;
    try {
      setUpdating(true);
      await update();
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    updateSession();
  }, [isModalVisible]);

  const paymentPopup = async (url: string) => {
    try {
      setSyncing(true);
      // create pop-up window with the payment info
      const popup = open_new_tab(url, true);
      if (popup == null) {
        // popup was blocked
        return;
      }
      while (true) {
        if (popup.closed) {
          // user explicitly closed it, so done.
          break;
        }
        try {
          if (popup.location.href == window.location.href) {
            break;
          }
        } catch (_) {
          // due to security, when on the stripe page, just looking at
          // popup.location.href should throw an exception.
        }
        await delay(500);
      }
      // attempt to close the popup, if possible
      try {
        popup.close();
      } catch (_) {}
      updateSession();
      await doUpdate();
      setIsModalVisible(false);

      // Have the backend call stripe and sync recent paid invoices.
      // **This should only be relevant in case webhooks aren't configured or working.**
      const sync = async () => {
        for (const d of [5, 30, 60]) {
          try {
            if ((await api.getBalance()) > balance) {
              // very unlikely to need to do any sync, so don't bother
              // wasting resources calling stripe.
              return;
            }
            const count = await api.syncPaidInvoices();
            if (count > 0) {
              await doUpdate();
              return;
            }
            await delay(d * 1000);
          } catch (err) {
            console.warn(err);
            return;
          }
        }
      };
      await sync();
    } finally {
      setSyncing(false);
    }
  };

  const showModal = () => {
    setPaymentAmount(
      cost
        ? Math.max(minPayment ?? 0, cost)
        : Math.max(
            minPayment ?? 0,
            balance != null && balance < 0 ? -balance : 0,
          ),
    );
    setIsModalVisible(true);
    if (typeof session == "object" && session?.url) {
      paymentPopup(session.url);
    }
  };

  const cancelPayment = async () => {
    try {
      setCancelling(true);
      await api.cancelCurrentCheckoutSession();
      await updateSession();
      setIsModalVisible(false);
    } catch (err) {
      console.warn("ERROR canceling checkout session", err);
    } finally {
      setCancelling(false);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setAmount(0);
  };

  function renderBody() {
    if (!isModalVisible) {
      return null;
    }
    if (session == "loading") {
      return <Spin />;
    }
    if (syncing) {
      return (
        <div>
          Waiting for your payment...
          <div style={{ textAlign: "center" }}>
            <Spin />
          </div>
        </div>
      );
    }
    if (session != null) {
      return (
        <div style={{ fontSize: "12pt" }}>
          If the popup payment window is blocked,{" "}
          <a href={session.url}>click here to complete your payment.</a>
        </div>
      );
    }
    return (
      <div>
        {balance != null && (
          <PaymentConfig
            balance={balance}
            paymentAmount={paymentAmount}
            setPaymentAmount={setPaymentAmount}
            minAmount={cost}
          />
        )}
        <br />
        {!amount && (
          <div style={{ textAlign: "center" }}>
            <Button
              disabled={!paymentAmount}
              size="large"
              type={!amount ? "primary" : "default"}
              onClick={() => {
                setAmount(paymentAmount);
              }}
            >
              Select Payment Method
            </Button>
          </div>
        )}
        {!!amount && (
          <div>
            <Divider />
            <StripePayment
              amount={amount}
              description="Add money to your account."
              purpose={"add-credit"}
              onFinished={() => {
                update?.();
                handleCancel();
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Button.Group>
        <Button
          size="large"
          disabled={balance == null || cancelling || updating || syncing}
          onClick={showModal}
          type={
            (cost ?? 0) > 0 || (typeof session == "object" && session?.id)
              ? "primary"
              : undefined
          }
        >
          <Icon name="credit-card" style={{ marginRight: "5px" }} />
          {typeof session == "object" && session?.id
            ? `Finish ${cost ? currency(cost) : ""} Payment...`
            : cost
              ? `Add at least ${currency(cost)} (plus tax) to your account...`
              : "Add Money..."}
          {session == "loading" && <Spin style={{ margin: "0 15px" }} />}
        </Button>
        {typeof session == "object" && session?.id && (
          <Button size="large" disabled={cancelling} onClick={cancelPayment}>
            Cancel
            {cancelling && <Spin style={{ marginLeft: "15px" }} />}
          </Button>
        )}
      </Button.Group>
      <Modal
        maskClosable={false}
        zIndex={zIndex}
        title={
          <>
            <Icon name="credit-card" style={{ marginRight: "5px" }} /> Add Money
            to Your Account
          </>
        }
        open={balance != null && isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="close" onClick={handleCancel}>
            Cancel
          </Button>,
        ]}
      >
        {renderBody()}
      </Modal>
    </div>
  );
}

export function Preset({ amount, setPaymentAmount, children }) {
  return (
    <Tag
      style={{ cursor: "pointer", marginBottom: "5px" }}
      color="blue"
      onClick={() => setPaymentAmount(amount)}
    >
      {children}
    </Tag>
  );
}
