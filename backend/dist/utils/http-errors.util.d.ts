export declare class HttpError extends Error {
    status: number;
    details?: any;
    constructor(status: number, message: string, details?: any);
}
export declare class BadRequestError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class UnauthorizedError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class ForbiddenError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class NotFoundError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class InternalServerError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class NotAuthenticatedError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class ZodValidationError extends HttpError {
    errors: any[];
    constructor(errors: any[], message?: string, details?: any);
}
//# sourceMappingURL=http-errors.util.d.ts.map