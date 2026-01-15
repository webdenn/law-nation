/**
 * API utilities for overlay visual diff
 * Provides endpoints for frontend to get highlight data
 */

import { generateOverlayVisualDiff } from './overlay-visual-diff.utils.js';
import type { VisualDiffResponse } from './overlay-visual-diff.utils.js';

/**
 * API response for visual diff overlay data
 */
export interface OverlayApiResponse {
  success: boolean;
  data?: {
    pdfUrl: string; // URL to existing edited PDF
    highlights: any[]; // Highlight data for frontend
    summary: {
      addedCount: number;
      removedCount: number;
      modifiedCount: number;
      totalChanges: number;
    };
    metadata: {
      timestamp: string;
      approach: string;
      version: string;
    };
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * Generate overlay data for API response
 * @param originalPdfPath - Path to original PDF
 * @param editedPdfPath - Path to edited PDF
 * @param baseUrl - Base URL for PDF access
 * @returns API response with overlay data
 */
export async function generateOverlayApiResponse(
  originalPdfPath: string,
  editedPdfPath: string,
  baseUrl: string = ''
): Promise<OverlayApiResponse> {
  console.log('\n🌐 [Overlay API] Generating overlay API response...');
  console.log(`📄 [Overlay API] Original: ${originalPdfPath}`);
  console.log(`📄 [Overlay API] Edited: ${editedPdfPath}`);
  console.log(`🌍 [Overlay API] Base URL: ${baseUrl}`);
  
  try {
    // Generate overlay visual diff
    const overlayResult: VisualDiffResponse = await generateOverlayVisualDiff(originalPdfPath, editedPdfPath);
    
    if (!overlayResult.success) {
      console.error('❌ [Overlay API] Overlay generation failed:', overlayResult.message);
      
      return {
        success: false,
        error: {
          message: overlayResult.message,
          code: 'OVERLAY_GENERATION_FAILED',
          details: overlayResult.highlightData
        }
      };
    }
    
    // Convert file path to URL
    let pdfUrl = overlayResult.pdfPath;
    if (pdfUrl.startsWith('/uploads')) {
      pdfUrl = `${baseUrl}${pdfUrl}`;
    }
    
    const apiResponse: OverlayApiResponse = {
      success: true,
      data: {
        pdfUrl,
        highlights: overlayResult.highlightData.highlights,
        summary: overlayResult.summary,
        metadata: {
          timestamp: overlayResult.highlightData.timestamp,
          approach: overlayResult.highlightData.approach,
          version: overlayResult.highlightData.version
        }
      }
    };
    
    console.log('✅ [Overlay API] API response generated successfully');
    console.log(`   🌍 PDF URL: ${apiResponse.data!.pdfUrl}`);
    console.log(`   🎨 Highlights: ${apiResponse.data!.highlights.length}`);
    console.log(`   📊 Changes: +${apiResponse.data!.summary.addedCount} -${apiResponse.data!.summary.removedCount} ~${apiResponse.data!.summary.modifiedCount}`);
    
    return apiResponse;
    
  } catch (error) {
    console.error('❌ [Overlay API] Failed to generate API response:', error);
    
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        code: 'API_GENERATION_FAILED',
        details: {
          originalPdfPath,
          editedPdfPath,
          baseUrl,
          timestamp: new Date().toISOString()
        }
      }
    };
  }
}

/**
 * Create test overlay API response for debugging
 * @param editedPdfPath - Path to edited PDF
 * @param baseUrl - Base URL for PDF access
 * @returns Test API response
 */
export async function generateTestOverlayApiResponse(
  editedPdfPath: string,
  baseUrl: string = ''
): Promise<OverlayApiResponse> {
  console.log('\n🧪 [Test Overlay API] Generating test API response...');
  console.log(`📄 [Test Overlay API] Edited PDF: ${editedPdfPath}`);
  console.log(`🌍 [Test Overlay API] Base URL: ${baseUrl}`);
  
  try {
    // Convert file path to URL
    let pdfUrl = editedPdfPath;
    if (pdfUrl.startsWith('/uploads')) {
      pdfUrl = `${baseUrl}${pdfUrl}`;
    }
    
    const testResponse: OverlayApiResponse = {
      success: true,
      data: {
        pdfUrl,
        highlights: [
          {
            type: 'added',
            text: 'test change',
            page: 1,
            searchText: 'test change',
            color: '#22c55e',
            opacity: 0.3
          }
        ],
        summary: {
          addedCount: 2,
          removedCount: 0,
          modifiedCount: 0,
          totalChanges: 2
        },
        metadata: {
          timestamp: new Date().toISOString(),
          approach: 'overlay-test',
          version: '1.0-test'
        }
      }
    };
    
    console.log('✅ [Test Overlay API] Test API response generated');
    console.log(`   🧪 Test highlights: ${testResponse.data!.highlights.length}`);
    
    return testResponse;
    
  } catch (error) {
    console.error('❌ [Test Overlay API] Failed to generate test response:', error);
    
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        code: 'TEST_API_FAILED'
      }
    };
  }
}