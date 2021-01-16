/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { CSS, React } from "../../../app-framework";
import { RenderElementProps, RenderLeafProps } from "slate-react";
import { startswith } from "smc-util/misc";
import { getRender } from "./register";

export const Element: React.FC<RenderElementProps> = ({
  attributes,
  children,
  element,
}) => {
  if (element.tag) {
    // We use some extra classes for certain tags so things just look better.
    let className: undefined | string = undefined;
    if (element.tag == "table") {
      className = "table";
    }
    let style = {} as CSS;
    if ((element.tag == "ol" || element.tag == "ul") && !element.tight) {
      // There is a shortcoming in how markdown-it parses nested
      // non-tight lists (at least with the CSS in cocalc), and this
      // is a workaround.  If it is not tight, add space below.
      style.marginBottom = "1em";
    }
    return React.createElement(
      element.tag as string,
      {
        ...attributes,
        ...(element.attrs as object),
        ...{ className },
        ...{ style },
      },
      children
    );
  }

  const C = getRender(element.type as string);
  if (C != null) {
    return React.createElement(C, {
      attributes,
      children,
      element,
    });
  }

  console.log("TODO: using generic default rendering for ", element);
  if (element.tight) {
    return (
      <span {...attributes} {...element.attrs}>
        {children}
      </span>
    );
  }
  return (
    <p {...attributes} {...element.attrs}>
      {children}
    </p>
  );
};

// Temporary to match markdown-it demo, so at least it is usable.
const CODE_STYLE = {
  padding: "2px 4px",
  fontSize: "90%",
  color: "#c7254e",
  backgroundColor: "#f9f2f4",
  borderRadius: "4px",
} as CSS;

export const Leaf: React.FC<RenderLeafProps> = ({
  attributes,
  children,
  leaf,
}) => {
  //console.log("Leaf ", { children });
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }
  if (leaf.italic) {
    children = <em>{children}</em>;
  }
  if (leaf.strikethrough) {
    children = <s>{children}</s>;
  }
  if (leaf.underline) {
    children = <u>{children}</u>;
  }
  if (leaf.sup) {
    children = <sup>{children}</sup>;
  }
  if (leaf.sub) {
    children = <sub>{children}</sub>;
  }
  if (leaf.code) {
    children = <code style={CODE_STYLE}>{children}</code>;
  }
  // check for colors, fonts, etc.
  for (const mark in leaf) {
    if (!leaf[mark]) continue; // only if it is true
    if (startswith(mark, "color:")) {
      children = <span style={{ color: mark.split(":")[1] }}>{children}</span>;
    }
    if (startswith(mark, "font-family:")) {
      children = (
        <span style={{ fontFamily: mark.split(":")[1] }}>{children}</span>
      );
    }
    if (startswith(mark, "font-size:")) {
      children = (
        <span style={{ fontSize: mark.split(":")[1] }}>{children}</span>
      );
    }
  }

  return <span {...attributes}>{children}</span>;
};
