// /src/utils/http-error.util.ts
export class HttpError extends Error {
  status: number;
  details?: any;

  constructor(status: number, message: string, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

// Common HTTP error classes extending HttpError

export class BadRequestError extends HttpError {
  constructor(message: string = "Bad Request", details?: any) {
    super(400, message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = "Unauthorized", details?: any) {
    super(401, message, details);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = "Forbidden", details?: any) {
    super(403, message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = "Not Found", details?: any) {
    super(404, message, details);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string = "Internal Server Error", details?: any) {
    super(500, message, details);
  }
}

export class NotAuthenticatedError extends HttpError {
  constructor(message: string = "Not Authenticated", details?: any) {
    super(401, message, details);
  }
}

export class ZodValidationError extends HttpError {
  errors: any[];

  constructor(
    errors: any[],
    message: string = "Validation Error",
    details?: any
  ) {
    super(400, message, details);
    this.errors = errors;
    Object.setPrototypeOf(this, ZodValidationError.prototype);
  }
}
