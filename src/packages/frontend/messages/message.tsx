import type { Message as MessageType } from "@cocalc/util/db-schema/messages";
import { Checkbox, Flex, Space } from "antd";
import { redux } from "@cocalc/frontend/app-framework";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { User } from "@cocalc/frontend/users";
import { TimeAgo } from "@cocalc/frontend/components/time-ago";
import StaticMarkdown from "@cocalc/frontend/editors/slate/static-markdown";
import ReplyButton from "./reply-button";
import { isRead } from "./util";

interface Props {
  message: MessageType;
  showBody?;
  setShowBody?;
  filter?;
}

export default function Message({
  message,
  showBody,
  setShowBody,
  filter,
}: Props) {
  return (
    <Space
      direction="vertical"
      style={{ width: "100%", marginBottom: "-10px" }}
    >
      <Flex style={{ width: "100%" }}>
        {filter != "messages-sent" && (
          <Checkbox
            style={{ marginRight: "15px" }}
            checked={message.saved}
            onChange={(e) => {
              redux.getActions("messages").mark({
                id: message.id,
                saved: e.target.checked,
              });
            }}
          />
        )}
        <div
          style={{ flex: 0.8, cursor: "pointer" }}
          onClick={() => {
            if (showBody == null) {
              return;
            }
            if (showBody.has(message.id)) {
              showBody.delete(message.id);
            } else {
              showBody.add(message.id);
              if (filter != "messages-sent" && !message.read) {
                redux.getActions("messages").mark({
                  id: message.id,
                  read: webapp_client.server_time(),
                });
              }
            }
            // should use immutable js but I'm lazy and not big.
            setShowBody(new Set(showBody));
          }}
        >
          {isRead(message) ? (
            <>
              {message.subject} (read <TimeAgo date={message.read} />)
            </>
          ) : (
            <b>{message.subject}</b>
          )}
        </div>
        <div style={{ flex: 0.2 }} />
        {isRead(message) && (
          <div style={{ textAlign: "right", marginRight: "15px", color:"#666" }}>
            (read <TimeAgo date={message.read} />)
          </div>
        )}
        <User
          account_id={
            filter == "messages-sent" ? message.to_id : message.from_id
          }
          show_avatar
          avatarSize={20}
        />
        <TimeAgo
          date={message.created}
          style={{ width: "150px", textAlign: "right" }}
        />
      </Flex>
      <div>
        {(showBody?.has(message.id) || showBody == null) && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: "5px",
              padding: "10px 15px 0 15px",
              marginBottom: "15px",
            }}
          >
            <StaticMarkdown value={message.body} />
            {message.from_type == "account" &&
              filter != "messages-sent" &&
              showBody != null && <ReplyButton type="text" replyTo={message} />}
          </div>
        )}
      </div>
    </Space>
  );
}
