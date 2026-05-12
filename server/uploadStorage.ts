import { Client } from "@replit/object-storage";
import path from "path";
import type { Express, Request, Response } from "express";

const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
export const objClient = new Client(bucketId ? { bucketId } : undefined);

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function saveBufferToBucket(
  buf: Buffer,
  prefix: string,
  originalname: string,
): Promise<string> {
  const safePrefix = prefix.replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "") || "misc";
  const ext = (path.extname(originalname || "").toLowerCase() || ".jpg").slice(0, 8);
  const key = `${safePrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}${/^[.][a-z0-9]+$/i.test(ext) ? ext : ".jpg"}`;
  const r = await objClient.uploadFromBytes(key, buf);
  if (!r.ok) throw new Error(`Object storage upload failed: ${(r.error as any)?.message ?? r.error}`);
  return `/files/${key}`;
}

export function registerFileServeRoute(app: Express) {
  app.get(/^\/files\/(.+)$/, async (req: Request, res: Response) => {
    const key = (req.params as any)[0] as string;
    if (!key || key.includes("..")) return res.sendStatus(400);
    const r = await objClient.downloadAsBytes(key);
    if (!r.ok) return res.sendStatus(404);
    const ext = path.extname(key).toLowerCase();
    res.setHeader("Content-Type", MIME_BY_EXT[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.end(r.value[0]);
  });
}
