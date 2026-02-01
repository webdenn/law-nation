// /src/utils/http-error.util.ts
export class HttpError extends Error {
    status;
    details;
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}
// Common HTTP error classes extending HttpError
export class BadRequestError extends HttpError {
    constructor(message = "Bad Request", details) {
        super(400, message, details);
    }
}
export class UnauthorizedError extends HttpError {
    constructor(message = "Unauthorized", details) {
        super(401, message, details);
    }
}
export class ForbiddenError extends HttpError {
    constructor(message = "Forbidden", details) {
        super(403, message, details);
    }
}
export class NotFoundError extends HttpError {
    constructor(message = "Not Found", details) {
        super(404, message, details);
    }
}
export class InternalServerError extends HttpError {
    constructor(message = "Internal Server Error", details) {
        super(500, message, details);
    }
}
export class NotAuthenticatedError extends HttpError {
    constructor(message = "Not Authenticated", details) {
        super(401, message, details);
    }
}
export class ZodValidationError extends HttpError {
    errors;
    constructor(errors, message = "Validation Error", details) {
        super(400, message, details);
        this.errors = errors;
        Object.setPrototypeOf(this, ZodValidationError.prototype);
    }
}
//# sourceMappingURL=http-errors.util.js.map