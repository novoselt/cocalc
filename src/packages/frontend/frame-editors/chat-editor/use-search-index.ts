import { useFrameContext } from "@cocalc/frontend/frame-editors/frame-tree/frame-context";
import { useEffect, useState } from "react";
import { create, search, insertMultiple } from "@orama/orama";
import { getSearchData } from "@cocalc/frontend/chat/filter-messages";
import useCounter from "@cocalc/frontend/app-framework/counter-hook";

export default function useSearchIndex() {
  const { actions, project_id, path } = useFrameContext();
  const [index, setIndex] = useState<null | SearchIndex>(null);
  const [error, setError] = useState<string>("");
  const { val: refresh, inc: doRefresh } = useCounter();
  const [indexTime, setIndexTime] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        setError("");
        const t0 = Date.now();
        const index = new SearchIndex({ actions });
        await index.init();
        setIndex(index);
        setIndexTime(Date.now() - t0);
      } catch (err) {
        setError(`${err}`);
      }
    })();
  }, [project_id, path, refresh]);

  return { index, error, doRefresh, setError, indexTime };
}

class SearchIndex {
  private actions;
  private state: "init" | "ready" | "failed" = "init";
  private error: Error | null = null;
  private db;

  constructor({ actions }) {
    this.actions = actions;
  }

  getState = () => this.state;
  getError = () => this.error;

  search = async (query) => {
    if (this.state != "ready") {
      throw Error("index not ready");
    }
    return await search(this.db, query);
  };

  init = async () => {
    this.db = await create({
      schema: {
        time: "number",
        message: "string",
      },
    });

    const messages = this.actions.store?.get("messages");
    if (messages == null) {
      return;
    }
    const searchData = getSearchData({ messages, threads: false });
    const docs: { time: number; message: string }[] = [];
    for (const time in searchData) {
      docs.push({
        time: parseInt(time),
        message: searchData[time]?.content ?? "",
      });
    }
    await insertMultiple(this.db, docs);
    this.state = "ready";
  };
}
