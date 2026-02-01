/**
 * Google reCAPTCHA Verification Utility
 */

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

/**
 * Verify reCAPTCHA token with Google API
 * @param token - reCAPTCHA token from frontend
 * @param remoteIp - User's IP address (optional)
 * @returns Verification result
 */
export async function verifyRecaptcha(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; score?: number; error?: string }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error('❌ [reCAPTCHA] RECAPTCHA_SECRET_KEY not configured');
    return {
      success: false,
      error: 'reCAPTCHA not configured on server',
    };
  }

  try {
    console.log('🔐 [reCAPTCHA] Verifying token...');

    // Prepare request to Google reCAPTCHA API
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    // Send verification request to Google
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error('❌ [reCAPTCHA] Google API request failed:', response.status);
      return {
        success: false,
        error: 'reCAPTCHA verification service unavailable',
      };
    }

    const data = await response.json() as RecaptchaResponse;

    console.log('📊 [reCAPTCHA] Verification result:', {
      success: data.success,
      score: data.score,
      hostname: data.hostname,
    });

    // Check for errors
    if (data['error-codes'] && data['error-codes'].length > 0) {
      console.error('❌ [reCAPTCHA] Verification errors:', data['error-codes']);
      return {
        success: false,
        error: `reCAPTCHA verification failed: ${data['error-codes'].join(', ')}`,
      };
    }

    // For reCAPTCHA v3, check score (0.0 - 1.0)
    // 1.0 = very likely human, 0.0 = very likely bot
    if (data.score !== undefined) {
      const minScore = 0.5; // Adjust threshold as needed
      if (data.score < minScore) {
        console.warn(`⚠️ [reCAPTCHA] Low score: ${data.score} (threshold: ${minScore})`);
        return {
          success: false,
          score: data.score,
          error: 'Suspicious activity detected. Please try again.',
        };
      }
    }

    if (data.success) {
      console.log('✅ [reCAPTCHA] Verification successful');
      return {
        success: true,
        ...(data.score !== undefined && { score: data.score }),
      };
    } else {
      console.error('❌ [reCAPTCHA] Verification failed');
      return {
        success: false,
        error: 'reCAPTCHA verification failed',
      };
    }
  } catch (error) {
    console.error('❌ [reCAPTCHA] Verification error:', error);
    return {
      success: false,
      error: 'reCAPTCHA verification failed due to server error',
    };
  }
}
