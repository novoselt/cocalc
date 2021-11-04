/*
Show directory in a project based on cached information
in the database.
*/

import useDatabase from "lib/hooks/database";
import { Alert, Card, Table } from "antd";
import Loading from "components/share/loading";
import editURL from "lib/share/edit-url";
import { cmp } from "@cocalc/util/cmp";
import { filename_extension } from "@cocalc/util/misc";
import A from "components/misc/A";
import { join } from "path";
import { file_associations } from "@cocalc/frontend/file-associations";
import { Icon } from "@cocalc/frontend/components/icon";

interface Props {
  project_id: string;
  path: string;
  title?: string; // optional title of the project to show at top
}

export default function Listing({ project_id, path, title }: Props) {
  const { error, value, loading } = useDatabase({
    listings: { project_id, path, listing: null },
  });
  return (
    <div>
      {loading && <Loading />}
      {error && <Alert type="error" message={error} showIcon />}
      {!loading && !error && (
        <FileList
          listing={value.listings.listing}
          project_id={project_id}
          path={path}
          title={title}
        />
      )}
    </div>
  );
}

interface Entry {
  name: string;
  size: number;
  mtime: number;
  isdir?: boolean;
}

interface FileListProps {
  project_id: string;
  path: string;
  title?: string;
  listing: Entry[];
}

function FileList({ listing, project_id, path, title }: FileListProps) {
  const dataSource = listing
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => cmp(a.name.toLowerCase(), b.name.toLowerCase()));

  const columns = [
    {
      title: "Type",
      dataIndex: "isdir",
      key: "isdir",
      render: (isdir, entry) => (
        <>
          <Icon
            name={
              isdir
                ? "folder"
                : file_associations[filename_extension(entry.name)]?.icon ??
                  file_associations[""]?.icon
            }
          />
          {isdir && <Icon name="caret-right" />}
        </>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (_, entry) => (
        <A
          href={editURL({ project_id, path: join(path, entry.name) })}
          external
        >
          {entry.name}
        </A>
      ),
    },
    {
      title: "Date Last Edited",
      dataIndex: "mtime",
      key: "mtime",
      render: (mtime) => <>{new Date(mtime * 1000).toLocaleString()}</>,
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
    },
  ];

  return (
    <Card
      title={
        title ? (
          <div>
            <A
              external
              href={editURL({
                type: "collaborator",
                project_id,
              })}
            >
              {title}
            </A>
          </div>
        ) : (
          "Directory Listing"
        )
      }
    >
      <div style={{ fontSize: "11pt", marginBottom: "10px" }}>
        {path ? path : "Home Directory"}
      </div>
      <Table
        dataSource={dataSource}
        columns={columns}
        style={{ width: "100%" }}
        pagination={{ hideOnSinglePage: true }}
      />
    </Card>
  );
}
