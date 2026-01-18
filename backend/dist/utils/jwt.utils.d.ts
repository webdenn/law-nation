/**
 * Creates a signed JWT access token for a given user ID.
 */
export declare function signAccessToken(userId: string): string;
/**
 * Verifies and decodes a JWT access token.
 */
export declare function verifyAccessToken(token: string): {
    sub: string;
    iat: number;
    exp: number;
};
/**
 * Creates a refresh token for a user and stores its hashed version in the DB.
 */
export declare function createRefreshTokenForUser(userId: string): Promise<string>;
/**
 * Revokes all refresh tokens matching a given raw token.
 */
export declare function revokeRefreshToken(rawToken: string): Promise<void>;
/**
 * Consumes a refresh token (verifies and revokes it).
 * Returns the associated user ID if valid, otherwise null.
 */
export declare function consumeRefreshToken(rawToken: string): Promise<string | null>;
//# sourceMappingURL=jwt.utils.d.ts.map