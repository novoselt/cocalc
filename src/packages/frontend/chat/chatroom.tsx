/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Button, Divider, Input, Select, Space, Tooltip } from "antd";
import { debounce } from "lodash";
import { useDebounce } from "use-debounce";
import { ButtonGroup, Col, Row, Well } from "@cocalc/frontend/antd-bootstrap";
import {
  React,
  redux,
  useEditorRedux,
  useEffect,
  useRef,
  useState,
} from "@cocalc/frontend/app-framework";
import { Icon, Loading, Tip } from "@cocalc/frontend/components";
import StaticMarkdown from "@cocalc/frontend/editors/slate/static-markdown";
import { FrameContext } from "@cocalc/frontend/frame-editors/frame-tree/frame-context";
import { hoursToTimeIntervalHuman } from "@cocalc/util/misc";
import { FormattedMessage } from "react-intl";
import type { ChatActions } from "./actions";
import type { ChatState } from "./store";
import { ChatLog } from "./chat-log";
import ChatInput from "./input";
import { LLMCostEstimationChat } from "./llm-cost-estimation";
import { SubmitMentionsFn } from "./types";
import { INPUT_HEIGHT, markChatAsReadIfUnseen } from "./utils";
import VideoChatButton from "./video/launch-button";
import Filter from "./filter";

const FILTER_RECENT_NONE = {
  value: 0,
  label: (
    <>
      <Icon name="clock" /> All
    </>
  ),
} as const;

const PREVIEW_STYLE: React.CSSProperties = {
  background: "#f5f5f5",
  fontSize: "14px",
  borderRadius: "10px 10px 10px 10px",
  boxShadow: "#666 3px 3px 3px",
  paddingBottom: "20px",
  maxHeight: "40vh",
  overflowY: "auto",
} as const;

const GRID_STYLE: React.CSSProperties = {
  maxWidth: "1200px",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  margin: "auto",
} as const;

const CHAT_LOG_STYLE: React.CSSProperties = {
  padding: "0",
  background: "white",
  flex: "1 0 auto",
  position: "relative",
} as const;

interface Props {
  actions: ChatActions;
  project_id: string;
  path: string;
  is_visible?: boolean;
  font_size: number;
}

export function ChatRoom({
  actions,
  project_id,
  path,
  is_visible,
  font_size,
}: Props) {
  const useEditor = useEditorRedux<ChatState>({ project_id, path });
  const is_uploading = useEditor("is_uploading");
  const is_preview = useEditor("is_preview");
  const input: string = useEditor("input");
  const [preview] = useDebounce(input, 250);

  const search = useEditor("search");
  const messages = useEditor("messages");
  const filterRecentH: number = useEditor("filterRecentH");
  const [filterRecentHCustom, setFilterRecentHCustom] = useState<string>("");
  const [filterRecentOpen, setFilterRecentOpen] = useState<boolean>(false);
  const llm_cost_room = useEditor("llm_cost_room");

  const submitMentionsRef = useRef<SubmitMentionsFn>();
  const scrollToBottomRef = useRef<any>(null);

  // The act of opening/displaying the chat marks it as seen...
  useEffect(() => {
    mark_as_read();
  }, []);

  function mark_as_read() {
    markChatAsReadIfUnseen(project_id, path);
  }

  function on_send_button_click(e): void {
    e.preventDefault();
    on_send();
  }

  function button_scroll_to_bottom(): void {
    scrollToBottomRef.current?.(true);
  }

  function render_preview_message(): JSX.Element | undefined {
    if (!is_preview) return;
    if (input.length === 0 || preview.length === 0) return;

    return (
      <Row style={{ position: "absolute", bottom: "0px", width: "100%" }}>
        <Col xs={0} sm={2} />

        <Col xs={10} sm={9}>
          <Well style={PREVIEW_STYLE}>
            <div
              className="pull-right lighten"
              style={{
                marginRight: "-8px",
                marginTop: "-10px",
                cursor: "pointer",
                fontSize: "13pt",
              }}
              onClick={() => actions.set_is_preview(false)}
            >
              <Icon name="times" />
            </div>
            <StaticMarkdown value={preview} />
            <div className="small lighten" style={{ marginTop: "15px" }}>
              Preview (press Shift+Enter to send)
            </div>
          </Well>
        </Col>

        <Col sm={1} />
      </Row>
    );
  }

  function render_bottom_button(): JSX.Element {
    return (
      <Button onClick={button_scroll_to_bottom}>
        <Tip
          title={
            <FormattedMessage
              id="chatroom.scroll_bottom.tooltip.title"
              defaultMessage={"Newest Messages"}
            />
          }
          tip={
            <span>
              <FormattedMessage
                id="chatroom.scroll_bottom.tooltip.tip"
                defaultMessage={
                  "Scrolls the chat to the bottom showing the newest messages"
                }
              />
            </span>
          }
          placement="left"
        >
          <Icon name="arrow-down" />{" "}
          <FormattedMessage
            id="chatroom.scroll_bottom.label"
            defaultMessage={"Newest"}
          />
        </Tip>
      </Button>
    );
  }

  function render_video_chat_button() {
    if (project_id == null || path == null) return;
    return (
      <VideoChatButton
        project_id={project_id}
        path={path}
        sendChat={(value) => actions.send_chat({ input: value })}
      />
    );
  }

  function isValidFilterRecentCustom(): boolean {
    const v = parseFloat(filterRecentHCustom);
    return isFinite(v) && v >= 0;
  }

  function renderFilterRecent() {
    return (
      <Tooltip title="Only show recent threads.">
        <Select
          open={filterRecentOpen}
          onDropdownVisibleChange={(v) => setFilterRecentOpen(v)}
          value={filterRecentH}
          status={filterRecentH > 0 ? "warning" : undefined}
          allowClear
          onClear={() => {
            actions.setState({ filterRecentH: 0 });
            setFilterRecentHCustom("");
          }}
          style={{ width: 120 }}
          popupMatchSelectWidth={false}
          onSelect={(val: number) => actions.setState({ filterRecentH: val })}
          options={[
            FILTER_RECENT_NONE,
            ...[1, 6, 12, 24, 48, 24 * 7, 14 * 24, 28 * 24].map((value) => {
              const label = hoursToTimeIntervalHuman(value);
              return { value, label };
            }),
          ]}
          labelRender={({ label, value }) => {
            if (!label) {
              if (isValidFilterRecentCustom()) {
                value = parseFloat(filterRecentHCustom);
                label = hoursToTimeIntervalHuman(value);
              } else {
                ({ label, value } = FILTER_RECENT_NONE);
              }
            }
            return (
              <Tooltip
                title={
                  value === 0
                    ? undefined
                    : `Only threads with messages sent in the past ${label}.`
                }
              >
                {label}
              </Tooltip>
            );
          }}
          dropdownRender={(menu) => (
            <>
              {menu}
              <Divider style={{ margin: "8px 0" }} />
              <Input
                placeholder="Number of hours"
                allowClear
                value={filterRecentHCustom}
                status={
                  filterRecentHCustom == "" || isValidFilterRecentCustom()
                    ? undefined
                    : "error"
                }
                onChange={debounce(
                  (e: React.ChangeEvent<HTMLInputElement>) => {
                    const v = e.target.value;
                    setFilterRecentHCustom(v);
                    const val = parseFloat(v);
                    if (isFinite(val) && val >= 0) {
                      actions.setState({ filterRecentH: val });
                    } else if (v == "") {
                      actions.setState({
                        filterRecentH: FILTER_RECENT_NONE.value,
                      });
                    }
                  },
                  150,
                  { leading: true, trailing: true },
                )}
                onKeyDown={(e) => e.stopPropagation()}
                onPressEnter={() => setFilterRecentOpen(false)}
                addonAfter={<span style={{ paddingLeft: "5px" }}>hours</span>}
              />
            </>
          )}
        />
      </Tooltip>
    );
  }

  function render_button_row() {
    if (messages == null) {
      return null;
    }
    return (
      <Space style={{ width: "100%", marginTop: "3px" }} wrap>
        <Filter
          actions={actions}
          search={search}
          style={{
            margin: 0,
            width: "100%",
            ...(messages.size >= 2
              ? undefined
              : { visibility: "hidden", height: 0 }),
          }}
        />
        {renderFilterRecent()}
        <ButtonGroup style={{ marginLeft: "5px" }}>
          {render_video_chat_button()}
          {render_bottom_button()}
        </ButtonGroup>
      </Space>
    );
  }

  function on_send(): void {
    const input = submitMentionsRef.current?.();
    scrollToBottomRef.current?.(true);
    actions.send_chat({ input });
    setTimeout(() => {
      scrollToBottomRef.current?.(true);
    }, 100);
  }

  function render_body(): JSX.Element {
    return (
      <div className="smc-vfill" style={GRID_STYLE}>
        {render_button_row()}
        <div className="smc-vfill" style={CHAT_LOG_STYLE}>
          <ChatLog
            actions={actions}
            project_id={project_id}
            path={path}
            scrollToBottomRef={scrollToBottomRef}
            mode={"standalone"}
            fontSize={font_size}
          />
          {render_preview_message()}
        </div>
        <div style={{ display: "flex", marginBottom: "5px", overflow: "auto" }}>
          <div
            style={{
              flex: "1",
              padding: "0px 5px 0px 2px",
            }}
          >
            <ChatInput
              fontSize={font_size}
              autoFocus
              cacheId={`${path}${project_id}-new`}
              input={input}
              on_send={on_send}
              height={INPUT_HEIGHT}
              onChange={(value) => {
                actions.set_input(value);
                // submitMentionsRef will not actually submit mentions; we're only interested in the reply value
                const reply =
                  submitMentionsRef.current?.(undefined, true) ?? value;
                actions?.llm_estimate_cost(reply, "room");
              }}
              submitMentionsRef={submitMentionsRef}
              syncdb={actions.syncdb}
              date={0}
              editBarStyle={{ overflow: "auto" }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "0",
              marginBottom: "0",
            }}
          >
            <div style={{ flex: 1 }} />
            <LLMCostEstimationChat
              llm_cost={llm_cost_room}
              compact
              style={{
                flex: 0,
                fontSize: "85%",
                textAlign: "center",
                margin: "0 0 5px 0",
              }}
            />
            <Tooltip
              title={
                <FormattedMessage
                  id="chatroom.chat_input.send_button.tooltip"
                  defaultMessage={"Send message (shift+enter)"}
                />
              }
            >
              <Button
                onClick={on_send_button_click}
                disabled={input.trim() === "" || is_uploading}
                type="primary"
                style={{ height: "47.5px" }}
                icon={<Icon name="paper-plane" />}
              >
                <FormattedMessage
                  id="chatroom.chat_input.send_button.label"
                  defaultMessage={"Send"}
                />
              </Button>
            </Tooltip>
            <div style={{ height: "5px" }} />
            <Button
              onClick={() => actions.set_is_preview(true)}
              style={{ height: "47.5px" }}
              disabled={is_preview}
            >
              <FormattedMessage
                id="chatroom.chat_input.preview_button.label"
                defaultMessage={"Preview"}
              />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (messages == null || input == null) {
    return <Loading theme={"medium"} />;
  }
  // remove frameContext once the chatroom is part of a frame tree.
  // we need this now, e.g., since some markdown editing components
  // for input assume in a frame tree, e.g., to fix
  //  https://github.com/sagemathinc/cocalc/issues/7554
  return (
    <FrameContext.Provider
      value={
        {
          project_id,
          path,
          isVisible: !!is_visible,
          redux,
        } as any
      }
    >
      <div
        onMouseMove={mark_as_read}
        onClick={mark_as_read}
        className="smc-vfill"
      >
        {render_body()}
      </div>
    </FrameContext.Provider>
  );
}
