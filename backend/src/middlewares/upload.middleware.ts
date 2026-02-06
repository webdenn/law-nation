// /src/middlewares/upload.middleware.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"; // CHANGED: AWS SDK
import type { Request, Response, NextFunction } from "express";
import { addWatermarkToPdf } from "@/utils/pdf-watermark.utils.js";
import { addSimpleWatermarkToWord } from "@/utils/word-watermark.utils.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StringValidation } from "zod/v3";

// Extend Request typing so req.fileUrl(s) are recognized
declare global {
  namespace Express {
    interface Request {
      fileUrl?: string;
      fileUrls?: Array<{ url: string; storageKey?: string }>;
      fileMeta?: {
        url: string;
        storageKey?: string;
        watermarkedUrl?: string;
        fileSize?: number;
        presignedUrl?: string;
      } | null;
      isDocumentUpload?: boolean;
    }
  }
}

// No size limit for admin uploads
const UNLIMITED_SIZE = Number.MAX_SAFE_INTEGER;

// Admin PDF directory
const ADMIN_PDF_DIR = 'uploads/admin-pdfs/';

const isLocal = process.env.NODE_ENV === "local";

// ---------- AWS S3 CONFIGURATION (CHANGED) ----------
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

// Map your old Supabase bucket vars to S3 Bucket Names
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "articles-bucket";
const S3_BUCKET_IMAGES = process.env.AWS_S3_BUCKET_IMAGES || "images-bucket";
const S3_BUCKET_THUMBNAILS = process.env.AWS_S3_BUCKET_THUMBNAILS || "thumbnails-bucket";

// Initialize S3 Client
const s3Client = !isLocal && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
  ? new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  })
  : null;

// ---------- PDF ONLY VALIDATION (STRICT) ----------
const allowedDocumentMimes = ["application/pdf"];
const MAX_DOCUMENT_SIZE = parseInt(
  process.env.MAX_DOCUMENT_SIZE_BYTES ?? String(10 * 1024 * 1024),
  10
);

// For user uploads (PDF ONLY)
const documentFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const allowedMimes = ["application/pdf"];
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

// For editor uploads (DOCX only)
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

// Admin PDF upload filter
const adminPdfFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed for admin uploads"), false);
  }
};

// ---------- IMAGE VALIDATION ----------
const allowedImageMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const MAX_IMAGE_SIZE = parseInt(
  process.env.MAX_IMAGE_SIZE_BYTES ?? String(5 * 1024 * 1024),
  10
);

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
  const adminPdfDir = "uploads/admin-pdfs/";

  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
  if (!fs.existsSync(wordDir)) fs.mkdirSync(wordDir, { recursive: true });
  if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
  if (!fs.existsSync(tempImageDir)) fs.mkdirSync(tempImageDir, { recursive: true });
  if (!fs.existsSync(visualDiffDir)) fs.mkdirSync(visualDiffDir, { recursive: true });
  if (!fs.existsSync(adminPdfDir)) fs.mkdirSync(adminPdfDir, { recursive: true });
}

// ---------- DOCUMENT UPLOAD CONFIG (PDF or Word for users) ----------
const localDocumentStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const isLoggedIn = !!(req as any).user?.id;
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

// Use memory storage for S3 uploads (same as Supabase)
const s3MemoryDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
});

// ---------- PDF ONLY UPLOAD CONFIG (for editors) ----------
const localPdfOnlyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
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

const s3MemoryPdfOnly = multer({
  storage: multer.memoryStorage(),
  fileFilter: pdfOnlyFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
});

// ---------- DOCX ONLY UPLOAD CONFIG ----------
const localDocxOnlyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
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

const s3MemoryDocxOnly = multer({
  storage: multer.memoryStorage(),
  fileFilter: docxOnlyFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
});

// ---------- ADMIN PDF UPLOAD CONFIG ----------
const localAdminPdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(ADMIN_PDF_DIR)) {
      fs.mkdirSync(ADMIN_PDF_DIR, { recursive: true });
    }
    cb(null, ADMIN_PDF_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const localUploadAdminPdf = multer({
  storage: localAdminPdfStorage,
  fileFilter: adminPdfFileFilter,
  limits: { fileSize: UNLIMITED_SIZE },
});

const s3MemoryAdminPdf = multer({
  storage: multer.memoryStorage(),
  fileFilter: adminPdfFileFilter,
  limits: { fileSize: UNLIMITED_SIZE },
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

const s3MemoryImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
});

// ---------- WATERMARK HELPER (UNCHANGED) ----------
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
      console.log(`📄 [Upload Watermark] Processing PDF for upload...`);
      return await addWatermarkToPdf(filePath, watermarkData, 'ADMIN', 'DRAFT');
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      console.log(`📝 [Upload Watermark] Processing Word document...`);
      return await addSimpleWatermarkToWord(filePath, watermarkData);
    } else {
      console.warn(`⚠️ [Upload Watermark] Unsupported file type: ${mimetype}`);
      return fs.readFileSync(filePath);
    }
  } catch (error) {
    console.error(`❌ [Upload Watermark] Failed to add watermark:`, error);
    return fs.readFileSync(filePath);
  }
}

// ---------- S3 UPLOAD HELPER (REPLACED) ----------
/**
 * Uploads a buffer to AWS S3 and returns the public URL.
 * Replaces: uploadBufferToSupabase
 */
async function uploadBufferToS3(
  buffer: Buffer,
  originalname: string,
  inputMimetype: string,
  fileType: 'pdf' | 'image' | 'thumbnail' = 'pdf'
): Promise<{ url: string; storageKey: string; presignedUrl: string }> { // <--- Return Type Updated
  if (!s3Client) throw new Error("AWS S3 client not initialized");

  // 1. Force Correct MimeType (Your existing fix)
  let finalMimeType = inputMimetype;
  const ext = path.extname(originalname).toLowerCase();
  if (ext === '.docx') finalMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (ext === '.pdf') finalMimeType = 'application/pdf';

  // 2. Select Bucket
  let bucketName = S3_BUCKET_ARTICLES;
  let folder = 'articles';
  if (fileType === 'thumbnail') { bucketName = S3_BUCKET_THUMBNAILS; folder = 'thumbnails'; }
  else if (fileType === 'image') { bucketName = S3_BUCKET_IMAGES; folder = 'images'; }

  const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const storageKey = `${folder}/${uniqueId}${ext}`;

  // 3. Upload File
  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    Body: buffer,
    ContentType: finalMimeType,
  }));

  // 4. Generate Links
  const publicUrl = `https://${bucketName}.s3.${AWS_REGION}.amazonaws.com/${storageKey}`;

  // GENERATE VIP PASS (PRESIGNED URL)
  const presignedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey
  }), { expiresIn: 3600 }); // Valid for 1 hour

  return { url: publicUrl, storageKey, presignedUrl };
}

// ---------- DOCUMENT UPLOAD HANDLER ----------
export const uploadDocument = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadDocument.single("document")(req, res, async (err) => {
      // ... (Local logic unchanged)
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file)
        return res.status(400).json({ error: "Document file required" });

      try {
        const isLoggedIn = !!(req as any).user?.id;
        const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
        const tempFilePath = path.join(process.cwd(), directory, req.file.filename);

        // Watermark Logic
        const watermarkedBuffer = await addUploadWatermark(tempFilePath, req.file.mimetype);
        fs.writeFileSync(tempFilePath, watermarkedBuffer);

        const url = `/${directory}${req.file.filename}`;
        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      } catch (error) {
        // Fallback Logic
        const isLoggedIn = !!(req as any).user?.id;
        const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
        const url = `/${directory}${req.file.filename}`;
        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      }
    });
  } else {
    // CHANGED: Use s3MemoryDocument
    s3MemoryDocument.single("document")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "Document file required" });

      try {
        // Temp file for watermarking
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempFilePath = path.join(tempDir, `temp-${Date.now()}${path.extname(file.originalname)}`);
        fs.writeFileSync(tempFilePath, file.buffer);

        const watermarkedBuffer = await addUploadWatermark(tempFilePath, file.mimetype);
        fs.unlinkSync(tempFilePath);

        // CHANGED: Call uploadBufferToS3
        const { url, storageKey } = await uploadBufferToS3(
          watermarkedBuffer,
          file.originalname,
          file.mimetype
        );

        req.fileUrl = url;
        req.fileMeta = { url, storageKey };
        next();
      } catch (error) {
        console.error('❌ [Upload] Watermark/Upload failed:', error);
        // Fallback to S3
        uploadBufferToS3(file.buffer, file.originalname, file.mimetype)
          .then(({ url, storageKey }) => {
            req.fileUrl = url;
            req.fileMeta = { url, storageKey };
            next();
          })
          .catch((e) => {
            console.error("S3 document upload error:", e);
            res.status(500).json({ error: "Document upload failed" });
          });
      }
    });
  }
};

// ---------- PDF ONLY UPLOAD HANDLER ----------
export const uploadPdfOnly = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadPdfOnly.single("pdf")(req, res, async (err) => {
      // ... (Local logic unchanged)
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "PDF file required" });

      try {
        const tempFilePath = path.join(process.cwd(), 'uploads/pdfs/', req.file.filename);
        const watermarkedBuffer = await addUploadWatermark(tempFilePath, req.file.mimetype);
        fs.writeFileSync(tempFilePath, watermarkedBuffer);
        const url = `/uploads/pdfs/${req.file.filename}`;
        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      } catch (error) {
        const url = `/uploads/pdfs/${req.file.filename}`;
        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      }
    });
  } else {
    // CHANGED: Use s3MemoryPdfOnly
    s3MemoryPdfOnly.single("pdf")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "PDF file required" });

      try {
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
        fs.writeFileSync(tempFilePath, file.buffer);

        const watermarkedBuffer = await addUploadWatermark(tempFilePath, file.mimetype);
        fs.unlinkSync(tempFilePath);

        // CHANGED: Call uploadBufferToS3
        const { url, storageKey } = await uploadBufferToS3(
          watermarkedBuffer,
          file.originalname,
          file.mimetype
        );

        req.fileUrl = url;
        req.fileMeta = { url, storageKey };
        next();
      } catch (error) {
        console.error('❌ [Upload] Watermark/Upload failed:', error);
        uploadBufferToS3(file.buffer, file.originalname, file.mimetype)
          .then(({ url, storageKey }) => {
            req.fileUrl = url;
            req.fileMeta = { url, storageKey };
            next();
          })
          .catch((e) => {
            console.error("S3 PDF upload error:", e);
            res.status(500).json({ error: "PDF upload failed" });
          });
      }
    });
  }
};

export const uploadPdf = uploadDocument;

// ---------- MULTIPLE PDF UPLOAD HANDLER ----------
export const uploadMultiplePdfs = (fieldName = "pdfs", maxCount = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isLocal) {
      // ... (Local logic unchanged)
      localUploadDocument.array(fieldName, maxCount)(req, res, async (err: any) => {
        if (err) return res.status(400).json({ error: err.message });
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (!files.length) return res.status(400).json({ error: "PDF files required" });
        req.fileUrls = files.map((f) => ({
          url: `/uploads/pdfs/${f.filename}`,
          storageKey: f.filename,
        }));
        next();
      });
    } else {
      // CHANGED: Use s3MemoryDocument
      s3MemoryDocument.array(fieldName, maxCount)(req, res, async (err: any) => {
        if (err) return res.status(400).json({ error: err.message });
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (!files.length)
          return res.status(400).json({ error: "PDF files required" });
        try {
          const out: Array<{ url: string; storageKey: string }> = [];
          for (const f of files) {
            // CHANGED: uploadBufferToS3
            const { url, storageKey } = await uploadBufferToS3(
              f.buffer,
              f.originalname,
              f.mimetype
            );
            out.push({ url, storageKey });
          }
          req.fileUrls = out;
          next();
        } catch (e) {
          console.error("S3 PDF upload error:", e);
          return res.status(500).json({ error: "PDF upload failed" });
        }
      });
    }
  };
};

// ---------- OPTIONAL PDF UPLOAD HANDLER ----------
export const uploadOptionalPdf = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    // ... (Local logic unchanged)
    localUploadDocument.single("pdf")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: err.message });
      if (req.file) {
        try {
          const isLoggedIn = !!(req as any).user?.id;
          const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
          const tempFilePath = path.join(process.cwd(), directory, req.file.filename);
          const watermarkedBuffer = await addUploadWatermark(tempFilePath, req.file.mimetype);
          fs.writeFileSync(tempFilePath, watermarkedBuffer);
          const url = `/${directory}${req.file.filename}`;
          req.fileUrl = url;
          req.fileMeta = { url, storageKey: req.file.filename };
        } catch (error) {
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
    // CHANGED: s3MemoryDocument
    s3MemoryDocument.single("pdf")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: err.message });

      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return next();
      }

      try {
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
        fs.writeFileSync(tempFilePath, file.buffer);

        const watermarkedBuffer = await addUploadWatermark(tempFilePath, file.mimetype);
        fs.unlinkSync(tempFilePath);

        // CHANGED: uploadBufferToS3
        const { url, storageKey, presignedUrl } = await uploadBufferToS3(
          watermarkedBuffer,
          file.originalname,
          file.mimetype
        );

        req.fileUrl = url;
        req.fileMeta = { url, storageKey, presignedUrl };
        next();
      } catch (error) {
        console.error('❌ [Upload] Watermark/Upload failed:', error);
        uploadBufferToS3(file.buffer, file.originalname, file.mimetype)
          .then(({ url, storageKey }) => {
            req.fileUrl = url;
            req.fileMeta = { url, storageKey };
            next();
          })
          .catch((e) => {
            console.error("S3 PDF upload error:", e);
            res.status(500).json({ error: "PDF upload failed" });
          });
      }
    });
  }
};

// ---------- EDITOR FILES UPLOAD ----------
export const uploadEditorFiles = (req: Request, res: Response, next: NextFunction) => {
  // Ensure editor-docs directory exists (Local)
  if (isLocal) {
    const editorDocsDir = 'uploads/editor-docs/';
    if (!fs.existsSync(editorDocsDir)) fs.mkdirSync(editorDocsDir, { recursive: true });
  }

  if (isLocal) {
    // ... (Local logic unchanged, complex nested fields)
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          let directory = '';
          if (file.fieldname === 'document') {
            directory = 'uploads/pdfs/';
          } else if (file.fieldname === 'editorDocument') {
            directory = 'uploads/editor-docs/';
          }
          if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
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
      { name: 'document', maxCount: 1 },
      { name: 'editorDocument', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      try {
        if (files.document && files.document[0]) {
          const docFile = files.document[0];
          const docFilePath = path.join(process.cwd(), 'uploads/pdfs/', docFile.filename);
          const ext = path.extname(docFile.originalname).toLowerCase();
          if (ext !== '.docx') {
            const watermarkedBuffer = await addUploadWatermark(docFilePath, docFile.mimetype);
            fs.writeFileSync(docFilePath, watermarkedBuffer);
          }
          req.fileMeta = {
            url: `/uploads/pdfs/${docFile.filename}`,
            storageKey: docFile.filename
          };
        } else {
          return res.status(400).json({ error: "Corrected document file required" });
        }

        if (files.editorDocument && files.editorDocument[0]) {
          const editorDocFile = files.editorDocument[0];
          const editorDocFilePath = path.join(process.cwd(), 'uploads/editor-docs/', editorDocFile.filename);
          const ext = path.extname(editorDocFile.originalname).toLowerCase();
          const docType = (ext === '.docx' || ext === '.doc') ? 'WORD' : 'PDF';

          const watermarkedBuffer = await addUploadWatermark(editorDocFilePath, editorDocFile.mimetype);
          fs.writeFileSync(editorDocFilePath, watermarkedBuffer);

          req.body.editorDocumentUrl = `/uploads/editor-docs/${editorDocFile.filename}`;
          req.body.editorDocumentType = docType;
        }
        next();
      } catch (error) {
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
    // CHANGED: Multer memory storage (no specific supabase object needed here)
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
        if (files.document && files.document[0]) {
          const docFile = files.document[0];
          const tempDir = path.join(process.cwd(), 'uploads', 'temp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

          const tempFilePath = path.join(tempDir, `temp-${Date.now()}${path.extname(docFile.originalname)}`);
          fs.writeFileSync(tempFilePath, docFile.buffer);

        //   const ext = path.extname(docFile.originalname).toLowerCase();
        //   let uploadBuffer;

        //   if (ext === '.docx') {
        //     uploadBuffer = docFile.buffer;
        //   } else {
        //     uploadBuffer = await addUploadWatermark(tempFilePath, docFile.mimetype);
        //   }
        //   fs.unlinkSync(tempFilePath);

        //   // CHANGED: uploadBufferToS3
        //   const { url, storageKey, presignedUrl } = await uploadBufferToS3(
        //     uploadBuffer,
        //     docFile.originalname,
        //     docFile.mimetype,
        //     'pdf'
        //   );
        //   req.fileMeta = { url, storageKey, presignedUrl };
        // } else {
        //   return res.status(400).json({ error: "Corrected document file required" });
        // }
       const ext = path.extname(docFile.originalname).toLowerCase();
       let uploadBuffer;
      let finalMimetype = docFile.mimetype;
       let finalFilename = docFile.originalname;

     if (ext === '.docx') {
       // Convert DOCX to PDF
       console.log('📄 Converting DOCX to PDF for preview...');
       const { convertDocxToPdf } = await import('../services/adobe.service.js');
       const pdfBuffer = await convertDocxToPdf(tempFilePath);
    
       // Save PDF to temp
        const pdfTempPath = tempFilePath.replace('.docx', '.pdf');
        fs.writeFileSync(pdfTempPath, pdfBuffer);
    
       // Watermark the PDF
        uploadBuffer = await addUploadWatermark(pdfTempPath, 'application/pdf');
    
      // Clean up
        fs.unlinkSync(pdfTempPath);
    
       // Update file info
       finalMimetype = 'application/pdf';
        finalFilename = docFile.originalname.replace('.docx', '.pdf');
    } else {
       // PDF file - just watermark
      uploadBuffer = await addUploadWatermark(tempFilePath, docFile.mimetype);
  }

   fs.unlinkSync(tempFilePath);

     // Upload to S3
      const { url, storageKey, presignedUrl } = await uploadBufferToS3(
    uploadBuffer,
    finalFilename,  // ← Now it's .pdf
    finalMimetype,  // ← Now it's application/pdf
    'pdf'
   );

          

        if (files.editorDocument && files.editorDocument[0]) {
          const editorDocFile = files.editorDocument[0];
          const ext = path.extname(editorDocFile.originalname).toLowerCase();
          const docType = (ext === '.docx' || ext === '.doc') ? 'WORD' : 'PDF';

          const tempDir = path.join(process.cwd(), 'uploads', 'temp');
          const tempFilePath = path.join(tempDir, `temp-${Date.now()}${path.extname(editorDocFile.originalname)}`);
          fs.writeFileSync(tempFilePath, editorDocFile.buffer);

          const watermarkedBuffer = await addUploadWatermark(tempFilePath, editorDocFile.mimetype);
          fs.unlinkSync(tempFilePath);

          // CHANGED: uploadBufferToS3
          const { url } = await uploadBufferToS3(
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
        console.error("S3 upload error:", e);
        return res.status(500).json({ error: "File upload failed" });
      }
    });
  }
};

// ---------- SINGLE IMAGE UPLOAD ----------
export const uploadImage = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    // ... (Local logic unchanged)
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
    // CHANGED: s3MemoryImage
    s3MemoryImage.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "Image file required" });

      const fileType = req.path.includes('thumbnail') ? 'thumbnail' : 'image';

      // CHANGED: uploadBufferToS3
      uploadBufferToS3(file.buffer, file.originalname, file.mimetype, fileType)
        .then(({ url, storageKey }) => {
          req.fileUrl = url;
          req.fileMeta = { url, storageKey };
          next();
        })
        .catch((e) => {
          console.error("S3 image upload error:", e);
          res.status(500).json({ error: "Image upload failed" });
        });
    });
  }
};

// ---------- MULTIPLE IMAGES UPLOAD ----------
export const uploadMultipleImages = (fieldName = "images", maxCount = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isLocal) {
      // ... (Local logic unchanged)
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
      // CHANGED: s3MemoryImage
      s3MemoryImage.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (!files.length) return res.status(400).json({ error: "Image files required" });

        try {
          const out: Array<{ url: string; storageKey: string }> = [];
          for (const f of files) {
            // CHANGED: uploadBufferToS3
            const { url, storageKey } = await uploadBufferToS3(
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
          console.error("S3 image upload error:", e);
          return res.status(500).json({ error: "Image upload failed" });
        }
      });
    }
  };
};

// ---------- OPTIONAL IMAGE UPLOAD ----------
export const uploadOptionalImage = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    // ... (Local logic unchanged)
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
    // CHANGED: s3MemoryImage
    s3MemoryImage.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return next();

      // CHANGED: uploadBufferToS3
      uploadBufferToS3(file.buffer, file.originalname, file.mimetype, 'image')
        .then(({ url, storageKey }) => {
          req.fileUrl = url;
          req.fileMeta = { url, storageKey };
          next();
        })
        .catch((e) => {
          console.error("S3 image upload error:", e);
          res.status(500).json({ error: "Image upload failed" });
        });
    });
  }
};

// ---------- COMBINED UPLOAD (PDF + IMAGES) ----------
export const uploadArticleFiles = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    // ... (Local logic unchanged, heavy nesting)
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
          if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
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
        if (files.pdf && files.pdf[0]) {
          const pdfFile = files.pdf[0];
          const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
          const pdfFilePath = path.join(process.cwd(), directory, pdfFile.filename);
          const watermarkedBuffer = await addUploadWatermark(pdfFilePath, pdfFile.mimetype);
          fs.writeFileSync(pdfFilePath, watermarkedBuffer);
          req.fileMeta = {
            url: `/${directory}${pdfFile.filename}`,
            storageKey: pdfFile.filename
          };
          const isDocumentUpload = req.body.contentType === 'DOCUMENT' ||
            req.body.documentType === 'PDF' ||
            req.body.documentType === 'DOCX' ||
            (!req.body.abstract && !req.body.keywords && !files.thumbnail && !files.images);
          if (isDocumentUpload) {
            req.body.contentType = 'DOCUMENT';
            req.body.documentType = 'PDF';
            req.body.requiresAdobeProcessing = true;
            req.isDocumentUpload = true;
          } else {
            req.body.contentType = 'ARTICLE';
          }
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
      } catch (error) {
        // Error handling ...
        if (files.pdf && files.pdf[0]) {
          const pdfFile = files.pdf[0];
          const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
          req.fileMeta = { url: `/${directory}${pdfFile.filename}`, storageKey: pdfFile.filename };
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
    // CHANGED: Multer memory (no supabase)
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
        if (files.pdf && files.pdf[0]) {
          const pdfFile = files.pdf[0];
          const tempDir = path.join(process.cwd(), 'uploads', 'temp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

          const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
          fs.writeFileSync(tempFilePath, pdfFile.buffer);

          const watermarkedBuffer = await addUploadWatermark(tempFilePath, pdfFile.mimetype);
          fs.unlinkSync(tempFilePath);

          // CHANGED: uploadBufferToS3
          const { url, storageKey } = await uploadBufferToS3(
            watermarkedBuffer,
            pdfFile.originalname,
            pdfFile.mimetype,
            'pdf'
          );
          req.fileMeta = { url, storageKey };
        }

        if (files.thumbnail && files.thumbnail[0]) {
          const thumbFile = files.thumbnail[0];
          // CHANGED: uploadBufferToS3
          const { url } = await uploadBufferToS3(
            thumbFile.buffer,
            thumbFile.originalname,
            thumbFile.mimetype,
            'image'
          );
          req.body.thumbnailUrl = url;
        }

        if (files.images && files.images.length > 0) {
          const imageUrls: string[] = [];
          for (const imgFile of files.images) {
            // CHANGED: uploadBufferToS3
            const { url } = await uploadBufferToS3(
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
        console.error("S3 upload error:", e);
        return res.status(500).json({ error: "File upload failed" });
      }
    });
  }
};

// ---------- DOCX ONLY UPLOAD HANDLER ----------
export const uploadDocxOnly = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    // ... (Local logic unchanged)
    localUploadDocxOnly.single("docx")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "DOCX file required" });
      try {
        const url = `/uploads/words/${req.file.filename}`;
        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      } catch (error) {
        const url = `/uploads/words/${req.file.filename}`;
        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      }
    });
  } else {
    // CHANGED: s3MemoryDocxOnly
    s3MemoryDocxOnly.single("docx")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "DOCX file required" });

      try {
        // CHANGED: uploadBufferToS3
        const { url, storageKey } = await uploadBufferToS3(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        req.fileUrl = url;
        req.fileMeta = { url, storageKey };
        next();
      } catch (error) {
        console.error('❌ [Upload] DOCX S3 upload failed:', error);
        res.status(500).json({ error: "DOCX upload failed" });
      }
    });
  }
};

// NEW: REVIEWER DOCX ONLY UPLOAD HANDLER
export const uploadReviewerDocxOnly = (req: Request, res: Response, next: NextFunction) => {
  // ... (Filter logic unchanged)
  const reviewerDocxFilter = (req: Request, file: Express.Multer.File, cb: any) => {
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      cb(null, true);
    } else {
      cb(new Error("Reviewers can only upload DOCX files. PDF uploads are not allowed for reviewers."), false);
    }
  };

  if (isLocal) {
    // ... (Local logic unchanged)
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
      if (!req.file) return res.status(400).json({ error: "DOCX file required for reviewer upload" });

      try {
        const url = `/uploads/words/${req.file.filename}`;
        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      } catch (error) {
        const url = `/uploads/words/${req.file.filename}`;
        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
        next();
      }
    });
  } else {
    // CHANGED: Multer memory (generic)
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
        // CHANGED: uploadBufferToS3
        const { url, storageKey } = await uploadBufferToS3(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        req.fileUrl = url;
        req.fileMeta = { url, storageKey };
        next();
      } catch (error) {
        console.error('❌ [Reviewer Upload] DOCX S3 upload failed:', error);
        res.status(500).json({ error: "Reviewer DOCX upload failed" });
      }
    });
  }
};

// BANNER IMAGE UPLOAD HANDLER
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
    // CHANGED: s3MemoryImage
    s3MemoryImage.single("image")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file;
      if (!file) return next();

      try {
        // CHANGED: uploadBufferToS3
        const { url } = await uploadBufferToS3(
          file.buffer,
          file.originalname,
          file.mimetype,
          'image'
        );
        req.fileUrl = url;
        next();
      } catch (error) {
        console.error("S3 Image Upload Error:", error);
        res.status(500).json({ error: "Image upload failed" });
      }
    });
  }
};

// ADMIN PDF UPLOAD HANDLER (unlimited size)
export const uploadAdminPdf = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    // ... (Local logic unchanged)
    localUploadAdminPdf.single("pdf")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "PDF file required" });

      try {
        const filePath = path.join(process.cwd(), ADMIN_PDF_DIR, req.file.filename);
        const { addAdminPdfWatermark } = await import('../utils/admin-pdf-watermark.utils.js');
        const { watermarkedBuffer } = await addAdminPdfWatermark(filePath, {
          title: req.body.title || 'Admin Upload',
          issue: req.body.issue || new Date().toLocaleString('default', { month: 'long' }),
          volume: req.body.volume || new Date().getFullYear().toString(),
          adminName: (req as any).user?.name || 'LAW NATION ADMIN'
        });

        const watermarkedFilename = req.file.filename.replace('.pdf', '_watermarked.pdf');
        const watermarkedPath = path.join(process.cwd(), ADMIN_PDF_DIR, watermarkedFilename);
        fs.writeFileSync(watermarkedPath, watermarkedBuffer);

        req.fileUrl = `/${ADMIN_PDF_DIR}${req.file.filename}`;
        req.fileMeta = {
          url: `/${ADMIN_PDF_DIR}${req.file.filename}`,
          watermarkedUrl: `/${ADMIN_PDF_DIR}${watermarkedFilename}`,
          storageKey: req.file.filename,
          fileSize: req.file.size
        };

        next();
      } catch (error) {
        const url = `/${ADMIN_PDF_DIR}${req.file.filename}`;
        req.fileUrl = url;
        req.fileMeta = {
          url,
          storageKey: req.file.filename,
          fileSize: req.file.size
        };
        next();
      }
    });
  } else {
    // CHANGED: s3MemoryAdminPdf
    s3MemoryAdminPdf.single("pdf")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "PDF file required" });

      try {
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempFilePath = path.join(tempDir, `admin-temp-${Date.now()}.pdf`);
        fs.writeFileSync(tempFilePath, file.buffer);

        const { addAdminPdfWatermark } = await import('../utils/admin-pdf-watermark.utils.js');

        const { originalBuffer, watermarkedBuffer } = await addAdminPdfWatermark(tempFilePath, {
          title: req.body.title || 'Admin Upload',
          issue: req.body.issue || new Date().toLocaleString('default', { month: 'long' }),
          volume: req.body.volume || new Date().getFullYear().toString(),
          adminName: (req as any).user?.name || 'LAW NATION ADMIN'
        });

        fs.unlinkSync(tempFilePath);

        // CHANGED: uploadBufferToS3 (Upload Original)
        const { url: originalUrl, storageKey } = await uploadBufferToS3(
          originalBuffer,
          file.originalname,
          file.mimetype,
          'pdf'
        );

        const watermarkedFilename = file.originalname.replace('.pdf', '_watermarked.pdf');

        // CHANGED: uploadBufferToS3 (Upload Watermarked)
        const { url: watermarkedUrl } = await uploadBufferToS3(
          watermarkedBuffer,
          watermarkedFilename,
          file.mimetype,
          'pdf'
        );

        req.fileUrl = originalUrl;
        req.fileMeta = {
          url: originalUrl,
          watermarkedUrl,
          storageKey,
          fileSize: file.size
        };

        next();
      } catch (error) {
        console.error('❌ [Admin Upload] Upload failed:', error);
        res.status(500).json({ error: "Admin PDF upload failed" });
      }
    });
  }
};



