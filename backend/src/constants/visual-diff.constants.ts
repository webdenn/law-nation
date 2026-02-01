/**
 * Visual Diff Status Constants
 * Used for concurrency control and status tracking
 */
export const VISUAL_DIFF_STATUS = {
  PENDING: 'PENDING',       // Initial state, not generated yet
  GENERATING: 'GENERATING', // Currently being generated (locked)
  READY: 'READY',          // Successfully generated and available
  FAILED: 'FAILED',        // Generation failed, can retry
} as const;

export type VisualDiffStatus = typeof VISUAL_DIFF_STATUS[keyof typeof VISUAL_DIFF_STATUS];

/**
 * Visual Diff Configuration
 */
export const VISUAL_DIFF_CONFIG = {
  // Base directory for visual diff files (relative to uploads)
  BASE_DIR: 'visual-diffs',
  
  // File naming pattern
  FILE_PREFIX: 'visual-diff-v',
  
  // Generation timeout (5 minutes)
  GENERATION_TIMEOUT_MS: 5 * 60 * 1000,
  
  // Retry attempts for failed generations
  MAX_RETRY_ATTEMPTS: 3,
} as const;