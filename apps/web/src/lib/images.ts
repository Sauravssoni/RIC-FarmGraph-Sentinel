"use client";
/**
 * Real image-evidence pipeline (Phase B1).
 * Camera/upload → decode → downscale → EXIF-stripping re-encode → SHA-256
 * content hash → duplicate detection → IndexedDB blob storage. Never stores
 * just a filename. Deletion is supported; retention is explicit.
 */
import Dexie, { type EntityTable } from "dexie";

export const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB input ceiling
export const MAX_EDGE = 1024;                    // stored longest edge
const JPEG_QUALITY = 0.85;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface StoredImageMeta {
  id: string;              // img_<hash12>
  hash: string;            // full SHA-256 of stored bytes
  width: number;
  height: number;
  storedBytes: number;
  originalBytes: number;
  mime: "image/jpeg";
  capturedAt: string;
  duplicateOf: string | null; // set when the same content hash already existed
}

export interface ImageRow extends StoredImageMeta { blob: Blob }

class EvidenceDB extends Dexie {
  images!: EntityTable<ImageRow, "id">;
  constructor() {
    super("fgr-evidence");
    this.version(1).stores({ images: "id, hash" });
  }
}

let db: EvidenceDB | undefined;
export function evidenceDB(): EvidenceDB {
  if (!db) db = new EvidenceDB();
  return db;
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class ImageRejected extends Error {
  constructor(public reason: "TOO_LARGE" | "UNSUPPORTED_TYPE" | "DECODE_FAILED", detail: string) {
    super(detail);
    this.name = "ImageRejected";
  }
}

/**
 * Process a captured/uploaded file into stored evidence.
 * Returns metadata; if the same content already exists, returns the existing
 * record with duplicateOf set (no second copy stored).
 */
export async function processImageFile(file: File): Promise<StoredImageMeta> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageRejected("TOO_LARGE", `File is ${(file.size / 1048576).toFixed(1)} MB — maximum is 15 MB`);
  }
  if (!ACCEPTED.has(file.type)) {
    throw new ImageRejected("UNSUPPORTED_TYPE", `Format "${file.type || "unknown"}" is unsupported — use JPEG, PNG or WebP (HEIC is not supported in this prototype)`);
  }

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new ImageRejected("DECODE_FAILED", "The file could not be decoded as an image");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageRejected("DECODE_FAILED", "Canvas unavailable");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  // Re-encode to JPEG — this strips EXIF/GPS metadata by construction.
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new ImageRejected("DECODE_FAILED", "Re-encode failed"))), "image/jpeg", JPEG_QUALITY),
  );
  const bytes = await blob.arrayBuffer();
  const hash = await sha256Hex(bytes);
  const id = `img_${hash.slice(0, 12)}`;

  const existing = await evidenceDB().images.where("hash").equals(hash).first();
  if (existing) {
    return { ...stripBlob(existing), duplicateOf: existing.id };
  }

  const row: ImageRow = {
    id, hash, width: w, height: h,
    storedBytes: bytes.byteLength, originalBytes: file.size,
    mime: "image/jpeg", capturedAt: new Date().toISOString(),
    duplicateOf: null, blob,
  };
  await evidenceDB().images.put(row);
  return stripBlob(row);
}

function stripBlob(row: ImageRow): StoredImageMeta {
  const { blob: _blob, ...meta } = row;
  return meta;
}

export async function getImageBlob(id: string): Promise<Blob | undefined> {
  return (await evidenceDB().images.get(id))?.blob;
}

const urlCache = new Map<string, string>();
export async function getImageURL(id: string): Promise<string | undefined> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const blob = await getImageBlob(id);
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

/** Pixel data for quality/inference — downscaled for speed. */
export async function getImageData(id: string, maxEdge = 512): Promise<ImageData | undefined> {
  const blob = await getImageBlob(id);
  if (!blob) return undefined;
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return ctx.getImageData(0, 0, w, h);
}

export async function deleteImage(id: string): Promise<void> {
  const url = urlCache.get(id);
  if (url) { URL.revokeObjectURL(url); urlCache.delete(id); }
  await evidenceDB().images.delete(id);
}

export async function imageCount(): Promise<number> {
  return evidenceDB().images.count();
}

/** Find duplicates of a stored image (same hash). */
export async function findDuplicate(hash: string): Promise<StoredImageMeta | undefined> {
  const row = await evidenceDB().images.where("hash").equals(hash).first();
  return row ? stripBlob(row) : undefined;
}
