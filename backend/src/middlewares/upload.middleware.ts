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

const isLocal = process.env.NODE_ENV === "local";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "";

// Only create Supabase client if not in local mode
const supabase = !isLocal && SUPABASE_URL && SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ---------- PDF VALIDATION ----------
const allowedPdfMime = ["application/pdf"];
const MAX_PDF_SIZE = parseInt(
  process.env.MAX_PDF_SIZE_BYTES ?? String(10 * 1024 * 1024),
  10
); // default 10MB

const pdfFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  if (allowedPdfMime.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only PDF files are allowed"), false);
};

// ---------- ENSURE UPLOAD DIRECTORY ----------
if (isLocal) {
  const tempDir = "uploads/temp/";
  const pdfDir = "uploads/pdfs/";
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
}

// ---------- PDF UPLOAD CONFIG ----------
const localPdfStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Check if user is logged in (set by optionalAuth middleware)
    const isLoggedIn = !!(req as any).user?.id;
    
    // Logged-in users: upload directly to permanent directory
    // Guest users: upload to temp directory (requires verification)
    const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
    cb(null, directory);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const localUploadPdf = multer({
  storage: localPdfStorage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: MAX_PDF_SIZE },
});

const supabaseMemoryPdf = multer({
  storage: multer.memoryStorage(),
  fileFilter: pdfFileFilter,
  limits: { fileSize: MAX_PDF_SIZE },
});

// ---------- SUPABASE UPLOAD HELPER ----------
async function uploadBufferToSupabase(
  buffer: Buffer,
  originalname: string,
  mimetype: string
): Promise<{ url: string; storageKey: string }> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }
  
  const storageKey = `articles/${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalname)}`;
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

// ---------- SINGLE PDF UPLOAD HANDLER ----------
export const uploadPdf = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadPdf.single("pdf")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file)
        return res.status(400).json({ error: "PDF file required" });
      
      // Determine the path based on user authentication status
      const isLoggedIn = !!(req as any).user?.id;
      const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
      const url = `/${directory}${req.file.filename}`;
      
      req.fileUrl = url;
      req.fileMeta = { url, storageKey: req.file.filename };
      next();
    });
  } else {
    supabaseMemoryPdf.single("pdf")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "PDF file required" });
      uploadBufferToSupabase(file.buffer, file.originalname, file.mimetype)
        .then(({ url, storageKey }) => {
          req.fileUrl = url;
          req.fileMeta = { url, storageKey };
          next();
        })
        .catch((e) => {
          console.error("Supabase PDF upload error:", e);
          res.status(500).json({ error: "PDF upload failed" });
        });
    });
  }
};

// ---------- MULTIPLE PDF UPLOAD HANDLER ----------
export const uploadMultiplePdfs = (fieldName = "pdfs", maxCount = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isLocal) {
      localUploadPdf.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (!files.length)
          return res.status(400).json({ error: "PDF files required" });
        req.fileUrls = files.map((f) => ({
          url: `/uploads/pdfs/${f.filename}`,
          storageKey: f.filename,
        }));
        next();
      });
    } else {
      supabaseMemoryPdf.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (!files.length)
          return res.status(400).json({ error: "PDF files required" });
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
          console.error("Supabase PDF upload error:", e);
          return res.status(500).json({ error: "PDF upload failed" });
        }
      });
    }
  };
};
