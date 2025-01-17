/*
Backend server side part of ChatGPT integration with CoCalc.
*/

import getLogger from "@cocalc/backend/logger";
import { getServerSettings } from "@cocalc/server/settings/server-settings";
import getProject from "./global-project-pool";
import callProject from "@cocalc/server/projects/call";
import { jupyter_kernels } from "@cocalc/util/message";
import LRU from "lru-cache";
import isCollaborator from "@cocalc/server/projects/is-collaborator";

const cache = new LRU<string, object[]>({
  ttl: 30000,
  max: 300,
});

const log = getLogger("jupyter-api:kernels");

async function getConfig() {
  log.debug("get config");
  const { jupyter_account_id, jupyter_api_enabled } = await getServerSettings();

  return {
    jupyter_account_id,
    jupyter_api_enabled,
  };
}

export default async function getKernels({
  project_id,
  account_id,
}: {
  project_id?: string;
  account_id?: string;
}): Promise<object[]> {
  if (project_id != null) {
    if (account_id == null) {
      throw Error("account_id must be specified -- make sure you are signed in");
    }
    if (!isCollaborator({ project_id, account_id })) {
      throw Error("permission denied -- user must be collaborator on project");
    }
  }

  const key = project_id ?? "global";
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  if (project_id == null) {
    const { jupyter_account_id, jupyter_api_enabled } = await getConfig();
    if (!jupyter_api_enabled) {
      throw Error("Jupyter API is not enabled on this server.");
    }
    project_id = await getProject();
    account_id = jupyter_account_id;
  }
  const mesg = jupyter_kernels({});
  const resp = await callProject({
    account_id,
    project_id,
    mesg,
  });
  if (resp.error) {
    throw Error(resp.error);
  }
  cache.set(key, resp.kernels);
  return resp.kernels;
}
