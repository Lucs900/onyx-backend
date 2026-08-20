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

export async function readPrivateBytes(bytesRef: string) {
  const result = await get(bytesRef, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("Blob not found");
  }
  const chunks: Uint8Array[] = [];
  const reader = result.stream.getReader();
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
  return {
    bytes,
    contentType: result.blob.contentType || "application/octet-stream",
    pathname: result.blob.pathname || bytesRef,
  };
}

export async function putPrivateBytes(
  pathname: string,
  body: Buffer | Uint8Array | Blob,
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
