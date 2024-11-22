import { useEffect, useMemo, useState } from "react";
import { Button, Flex, List, Space, Spin } from "antd";
import type { Message as MessageType } from "@cocalc/util/db-schema/messages";
import { get_array_range } from "@cocalc/util/misc";
import Message from "./message";
import { Icon } from "@cocalc/frontend/components/icon";
import { redux } from "@cocalc/frontend/app-framework";
import dayjs from "dayjs";
import {
  expandToThreads,
  getFilteredMessages,
  isNullDate,
  isThreadRead,
  isInFolderThreaded,
} from "./util";
import { isFolder, Folder } from "./types";

export default function MessagesList({ messages, threads, filter }) {
  const [showThread, setShowThread] = useState<number | null>(null);
  const [checkedMessageIds, setCheckedMessageIds] = useState<Set<number>>(
    new Set(),
  );
  const [mostRecentChecked, setMostRecentChecked] = useState<number | null>(
    null,
  );

  const folder: Folder = useMemo(() => {
    const folder = filter.split("-")[1];
    if (!isFolder(folder)) {
      // BUG -- should never happen!
      return "inbox" as Folder;
    }
    return folder;
  }, [filter]);

  const filteredMessages: MessageType[] = useMemo(() => {
    if (messages == null || threads == null) {
      return [];
    }
    return getFilteredMessages({ messages, threads, folder });
  }, [messages, threads, folder]);

  useEffect(() => {
    if (checkedMessageIds.size > 0) {
      // update information about which messages are selected.
      let changed = false;
      const messageIds = new Set(filteredMessages.map(({ id }) => id));
      for (const id of checkedMessageIds) {
        if (!messageIds.has(id)) {
          checkedMessageIds.delete(id);
          changed = true;
        }
      }
      if (changed) {
        setCheckedMessageIds(new Set(checkedMessageIds));
      }
    }
  }, [filteredMessages]);

  useEffect(() => {
    setCheckedMessageIds(new Set());
    setShowThread(null);
  }, [folder]);

  if (messages == null) {
    return <Spin />;
  }

  const mesgIndex =
    showThread != null
      ? filteredMessages.map(({ id }) => id).indexOf(showThread)
      : undefined;

  if (showThread != null) {
    const id = showThread;
    return (
      <>
        <Flex style={{ marginBottom: "5px" }}>
          <Button
            size="large"
            type="text"
            onClick={() => {
              setShowThread(null);
            }}
          >
            <Icon
              name="left-circle-o"
              style={{ fontSize: "14pt", color: "#666" }}
            />
            Back
          </Button>
          {folder != "sent" && (
            <Actions
              threads={threads}
              folder={folder}
              checkedMessageIds={new Set([showThread])}
              messages={messages}
              setShowThread={setShowThread}
            />
          )}
          <div style={{ flex: 1 }} />
          {showThread && mesgIndex != null && (
            <Space>
              {mesgIndex + 1} of {filteredMessages.length}
              <Button
                size="large"
                disabled={mesgIndex <= 0}
                type="text"
                onClick={() => {
                  setShowThread(filteredMessages[mesgIndex - 1]?.id);
                }}
              >
                <Icon name="chevron-left" />
              </Button>
              <Button
                size="large"
                disabled={mesgIndex >= filteredMessages.length - 1}
                type="text"
                onClick={() => {
                  setShowThread(filteredMessages[mesgIndex + 1]?.id);
                }}
              >
                <Icon name="chevron-right" />
              </Button>
            </Space>
          )}
        </Flex>
        <Message
          message={messages.get(id)?.toJS()}
          threads={threads}
          showThread
          setShowThread={setShowThread}
          folder={folder}
          style={{ paddingLeft: "12px" }}
        />
      </>
    );
  }

  return (
    <>
      {folder == "sent" && <div style={{ height: "37px" }} />}
      {folder != "sent" && (
        <Flex style={{ minHeight: "37px" }}>
          <Icon
            onClick={() => {
              if (checkedMessageIds.size == 0) {
                setCheckedMessageIds(
                  new Set(filteredMessages.map(({ id }) => id)),
                );
              } else {
                setCheckedMessageIds(new Set());
              }
            }}
            name={
              checkedMessageIds.size == 0
                ? "square"
                : checkedMessageIds.size == filteredMessages.length
                  ? "check-square"
                  : "minus-square"
            }
            style={{
              fontSize: "14pt",
              color: "#666",
              marginLeft: "24px",
              marginRight: "30px",
            }}
          />
          {checkedMessageIds.size > 0 && (
            <Actions
              folder={folder}
              checkedMessageIds={checkedMessageIds}
              messages={messages}
              setShowThread={setShowThread}
              threads={threads}
            />
          )}
        </Flex>
      )}
      <List
        style={{ overflowY: "auto" }}
        bordered
        dataSource={filteredMessages}
        renderItem={(message) => (
          <List.Item style={{ background: "#f2f6fc" }}>
            <Message
              threads={threads}
              checked={checkedMessageIds.has(message.id)}
              setChecked={
                folder != "sent"
                  ? ({ checked, shiftKey }) => {
                      if (shiftKey && mostRecentChecked != null) {
                        // set the range of id's between this message and the most recent one
                        // to be checked.  This matches the algorithm I think in gmail and our file explorer.
                        const v = get_array_range(
                          filteredMessages.map(({ id }) => id),
                          mostRecentChecked,
                          message.id,
                        );
                        if (checked) {
                          for (const id of v) {
                            checkedMessageIds.add(id);
                          }
                        } else {
                          for (const id of v) {
                            checkedMessageIds.delete(id);
                          }
                        }
                      } else {
                        if (checked) {
                          checkedMessageIds.add(message.id);
                        } else {
                          checkedMessageIds.delete(message.id);
                        }
                      }
                      setCheckedMessageIds(new Set(checkedMessageIds));
                      setMostRecentChecked(message.id);
                    }
                  : undefined
              }
              message={message}
              showThread={showThread}
              setShowThread={setShowThread}
              folder={folder}
            />
          </List.Item>
        )}
      />
    </>
  );
}

// These are actions for an entire THREAD in all cases.
function Actions({
  folder,
  checkedMessageIds,
  messages,
  setShowThread,
  threads,
}) {
  return (
    <Space wrap>
      <Button
        type="text"
        disabled={folder != "inbox"}
        onClick={() => {
          redux.getActions("messages").mark({
            ids: expandToThreads({
              ids: checkedMessageIds,
              threads,
              messages,
            }),
            saved: true,
          });
          setShowThread(null);
        }}
      >
        <Icon name="download" /> Archive
      </Button>
      {folder != "trash" && (
        <Button
          type="text"
          onClick={() => {
            redux.getActions("messages").mark({
              ids: expandToThreads({
                ids: checkedMessageIds,
                threads,
                messages,
              }),
              deleted: true,
            });
            setShowThread(null);
          }}
        >
          <Icon name="trash" /> Delete
        </Button>
      )}
      {folder == "trash" && (
        <Button
          danger
          type="text"
          disabled={!hasNotExpire({ checkedMessageIds, messages })}
          onClick={() => {
            redux.getActions("messages").mark({
              ids: expandToThreads({
                ids: checkedMessageIds,
                threads,
                messages,
              }),
              expire: dayjs().add(1, "day").toDate(),
            });
            setShowThread(null);
          }}
        >
          <Icon name="trash" /> Delete Forever
        </Button>
      )}
      {folder != "trash" && (
        <Button
          type="text"
          disabled={
            !hasUnread({ checkedMessageIds, messages, threads, folder })
          }
          onClick={() => {
            redux.getActions("messages").mark({
              ids: expandToThreads({
                ids: checkedMessageIds,
                threads,
                messages,
              }),
              read: new Date(),
            });
          }}
        >
          <Icon name="eye" /> Read
        </Button>
      )}
      {folder != "trash" && (
        <Button
          type="text"
          disabled={!hasRead({ checkedMessageIds, messages, threads, folder })}
          onClick={() => {
            redux.getActions("messages").mark({
              ids: expandToThreads({
                ids: checkedMessageIds,
                threads,
                messages,
              }),
              read: null,
            });
          }}
        >
          <Icon name="eye-slash" /> Unread
        </Button>
      )}
      <Button
        type="text"
        disabled={
          !enableMoveToInbox({
            folder,
            checkedMessageIds,
            messages,
            threads,
          })
        }
        onClick={() => {
          redux.getActions("messages").mark({
            ids: expandToThreads({
              ids: checkedMessageIds,
              threads,
              messages,
            }),
            saved: false,
            deleted: false,
            expire: null,
          });
          setShowThread(null);
        }}
      >
        <Icon name="container" /> To Inbox
      </Button>
    </Space>
  );
}

function enableMoveToInbox({ folder, checkedMessageIds, messages, threads }) {
  if (folder == "inbox" || folder == "sent") {
    return false;
  }
  if (
    folder == "all" &&
    everyMessageIsInInbox({ checkedMessageIds, messages, threads })
  ) {
    // every message is already in the inbox
    return false;
  }
  if (folder == "trash") {
    return true;
  }
  return true;
}

function getIn({ id, messages, field }) {
  return messages.getIn([id, field]);
}

function hasUnread({ checkedMessageIds, messages, threads, folder }) {
  for (const id of checkedMessageIds) {
    if (!isThreadRead({ threads, folder, message: messages.get(id).toJS() })) {
      return true;
    }
  }
  return false;
}

function hasRead({ checkedMessageIds, messages, threads, folder }) {
  for (const id of checkedMessageIds) {
    if (isThreadRead({ threads, folder, message: messages.get(id).toJS() })) {
      return true;
    }
  }
  return false;
}

function everyMessageIsInInbox({ checkedMessageIds, messages, threads }) {
  for (const id of checkedMessageIds) {
    if (
      !isInFolderThreaded({
        threads,
        message: messages.get(id),
        folder: "inbox",
      })
    ) {
      return false;
    }
  }
  return true;
}

function hasNotExpire({ checkedMessageIds, messages }) {
  for (const id of checkedMessageIds) {
    const expire = getIn({ id, field: "expire", messages });
    if (isNullDate(expire)) {
      return true;
    }
  }
  return false;
}
