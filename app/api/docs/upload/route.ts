import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { ACCEPTED_MEDIA, MAX_DOC_BYTES } from "@/lib/docs/accept";
import { clientUploadReady, storageStatus, STORAGE_BLOCKED } from "@/lib/docs/storage";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(storageStatus());
}

export async function POST(request: Request) {
  if (!clientUploadReady()) {
    return NextResponse.json(
      { error: STORAGE_BLOCKED, code: "STORAGE_BLOCKED", ...storageStatus() },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("fox-intake/")) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: [...ACCEPTED_MEDIA],
          maximumSizeInBytes: MAX_DOC_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ kind: "fox-intake" }),
        };
      },
      onUploadCompleted: async () => {
        // Bytes stay private. Extract reads via server get().
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const blocked = /token|blob|store|oidc/i.test(message);
    return NextResponse.json(
      {
        error: blocked ? STORAGE_BLOCKED : message,
        code: blocked ? "STORAGE_BLOCKED" : "UPLOAD_FAILED",
        ...storageStatus(),
      },
      { status: blocked ? 503 : 400 },
    );
  }
}
