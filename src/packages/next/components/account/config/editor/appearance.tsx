import { Space } from "antd";
import Loading from "components/share/loading";
import register from "../register";
import useEditTable from "lib/hooks/edit-table";
import { EDITOR_COLOR_SCHEMES } from "@cocalc/util/db-schema/accounts";
import CodeMirror from "components/share/codemirror";

interface Data {
  font_size: number;
  editor_settings: {
    theme: keyof typeof EDITOR_COLOR_SCHEMES;
  };
}

const desc = {
  font_size: `
Newly opened files will open with this font size in pixels by default. You can
change the font size for a particular file (or editor frame) at any time,
and the setting is saved in your browser.
`,
  theme: `TODO -- theme`,
};

const EXAMPLE = `def is_prime_lucas_lehmer(p):
    """
    Test primality of Mersenne number 2**p - 1.
    >>> is_prime_lucas_lehmer(107)
    True
    """
    k = 2**p - 1; s = 4
    for i in range(3, p+1):
        s = (s*s - 2) % k
    return s == 0`;

register({
  path: "editor/appearance",
  title: "Appearance",
  icon: "font",
  desc: "Editor default font size, color theme, etc.",
  search: desc.font_size,
  Component: () => {
    const { edited, original, Save, EditNumber, EditSelect } =
      useEditTable<Data>({
        accounts: { font_size: null, editor_settings: null },
      });

    if (original == null || edited == null) {
      return <Loading />;
    }

    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Save />
        <EditNumber
          path="font_size"
          icon="text-height"
          desc={desc.font_size}
          min={5}
          max={32}
          units="px"
        />
        <EditSelect
          path="editor_settings.theme"
          icon="colors"
          desc={desc.theme}
          options={EDITOR_COLOR_SCHEMES}
        />
        <h3 style={{ marginTop: "10px" }}>Preview</h3>
        <CodeMirror
          content={EXAMPLE}
          filename="a.py"
          options={{ theme: edited.editor_settings.theme }}
        />
      </Space>
    );
  },
});
