import { env } from "../config/env.js";

const REQUEST_TIMEOUT_MS = 5_000;
const LIST_PAGE_SIZE = 100;

export type MediaMtxPathConfigType = {
  // Where MediaMTX pulls video from, e.g. rtsp://user:pass@192.168.1.64/stream
  source: string;
  // true = connect to the camera only while someone is watching
  sourceOnDemand: boolean;
  rtspTransport: "tcp" | "udp" | "automatic";
};

export type MediaMtxPathStatusType = {
  // true = video is flowing from the source right now
  ready: boolean;
  // When the video started flowing (ISO string), null while not ready
  readySince: string | null;
  readerCount: number;
  // Codecs of the incoming video, e.g. ["H264"]
  tracks: Array<string>;
};

export class MediaMtxError extends Error {
  public readonly status: number | null;

  constructor(message: string, status: number | null, options?: ErrorOptions) {
    super(message, options);
    this.name = "MediaMtxError";
    this.status = status;
  }
}

const authorizationHeader = `Basic ${Buffer.from(
  `${env.surveillance.apiUser}:${env.surveillance.apiPassword}`,
).toString("base64")}`;

async function request(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<Response> {
  const url = new URL(`/v3${path}`, env.surveillance.apiUrl);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: authorizationHeader,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Never let a hung media server hang an API request
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new MediaMtxError(
      `MediaMTX is unreachable (${method} ${url.pathname})`,
      null,
      { cause },
    );
  }

  return response;
}

async function toMediaMtxError(
  response: Response,
  action: string,
): Promise<MediaMtxError> {
  let detail = response.statusText;
  try {
    const json = (await response.json()) as { error?: string };
    if (json.error) detail = json.error;
  } catch {
    // Body was not JSON; keep the status text
  }
  return new MediaMtxError(
    `MediaMTX ${action} failed: ${response.status} ${detail}`,
    response.status,
  );
}

// Create the path, or overwrite it if it exists. Idempotent: safe to call again and again.
export async function mediamtxUpsertPath(
  name: string,
  config: MediaMtxPathConfigType,
): Promise<void> {
  const response = await request(
    "POST",
    `/config/paths/replace/${encodeURIComponent(name)}`,
    config,
  );
  if (!response.ok) throw await toMediaMtxError(response, `upsert "${name}"`);
}

// Remove the path. A path that is already gone counts as success (idempotent).
export async function mediamtxDeletePath(name: string): Promise<void> {
  const response = await request(
    "DELETE",
    `/config/paths/delete/${encodeURIComponent(name)}`,
  );
  if (response.status === 404) return;
  if (!response.ok) throw await toMediaMtxError(response, `delete "${name}"`);
}
// Live state of a path. null = no such path in MediaMTX right now.
export async function mediamtxGetPathStatus(
  name: string,
): Promise<MediaMtxPathStatusType | null> {
  const response = await request(
    "GET",
    `/paths/get/${encodeURIComponent(name)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) throw await toMediaMtxError(response, `status "${name}"`);

  const json = (await response.json()) as {
    ready: boolean;
    readyTime: string | null;
    readers: Array<unknown>;
    tracks: Array<string>;
  };
  return {
    ready: json.ready,
    readySince: json.readyTime,
    readerCount: json.readers.length,
    tracks: json.tracks,
  };
}

// Names of every configured path, following MediaMTX's pagination (page is 0-based)
export async function mediamtxListPathNames(): Promise<Array<string>> {
  const names: Array<string> = [];
  let page = 0;
  let pageCount = 1;

  while (page < pageCount) {
    const response = await request(
      "GET",
      `/config/paths/list?itemsPerPage=${LIST_PAGE_SIZE}&page=${page}`,
    );
    if (!response.ok) throw await toMediaMtxError(response, "list paths");

    const json = (await response.json()) as {
      pageCount: number;
      items: Array<{ name: string }>;
    };
    names.push(...json.items.map((item) => item.name));
    pageCount = json.pageCount;
    page += 1;
  }

  return names;
}
