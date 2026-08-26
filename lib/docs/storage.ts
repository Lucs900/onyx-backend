import { get, put } from "@vercel/blob";

export const STORAGE_BLOCKED =
  "Vercel Blob is not provisioned. Add a private Blob store to the onyx-backend project and set BLOB_READ_WRITE_TOKEN for Preview. Do not use a public blob URL.";

export function clientUploadReady() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function serverBlobReady() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && (process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL)),
  );
}

export function storageStatus(): { storage: "ready" | "blocked"; reason?: string } {
  if (clientUploadReady()) return { storage: "ready" };
  if (serverBlobReady()) {
    return {
      storage: "blocked",
      reason:
        "OIDC can read/write on Vercel, but client upload needs BLOB_READ_WRITE_TOKEN. Files over 4.5 MB cannot use the function body.",
    };
  }
  return { storage: "blocked", reason: STORAGE_BLOCKED };
}

function blobRefsToTry(bytesRef: string): string[] {
  const trimmed = bytesRef.trim();
  if (!trimmed) return [];
  const refs = [trimmed];
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const path = new URL(trimmed).pathname.replace(/^\//, "");
      if (path && path !== trimmed) refs.push(path);
    }
  } catch {
    // pathname only
  }
  return refs;
}

async function bufferBlobStream(stream: ReadableStream<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function readPrivateBytes(bytesRef: string) {
  const refs = blobRefsToTry(bytesRef);
  let lastError: Error | null = null;
  for (const ref of refs) {
    try {
      const result = await get(ref, { access: "private", useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) {
        lastError = new Error("Blob not found");
        continue;
      }
      const bytes = await bufferBlobStream(result.stream);
      if (!bytes.length) {
        lastError = new Error("Blob empty");
        continue;
      }
      return {
        bytes,
        contentType: result.blob.contentType || "application/octet-stream",
        pathname: result.blob.pathname || ref,
        url: result.blob.url || (/^https?:\/\//i.test(ref) ? ref : undefined),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error("Blob not found");
}

export async function putPrivateBytes(
  pathname: string,
  body: Buffer | Blob,
  contentType: string,
) {
  if (!clientUploadReady() && !serverBlobReady()) {
    throw new Error(STORAGE_BLOCKED);
  }
  return put(pathname, body, {
    access: "private",
    addRandomSuffix: true,
    contentType,
  });
}
