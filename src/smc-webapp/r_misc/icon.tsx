/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import * as React from "react";
import { CSS } from "../app-framework";

import {
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  BellFilled,
  BellOutlined,
  BoldOutlined,
  BookOutlined,
  BorderOutlined,
  CaretDownFilled,
  CaretLeftFilled,
  CaretRightFilled,
  CaretUpFilled,
  CheckOutlined,
  CheckSquareOutlined,
  CloudDownloadOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  CloudFilled,
  CloudUploadOutlined,
  ClusterOutlined,
  CodeOutlined,
  ColumnHeightOutlined,
  ColumnWidthOutlined,
  CommentOutlined,
  ControlOutlined,
  CopyOutlined,
  DashboardOutlined,
  DeleteOutlined,
  DesktopOutlined,
  DownOutlined,
  EditOutlined,
  ExpandOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  ForwardOutlined,
  FundProjectionScreenOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  InfoOutlined,
  ItalicOutlined,
  KeyOutlined,
  LeftOutlined,
  LeftSquareFilled,
  LineHeightOutlined,
  LinkOutlined,
  LoadingOutlined,
  LockFilled,
  LogoutOutlined,
  MedicineBoxOutlined,
  MinusCircleOutlined,
  MinusOutlined,
  MinusSquareOutlined,
  OrderedListOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusCircleFilled,
  PlusCircleOutlined,
  PlusOutlined,
  PlusSquareFilled,
  PlusSquareOutlined,
  PoweroffOutlined,
  PrinterOutlined,
  QuestionCircleOutlined,
  RedoOutlined,
  RightOutlined,
  RightSquareFilled,
  RocketOutlined,
  SaveOutlined,
  ScissorOutlined,
  SearchOutlined,
  ShareAltOutlined,
  ShrinkOutlined,
  StepForwardOutlined,
  StopOutlined,
  StrikethroughOutlined,
  TableOutlined,
  ThunderboltOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
  UpOutlined,
  UploadOutlined,
  UserDeleteOutlined,
  UsergroupAddOutlined,
  UserOutlined,
  WifiOutlined,
} from "@ant-design/icons";

import { createFromIconfontCN } from "@ant-design/icons";
const scriptUrl = `${window.app_base_url}/webapp/iconfont.cn/iconfont.js`;
const IconFont = createFromIconfontCN({ scriptUrl });

const FA2ANTD = {
  "align-left": AlignLeftOutlined,
  "align-center": AlignCenterOutlined,
  "align-right": AlignRightOutlined,
  "arrow-circle-o-left": { IconFont: "arrow-circle-o-left" },
  "arrow-down": ArrowDownOutlined,
  "arrow-up": ArrowUpOutlined,
  bell: BellFilled,
  "bell-o": BellOutlined,
  bold: BoldOutlined,
  bolt: ThunderboltOutlined,
  book: BookOutlined,
  bullhorn: { IconFont: "bullhorn" },
  "caret-down": CaretDownFilled,
  "caret-left": CaretLeftFilled,
  "caret-right": CaretRightFilled,
  "caret-up": CaretUpFilled,
  "caret-square-left": LeftSquareFilled,
  "caret-square-right": RightSquareFilled,
  check: CheckOutlined,
  "check-square": CheckSquareOutlined,
  "check-square-o": CheckSquareOutlined,
  "chevron-down": DownOutlined,
  "chevron-left": LeftOutlined,
  "chevron-right": RightOutlined,
  "chevron-up": UpOutlined,
  "circle-notch": LoadingOutlined,
  clone: { IconFont: "clone" },
  cloud: CloudFilled,
  "cloud-download": CloudDownloadOutlined,
  "cloud-download-alt": CloudDownloadOutlined,
  "cloud-upload": CloudUploadOutlined,
  code: { IconFont: "code" },
  CodeOutlined,
  cogs: ControlOutlined,
  colors: { IconFont: "colors" },
  ColumnHeightOutlined,
  ColumnWidthOutlined,
  comment: CommentOutlined,
  comments: CommentOutlined,
  compress: ShrinkOutlined,
  copy: CopyOutlined,
  dashboard: DashboardOutlined,
  "dot-circle": { IconFont: "dot-circle" },
  edit: EditOutlined,
  expand: ExpandOutlined,
  eye: EyeOutlined,
  "eye-slash": EyeInvisibleOutlined,
  file: FileOutlined,
  "file-alt": FileTextOutlined,
  "file-code": FileTextOutlined,
  "file-image": FileImageOutlined,
  "file-pdf": FilePdfOutlined,
  "folder-open": FolderOpenOutlined,
  files: CopyOutlined,
  folder: FolderOutlined,
  font: { IconFont: "font" },
  forward: ForwardOutlined,
  FundProjectionScreenOutlined,
  gears: ControlOutlined,
  "graduation-cap": { IconFont: "graduation" },
  header: { IconFont: "header" },
  history: HistoryOutlined,
  "horizontal-split": { IconFont: "horizontal-split" },
  image: { IconFont: "image" },
  "info-circle": InfoCircleOutlined,
  info: InfoOutlined,
  italic: ItalicOutlined,
  key: KeyOutlined,
  keyboard: { IconFont: "keyboard" },
  leave_conference: { IconFont: "leave_conference" },
  "life-saver": { IconFont: "life-ring" },
  link: LinkOutlined,
  list: UnorderedListOutlined,
  "list-ol": OrderedListOutlined,
  lock: LockFilled,
  magic: { IconFont: "magic" },
  mask: { IconFont: "cpu" },
  medkit: MedicineBoxOutlined,
  microchip: { IconFont: "cpu" },
  "minus-circle": MinusCircleOutlined,
  "minus-square": MinusSquareOutlined,
  pause: PauseCircleOutlined,
  paste: { IconFont: "paste" },
  pencil: EditOutlined,
  "pencil-alt": EditOutlined,
  play: PlayCircleOutlined,
  plus: PlusOutlined,
  "plus-circle": PlusCircleFilled,
  "plus-circle-o": PlusCircleOutlined,
  "plus-square": PlusSquareFilled,
  "plus-square-o": PlusSquareOutlined,
  PoweroffOutlined,
  print: PrinterOutlined,
  "question-circle": QuestionCircleOutlined,
  "quote-left": { IconFont: "quote-left" },
  redo: RedoOutlined,
  refresh: RedoOutlined,
  repeat: RedoOutlined,
  replace: { IconFont: "find-replace" },
  rocket: RocketOutlined,
  save: SaveOutlined,
  scissors: ScissorOutlined,
  search: SearchOutlined,
  "search-minus": MinusOutlined, // we actually use this for zoom
  "search-plus": PlusOutlined,
  "sign-out-alt": LogoutOutlined,
  sitemap: ClusterOutlined,
  "share-square": ShareAltOutlined,
  square: BorderOutlined,
  "square-o": BorderOutlined,
  "step-forward": StepForwardOutlined,
  stop: StopOutlined,
  stopwatch: FieldTimeOutlined,
  strikethrough: StrikethroughOutlined,
  subscript: { IconFont: "subscript" },
  superscript: { IconFont: "superscript" },
  sync: { IconFont: "sync" },
  table: TableOutlined,
  tasks: { IconFont: "tasks" },
  terminal: CodeOutlined,
  "text-height": LineHeightOutlined,
  times: CloseOutlined,
  "times-circle": CloseCircleOutlined,
  trash: DeleteOutlined,
  underline: UnderlineOutlined,
  undo: UndoOutlined,
  upload: UploadOutlined,
  user: UserOutlined,
  "user-plus": UsergroupAddOutlined,
  "user-times": UserDeleteOutlined,
  users: UsergroupAddOutlined,
  "vertical-split": { IconFont: "vertical-split" },
  wifi: WifiOutlined,
  "window-restore": DesktopOutlined, //  we only use for x11 and this has big X.
  wrench: { IconFont: "tasks" },
};

// TODO:  dashboard arrow-circle-up key redo shopping-cart clipboard warning list-ul life-ring bars database clipboard-check check-square user-times gears hdd list-alt table file-text-o flash external-link header envelope share-square laptop-code cogs share-alt video-camera chevron-circle-right money google gear tachometer-alt credit-card fab fa-cc-visa external-link-alt line-chart paper-plane-o fa-stopwatch at bell

interface Props {
  name?: string;
  unicode?: number; // (optional) set a hex 16 bit charcode to render a unicode char, e.g. 0x2620
  className?: string;
  size?: "lg" | "2x" | "3x" | "4x" | "5x";
  rotate?: "45" | "90" | "135" | "180" | "225" | "270" | "315";
  flip?: "horizontal" | "vertical";
  spin?: boolean;
  pulse?: boolean;
  stack?: "1x" | "2x";
  inverse?: boolean;
  Component?: JSX.Element | JSX.Element[];
  style?: CSS;
  onClick?: (event?: React.MouseEvent) => void; // https://fettblog.eu/typescript-react/events/
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}

// Converted from https://github.com/andreypopp/react-fa
export const Icon: React.FC<Props> = (props: Props) => {
  if (props.name != null) {
    let name = props.name;
    if (name.startsWith("fa-")) {
      name = name.slice(3);
    }
    let C;
    if (name.startsWith("cc-icon-")) {
      C = { IconFont: name.slice("cc-icon-".length) };
    } else {
      C = FA2ANTD[name];
      if (C == null && name.endsWith("-o")) {
        // try without -o
        C = FA2ANTD[name.slice(0, name.length - 2)];
      }
    }
    if (C != null) {
      if (typeof C.IconFont == "string") {
        // @ts-ignore
        return <IconFont type={"icon-" + C.IconFont} {...props} />;
      }
      return <C {...props} />;
    }
  }

  const {
    name: name_prop,
    onClick: onClick_prop,
    size,
    unicode,
    rotate,
    flip,
    spin,
    pulse,
    stack,
    inverse,
    className,
    onMouseOver,
    onMouseOut,
    style,
  } = props;
  let name = name_prop ?? "square-o";
  const onClick = onClick_prop ?? undefined;

  function render_unicode() {
    const style: CSS = {
      fontSize: "120%",
      fontWeight: "bold",
      lineHeight: "1",
      verticalAlign: "middle",
    };
    // we know unicode is not undefined, see render_icon
    return <span style={style}>{String.fromCharCode(unicode!)}</span>;
  }

  function render_icon() {
    if (unicode != null) {
      return render_unicode();
    }

    let classNames;

    let i = name.indexOf("cc-icon");

    if (i !== -1 && spin) {
      // Temporary workaround because cc-icon-cocalc-ring is not a font awesome JS+SVG icon, so
      // spin, etc., doesn't work on it.  There is a discussion at
      // https://stackoverflow.com/questions/19364726/issue-making-bootstrap3-icon-spin
      // about spinning icons, but it's pretty subtle and hard to get right, so I hope
      // we don't have to implement our own.  Also see
      // "Icon animation wobble foibles" at https://fontawesome.com/how-to-use/web-fonts-with-css
      // where they say "witch to the SVG with JavaScript version, it's working a lot better for this".
      name = "fa-circle-notch";
      i = -1;
    }

    if (i !== -1) {
      // A custom Cocalc font icon.  Don't even bother with font awesome at all!
      classNames = name.slice(i);
    } else {
      const left = name.slice(0, 3);
      if (left === "fas" || left === "fab" || left === "far") {
        // version 5 names are different!  https://fontawesome.com/how-to-use/use-with-node-js
        // You give something like: 'fas fa-blah'.
        classNames = name;
      } else {
        // temporary until file_associations can be changed
        if (name.slice(0, 3) === "cc-" && name !== "cc-stripe") {
          classNames = `fab ${name}`;
          // the cocalc icon font can't do any extra tricks
        } else {
          // temporary until file_associations can be changed
          if (name.slice(0, 3) === "fa-") {
            classNames = `fa ${name}`;
          } else {
            classNames = `fa fa-${name}`;
          }
        }
      }
      // These only make sense for font awesome.
      if (size) {
        classNames += ` fa-${size}`;
      }
      if (rotate) {
        classNames += ` fa-rotate-${rotate}`;
      }
      if (flip) {
        classNames += ` fa-flip-${flip}`;
      }
      if (spin) {
        classNames += " fa-spin";
      }
      if (pulse) {
        classNames += " fa-pulse";
      }
      if (stack) {
        classNames += ` fa-stack-${stack}`;
      }
      if (inverse) {
        classNames += " fa-inverse";
      }
    }

    if (className) {
      classNames += ` ${className}`;
    }
    return <i className={classNames} />;
  }

  // Wrap in a span for **two** reasons.
  // 1. A reasonable one -- have to wrap the i, since when rendered using js and svg by new fontawesome 5,
  // the click handlers of the <i> object are just ignored, since it is removed from the DOM!
  // This is important the close button on tabs.
  // 2. An evil one -- FontAwesome's javascript mutates the DOM.  Thus we put a random key in so,
  // that React just replaces the whole part of the DOM where the SVG version of the icon is,
  // and doesn't get tripped up by this.   A good example where this is used is when *running* Jupyter
  // notebooks.
  return (
    <span
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      key={Math.random()}
      style={style}
    >
      {render_icon()}
    </span>
  );
};
