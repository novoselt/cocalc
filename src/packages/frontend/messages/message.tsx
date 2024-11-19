import type { Message as MessageType } from "@cocalc/util/db-schema/messages";
import { Checkbox, Flex, Space, Tag, Tooltip } from "antd";
import { redux } from "@cocalc/frontend/app-framework";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { User } from "@cocalc/frontend/users";
import { TimeAgo } from "@cocalc/frontend/components/time-ago";
import StaticMarkdown from "@cocalc/frontend/editors/slate/static-markdown";
import ReplyButton from "./reply-button";
import { isNullDate, isRead } from "./util";

interface Props {
  checked?: boolean;
  setChecked?: (e: { checked: boolean; shiftKey: boolean }) => void;
  message: MessageType;
  showBody?;
  setShowBody?;
  filter?;
  style?;
}

export default function Message({
  checked,
  setChecked,
  message,
  showBody,
  setShowBody,
  filter,
  style,
}: Props) {
  const toggleBody = () => {
    if (setShowBody == null) {
      return;
    }
    if (showBody) {
      setShowBody(null);
    } else {
      if (filter != "messages-sent" && !isRead(message)) {
        redux.getActions("messages").mark({
          id: message.id,
          read: webapp_client.server_time(),
        });
      }
      setShowBody(message.id);
    }
  };

  const read = isRead(message);
  if (showBody) {
    return (
      <div>
        <h3>{message.subject}</h3>
        <StaticMarkdown value={message.body} />
        {message.from_type == "account" && filter != "messages-sent" && (
          <ReplyButton type="text" replyTo={message} />
        )}
        <pre>{JSON.stringify(message, undefined, 2)}</pre>
      </div>
    );
  }

  return (
    <Space
      direction="vertical"
      style={{ width: "100%", marginBottom: "-10px", ...style }}
    >
      <Flex
        style={{ width: "100%" }}
        onClick={showBody ? undefined : () => toggleBody()}
      >
        {setChecked != null && (
          <Checkbox
            onClick={(e) => e.stopPropagation()}
            style={{ marginRight: "15px" }}
            checked={!!checked}
            onChange={(e) => {
              const shiftKey = e.nativeEvent.shiftKey;
              setChecked({ checked: e.target.checked, shiftKey });
            }}
          />
        )}
        <div
          style={{
            flex: 0.3,
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "pre",
          }}
        >
          <Tooltip
            placement="right"
            title={
              filter != "messages-sent" ? undefined : isRead(message) ? (
                <>
                  Read message <TimeAgo date={message.read} />
                </>
              ) : (
                "Has not yet read message"
              )
            }
          >
            &nbsp;{/*the nbsp makes the tooltip work -- weird */}
            <User
              style={!read ? { fontWeight: "bold" } : undefined}
              account_id={
                filter == "messages-sent" ? message.to_id : message.from_id
              }
              show_avatar
              avatarSize={20}
            />
          </Tooltip>
        </div>
        <div
          style={{
            flex: 0.7,
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "pre",
          }}
        >
          {getTag(message, filter)}
          {read ? message.subject : <b>{message.subject}</b>}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <TimeAgo
            date={message.created}
            style={{
              width: "150px",
              textAlign: "right",
              fontWeight: read ? undefined : "bold",
            }}
          />
        </div>
      </Flex>
    </Space>
  );
}

function getTag(message, filter) {
  if (
    filter != "messages-sent" &&
    filter != "messages-inbox" &&
    !message.saved &&
    !message.deleted
  ) {
    return <Tag color="green">Inbox</Tag>;
  }
  if (!isNullDate(message.expire)) {
    return (
      <Tooltip
        title={
          <>
            This message is scheduled to be permanently deleted{" "}
            <TimeAgo date={message.expire} />.
          </>
        }
      >
        <Tag color="red">Deleting</Tag>
      </Tooltip>
    );
  }
  return null;
}
