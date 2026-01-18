// /src/error-handlers/jwt.error-handler.ts
export function jwtErrorHandler(err, req, res, next) {
    if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired" });
    }
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token" });
    }
    if (err.name === "NotBeforeError") {
        return res.status(401).json({ error: "Token not active yet" });
    }
    next(err);
}
//# sourceMappingURL=jwt.error-handler.js.map