/*
Component to show all your messages.
*/

import { useEffect } from "react";
import { init } from "./redux";
import Main from "./main";
import { useTypedRedux } from "@cocalc/frontend/app-framework";
import { Spin } from "antd";
import type { Filter } from "./types";
export { isMessagesFilter } from "./types";
import Search from "./search";

interface Props {
  filter?: Filter;
  style?;
}

export default function Messages({ filter, style }: Props) {
  useEffect(() => {
    // ONLY initialize the state stuff if the actual messages
    // are displayed, to avoid  waste of resources/load
    init();
  }, []);

  const threads = useTypedRedux("messages", "threads");
  const messages = useTypedRedux("messages", "messages");
  const search = useTypedRedux("messages", "search");
  return (
    <div
      style={{
        borderLeft: "1px solid #ccc",
        overflowY: "auto",
        paddingLeft: "15px",
        ...style,
      }}
      className="smc-vfill"
    >
      <Search />
      {threads == null || messages == null ? (
        <Spin />
      ) : (
        <Main
          messages={messages}
          threads={threads}
          filter={filter}
          search={search}
        />
      )}
    </div>
  );
}
