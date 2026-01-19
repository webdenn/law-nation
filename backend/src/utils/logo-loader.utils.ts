import fs from 'fs';
import path from 'path';

/**
 * Simple logo loader utility to avoid TypeScript issues in main service
 */
export function loadCompanyLogo(): { found: boolean; path?: string; size?: number } {
  try {
    // Your specific logo file
    const logoPath = path.join(process.cwd(), 'src', 'assests', 'img', 'Screenshot 2026-01-09 204120.png');
    
    console.log(`🔍 [Logo Loader] Checking for logo at: ${logoPath}`);
    
    if (fs.existsSync(logoPath)) {
      const stats = fs.statSync(logoPath);
      console.log(`✅ [Logo Loader] Found logo file!`);
      console.log(`📊 [Logo Loader] File size: ${stats.size} bytes`);
      
      return {
        found: true,
        path: logoPath,
        size: stats.size
      };
    } else {
      console.warn(`❌ [Logo Loader] Logo file not found at: ${logoPath}`);
      return { found: false };
    }
  } catch (error: any) {
    console.error(`❌ [Logo Loader] Error loading logo:`, error.message);
    return { found: false };
  }
}

/**
 * Get logo bytes for embedding
 */
export function getLogoBytes(logoPath: string): Buffer | null {
  try {
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath);
    }
    return null;
  } catch (error) {
    console.error(`❌ [Logo Loader] Error reading logo bytes:`, error);
    return null;
  }
}