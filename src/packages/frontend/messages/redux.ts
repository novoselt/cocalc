/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Table } from "@cocalc/frontend/app-framework/Table";
import { redux, Store, Actions } from "@cocalc/frontend/app-framework";
import type { iMessagesMap, iThreads, Message } from "./types";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { search_split, uuid } from "@cocalc/util/misc";
import { once } from "@cocalc/util/async-utils";
import searchFilter from "@cocalc/frontend/search/filter";
import { reuseInFlight } from "@cocalc/util/reuse-in-flight";
import {
  getThreadId,
  isFromMe,
  replySubject,
  getNotExpired,
  getThreads,
} from "./util";
import { throttle } from "lodash";

export interface MessagesState {
  // map from string version of message id to immutablejs Message.
  messages?: iMessagesMap;
  threads?: iThreads;
  search: Set<number>;
  searchWords: Set<string>;
  // show/hide the compose modal
  compose?: boolean;
  // error to display to user
  error: string;
}
export class MessagesStore extends Store<MessagesState> {}

export class MessagesActions extends Actions<MessagesState> {
  searchIndex: {
    messages: iMessagesMap | null;
    filter: (search: string) => Promise<number[]>;
  } = { messages: null, filter: async (_search: string) => [] };

  constructor(name, redux) {
    super(name, redux);
  }

  getStore = () => this.redux.getStore("messages");

  setError = (error: string) => {
    this.setState({ error });
  };

  mark = async ({
    id,
    ids,
    read,
    saved,
    deleted,
    expire,
  }: {
    id?: number;
    ids?: Set<number>;
    read?: Date | null;
    saved?: boolean;
    deleted?: boolean;
    expire?: Date;
  }) => {
    const table = this.redux.getTable("messages")._table;
    const sent_table = this.redux.getTable("sent_messages")._table;
    if (id != null) {
      if (ids != null) {
        ids.add(id);
      } else {
        ids = new Set([id]);
      }
    }
    if (ids != null && ids.size > 0) {
      // mark them all read or saved -- have to use _table to
      // change more than one record at a time.
      let changed_table = false;
      let changed_sent_table = false;
      for (const id of ids) {
        if (table.get_one(`${id}`) != null) {
          table.set({
            id,
            read: read === null ? 0 : read,
            saved,
            to_deleted: deleted,
            to_expire: expire,
          });
          changed_table = true;
        }
        if (sent_table.get_one(`${id}`) != null) {
          sent_table.set({
            id,
            from_deleted: deleted,
            from_expire: expire,
          });
          changed_sent_table = true;
        }
      }
      if (changed_table) {
        await table.save();
      }
      if (changed_sent_table) {
        await sent_table.save();
      }
    }
  };

  send = async ({
    to_id,
    to_type = "account",
    subject,
    body,
    thread_id,
  }: {
    to_id: string;
    to_type?: string;
    subject: string;
    body: string;
    thread_id?: number;
  }) => {
    await webapp_client.async_query({
      query: {
        sent_messages: {
          sent: webapp_client.server_time(),
          subject,
          body,
          to_id,
          to_type,
          thread_id,
        },
      },
    });
  };

  handleTableUpdate = (updatedMessages) => {
    const store = this.getStore();
    let messages = store.get("messages");
    if (messages == null) {
      messages = updatedMessages;
    } else {
      messages = messages.merge(updatedMessages);
    }
    messages = getNotExpired(messages);
    const threads = getThreads(messages);
    this.setState({ messages, threads });
  };

  updateDraft = (obj: {
    id: number;
    thread_id?: number;
    to_id?: string;
    to_type?: string;
    subject?: string;
    body?: string;
    sent?: Date;
    // deleted and expire are only allowed if the draft message is not sent
    deleted?: boolean;
    expire?: Date;
  }) => {
    const table = this.redux.getTable("sent_messages")._table;
    const current = table.get_one(`${obj.id}`);
    if (current == null) {
      throw Error("message does not exist in sent_messages table");
    }
    for (const field of ["expire", "deleted"]) {
      obj[`from_${field}`] = obj[field];
      delete obj[field];
    }
    // sets it in the local table so it's there when you come back.
    // does NOT save the local table to the database though.
    // Only save to database when user exits out of the draft,
    // or sending it by setting sent to true (so recipient can see).
    // It also gets saved periodically.
    table.set(obj);
  };

  saveSentMessagesTable = async () => {
    const table = this.redux.getTable("sent_messages")._table;
    await table.save();
  };

  createDraft = async ({
    to_id,
    to_type = "account",
    subject = "",
    body = "",
    thread_id,
  }: {
    to_id: string;
    to_type?: string;
    subject?: string;
    body?: string;
    thread_id?: number;
  }) => {
    // trick -- we use a sentinel subject for a moment, since async_query
    // doesn't return the created primary key.  We'll implement that at some
    // point, but for now this will have to do.
    const uniqueSubject = `${subject}-${uuid()}`;
    await webapp_client.async_query({
      query: {
        sent_messages: {
          subject: uniqueSubject,
          body,
          to_id,
          to_type,
          thread_id,
        },
      },
    });
    const table = this.redux.getTable("sent_messages")._table;
    let t0 = Date.now();
    while (Date.now() - t0 <= 30000) {
      await once(table, "change", 10000);
      for (const [_, message] of table.get()) {
        if (message.get("subject") == uniqueSubject) {
          const id = message.get("id");
          // set the subject to actual one
          await this.updateDraft({ id, subject });
          return id;
        }
      }
    }
  };

  createReply = async (message: Message) => {
    let to_id, to_type;
    if (isFromMe(message)) {
      to_id = message.to_id;
      to_type = message.to_type;
    } else {
      to_id = message.from_id;
      to_type = message.from_type;
    }
    const subject = replySubject(message.subject);
    await this.createDraft({
      to_id,
      to_type,
      thread_id: getThreadId(message),
      subject,
      body: "",
    });
  };

  updateSearchIndex = reuseInFlight(
    async (opts: { noRetryIfMissing?: boolean; force?: boolean } = {}) => {
      const store = this.getStore();
      const messages = store.get("messages");
      if (messages == null) {
        // nothing to do
        return;
      }
      if (!opts.force && messages.equals(this.searchIndex.messages)) {
        // already up to date
        return;
      }
      const data = messages.keySeq().toJS();
      const users = this.redux.getStore("users");

      const missingUsers = new Set<string>();
      const getName = (account_id) => {
        const name = users.get_name(account_id);
        if (name == null) {
          missingUsers.add(account_id);
        }
        return name ?? "";
      };
      const toString = (id) => {
        const message = messages.get(id);
        if (message == null) {
          return "";
        }

        // todo -- adapt for non-accounts

        const s = `
From: ${getName(message.get("from_id"))}

To: ${getName(message.get("to_id"))}

Subject: ${message.get("subject")}

Body: ${message.get("body")}
`;

        return s;
      };
      const filter = await searchFilter<number>({
        data,
        toString,
      });

      this.searchIndex = { messages, filter };

      if (!opts.noRetryIfMissing && missingUsers.size > 0) {
        // after returning, we fire off loading of names
        // of all missing users, then redo the search index.
        // Otherwise non-collaborators will be missing in the
        // search index until store.get('messages') changes again.
        setTimeout(async () => {
          try {
            const actions = this.redux.getActions("users");
            await Promise.all(
              Array.from(missingUsers).map((account_id) =>
                actions.fetch_non_collaborator(account_id),
              ),
            );
            await this.updateSearchIndex({
              force: true,
              noRetryIfMissing: true,
            });
          } catch (err) {
            console.warn(err);
          }
        }, 1);
      }
    },
  );

  search = throttle(
    async (query: string) => {
      if (!query.trim()) {
        // easy special case
        this.setState({ search: new Set() });
        return;
      }
      // used for highlighting
      const searchWords = new Set(
        search_split(query, false).filter((x) => typeof x == "string"),
      );
      this.setState({ searchWords });
      // update search index, if necessary
      await this.updateSearchIndex();
      // the matching results
      const search = new Set(await this.searchIndex.filter(query));
      this.setState({ search });

      // change folder if necessary
      this.redux.getActions("mentions").set_filter("messages-search");
    },
    300,
    { leading: true, trailing: true },
  );
}

class MessagesTable extends Table {
  constructor(name, redux) {
    super(name, redux);
    this.query = this.query.bind(this);
    this._change = this._change.bind(this);
  }

  options() {
    return [];
  }

  query() {
    return {
      messages: [
        {
          id: null,
          sent: null,
          from_type: null,
          from_id: null,
          to_type: null,
          to_id: null,
          subject: null,
          body: null,
          read: null,
          saved: null,
          thread_id: null,
          to_deleted: null,
          to_expire: null,
        },
      ],
    };
  }

  _change(table, _keys): void {
    const actions = this.redux.getActions("messages");
    if (actions == null) {
      throw Error("actions must be defined");
    }
    actions.handleTableUpdate(table.get().mapKeys(parseInt));
  }
}

class SentMessagesTable extends Table {
  constructor(name, redux) {
    super(name, redux);
    this.query = this.query.bind(this);
    this._change = this._change.bind(this);
  }

  options() {
    return [];
  }

  query() {
    return {
      sent_messages: [
        {
          id: null,
          sent: null,
          from_type: null,
          from_id: null,
          to_type: null,
          to_id: null,
          subject: null,
          body: null,
          read: null,
          saved: null,
          thread_id: null,
          from_expire: null,
          from_deleted: null,
        },
      ],
    };
  }

  _change(table, _keys): void {
    const actions = this.redux.getActions("messages");
    if (actions == null) {
      throw Error("actions must be defined");
    }
    actions.handleTableUpdate(table.get().mapKeys(parseInt));
  }
}

let initialized = false;
export function init() {
  if (initialized || redux.getStore("messages") != null) {
    return;
  }
  redux.createStore<MessagesState, MessagesStore>("messages", MessagesStore, {
    search: new Set<number>(),
    searchWords: new Set<string>(),
    error: "",
  });
  redux.createActions<MessagesState, MessagesActions>(
    "messages",
    MessagesActions,
  );
  redux.createTable("messages", MessagesTable);
  redux.createTable("sent_messages", SentMessagesTable);
  initialized = true;
}
