/*
 *  This file is part of CoCalc: Copyright © 2023 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

// Active files (editors) in the current project
// Note: there is no corresponding full page – instead, this is based on the "editor tabs"

import { Alert, Button } from "antd";
import { sortBy, uniq } from "lodash";

import { UsersViewing } from "@cocalc/frontend/account/avatar/users-viewing";
import {
  CSS,
  useActions,
  useEffect,
  useMemo,
  usePrevious,
  useState,
  useTypedRedux,
} from "@cocalc/frontend/app-framework";
import { HelpIcon, Icon, Paragraph } from "@cocalc/frontend/components";
import { file_options } from "@cocalc/frontend/editor-tmp";
import { useProjectContext } from "@cocalc/frontend/project/context";
import { handleFileEntryClick } from "@cocalc/frontend/project/history/utils";
import track from "@cocalc/frontend/user-tracking";
import {
  filename_extension_notilde,
  path_split,
  search_match,
  search_split,
  strictMod,
  tab_to_path,
} from "@cocalc/util/misc";
import { COLORS } from "@cocalc/util/theme";
import { FIX_BORDER } from "../common";
import { FIXED_PROJECT_TABS } from "../file-tab";
import { shouldOpenFileInNewWindow } from "../utils";
import { Group } from "./active-group";
import { OpenFileTabs } from "./active-tabs";
import { ActiveTop } from "./active-top";
import {
  ACTIVE_FOLDER_TYPE,
  FLYOUT_DEFAULT_WIDTH_PX,
  FLYOUT_PADDING,
} from "./consts";
import { FileListItem } from "./file-list-item";
import {
  FlyoutActiveMode,
  FlyoutActiveStarred,
  getFlyoutActiveMode,
  getFlyoutActiveShowStarred,
  getFlyoutActiveStarred,
  isFlyoutActiveMode,
  storeFlyoutState,
} from "./state";
import { GROUP_STYLE, randomLeftBorder } from "./utils";

const FILE_TYPE_PRIORITY = [
  "ipynb",
  "sagews",
  "term",
  "md",
  "tex",
  "pdf",
  "txt",
  "py",
  "course",
  "sage-chat",
] as const;

const GROUP_SORTER: {
  [mode in Exclude<FlyoutActiveMode, "tabs">]: (
    group: string,
  ) => string | string[];
} = {
  folder: (group: string) => group.toLowerCase(),
  type: (group: string) => {
    // prioritize known file types, and some special ones even more
    // taken from our stats, and adding some, high priority at the start
    const len = FILE_TYPE_PRIORITY.length;
    const grp = group.toLowerCase();
    let level = FILE_TYPE_PRIORITY.indexOf(grp as any);
    // known file extensions are still above all other ones
    if (level === -1) {
      const fileType = file_options(`foo.${grp}`);
      level = fileType != null ? len : len + 1;
    }
    return [
      // it only compares strings, hence we pad with zeros
      String(level).padStart(3, "0"),
      group.toLowerCase(),
    ];
  },
} as const;

const USERS_SIZE_PX = 18;

// on top of the default for UsersViewing
const USERS_STYLE: CSS = {
  maxWidth: "90px",
  height: "auto",
  padding: 0,
  position: "relative",
  top: "-1px",
} as const;

interface Props {
  wrap: (list: JSX.Element, style?: CSS) => JSX.Element;
  flyoutWidth: number;
}

export function ActiveFlyout(props: Readonly<Props>): JSX.Element {
  const { wrap, flyoutWidth } = props;
  const { project_id, flipTabs } = useProjectContext();
  const flipTab = flipTabs[0];
  const flipTabPrevious = usePrevious(flipTab);
  const actions = useActions({ project_id });

  const [mode, setActiveMode] = useState<FlyoutActiveMode>(
    getFlyoutActiveMode(project_id),
  );
  const [starred, setStarred] = useState<FlyoutActiveStarred>(
    getFlyoutActiveStarred(project_id),
  );

  const openFiles = useTypedRedux({ project_id }, "open_files_order");
  const recentlyClosed = useTypedRedux({ project_id }, "recently_closed_files");
  //   const user_map = useTypedRedux("users", "user_map");
  const activeTab = useTypedRedux({ project_id }, "active_project_tab");
  const [filterTerm, setFilterTerm] = useState<string>("");
  const [showStarred, setShowStarred] = useState<boolean>(
    getFlyoutActiveShowStarred(project_id),
  );
  const [showStarredTabs, setShowStarredTabs] = useState<boolean>(true);

  function setMode(mode: FlyoutActiveMode) {
    if (isFlyoutActiveMode(mode)) {
      setActiveMode(mode);
      actions?.setFlyoutActiveMode(mode);
    } else {
      console.warn(`Invalid flyout active mode: ${mode}`);
    }
  }

  function setStarredPath(path: string, next: boolean) {
    const newStarred = next
      ? [...starred, path]
      : starred.filter((p) => p !== path);
    setStarred(newStarred);
    storeFlyoutState(project_id, "active", { starred: newStarred });
  }

  useEffect(() => actions?.setFlyoutActiveMode(mode), [mode]);

  // when flipTab changes, dispatch to doScroll
  useEffect(() => {
    if (flipTabPrevious != null && flipTabPrevious !== flipTab) {
      // filters quick clicks, but maybe we don't want to do that. In any case, doScroll requires +/- 1
      doScroll(flipTab - flipTabPrevious > 0 ? 1 : -1);
    }
  }, [flipTab]);

  const [filteredFiles, openFilesGrouped]: [
    string[],
    { [group: string]: string[] },
  ] = useMemo(() => {
    const searchWords = search_split(filterTerm.trim().toLowerCase());

    // we put starred files first, then open files – everything else is defined by grouping/sorting
    const allFiles = uniq([
      ...starred.filter((path) => {
        if (!showStarred) return false;
        return !path.endsWith("/");
      }),
      ...openFiles.toJS(),
    ]);

    const filteredFiles = allFiles.filter((path) => doesMatch(path, false));

    function doesMatch(path: string, isDir: boolean) {
      // if we have a filter term, then only show files that match
      if (filterTerm === "" || searchWords.length === 0) return true;
      // we only filter based on the base-filename, not the path
      const { head, tail } = path_split(path);
      return search_match(isDir ? head : tail, searchWords);
    }

    // group files, an array of strings for path/filename, by directory or type (file extension)
    const grouped: { [group: string]: string[] } = {};
    filteredFiles.forEach((path) => {
      const { head, tail } = path_split(path);
      const group =
        mode === "folder" ? head : filename_extension_notilde(tail) ?? "";
      if (grouped[group] == null) grouped[group] = [];
      grouped[group].push(path);
    });

    // in folder mode, show starred directories
    if (mode === "folder" || mode === "type") {
      const starredFolders = starred.filter(
        (path) => showStarred && path.endsWith("/") && doesMatch(path, true),
      );

      if (mode === "folder") {
        // for all starred directories (starred ending in /)
        // make sure there is a group with an empty string array
        // only show it, if it matches the search terms
        starredFolders.forEach((path) => {
          const dirName = path.slice(0, -1);
          if (grouped[dirName] == null) grouped[dirName] = [];
        });
      } // while in type mode, make a "folder" group for starred directories
      else if (mode === "type") {
        if (starredFolders.length > 0) {
          grouped[ACTIVE_FOLDER_TYPE] = starredFolders;
        }
      }
    }

    return [filteredFiles, grouped];
  }, [filterTerm, openFiles, showStarred, mode, starred]);

  const activePath = useMemo(() => {
    return tab_to_path(activeTab);
  }, [activeTab]);

  // end of hooks

  function handleFileClick(
    e: React.MouseEvent,
    path: string,
    how: "file" | "undo",
  ) {
    const trackInfo = {
      path,
      project_id,
      how: `flyout-active-${how}-click`,
    };
    if (shouldOpenFileInNewWindow(e)) {
      actions?.open_file({
        path,
        new_browser_window: true,
      });
      track("open-file-in-new-window", trackInfo);
    } else {
      handleFileEntryClick(e, path, project_id);
      track("open-file", trackInfo);
    }
  }

  function renderFileItem(path: string, how: "file" | "undo", group?: string) {
    const isActive: boolean = activePath === path;
    const style = group != null ? randomLeftBorder(group) : undefined;

    const isdir = path.endsWith("/");
    // if it is a directory, remove the trailing slash
    // and if it starts with ".smc/root/", replace that by a "/"
    const display = isdir
      ? path.slice(0, -1).replace(/^\.smc\/root\//, "/")
      : undefined;

    return (
      <FileListItem
        key={path}
        mode="active"
        item={{
          name: path,
          isopen: openFiles.includes(path),
          isdir,
          isactive: isActive,
        }}
        displayedNameOverride={display}
        style={style}
        multiline={false}
        onClick={(e: React.MouseEvent) => handleFileClick(e, path, how)}
        onClose={(e: React.MouseEvent, path: string) => {
          e.stopPropagation();
          actions?.close_tab(path);
        }}
        onMouseDown={(e: React.MouseEvent) => {
          if (e.button === 1) {
            // middle mouse click
            actions?.close_tab(path);
          }
        }}
        isStarred={showStarred ? starred.includes(path) : undefined}
        onStar={(next: boolean) => {
          setStarredPath(path, next);
        }}
        extra2={
          flyoutWidth >= FLYOUT_DEFAULT_WIDTH_PX ? (
            <UsersViewing
              path={path}
              project_id={project_id}
              size={USERS_SIZE_PX}
              style={USERS_STYLE}
            />
          ) : undefined
        }
      />
    );
  }

  // when not showing starrd: for mode "type" and "folder", we only show groups that have files
  // i.e. we do not show an empty group due to a starred file, if that file isn't going to be shown.
  function getGroupKeys() {
    const groupNames = sortBy(
      Object.keys(openFilesGrouped),
      GROUP_SORTER[mode],
    );
    return groupNames.filter((group) => {
      if (!showStarred && (mode === "type" || mode === "folder")) {
        return openFilesGrouped[group].length > 0;
      }
      return true;
    });
  }

  function getGroupFilenames(group: string): string[] {
    return sortBy(openFilesGrouped[group], (path) => {
      const { head, tail } = path_split(path);
      if (path.endsWith("/")) {
        return head.toLowerCase();
      } else {
        return tail.toLowerCase();
      }
    });
  }

  // if there are starred files but they're hidden, remind the user of that
  function renderEmptyStarredInfo() {
    if (starred.length === 0 || showStarred) return;
    return (
      <>
        {" "}
        or pick one from your{" "}
        <Button
          size="small"
          icon={<Icon name="star-filled" style={{ color: COLORS.STAR }} />}
          onClick={() => setShowStarred(true)}
        >
          starred files
        </Button>
      </>
    );
  }

  function renderEmpty(): JSX.Element {
    return (
      <div>
        <Alert
          type="info"
          showIcon={false}
          banner
          description={
            <>
              <Paragraph strong>There are no open files to show.</Paragraph>
              <Paragraph>
                Use the{" "}
                <Button
                  size="small"
                  icon={<Icon name={FIXED_PROJECT_TABS.files.icon} />}
                  onClick={() => {
                    actions?.toggleFlyout("files");
                  }}
                >
                  {FIXED_PROJECT_TABS.files.label}
                </Button>{" "}
                to open a file{renderEmptyStarredInfo()}.
              </Paragraph>
            </>
          }
        />
      </div>
    );
  }

  function dndDragEnd({ active, over }) {
    if (active == null || over == null || active.id == over.id) return;
    actions?.move_file_tab({
      old_index: openFiles.indexOf(active.id),
      new_index: openFiles.indexOf(over.id),
    });
  }

  // here, there is no grouping – it's the custom ordering and below are (optionally) starred files
  function renderTabs(): [JSX.Element, JSX.Element | null] {
    const openTabs = openFiles
      .filter((path) => filteredFiles.includes(path))
      .toJS();
    // starred files (no directories) which aren't opened, are at the bottom
    const starredRendered = showStarred
      ? starred
          .filter((path) => !path.endsWith("/") && !openFiles.includes(path))
          .sort((a, b) => a.localeCompare(b))
          .map((path) => {
            return renderFileItem(path, "file");
          })
      : [];

    return [
      openTabs.length === 0 ? (
        renderEmpty()
      ) : (
        <OpenFileTabs
          dndDragEnd={dndDragEnd}
          openTabs={openTabs}
          renderFileItem={renderFileItem}
        />
      ),
      renderStarredInFiles(starredRendered),
    ];
  }

  function renderStarredInFiles(starredRendered: JSX.Element[]) {
    if (!showStarred || starredRendered.length === 0) return null;
    return (
      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          maxHeight: "30vh",
          borderTop: FIX_BORDER,
        }}
      >
        <div
          style={{
            flex: "1 0 auto",
            padding: FLYOUT_PADDING,
            ...GROUP_STYLE,
          }}
        >
          <Icon name="star-filled" style={{ color: COLORS.STAR }} /> Starred{" "}
          <HelpIcon title={"Starred files are like bookmarks."}>
            These files are not opened, but you can quickly access them.
            <br />
            Use the <Icon
              name="star-filled"
              style={{ color: COLORS.STAR }}
            />{" "}
            icon to star/unstar a file.
            <br />
            The star above the list of active files toggles if starred files are
            shown.
          </HelpIcon>
          <Button
            size="small"
            style={{ float: "right", color: COLORS.FILE_EXT }}
            onClick={() => setShowStarredTabs(!showStarredTabs)}
          >
            {showStarredTabs ? (
              <>
                <Icon name="eye-slash" /> Hide
              </>
            ) : (
              <>
                <Icon name="eye" /> Show
              </>
            )}
          </Button>
        </div>
        {showStarredTabs ? (
          <div style={{ flex: "1 1 auto", overflowY: "auto" }}>
            {starredRendered}
          </div>
        ) : null}
      </div>
    );
  }

  // type "folder" and  "type" have actual groups
  function renderGroupsOfGrouped(): JSX.Element {
    const groups: JSX.Element[] = [];

    for (const group of getGroupKeys()) {
      groups.push(
        <Group
          key={group}
          group={group}
          mode={mode}
          openFilesGrouped={openFilesGrouped}
          starred={starred}
          setStarredPath={setStarredPath}
          showStarred={showStarred}
        />,
      );

      for (const path of getGroupFilenames(group)) {
        groups.push(renderFileItem(path, "file", group));
      }
    }

    if (groups.length === 0) {
      return renderEmpty();
    } else {
      return <div>{groups}</div>;
    }
  }

  function renderGroups(): JSX.Element {
    // flat, same ordering as file tabs
    if (mode === "tabs") {
      const [tabs, stars] = renderTabs();
      return (
        <>
          {wrap(tabs, { marginTop: "10px" })}
          {stars}
        </>
      );
    } else {
      return wrap(renderGroupsOfGrouped(), { marginTop: "10px" });
    }
  }

  function* iterAllGroups(onlyOpened: boolean = false): Generator<{
    idx: number;
    group: string;
    path: string;
  }> {
    // our ordering, across the groups
    const groupKeys = getGroupKeys();
    let idx = 0;
    for (const group of groupKeys) {
      const paths = getGroupFilenames(group);
      for (const path of paths) {
        if (onlyOpened && !openFiles.includes(path)) continue;
        yield { idx, group, path };
        idx += 1;
      }
    }
  }

  // the getOpenedIndex and getOpenedFileByIdx functions are inverses of each other
  function getOpenedIndex(): number {
    if (mode === "tabs") {
      // the ordering of the tabs
      let idx = -1;
      openFiles.forEach((path, i) => {
        if (path === activePath) {
          idx = i;
          return false;
        }
      });
      return idx;
    } else {
      for (const { idx, path } of iterAllGroups(true)) {
        if (path === activePath) {
          return idx;
        }
      }
      return -1;
    }
  }

  // This is the inverse of the above
  function getOpenedFileByIdx(idx: number): string {
    if (mode === "tabs") {
      let ret = "";
      openFiles.forEach((path, i) => {
        if (i === idx) {
          ret = path;
          return false;
        }
      });
      return ret;
    } else {
      for (const { idx: pos, path } of iterAllGroups(true)) {
        if (idx === pos) {
          return path;
        }
      }
      return "";
    }
  }

  function renderUndo() {
    if (recentlyClosed.size === 0) return;

    return (
      <div
        style={{
          flex: "1 1 auto",
          borderTop: FIX_BORDER,
        }}
      >
        <div
          style={{
            padding: FLYOUT_PADDING,
            ...GROUP_STYLE,
            color: COLORS.FILE_EXT,
          }}
        >
          <Icon name="undo" /> Recently closed
          <Button
            size="small"
            style={{ float: "right", color: COLORS.FILE_EXT }}
            onClick={() => actions?.clear_recently_closed_files()}
          >
            <Icon name="times" /> Clear
          </Button>
        </div>
        {recentlyClosed.reverse().map((path) => {
          return renderFileItem(path, "undo");
        })}
      </div>
    );
  }

  // Scrolling depends on the mode. We bascially check if a file is opened.
  // If that's the case, open the next opened file according to the ordering implied by the mode.
  // Otherwise it jumps around erratically.
  function doScroll(dx: -1 | 1) {
    let idx = getOpenedIndex();
    if (idx === -1) {
      idx = dx === 1 ? 0 : openFiles.size - 1;
    } else {
      idx = strictMod(idx + dx, openFiles.size);
    }
    const openNext = getOpenedFileByIdx(idx);
    if (openNext !== "") {
      track("open-file", {
        project_id,
        path: openNext,
        how: "flyout-active-tab-scroll",
      });
      handleFileEntryClick(undefined, openNext, project_id);
    }
  }

  function openFirstMatchingFile() {
    const path =
      mode === "tabs" ? filteredFiles[0] : iterAllGroups().next().value?.path;

    if (path != null) {
      handleFileEntryClick(undefined, path, project_id);
      return true;
    } else {
      return false;
    }
  }

  return (
    <>
      <ActiveTop
        mode={mode}
        setMode={setMode}
        showStarred={showStarred}
        setShowStarred={setShowStarred}
        filterTerm={filterTerm}
        setFilterTerm={setFilterTerm}
        doScroll={doScroll}
        openFirstMatchingFile={openFirstMatchingFile}
      />
      {renderGroups()}
      {renderUndo()}
    </>
  );
}
