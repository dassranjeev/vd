import { issueSignedToken } from "@vercel/blob";
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Issues a short-lived token so the browser can upload straight to Vercel Blob.
 *
 * This used to accept the file itself and forward it with `put()`. That works
 * locally but always fails on Vercel for anything sizeable: serverless
 * functions cap request bodies at 4.5 MB, so a hero reel or a large still is
 * rejected with a 413 before the handler even runs.
 *
 * With a client upload the bytes never touch the function — only the token
 * negotiation does — so the practical size limit becomes Blob's, not the
 * platform's.
 */

const MAX_BYTES = 500 * 1024 * 1024;

/**
 * Anything a browser will realistically hand us.
 *
 * HEIC and HEIF matter in particular: photos straight off an iPhone arrive
 * as those, and rejecting them looks to an editor like the uploader is simply
 * broken rather than being picky about formats.
 *
 * An empty type is not a problem — the client SDK infers one from the file
 * extension when the browser reports none.
 */
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export async function POST(request: Request) {
  // Authorise before revealing anything about how this deployment is set up.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "No Blob store connected. Create one in the Vercel dashboard (Storage > Blob), or add the asset by URL instead.",
      },
      { status: 501 },
    );
  }

  let body: HandleUploadBody | HandleUploadPresignedBody;
  try {
    body = (await request.json()) as HandleUploadBody | HandleUploadPresignedBody;
  } catch {
    return NextResponse.json({ error: "Malformed upload request." }, { status: 400 });
  }

  /**
   * Private stores upload through a presigned URL, not a client token.
   *
   * The SDK ships two server helpers and they are not interchangeable:
   * `handleUpload` answers `blob.generate-client-token`, which is how a public
   * store works, and rejects anything else as an invalid event type. A private
   * store's client asks for `blob.generate-presigned-url` instead, and when
   * that is refused the browser falls back to calling the Blob control API on
   * vercel.com directly — which fails CORS and looks, from the console, like a
   * problem with the store rather than with this route.
   */
  if (isPresignedRequest(body)) {
    try {
      const result = await handleUploadPresigned({
        body,
        request,
        // Demanded up front even though only the `blob.upload-completed`
        // branch ever reads it. We deliberately register no completion
        // callback — the client writes the media row itself once upload()
        // resolves — so that branch is unreachable here and the key is never
        // used to verify anything. Vercel injects the real value when a Blob
        // store is connected to the project; the placeholder only keeps local
        // development working without it.
        webhookPublicKey:
          process.env.BLOB_WEBHOOK_PUBLIC_KEY || "unused-no-upload-callback-registered",
        getSignedToken: async (pathname) => {
          // The gate that keeps uploads to signed-in editors; throwing refuses.
          const editor = await getSession();
          if (!editor) throw new Error("Not signed in.");

          const token = await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_BYTES,
          });

          return { token, urlOptions: { addRandomSuffix: true } };
        },
        // No completion callback: it would have to be verified against a
        // webhook key and can never reach localhost. The client records the
        // media row itself once upload() resolves.
      });

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Upload failed." },
        { status: 400 },
      );
    }
  }

  try {
    const result = await handleUpload({
      body: body as HandleUploadBody,
      request,
      // Runs before a token is minted. Throwing here refuses the upload, so this
      // is the gate that keeps uploads to signed-in editors.
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (!session) throw new Error("Not signed in.");

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.sub }),
        };
      },
      // Vercel calls this from its own network, so it never fires against
      // localhost. The media row is recorded by the client instead, once the
      // upload resolves — see recordUploadedMediaAction.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}

/** Whether the client is asking for a presigned URL rather than a client token. */
function isPresignedRequest(
  body: HandleUploadBody | HandleUploadPresignedBody,
): body is HandleUploadPresignedBody {
  return (body as { type?: string }).type === "blob.generate-presigned-url";
}
