import type { Message as MessageType } from "@cocalc/util/db-schema/messages";
import { Checkbox, Flex, Tag, Tooltip } from "antd";
import { redux } from "@cocalc/frontend/app-framework";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { TimeAgo } from "@cocalc/frontend/components/time-ago";
import StaticMarkdown from "@cocalc/frontend/editors/slate/static-markdown";
import ReplyButton from "./reply-button";
import { isNullDate, isFromMe, isRead } from "./util";
import Thread, { ThreadCount } from "./thread";
import type { Threads } from "./types";
import User from "./user";

const LEFT_OFFSET = "54px";

interface Props {
  checked?: boolean;
  setChecked?: (e: { checked: boolean; shiftKey: boolean }) => void;
  message: MessageType;
  showBody?;
  setShowBody?;
  filter?;
  style?;
  threads?: Threads;
  inThread?: boolean;
}

export default function Message(props: Props) {
  if (props.showBody) {
    return <MessageFull {...props} />;
  } else {
    return <MessageInList {...props} />;
  }
}

function MessageInList({
  checked,
  setChecked,
  message,
  setShowBody,
  filter,
  style,
  threads,
  inThread,
}: Props) {
  const read = isRead(message);

  // [ ] todo: need to factor this out and also
  // support types besides 'account'
  const user = (
    <Tooltip
      placement="right"
      title={
        !isFromMe(message) ? undefined : isRead(message) ? (
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
        type="account"
        id={
          inThread
            ? message.from_id
            : isFromMe(message)
              ? message.to_id
              : message.from_id
        }
        show_avatar
        avatarSize={20}
      />
    </Tooltip>
  );

  return (
    <Flex
      style={{
        width: "100%",
        marginBottom: "-5px",
        marginTop: "-5px",
        cursor: "pointer",
        ...style,
      }}
      onClick={() => {
        if (!isRead(message)) {
          redux.getActions("messages").mark({
            id: message.id,
            read: webapp_client.server_time(),
          });
        }
        setShowBody(message.id);
      }}
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
          width: "150px",
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "pre",
          marginRight: "10px",
        }}
      >
        {user}
        {message.thread_id != null && threads != null && (
          <ThreadCount thread_id={message.thread_id} threads={threads} />
        )}
      </div>
      <div
        style={{
          flex: 1,
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "pre",
          marginRight: "10px",
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
      <div
        style={{
          color: "#888",
          marginRight: "10px",
          width: "25px",
          textAlign: "right",
        }}
      >
        {message.id}
      </div>
    </Flex>
  );
}

export function MessageInThread(props: Props) {
  if (props.showBody) {
    return <MessageFull {...props} />;
  } else {
    return <MessageInList {...props} inThread />;
  }
}

function MessageFull({ message, filter, threads }: Props) {
  const read = isRead(message);

  const user = (
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
        style={{
          fontSize: "12pt",
          ...(!read ? { fontWeight: "bold" } : undefined),
        }}
        type="account"
        id={filter == "messages-sent" ? message.to_id : message.from_id}
        show_avatar
        avatarSize={44}
      />
    </Tooltip>
  );

  return (
    <div style={{ marginRight: "30px" }} className="smc-vfill">
      {message.thread_id != null && threads != null && (
        <Thread
          thread_id={message.thread_id}
          threads={threads}
          filter={filter}
        />
      )}
      <Flex>
        <div
          style={{
            marginLeft: LEFT_OFFSET,
            fontSize: "16pt",
          }}
        >
          {message.subject}
        </div>
        <div style={{ flex: 1 }} />
        {(message.from_type == "account" || isFromMe(message)) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              marginRight: "15px",
            }}
          >
            <ReplyButton type="text" replyTo={message} />
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <TimeAgo
            date={message.created}
            style={{
              whiteSpace: "pre",
              textAlign: "right",
              fontWeight: read ? undefined : "bold",
            }}
          />
        </div>
      </Flex>
      <div style={{ marginTop: "-20px" }}>
        {user}
        <div
          style={{
            marginLeft: LEFT_OFFSET,
            color: "#666",
            marginTop: "-5px",
          }}
        >
          {filter == "messages-sent" ? "from" : "to"} me
        </div>
      </div>
      <div
        className="smc-vfill"
        style={{
          marginLeft: LEFT_OFFSET,
          marginTop: "15px",
          overflowY: "auto",
        }}
      >
        <StaticMarkdown value={message.body} />
        <div style={{ height: "30px" }} />
        {message.from_type == "account" && filter != "messages-sent" && (
          <ReplyButton size="large" replyTo={message} />
        )}
      </div>
    </div>
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
