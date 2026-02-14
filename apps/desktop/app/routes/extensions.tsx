import { useLoaderData } from "react-router";

const API_BASE = "http://localhost:4096/api";

type Extension = {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  tags?: string[];
  scope: string;
  docsUrl?: string | null;
  supportsPreview?: boolean;
};

export async function clientLoader() {
  try {
    const res = await fetch(`${API_BASE}/extensions`);
    if (!res.ok) {
      return { extensions: [], error: `HTTP ${res.status}` };
    }
    const extensions: Extension[] = await res.json();
    return { extensions, error: null };
  } catch (err) {
    return {
      extensions: [],
      error: err instanceof Error ? err.message : "Failed to fetch extensions",
    };
  }
}

export default function Extensions() {
  const { extensions, error } = useLoaderData<typeof clientLoader>();

  if (error) {
    return (
      <div>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "bold" }}>
          Extensions
        </h1>
        <p
          style={{
            marginTop: "1rem",
            color: "#dc2626",
            padding: "1rem",
            backgroundColor: "#fef2f2",
            borderRadius: "0.5rem",
          }}
        >
          {error}
        </p>
        <p
          style={{
            marginTop: "0.5rem",
            color: "#6b7280",
            fontSize: "0.875rem",
          }}
        >
          Make sure the API server sidecar is running.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.875rem", fontWeight: "bold" }}>Extensions</h1>
      <p
        style={{
          marginTop: "0.5rem",
          color: "#6b7280",
          marginBottom: "1.5rem",
        }}
      >
        {extensions.length} extension{extensions.length !== 1 ? "s" : ""}{" "}
        loaded
      </p>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {extensions.map((ext) => (
          <li
            key={ext.id}
            data-test="extension-item"
            style={{
              padding: "1rem 1.25rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              backgroundColor: "#fff",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
            >
              {ext.icon && (
                <img
                  src={
                    ext.icon.startsWith("/")
                      ? `http://localhost:4096${ext.icon}`
                      : ext.icon
                  }
                  alt=""
                  width={40}
                  height={40}
                  style={{ borderRadius: "0.375rem", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  {ext.name}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginTop: "0.25rem",
                  }}
                >
                  {ext.id}
                </div>
                {ext.description && (
                  <p
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.875rem",
                      color: "#4b5563",
                      lineHeight: 1.4,
                    }}
                  >
                    {ext.description}
                  </p>
                )}
                <div
                  style={{
                    marginTop: "0.5rem",
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.125rem 0.5rem",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "9999px",
                      color: "#374151",
                    }}
                  >
                    {ext.scope}
                  </span>
                  {ext.tags?.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.125rem 0.5rem",
                        backgroundColor: "#f3f4f6",
                        borderRadius: "9999px",
                        color: "#6b7280",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
