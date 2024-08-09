/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

// data and functions specific to the latex editor.

import {
  exec,
  ExecOpts,
  ExecOutput,
} from "@cocalc/frontend/frame-editors/generic/client";
import { separate_file_extension } from "@cocalc/util/misc";
import { ExecuteCodeOutputAsync } from "@cocalc/util/types/execute-code";
// import { TIMEOUT_CALLING_PROJECT } from "@cocalc/util/consts/project";
import { TIMEOUT_CALLING_PROJECT } from "@cocalc/util/consts/project";
import { ExecOptsBlocking } from "@cocalc/util/db-schema/projects";
import { TIMEOUT_LATEX_JOB_S } from "./constants";

export function pdf_path(path: string): string {
  // if it is already a pdf, don't change the upper/lower casing -- #4562
  const { name, ext } = separate_file_extension(path);
  if (ext.toLowerCase() == "pdf") return path;
  return `${name}.pdf`;
}

/*
- cmd = the build command line
- filename - if the path to the file is 'foo/a b.tex' then this is 'a b.tex'.
*/
export function ensureTargetPathIsCorrect(
  cmd: string,
  filename: string,
): string {
  // make it so we can assume no whitespace at end:
  cmd = cmd.trim();

  // Make sure the filename is correct and is the last
  // command line argument.  Be careful since the path
  // may contain spaces.  Fortunately, the path can't
  // contain a single quote, since latex doesn't work
  // with such a file (and we have checks for this).
  // https://github.com/sagemathinc/cocalc/issues/5215
  // Also we have to automatically workaround the mess caused
  // by that bug #5215, which is why this code is more
  // complicated.
  const quoted = `'${filename}'`;

  // Now try to fix it, taking into account the fact that
  // it could be mangled because of bug #5215.  Note that single
  // quotes should have only been used to quote the final filename
  // argument to pdflatex.  The other arguments were really simple and
  // don't need quoting.
  const i = cmd.indexOf("'");
  if (i == -1) {
    // no single quotes at all -- old version.
    // replace the last argument with quoted version
    const j = cmd.lastIndexOf(" ");
    if (j == -1) {
      return cmd; // we don't do anything, e.g. this could be just "false"
    } else {
      return cmd.slice(0, j) + " " + quoted;
    }
  }

  // Get rid of whatever is between single quotes and put in the correct
  // thing (e.g., the filename may have been renamed).
  return cmd.slice(0, i).trim() + " " + quoted;
}

/**
 * Periodically get information about the job and terminate (without another update!) when the job is no longer running.
 */
export async function gatherJobInfo(
  project_id: string,
  job_info: ExecuteCodeOutputAsync,
  set_job_info: (info: ExecuteCodeOutputAsync) => void,
): Promise<void> {
  let wait_s = 1;
  try {
    while (true) {
      await new Promise((done) => setTimeout(done, 1000 * wait_s));
      const update = await exec({
        project_id,
        async_get: job_info.job_id,
        async_stats: true,
      });
      if (update.type === "blocking") {
        console.warn("Wrong type returned. The project is too old!");
        return;
      }
      if (update.status === "running") {
        set_job_info(update);
      } else {
        return;
      }
      wait_s = Math.min(10, wait_s + 1);
    }
  } catch {
    return;
  }
}

interface RunJobOpts {
  aggregate: ExecOptsBlocking["aggregate"];
  args?: string[];
  command: string;
  env?: { [key: string]: string };
  project_id: string;
  rundir: string; // a directory! (output_directory if in /tmp, or the directory of the file's path)
  set_job_info: (info: ExecuteCodeOutputAsync) => void;
  timeout?: number;
}

export async function runJob(opts: RunJobOpts): Promise<ExecOutput> {
  const { aggregate, args, command, env, project_id, rundir, set_job_info } =
    opts;

  const haveArgs = Array.isArray(args);

  const job: ExecOpts = {
    aggregate,
    args,
    async_call: true,
    bash: !haveArgs,
    command,
    env,
    err_on_exit: false,
    path: rundir,
    project_id,
    timeout: TIMEOUT_LATEX_JOB_S,
  };

  const job_info = await exec(job);

  if (job_info.type !== "async") {
    // this is not an async job. This could happen for old projects.
    return job_info;
  }

  if (typeof job_info.pid !== "number") {
    throw new Error("Unable to spawn compile job.");
  }

  set_job_info(job_info);
  gatherJobInfo(project_id, job_info, set_job_info);

  while (true) {
    try {
      const output = await exec({
        project_id,
        async_get: job_info.job_id,
        async_await: true,
        async_stats: true,
      });
      if (output.type !== "async") {
        throw new Error("output type is not async exec");
      }
      set_job_info(output);
      return output;
    } catch (err) {
      if (err === TIMEOUT_CALLING_PROJECT) {
        // this will be fine, hopefully. We continue trying to get a reply.
        await new Promise((done) => setTimeout(done, 100));
      } else {
        throw new Error(
          "Unable to complete compilation. Check the project and try again...",
        );
      }
    }
  }
}
