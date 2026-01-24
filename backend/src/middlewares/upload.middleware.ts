// /src/middlewares/upload.middleware.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";
import { addWatermarkToPdf } from "@/utils/pdf-watermark.utils.js";
import { addSimpleWatermarkToWord } from "@/utils/word-watermark.utils.js";

// Extend Request typing so req.fileUrl(s) are recognized
declare global {
  namespace Express {
    interface Request {
      fileUrl?: string;
      fileUrls?: Array<{ url: string; storageKey?: string }>;
      fileMeta?: { url: string; storageKey?: string } | null;
      isDocumentUpload?: boolean; // NEW: Flag for document processing
    }
  }
}

const isLocal = process.env.NODE_ENV === "local";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "";
const SUPABASE_IMAGES_BUCKET = process.env.SUPABASE_IMAGES_BUCKET || "Images";
const SUPABASE_THUMBNAILS_BUCKET = process.env.SUPABASE_THUMBNAILS_BUCKET || "Thumbnail";

// Only create Supabase client if not in local mode
const supabase = !isLocal && SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ---------- PDF ONLY VALIDATION (STRICT) ----------
const allowedDocumentMimes = [
  "application/pdf", // Only PDF for users
];
const MAX_DOCUMENT_SIZE = parseInt(
  process.env.MAX_DOCUMENT_SIZE_BYTES ?? String(10 * 1024 * 1024),
  10
); // default 10MB

// For user uploads (PDF ONLY) - STRICT: Users can only upload PDF
const documentFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const allowedMimes = [
    "application/pdf", // Only PDF allowed for users
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed for user uploads. Editors can upload DOCX files."), false);
  }
};

// For editor uploads (PDF only)
const pdfOnlyFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are allowed for editor uploads"), false);
};

// For editor uploads (DOCX only) - STRICT: Only modern .docx format
const docxOnlyFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const allowedMimes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/msword" // .doc
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only DOCX/DOC files are allowed for editor uploads."), false);
  }
};

// ---------- IMAGE VALIDATION ----------
const allowedImageMimes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif"
];

const MAX_IMAGE_SIZE = parseInt(
  process.env.MAX_IMAGE_SIZE_BYTES ?? String(5 * 1024 * 1024),
  10
); // default 5MB

const imageFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  if (allowedImageMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"), false);
  }
};

// ---------- ENSURE UPLOAD DIRECTORY ----------
if (isLocal) {
  const tempDir = "uploads/temp/";
  const pdfDir = "uploads/pdfs/";
  const wordDir = "uploads/words/";
  const imageDir = "uploads/images/";
  const tempImageDir = "uploads/temp/images/";
  const visualDiffDir = "uploads/visual-diffs/";

  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
  if (!fs.existsSync(wordDir)) fs.mkdirSync(wordDir, { recursive: true });
  if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
  if (!fs.existsSync(tempImageDir)) fs.mkdirSync(tempImageDir, { recursive: true });
  if (!fs.existsSync(visualDiffDir)) fs.mkdirSync(visualDiffDir, { recursive: true });
}

// ---------- DOCUMENT UPLOAD CONFIG (PDF or Word for users) ----------
const localDocumentStorage = multer.diskStorage({
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

const localUploadDocument = multer({
  storage: localDocumentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
});

const supabaseMemoryDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
});

// ---------- PDF ONLY UPLOAD CONFIG (for editors) ----------
const localPdfOnlyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Editors always upload to permanent directory
    cb(null, 'uploads/pdfs/');
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const localUploadPdfOnly = multer({
  storage: localPdfOnlyStorage,
  fileFilter: pdfOnlyFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
});

const supabaseMemoryPdfOnly = multer({
  storage: multer.memoryStorage(),
  fileFilter: pdfOnlyFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
});

// ---------- DOCX ONLY UPLOAD CONFIG (for editor edited documents) ----------
const localDocxOnlyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Editor DOCX uploads go to words directory
    cb(null, 'uploads/words/');
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const localUploadDocxOnly = multer({
  storage: localDocxOnlyStorage,
  fileFilter: docxOnlyFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
});

const supabaseMemoryDocxOnly = multer({
  storage: multer.memoryStorage(),
  fileFilter: docxOnlyFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
});

// ---------- IMAGE STORAGE CONFIG ----------
const localImageStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const isLoggedIn = !!(req as any).user?.id;
    const directory = isLoggedIn ? 'uploads/images/' : 'uploads/temp/images/';

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    cb(null, directory);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const localUploadImage = multer({
  storage: localImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
});

const supabaseMemoryImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
});

// ---------- WATERMARK HELPER ----------
/**
 * Add watermark to uploaded document (PDF or Word)
 * @param filePath - Local file path
 * @param mimetype - File MIME type
 * @returns Watermarked file buffer
 */
async function addUploadWatermark(
  filePath: string,
  mimetype: string
): Promise<Buffer> {
  console.log(`💧 [Upload Watermark] Adding watermark to: ${filePath}`);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const watermarkData = {
    userName: 'LAW NATION',
    downloadDate: new Date(),
    articleTitle: 'Uploaded Document',
    articleId: 'upload',
    frontendUrl,
  };

  try {
    if (mimetype === 'application/pdf') {
      console.log(`📄 [Upload Watermark] Processing PDF...`);
      return await addWatermarkToPdf(filePath, watermarkData);
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      console.log(`📝 [Upload Watermark] Processing Word document...`);
      return await addSimpleWatermarkToWord(filePath, watermarkData);
    } else {
      console.warn(`⚠️ [Upload Watermark] Unsupported file type: ${mimetype}`);
      // Return original file if not PDF/Word
      return fs.readFileSync(filePath);
    }
  } catch (error) {
    console.error(`❌ [Upload Watermark] Failed to add watermark:`, error);
    // Return original file on error
    return fs.readFileSync(filePath);
  }
}

// ---------- SUPABASE UPLOAD HELPER ----------
async function uploadBufferToSupabase(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
  fileType: 'pdf' | 'image' | 'thumbnail' = 'pdf'
): Promise<{ url: string; storageKey: string }> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  // Choose bucket based on file type
  let bucket: string;
  let folder: string;

  if (fileType === 'thumbnail') {
    bucket = SUPABASE_THUMBNAILS_BUCKET;
    folder = 'thumbnails';
  } else if (fileType === 'image') {
    bucket = SUPABASE_IMAGES_BUCKET;
    folder = 'images';
  } else {
    bucket = SUPABASE_BUCKET;
    folder = 'articles';
  }

  const storageKey = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalname)}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storageKey, buffer, {
      contentType: mimetype,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const { data: pub } = supabase.storage
    .from(bucket)
    .getPublicUrl(storageKey);

  return { url: pub.publicUrl, storageKey };
}

// ---------- DOCUMENT UPLOAD HANDLER (PDF or Word for users) ----------
export const uploadDocument = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadDocument.single("document")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file)
        return res.status(400).json({ error: "Document file (PDF or Word) required" });

      try {
        // Determine the path based on user authentication status
        const isLoggedIn = !!(req as any).user?.id;
        const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
        const tempFilePath = path.join(process.cwd(), directory, req.file.filename);

        console.log(`🔖 [Upload] Adding watermark to uploaded document...`);

        // Add watermark to the uploaded file
        const watermarkedBuffer = await addUploadWatermark(tempFilePath, req.file.mimetype);

        // Save watermarked file (overwrite original)
        fs.writeFileSync(tempFilePath, watermarkedBuffer);

        console.log(`✅ [Upload] Watermarked file saved: ${tempFilePath}`);

        const url = `/${directory}${req.file.filename}`;

        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      } catch (error) {
        console.error('❌ [Upload] Watermark failed:', error);
        // Continue with original file if watermark fails
        const isLoggedIn = !!(req as any).user?.id;
        const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
        const url = `/${directory}${req.file.filename}`;

        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      }
    });
  } else {
    supabaseMemoryDocument.single("document")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "Document file (PDF or Word) required" });

      try {
        console.log(`🔖 [Upload] Adding watermark to uploaded document...`);

        // Save to temp file for watermarking
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `temp-${Date.now()}${path.extname(file.originalname)}`);
        fs.writeFileSync(tempFilePath, file.buffer);

        // Add watermark
        const watermarkedBuffer = await addUploadWatermark(tempFilePath, file.mimetype);

        // Delete temp file
        fs.unlinkSync(tempFilePath);

        console.log(`✅ [Upload] Watermark added, uploading to Supabase...`);

        // Upload watermarked buffer to Supabase
        const { url, storageKey } = await uploadBufferToSupabase(
          watermarkedBuffer,
          file.originalname,
          file.mimetype
        );

        req.fileUrl = url;
        req.fileMeta = { url, storageKey };
        next();
      } catch (error) {
        console.error('❌ [Upload] Watermark/Upload failed:', error);
        // Fallback: upload original file
        uploadBufferToSupabase(file.buffer, file.originalname, file.mimetype)
          .then(({ url, storageKey }) => {
            req.fileUrl = url;
            req.fileMeta = { url, storageKey };
            next();
          })
          .catch((e) => {
            console.error("Supabase document upload error:", e);
            res.status(500).json({ error: "Document upload failed" });
          });
      }
    });
  }
};

// ---------- PDF ONLY UPLOAD HANDLER (for editors) ----------
export const uploadPdfOnly = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadPdfOnly.single("pdf")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file)
        return res.status(400).json({ error: "PDF file required" });

      try {
        const tempFilePath = path.join(process.cwd(), 'uploads/pdfs/', req.file.filename);

        console.log(`🔖 [Upload] Adding watermark to editor PDF...`);

        // Add watermark to the uploaded PDF
        const watermarkedBuffer = await addUploadWatermark(tempFilePath, req.file.mimetype);

        // Save watermarked file (overwrite original)
        fs.writeFileSync(tempFilePath, watermarkedBuffer);

        console.log(`✅ [Upload] Watermarked PDF saved: ${tempFilePath}`);

        const url = `/uploads/pdfs/${req.file.filename}`;

        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      } catch (error) {
        console.error('❌ [Upload] Watermark failed:', error);
        // Continue with original file if watermark fails
        const url = `/uploads/pdfs/${req.file.filename}`;

        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      }
    });
  } else {
    supabaseMemoryPdfOnly.single("pdf")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "PDF file required" });

      try {
        console.log(`🔖 [Upload] Adding watermark to editor PDF...`);

        // Save to temp file for watermarking
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
        fs.writeFileSync(tempFilePath, file.buffer);

        // Add watermark
        const watermarkedBuffer = await addUploadWatermark(tempFilePath, file.mimetype);

        // Delete temp file
        fs.unlinkSync(tempFilePath);

        console.log(`✅ [Upload] Watermark added, uploading to Supabase...`);

        // Upload watermarked buffer to Supabase
        const { url, storageKey } = await uploadBufferToSupabase(
          watermarkedBuffer,
          file.originalname,
          file.mimetype
        );

        req.fileUrl = url;
        req.fileMeta = { url, storageKey };
        next();
      } catch (error) {
        console.error('❌ [Upload] Watermark/Upload failed:', error);
        // Fallback: upload original file
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
      }
    });
  }
};

// ---------- LEGACY: Keep old uploadPdf for backward compatibility ----------
export const uploadPdf = uploadDocument;

// ---------- MULTIPLE PDF UPLOAD HANDLER ----------
export const uploadMultiplePdfs = (fieldName = "pdfs", maxCount = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isLocal) {
      localUploadDocument.array(fieldName, maxCount)(req, res, async (err: any) => {
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
      supabaseMemoryDocument.array(fieldName, maxCount)(req, res, async (err: any) => {
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


// ✅ NEW: Optional PDF Upload Handler 
export const uploadOptionalPdf = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadDocument.single("pdf")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: err.message });
      if (req.file) {
        try {
          const isLoggedIn = !!(req as any).user?.id;
          const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
          const tempFilePath = path.join(process.cwd(), directory, req.file.filename);

          console.log(`🔖 [Upload] Adding watermark to optional PDF...`);

          // Add watermark to the uploaded file
          const watermarkedBuffer = await addUploadWatermark(tempFilePath, req.file.mimetype);

          // Save watermarked file (overwrite original)
          fs.writeFileSync(tempFilePath, watermarkedBuffer);

          console.log(`✅ [Upload] Watermarked optional PDF saved: ${tempFilePath}`);

          const url = `/${directory}${req.file.filename}`;

          req.fileUrl = url;
          req.fileMeta = { url, storageKey: req.file.filename };
        } catch (error) {
          console.error('❌ [Upload] Watermark failed:', error);
          // Continue with original file if watermark fails
          const isLoggedIn = !!(req as any).user?.id;
          const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
          const url = `/${directory}${req.file.filename}`;

          req.fileUrl = url;
          req.fileMeta = { url, storageKey: req.file.filename };
        }
      }

      next();
    });
  } else {
    supabaseMemoryDocument.single("pdf")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: err.message });

      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return next();
      }

      try {
        console.log(`🔖 [Upload] Adding watermark to optional PDF...`);

        // Save to temp file for watermarking
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
        fs.writeFileSync(tempFilePath, file.buffer);

        // Add watermark
        const watermarkedBuffer = await addUploadWatermark(tempFilePath, file.mimetype);

        // Delete temp file
        fs.unlinkSync(tempFilePath);

        console.log(`✅ [Upload] Watermark added, uploading to Supabase...`);

        // Upload watermarked buffer to Supabase
        const { url, storageKey } = await uploadBufferToSupabase(
          watermarkedBuffer,
          file.originalname,
          file.mimetype
        );

        req.fileUrl = url;
        req.fileMeta = { url, storageKey };
        next();
      } catch (error) {
        console.error('❌ [Upload] Watermark/Upload failed:', error);
        // Fallback: upload original file
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
      }
    });
  }
};

// ✅ NEW: Editor uploads corrected PDF + optional editor document
export const uploadEditorFiles = (req: Request, res: Response, next: NextFunction) => {
  // Ensure editor-docs directory exists
  if (isLocal) {
    const editorDocsDir = 'uploads/editor-docs/';
    if (!fs.existsSync(editorDocsDir)) {
      fs.mkdirSync(editorDocsDir, { recursive: true });
    }
  }

  if (isLocal) {
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          let directory = '';
          if (file.fieldname === 'document') {
            // Main corrected article file
            directory = 'uploads/pdfs/';
          } else if (file.fieldname === 'editorDocument') {
            // Editor's additional document
            directory = 'uploads/editor-docs/';
          }

          if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
          }

          cb(null, directory);
        },
        filename: (req, file, cb) => {
          const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, unique + path.extname(file.originalname));
        },
      }),
      fileFilter: docxOnlyFileFilter,
      limits: { fileSize: MAX_DOCUMENT_SIZE }
    });

    upload.fields([
      { name: 'document', maxCount: 1 },      // Required: corrected article
      { name: 'editorDocument', maxCount: 1 } // Optional: editor's notes/diff
    ])(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      try {
        // Handle main corrected document (required)
        if (files.document && files.document[0]) {
          const docFile = files.document[0];
          const docFilePath = path.join(process.cwd(), 'uploads/pdfs/', docFile.filename);

          console.log(`🔖 [Upload] Adding watermark to editor's corrected document...`);

          // For DOCX files, save clean version for improved workflow and create watermarked version
          const ext = path.extname(docFile.originalname).toLowerCase();
          if (ext === '.docx') {
            console.log(`📄 [Upload] DOCX detected - preserving clean version for improved workflow`);
            
            // Keep the original clean file as-is for improved workflow
            // The improved workflow will handle watermarking properly
            console.log(`✅ [Upload] Clean DOCX preserved for improved workflow`);
          } else {
            // For non-DOCX files, apply watermark as before
            const watermarkedBuffer = await addUploadWatermark(docFilePath, docFile.mimetype);
            fs.writeFileSync(docFilePath, watermarkedBuffer);
            console.log(`✅ [Upload] Watermarked corrected document saved`);
          }

          req.fileMeta = {
            url: `/uploads/pdfs/${docFile.filename}`,
            storageKey: docFile.filename
          };
        } else {
          return res.status(400).json({ error: "Corrected document file required" });
        }

        // Handle editor document (optional)
        if (files.editorDocument && files.editorDocument[0]) {
          const editorDocFile = files.editorDocument[0];
          const editorDocFilePath = path.join(process.cwd(), 'uploads/editor-docs/', editorDocFile.filename);
          const ext = path.extname(editorDocFile.originalname).toLowerCase();
          const docType = (ext === '.docx' || ext === '.doc') ? 'WORD' : 'PDF';

          console.log(`🔖 [Upload] Adding watermark to editor's additional document...`);

          // Add watermark
          const watermarkedBuffer = await addUploadWatermark(editorDocFilePath, editorDocFile.mimetype);

          // Save watermarked file (overwrite original)
          fs.writeFileSync(editorDocFilePath, watermarkedBuffer);

          console.log(`✅ [Upload] Watermarked editor document saved`);

          req.body.editorDocumentUrl = `/uploads/editor-docs/${editorDocFile.filename}`;
          req.body.editorDocumentType = docType;
        }

        next();
      } catch (error) {
        console.error('❌ [Upload] Watermark failed:', error);
        // Continue with original files if watermark fails
        if (files.document && files.document[0]) {
          const docFile = files.document[0];
          req.fileMeta = {
            url: `/uploads/pdfs/${docFile.filename}`,
            storageKey: docFile.filename
          };
        }

        if (files.editorDocument && files.editorDocument[0]) {
          const editorDocFile = files.editorDocument[0];
          const ext = path.extname(editorDocFile.originalname).toLowerCase();
          const docType = (ext === '.docx' || ext === '.doc') ? 'WORD' : 'PDF';

          req.body.editorDocumentUrl = `/uploads/editor-docs/${editorDocFile.filename}`;
          req.body.editorDocumentType = docType;
        }

        next();
      }
    });
  } else {
    const upload = multer({
      storage: multer.memoryStorage(),
      fileFilter: docxOnlyFileFilter,
      limits: { fileSize: MAX_DOCUMENT_SIZE }
    });

    upload.fields([
      { name: 'document', maxCount: 1 },
      { name: 'editorDocument', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      try {
        // Handle main corrected document (required)
        if (files.document && files.document[0]) {
          const docFile = files.document[0];

          console.log(`🔖 [Upload] Adding watermark to editor's corrected document...`);

          // Save to temp file for watermarking
          const tempDir = path.join(process.cwd(), 'uploads', 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const tempFilePath = path.join(tempDir, `temp-${Date.now()}${path.extname(docFile.originalname)}`);
          fs.writeFileSync(tempFilePath, docFile.buffer);

          // For DOCX files, skip watermarking to preserve clean version for improved workflow
          const ext = path.extname(docFile.originalname).toLowerCase();
          let uploadBuffer;
          
          if (ext === '.docx') {
            console.log(`📄 [Upload] DOCX detected - preserving clean version for improved workflow`);
            uploadBuffer = docFile.buffer; // Use original clean buffer
            console.log(`✅ [Upload] Clean DOCX preserved for improved workflow`);
          } else {
            // Add watermark for non-DOCX files
            uploadBuffer = await addUploadWatermark(tempFilePath, docFile.mimetype);
            console.log(`✅ [Upload] Watermark added, uploading to Supabase...`);
          }

          // Delete temp file
          fs.unlinkSync(tempFilePath);

          // Upload buffer to Supabase
          const { url, storageKey } = await uploadBufferToSupabase(
            uploadBuffer,
            docFile.originalname,
            docFile.mimetype,
            'pdf'
          );
          req.fileMeta = { url, storageKey };
        } else {
          return res.status(400).json({ error: "Corrected document file required" });
        }

        // Handle editor document (optional)
        if (files.editorDocument && files.editorDocument[0]) {
          const editorDocFile = files.editorDocument[0];
          const ext = path.extname(editorDocFile.originalname).toLowerCase();
          const docType = (ext === '.docx' || ext === '.doc') ? 'WORD' : 'PDF';

          console.log(`🔖 [Upload] Adding watermark to editor's additional document...`);

          // Save to temp file for watermarking
          const tempDir = path.join(process.cwd(), 'uploads', 'temp');
          const tempFilePath = path.join(tempDir, `temp-${Date.now()}${path.extname(editorDocFile.originalname)}`);
          fs.writeFileSync(tempFilePath, editorDocFile.buffer);

          // Add watermark
          const watermarkedBuffer = await addUploadWatermark(tempFilePath, editorDocFile.mimetype);

          // Delete temp file
          fs.unlinkSync(tempFilePath);

          console.log(`✅ [Upload] Watermark added, uploading to Supabase...`);

          // Upload watermarked buffer to Supabase
          const { url } = await uploadBufferToSupabase(
            watermarkedBuffer,
            editorDocFile.originalname,
            editorDocFile.mimetype,
            'pdf'
          );

          req.body.editorDocumentUrl = url;
          req.body.editorDocumentType = docType;
        }

        next();
      } catch (e) {
        console.error("Supabase upload error:", e);
        return res.status(500).json({ error: "File upload failed" });
      }
    });
  }
};


// ---------- SINGLE IMAGE UPLOAD HANDLER ----------
export const uploadImage = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadImage.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "Image file required" });

      const isLoggedIn = !!(req as any).user?.id;
      const directory = isLoggedIn ? 'uploads/images/' : 'uploads/temp/images/';
      const url = `/${directory}${req.file.filename}`;

      req.fileUrl = url;
      req.fileMeta = { url, storageKey: req.file.filename };
      next();
    });
  } else {
    supabaseMemoryImage.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "Image file required" });

      // Use 'thumbnail' type for thumbnail uploads, 'image' for regular images
      const fileType = req.path.includes('thumbnail') ? 'thumbnail' : 'image';

      uploadBufferToSupabase(file.buffer, file.originalname, file.mimetype, fileType)
        .then(({ url, storageKey }) => {
          req.fileUrl = url;
          req.fileMeta = { url, storageKey };
          next();
        })
        .catch((e) => {
          console.error("Supabase image upload error:", e);
          res.status(500).json({ error: "Image upload failed" });
        });
    });
  }
};

// ---------- MULTIPLE IMAGES UPLOAD HANDLER ----------
export const uploadMultipleImages = (fieldName = "images", maxCount = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isLocal) {
      localUploadImage.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (!files.length) return res.status(400).json({ error: "Image files required" });

        const isLoggedIn = !!(req as any).user?.id;
        const directory = isLoggedIn ? 'uploads/images/' : 'uploads/temp/images/';

        req.fileUrls = files.map((f) => ({
          url: `/${directory}${f.filename}`,
          storageKey: f.filename,
        }));
        next();
      });
    } else {
      supabaseMemoryImage.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (!files.length) return res.status(400).json({ error: "Image files required" });

        try {
          const out: Array<{ url: string; storageKey: string }> = [];
          for (const f of files) {
            const { url, storageKey } = await uploadBufferToSupabase(
              f.buffer,
              f.originalname,
              f.mimetype,
              'image'
            );
            out.push({ url, storageKey });
          }
          req.fileUrls = out;
          next();
        } catch (e) {
          console.error("Supabase image upload error:", e);
          return res.status(500).json({ error: "Image upload failed" });
        }
      });
    }
  };
};

// ---------- OPTIONAL IMAGE UPLOAD HANDLER ----------
export const uploadOptionalImage = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadImage.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (req.file) {
        const isLoggedIn = !!(req as any).user?.id;
        const directory = isLoggedIn ? 'uploads/images/' : 'uploads/temp/images/';
        const url = `/${directory}${req.file.filename}`;

        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
      }
      next();
    });
  } else {
    supabaseMemoryImage.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return next();

      uploadBufferToSupabase(file.buffer, file.originalname, file.mimetype, 'image')
        .then(({ url, storageKey }) => {
          req.fileUrl = url;
          req.fileMeta = { url, storageKey };
          next();
        })
        .catch((e) => {
          console.error("Supabase image upload error:", e);
          res.status(500).json({ error: "Image upload failed" });
        });
    });
  }
};

// ---------- COMBINED UPLOAD (PDF + IMAGES) ----------
export const uploadArticleFiles = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const isLoggedIn = !!(req as any).user?.id;

          let directory = '';
          if (file.fieldname === 'pdf') {
            directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
          } else {
            directory = isLoggedIn ? 'uploads/images/' : 'uploads/temp/images/';
          }

          if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
          }

          cb(null, directory);
        },
        filename: (req, file, cb) => {
          const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, unique + path.extname(file.originalname));
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }
    });

    upload.fields([
      { name: 'pdf', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
      { name: 'images', maxCount: 10 }
    ])(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const isLoggedIn = !!(req as any).user?.id;

      try {
        // Handle PDF with watermark and document processing
        if (files.pdf && files.pdf[0]) {
          const pdfFile = files.pdf[0];
          const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
          const pdfFilePath = path.join(process.cwd(), directory, pdfFile.filename);

          console.log(`🔖 [Upload] Adding watermark to PDF...`);

          // Add watermark
          const watermarkedBuffer = await addUploadWatermark(pdfFilePath, pdfFile.mimetype);

          // Save watermarked file (overwrite original)
          fs.writeFileSync(pdfFilePath, watermarkedBuffer);

          console.log(`✅ [Upload] Watermarked PDF saved`);

          req.fileMeta = {
            url: `/${directory}${pdfFile.filename}`,
            storageKey: pdfFile.filename
          };

          // NEW: Enhanced document detection
          const isDocumentUpload = req.body.contentType === 'DOCUMENT' ||
            req.body.documentType === 'PDF' ||
            req.body.documentType === 'DOCX' ||
            // Auto-detect: No article-specific fields = document
            (!req.body.abstract && !req.body.keywords && !files.thumbnail && !files.images);

          if (isDocumentUpload) {
            req.body.contentType = 'DOCUMENT';
            req.body.documentType = 'PDF';
            console.log(`📄 [Upload] Processing as document upload`);

            // For documents, trigger Adobe conversion in background
            req.body.requiresAdobeProcessing = true;
            req.isDocumentUpload = true;
          } else {
            req.body.contentType = 'ARTICLE';
            console.log(`📰 [Upload] Processing as article upload`);
          }
        }

        // Handle thumbnail
        if (files.thumbnail && files.thumbnail[0]) {
          const thumbFile = files.thumbnail[0];
          const directory = isLoggedIn ? 'uploads/images/' : 'uploads/temp/images/';
          req.body.thumbnailUrl = `/${directory}${thumbFile.filename}`;
        }

        // Handle multiple images
        if (files.images && files.images.length > 0) {
          const directory = isLoggedIn ? 'uploads/images/' : 'uploads/temp/images/';
          req.body.imageUrls = files.images.map(img => `/${directory}${img.filename}`);
        }

        next();
      } catch (error) {
        console.error('❌ [Upload] Watermark failed:', error);
        // Continue with original files if watermark fails
        if (files.pdf && files.pdf[0]) {
          const pdfFile = files.pdf[0];
          const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
          req.fileMeta = {
            url: `/${directory}${pdfFile.filename}`,
            storageKey: pdfFile.filename
          };
        }

        if (files.thumbnail && files.thumbnail[0]) {
          const thumbFile = files.thumbnail[0];
          const directory = isLoggedIn ? 'uploads/images/' : 'uploads/temp/images/';
          req.body.thumbnailUrl = `/${directory}${thumbFile.filename}`;
        }

        if (files.images && files.images.length > 0) {
          const directory = isLoggedIn ? 'uploads/images/' : 'uploads/temp/images/';
          req.body.imageUrls = files.images.map(img => `/${directory}${img.filename}`);
        }

        next();
      }
    });
  } else {
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }
    });

    upload.fields([
      { name: 'pdf', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
      { name: 'images', maxCount: 10 }
    ])(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      try {
        // Handle PDF with watermark
        if (files.pdf && files.pdf[0]) {
          const pdfFile = files.pdf[0];

          console.log(`🔖 [Upload] Adding watermark to article PDF...`);

          // Save to temp file for watermarking
          const tempDir = path.join(process.cwd(), 'uploads', 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
          fs.writeFileSync(tempFilePath, pdfFile.buffer);

          // Add watermark
          const watermarkedBuffer = await addUploadWatermark(tempFilePath, pdfFile.mimetype);

          // Delete temp file
          fs.unlinkSync(tempFilePath);

          console.log(`✅ [Upload] Watermark added, uploading to Supabase...`);

          // Upload watermarked buffer to Supabase
          const { url, storageKey } = await uploadBufferToSupabase(
            watermarkedBuffer,
            pdfFile.originalname,
            pdfFile.mimetype,
            'pdf'
          );
          req.fileMeta = { url, storageKey };
        }

        // Handle thumbnail
        if (files.thumbnail && files.thumbnail[0]) {
          const thumbFile = files.thumbnail[0];
          const { url } = await uploadBufferToSupabase(
            thumbFile.buffer,
            thumbFile.originalname,
            thumbFile.mimetype,
            'image'
          );
          req.body.thumbnailUrl = url;
        }

        // Handle multiple images
        if (files.images && files.images.length > 0) {
          const imageUrls: string[] = [];

          for (const imgFile of files.images) {
            const { url } = await uploadBufferToSupabase(
              imgFile.buffer,
              imgFile.originalname,
              imgFile.mimetype,
              'image'
            );
            imageUrls.push(url);
          }

          req.body.imageUrls = imageUrls;
        }

        next();
      } catch (e) {
        console.error("Supabase upload error:", e);
        return res.status(500).json({ error: "File upload failed" });
      }
    });
  }
};
// ---------- DOCX ONLY UPLOAD HANDLER (for editor edited documents) ----------
export const uploadDocxOnly = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadDocxOnly.single("docx")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file)
        return res.status(400).json({ error: "DOCX file required" });

      try {
        const tempFilePath = path.join(process.cwd(), 'uploads/words/', req.file.filename);

        console.log(`🔖 [Upload] Processing editor DOCX: ${tempFilePath}`);

        // For DOCX files, we don't add watermark here as it will be handled by Adobe service
        // Just set the file path for the service to process
        const url = `/uploads/words/${req.file.filename}`;

        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };

        console.log(`✅ [Upload] DOCX file ready for processing: ${url}`);
        next();
      } catch (error) {
        console.error('❌ [Upload] DOCX processing failed:', error);
        const url = `/uploads/words/${req.file.filename}`;

        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      }
    });
  } else {
    supabaseMemoryDocxOnly.single("docx")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "DOCX file required" });

      try {
        console.log(`🔖 [Upload] Processing editor DOCX for Supabase...`);

        // Upload DOCX to Supabase (watermarking will be handled by Adobe service)
        const { url, storageKey } = await uploadBufferToSupabase(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        req.fileUrl = url;
        req.fileMeta = { url, storageKey };

        console.log(`✅ [Upload] DOCX uploaded to Supabase: ${url}`);
        next();
      } catch (error) {
        console.error('❌ [Upload] DOCX Supabase upload failed:', error);
        res.status(500).json({ error: "DOCX upload failed" });
      }
    });
  }
};

// NEW: REVIEWER DOCX ONLY UPLOAD HANDLER (strict DOCX-only for reviewers)
export const uploadReviewerDocxOnly = (req: Request, res: Response, next: NextFunction) => {
  // Reviewer-specific file filter - ONLY DOCX allowed
  const reviewerDocxFilter = (req: Request, file: Express.Multer.File, cb: any) => {
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      cb(null, true);
    } else {
      cb(new Error("Reviewers can only upload DOCX files. PDF uploads are not allowed for reviewers."), false);
    }
  };

  if (isLocal) {
    const reviewerUpload = multer({
      storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, 'uploads/words/');
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, unique + path.extname(file.originalname));
        },
      }),
      fileFilter: reviewerDocxFilter,
      limits: { fileSize: MAX_DOCUMENT_SIZE },
    });

    reviewerUpload.single("document")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file)
        return res.status(400).json({ error: "DOCX file required for reviewer upload" });

      try {
        const tempFilePath = path.join(process.cwd(), 'uploads/words/', req.file.filename);

        console.log(`🔖 [Reviewer Upload] Processing reviewer DOCX: ${tempFilePath}`);

        // For reviewer DOCX files, keep clean for Adobe processing
        const url = `/uploads/words/${req.file.filename}`;

        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };

        console.log(`✅ [Reviewer Upload] DOCX file ready for reviewer processing: ${url}`);
        next();
      } catch (error) {
        console.error('❌ [Reviewer Upload] DOCX processing failed:', error);
        const url = `/uploads/words/${req.file.filename}`;

        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      }
    });
  } else {
    const reviewerUpload = multer({
      storage: multer.memoryStorage(),
      fileFilter: reviewerDocxFilter,
      limits: { fileSize: MAX_DOCUMENT_SIZE },
    });

    reviewerUpload.single("document")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "DOCX file required for reviewer upload" });

      try {
        console.log(`🔖 [Reviewer Upload] Processing reviewer DOCX for Supabase...`);

        // Upload DOCX to Supabase (watermarking will be handled by Adobe service)
        const { url, storageKey } = await uploadBufferToSupabase(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        req.fileUrl = url;
        req.fileMeta = { url, storageKey };

        console.log(`✅ [Reviewer Upload] DOCX uploaded to Supabase: ${url}`);
        next();
      } catch (error) {
        console.error('❌ [Reviewer Upload] DOCX Supabase upload failed:', error);
        res.status(500).json({ error: "Reviewer DOCX upload failed" });
      }
    });
  }
};
// ✅ NEW: Banner Image Upload Handler
export const uploadBannerImage = (req: Request, res: Response, next: NextFunction) => {
    if (isLocal) {
        localUploadImage.single("image")(req, res, async (err) => {
            if (err) return res.status(400).json({ error: err.message });
            if (req.file) {
                req.fileUrl = `/uploads/images/${req.file.filename}`;
            }
            next();
        });
    } else {
        supabaseMemoryImage.single("image")(req, res, async (err) => {
            if (err) return res.status(400).json({ error: err.message });
            const file = req.file;
            if (!file) return next();

            try {
                const { url } = await uploadBufferToSupabase(
                    file.buffer,
                    file.originalname,
                    file.mimetype,
                    'image'
                );
                req.fileUrl = url;
                next();
            } catch (error) {
                console.error("Supabase Image Upload Error:", error);
                res.status(500).json({ error: "Image upload failed" });
            }
        });
    }
};
