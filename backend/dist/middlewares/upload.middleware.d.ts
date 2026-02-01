import type { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            fileUrl?: string;
            fileUrls?: Array<{
                url: string;
                storageKey?: string;
            }>;
            fileMeta?: {
                url: string;
                storageKey?: string;
            } | null;
            isDocumentUpload?: boolean;
        }
    }
}
export declare const uploadDocument: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadPdfOnly: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadPdf: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadMultiplePdfs: (fieldName?: string, maxCount?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadOptionalPdf: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadEditorFiles: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadImage: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadMultipleImages: (fieldName?: string, maxCount?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadOptionalImage: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadArticleFiles: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadDocxOnly: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=upload.middleware.d.ts.map