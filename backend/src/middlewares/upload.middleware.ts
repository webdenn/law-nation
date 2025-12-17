// /src/middlewares/upload.middleware.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";

// Extend Request typing so req.fileUrl(s) are recognized
declare global {
  namespace Express {
    interface Request {
      fileUrl?: string;
      fileUrls?: Array<{ url: string; storageKey?: string }>;
      fileMeta?: { url: string; storageKey?: string } | null;
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const isLocal = process.env.NODE_ENV === "local";

// ---------- IMAGE VALIDATION ----------
const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = parseInt(
  process.env.MAX_IMAGE_SIZE_BYTES ?? String(5 * 1024 * 1024),
  10
); // default 5MB
const MAX_IMAGES = parseInt(process.env.MAX_IMAGES_UPLOAD ?? "10", 10);

const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  if (allowedMime.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, WEBP images allowed"), false);
};

// ---------- ENSURE UPLOAD DIRECTORY ----------
if (isLocal) {
  const dir = "uploads/";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ---------- MULTER CONFIG ----------
const localStorage = multer.diskStorage({
  destination: "uploads/",
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const localUploadSingle = multer({
  storage: localStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const localUploadMulti = multer({
  storage: localStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const supabaseMemorySingle = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const supabaseMemoryMulti = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ---------- SUPABASE UPLOAD HELPERS ----------
async function uploadBufferToSupabase(
  buffer: Buffer,
  originalname: string,
  mimetype: string
): Promise<{ url: string; storageKey: string }> {
  const storageKey = `inventory/${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalname)}`;
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(storageKey, buffer, {
      contentType: mimetype,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const { data: pub } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(storageKey);

  return { url: pub.publicUrl, storageKey };
}

// ---------- SINGLE IMAGE HANDLER (keeps existing API) ----------
export const upload = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadSingle.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file)
        return res.status(400).json({ error: "Image file required" });
      const url = `/uploads/${req.file.filename}`;
      req.fileUrl = url;
      req.fileMeta = { url, storageKey: req.file.filename }; // store filename as storageKey for deletion
      next();
    });
  } else {
    supabaseMemorySingle.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "Image file required" });
      uploadBufferToSupabase(file.buffer, file.originalname, file.mimetype)
        .then(({ url, storageKey }) => {
          req.fileUrl = url;
          req.fileMeta = { url, storageKey };
          next();
        })
        .catch((e) => {
          console.error("Supabase upload error:", e);
          res.status(500).json({ error: "Upload failed" });
        });
    });
  }
};

// ---------- MULTI IMAGE HANDLER ----------
export const uploadMulti = (fieldName = "images", maxCount = MAX_IMAGES) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isLocal) {
      localUploadMulti.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (!files.length)
          return res.status(400).json({ error: "Image files required" });
        req.fileUrls = files.map((f) => ({
          url: `/uploads/${f.filename}`,
          storageKey: f.filename,
        }));
        next();
      });
    } else {
      supabaseMemoryMulti.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (!files.length)
          return res.status(400).json({ error: "Image files required" });
        try {
          const out: Array<{ url: string; storageKey: string }> = [];
          for (const f of files) {
            const { url, storageKey } = await uploadBufferToSupabase(
              f.buffer,
              f.originalname,
              f.mimetype
            );
            out.push({ url, storageKey });
          }
          req.fileUrls = out;
          next();
        } catch (e) {
          console.error("Supabase upload error:", e);
          return res.status(500).json({ error: "Upload failed" });
        }
      });
    }
  };
};
