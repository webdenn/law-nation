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

// ---------- PDF AND WORD VALIDATION ----------
const allowedDocumentMimes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword" // .doc
];
const MAX_DOCUMENT_SIZE = parseInt(
  process.env.MAX_DOCUMENT_SIZE_BYTES ?? String(10 * 1024 * 1024),
  10
); // default 10MB

// For user uploads (PDF or Word)
const documentFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  if (allowedDocumentMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only PDF and Word (.docx, .doc) files are allowed"), false);
};

// For editor uploads (PDF only)
const pdfOnlyFileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are allowed for editor uploads"), false);
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
  
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
  if (!fs.existsSync(wordDir)) fs.mkdirSync(wordDir, { recursive: true });
  if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
  if (!fs.existsSync(tempImageDir)) fs.mkdirSync(tempImageDir, { recursive: true });
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

// ---------- SUPABASE UPLOAD HELPER ----------
async function uploadBufferToSupabase(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
  fileType: 'pdf' | 'image' = 'pdf'
): Promise<{ url: string; storageKey: string }> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }
  
  const folder = fileType === 'pdf' ? 'articles' : 'images';
  const storageKey = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalname)}`;
  
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

// ---------- DOCUMENT UPLOAD HANDLER (PDF or Word for users) ----------
export const uploadDocument = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadDocument.single("document")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file)
        return res.status(400).json({ error: "Document file (PDF or Word) required" });
      
      // Determine the path based on user authentication status
      const isLoggedIn = !!(req as any).user?.id;
      const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
      const url = `/${directory}${req.file.filename}`;
      
      req.fileUrl = url;
      req.fileMeta = { url, storageKey: req.file.filename };
      next();
    });
  } else {
    supabaseMemoryDocument.single("document")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "Document file (PDF or Word) required" });
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
    });
  }
};

// ---------- PDF ONLY UPLOAD HANDLER (for editors) ----------
export const uploadPdfOnly = (req: Request, res: Response, next: NextFunction) => {
  if (isLocal) {
    localUploadPdfOnly.single("pdf")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file)
        return res.status(400).json({ error: "PDF file required" });
      
      const url = `/uploads/pdfs/${req.file.filename}`;
      
      req.fileUrl = url;
      req.fileMeta = { url, storageKey: req.file.filename };
      next();
    });
  } else {
    supabaseMemoryPdfOnly.single("pdf")(req, res, (err) => {
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
    localUploadDocument.single("pdf")(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err.message });
      if (req.file) {
        const isLoggedIn = !!(req as any).user?.id;
        const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
        const url = `/${directory}${req.file.filename}`;
        
        req.fileUrl = url;
        req.fileMeta = { url, storageKey: req.file.filename };
      }
      
      next();
    });
  } else {
    supabaseMemoryDocument.single("pdf")(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err.message });
      
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return next();
      }
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
      fileFilter: documentFileFilter,
      limits: { fileSize: MAX_DOCUMENT_SIZE }
    });

    upload.fields([
      { name: 'document', maxCount: 1 },      // Required: corrected article
      { name: 'editorDocument', maxCount: 1 } // Optional: editor's notes/diff
    ])(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Handle main corrected document (required)
      if (files.document && files.document[0]) {
        const docFile = files.document[0];
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
        const ext = path.extname(editorDocFile.originalname).toLowerCase();
        const docType = (ext === '.docx' || ext === '.doc') ? 'WORD' : 'PDF';
        
        req.body.editorDocumentUrl = `/uploads/editor-docs/${editorDocFile.filename}`;
        req.body.editorDocumentType = docType;
      }
      
      next();
    });
  } else {
    const upload = multer({
      storage: multer.memoryStorage(),
      fileFilter: documentFileFilter,
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
          const { url, storageKey } = await uploadBufferToSupabase(
            docFile.buffer,
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
          
          const { url } = await uploadBufferToSupabase(
            editorDocFile.buffer,
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
    ])(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const isLoggedIn = !!(req as any).user?.id;
      
      // Handle PDF
      if (files.pdf && files.pdf[0]) {
        const pdfFile = files.pdf[0];
        const directory = isLoggedIn ? 'uploads/pdfs/' : 'uploads/temp/';
        req.fileMeta = {
          url: `/${directory}${pdfFile.filename}`,
          storageKey: pdfFile.filename
        };
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
        // Handle PDF
        if (files.pdf && files.pdf[0]) {
          const pdfFile = files.pdf[0];
          const { url, storageKey } = await uploadBufferToSupabase(
            pdfFile.buffer,
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
