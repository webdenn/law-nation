import multer from "multer";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Request, Response, NextFunction } from "express";
import { addWatermarkToPdf } from "@/utils/pdf-watermark.utils.js";
import { addSimpleWatermarkToWord } from "@/utils/word-watermark.utils.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

const UNLIMITED_SIZE = Number.MAX_SAFE_INTEGER;
const ADMIN_PDF_DIR = 'uploads/admin-pdfs/';
const isLocal = process.env.NODE_ENV === "local";

// ---------- AWS S3 CONFIGURATION ----------
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "articles-bucket";
const S3_BUCKET_IMAGES = process.env.AWS_S3_BUCKET_IMAGES || "images-bucket";
const S3_BUCKET_THUMBNAILS = process.env.AWS_S3_BUCKET_THUMBNAILS || "thumbnails-bucket";

const s3Client = !isLocal && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
  ? new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

// ---------- VALIDATION FILTERS ----------
const MAX_DOCUMENT_SIZE = parseInt(process.env.MAX_DOCUMENT_SIZE_BYTES ?? String(10 * 1024 * 1024), 10);
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE_BYTES ?? String(5 * 1024 * 1024), 10);

const documentFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are allowed for user uploads."), false);
};

const docxOnlyFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const allowed = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only DOCX/DOC files allowed."), false);
};

const imageFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid image format."), false);
};

// ---------- WATERMARK & S3 HELPERS ----------
async function addUploadWatermark(filePath: string, mimetype: string): Promise<Buffer> {
  const watermarkData = {
    userName: 'LAW NATION',
    downloadDate: new Date(),
    articleTitle: 'Uploaded Document',
    articleId: 'upload',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  };

  try {
    if (mimetype === 'application/pdf') {
      return await addWatermarkToPdf(filePath, watermarkData, 'ADMIN', 'DRAFT');
    } else if (mimetype.includes('word') || mimetype.includes('msword')) {
      return await addSimpleWatermarkToWord(filePath, watermarkData);
    }
    return fs.readFileSync(filePath);
  } catch (error) {
    return fs.readFileSync(filePath);
  }
}

async function uploadBufferToS3(buffer: Buffer, originalname: string, inputMimetype: string, fileType: 'pdf' | 'image' | 'thumbnail' = 'pdf') {
  if (!s3Client) throw new Error("S3 Client not initialized");
  const ext = path.extname(originalname).toLowerCase();
  const bucketName = fileType === 'image' ? S3_BUCKET_IMAGES : (fileType === 'thumbnail' ? S3_BUCKET_THUMBNAILS : S3_BUCKET_ARTICLES);
  const storageKey = `${fileType === 'pdf' ? 'articles' : (fileType === 'image' ? 'images' : 'thumbnails')}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    Body: buffer,
    ContentType: inputMimetype,
  }));

  const url = `https://${bucketName}.s3.${AWS_REGION}.amazonaws.com/${storageKey}`;
  const presignedUrl = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: bucketName, Key: storageKey }), { expiresIn: 3600 });
  return { url, storageKey, presignedUrl };
}

// ---------- HANDLERS ----------

export const uploadEditorFiles = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    // Local logic (omitted for brevity, typically mirrors Supabase style or local disk storage)
    next();
  } else {
    const upload = multer({
      storage: multer.memoryStorage(),
      fileFilter: docxOnlyFileFilter,
      limits: { fileSize: MAX_DOCUMENT_SIZE }
    });

    upload.fields([{ name: 'document', maxCount: 1 }, { name: 'editorDocument', maxCount: 1 }])(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      try {
        if (files.document && files.document[0]) {
          const docFile = files.document[0];
          const tempDir = path.join(process.cwd(), 'uploads', 'temp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

          const tempFilePath = path.join(tempDir, `temp-${Date.now()}${path.extname(docFile.originalname)}`);
          fs.writeFileSync(tempFilePath, docFile.buffer);

          const ext = path.extname(docFile.originalname).toLowerCase();
          let uploadBuffer;
          let finalMimetype = docFile.mimetype;
          let finalFilename = docFile.originalname;

          if (ext === '.docx') {
            // PROACTIVE CONVERSION FOR S3 IFRAME
            const { convertDocxToPdf } = await import('../services/adobe.service.js');
            const pdfBuffer = await convertDocxToPdf(tempFilePath);

            const pdfTempPath = tempFilePath.replace('.docx', '.pdf');
            fs.writeFileSync(pdfTempPath, pdfBuffer);

            // WATERMARK AFTER CONVERSION
            uploadBuffer = await addUploadWatermark(pdfTempPath, 'application/pdf');
            fs.unlinkSync(pdfTempPath);

            finalMimetype = 'application/pdf';
            finalFilename = docFile.originalname.replace('.docx', '.pdf');
          } else {
            uploadBuffer = await addUploadWatermark(tempFilePath, docFile.mimetype);
          }

          fs.unlinkSync(tempFilePath);

          const { url, storageKey, presignedUrl } = await uploadBufferToS3(uploadBuffer, finalFilename, finalMimetype, 'pdf');
          req.fileMeta = { url, storageKey, presignedUrl };
        }

        if (files.editorDocument && files.editorDocument[0]) {
          const editorDocFile = files.editorDocument[0];
          const tempFilePath = path.join(process.cwd(), 'uploads', 'temp', `ed-${Date.now()}${path.extname(editorDocFile.originalname)}`);
          fs.writeFileSync(tempFilePath, editorDocFile.buffer);
          const watermarkedBuffer = await addUploadWatermark(tempFilePath, editorDocFile.mimetype);
          fs.unlinkSync(tempFilePath);

          const { url } = await uploadBufferToS3(watermarkedBuffer, editorDocFile.originalname, editorDocFile.mimetype, 'pdf');
          req.body.editorDocumentUrl = url;
          req.body.editorDocumentType = path.extname(editorDocFile.originalname).toLowerCase().includes('doc') ? 'WORD' : 'PDF';
        }
        next();
      } catch (e) {
        res.status(500).json({ error: "S3 processing failed" });
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


