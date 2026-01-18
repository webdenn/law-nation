import { NotFoundError } from "@/utils/http-errors.util.js";
// /src/error-handlers/non-existing-routes.error-handler.ts
export function nonExistingRoutesErrorHandler(req, res, next) {
    const error = new NotFoundError("Not Found: The route you requested does not exist.");
    next(error);
}
//# sourceMappingURL=non-existing-route.error-handler.js.map