import { createHash, createHmac } from "node:crypto";
import type { PipelineContext } from "@twikoojs/common";

/**
 * 提取评论 HTML 中属于本站 R2 存储桶的所有图片对象 key
 */
export function extractR2ImageKeys(
  commentHtml: string,
  cdnUrl?: string,
  bucket?: string,
  endpoint?: string,
): string[] {
  if (!commentHtml) return [];
  const keys = new Set<string>();
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

  const prefixes: string[] = [];
  if (cdnUrl) {
    prefixes.push(cdnUrl.replace(/\/$/, ""));
  }
  if (endpoint && bucket) {
    prefixes.push(`${endpoint.replace(/\/$/, "")}/${bucket}`);
  }

  if (prefixes.length === 0) return [];

  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(commentHtml)) !== null) {
    const src = match[1];
    for (const prefix of prefixes) {
      if (src.startsWith(prefix)) {
        const key = src.substring(prefix.length).replace(/^\//, "");
        if (key) keys.add(key);
        break;
      }
    }
  }
  return Array.from(keys);
}

/**
 * 通过 S3 API 协议删除 R2 存储桶中的指定对象
 */
export async function deleteS3Object(options: {
  bucket: string;
  key: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
}): Promise<boolean> {
  try {
    const { bucket, key, accessKeyId, secretAccessKey } = options;
    const region = options.region || "auto";
    const endpointBase = options.endpoint.replace(/\/$/, "");
    const endpoint = `${endpointBase}/${bucket}/${key}`;
    const endpointUrl = new URL(endpoint);
    const host = endpointUrl.host;
    const pathname = endpointUrl.pathname;

    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const amzDate = now.toISOString().replace(/[:-]/g, "").slice(0, 15) + "Z";
    const payloadHash = createHash("sha256").update("").digest("hex");

    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const canonicalRequest = ["DELETE", pathname, "", canonicalHeaders, signedHeaders, payloadHash].join(
      "\n",
    );
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const hmac = (k: Buffer | string, data: string): Buffer =>
      createHmac("sha256", k).update(data).digest();
    const signingKey = hmac(
      hmac(
        hmac(hmac(Buffer.from(`AWS4${secretAccessKey}`), dateStamp), region),
        "s3",
      ),
      "aws4_request",
    );
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Host: host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorization,
      },
    });
    return res.status === 204 || res.status === 200;
  } catch (err) {
    console.warn(`[R2 Cleanup] 删除对象 ${options.key} 失败:`, err);
    return false;
  }
}

/**
 * 清理指定评论 HTML 中引用的 R2 图片
 */
export async function cleanupCommentR2Images(
  commentHtml: string,
  config: Record<string, unknown>,
): Promise<void> {
  const imageService = String(config.IMAGE_CDN || "").toLowerCase();
  if (imageService !== "s3") return;

  const bucket = config.S3_BUCKET ? String(config.S3_BUCKET) : "";
  const accessKeyId = config.S3_ACCESS_KEY_ID ? String(config.S3_ACCESS_KEY_ID) : "";
  const secretAccessKey = config.S3_SECRET_ACCESS_KEY ? String(config.S3_SECRET_ACCESS_KEY) : "";
  const endpoint = config.S3_ENDPOINT ? String(config.S3_ENDPOINT) : "";
  const cdnUrl = config.S3_CDN_URL ? String(config.S3_CDN_URL) : "";
  const region = config.S3_REGION ? String(config.S3_REGION) : "auto";

  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) return;

  const keys = extractR2ImageKeys(commentHtml, cdnUrl, bucket, endpoint);
  if (keys.length === 0) return;

  await Promise.all(
    keys.map((key) =>
      deleteS3Object({
        bucket,
        key,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint,
      }),
    ),
  );
}

/**
 * 拦截删除评论，自动连带删除关联的 R2 图片
 */
export async function handleCommentDeleteWithCleanup(
  ctx: PipelineContext,
  originalDeleteHandler: (ctx: PipelineContext) => Promise<unknown>,
): Promise<unknown> {
  const event = ctx.request.body as { id?: string };
  if (event?.id) {
    try {
      const commentDoc = await ctx.adapters.database.getComment(event.id);
      if (commentDoc && commentDoc.comment) {
        await cleanupCommentR2Images(commentDoc.comment, ctx.config);
      }
    } catch (e) {
      console.warn("[R2 Cleanup] 获取待删除评论图片失败:", e);
    }
  }
  return await originalDeleteHandler(ctx);
}
