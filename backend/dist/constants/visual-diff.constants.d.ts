/**
 * Visual Diff Status Constants
 * Used for concurrency control and status tracking
 */
export declare const VISUAL_DIFF_STATUS: {
    readonly PENDING: "PENDING";
    readonly GENERATING: "GENERATING";
    readonly READY: "READY";
    readonly FAILED: "FAILED";
};
export type VisualDiffStatus = typeof VISUAL_DIFF_STATUS[keyof typeof VISUAL_DIFF_STATUS];
/**
 * Visual Diff Configuration
 */
export declare const VISUAL_DIFF_CONFIG: {
    readonly BASE_DIR: "visual-diffs";
    readonly FILE_PREFIX: "visual-diff-v";
    readonly GENERATION_TIMEOUT_MS: number;
    readonly MAX_RETRY_ATTEMPTS: 3;
};
//# sourceMappingURL=visual-diff.constants.d.ts.map