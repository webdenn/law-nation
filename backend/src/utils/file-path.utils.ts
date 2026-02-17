import path from 'path';
import fs from 'fs';

/**
 * Check if a path is a URL
 */
function isUrl(filePath: string): boolean {
  return filePath.startsWith('http://') || filePath.startsWith('https://');
}

/**
 * Resolve file path to absolute path
 * Handles URLs, web-style paths, relative paths, and absolute paths
 */
export function resolveToAbsolutePath(filePath: string): string {
  console.log(`🔧 [Path Utils] Resolving: ${filePath}`);
  
  // Check if it's a URL (Supabase or other remote URLs)
  if (isUrl(filePath)) {
    console.log(`🌐 [Path Utils] URL detected, returning as-is: ${filePath}`);
    return filePath; // Return URLs unchanged - they should be handled by download logic
  }
  
  // Check if it's a Windows absolute path (C:\... or D:\...)
  const isWindowsAbsolute = /^[A-Za-z]:\\/.test(filePath);
  // Check if it's a Unix absolute path (starts with / and has more than just /)
  const isUnixAbsolute = path.isAbsolute(filePath) && !filePath.startsWith('/uploads') && !filePath.startsWith('/temp') && !filePath.startsWith('/pdfs') && !filePath.startsWith('/words');
  
  if (isWindowsAbsolute || isUnixAbsolute) {
    console.log(`🔧 [Path Utils] Already absolute: ${filePath}`);
    return filePath;
  }
  
  // Handle web-style paths that start with / (these are NOT absolute paths in our context)
  if (filePath.startsWith('/')) {
    const relativePart = filePath.substring(1); // Remove leading /
    const absolutePath = path.join(process.cwd(), relativePart);
    console.log(`🔧 [Path Utils] Web-style path: ${filePath} → ${absolutePath}`);
    return absolutePath;
  }
  
  // Handle regular relative paths
  const absolutePath = path.join(process.cwd(), filePath);
  console.log(`🔧 [Path Utils] Relative path: ${filePath} → ${absolutePath}`);
  return absolutePath;
}

/**
 * Check if file exists at the resolved absolute path
 * For URLs, this will return false since they're not local files
 */
export function fileExistsAtPath(filePath: string): boolean {
  // If it's a URL, we can't check local file existence
  if (isUrl(filePath)) {
    console.log(`🌐 [Path Utils] URL detected, cannot check local existence: ${filePath}`);
    return false; // URLs don't exist as local files
  }
  
  const absolutePath = resolveToAbsolutePath(filePath);
  const exists = fs.existsSync(absolutePath);
  console.log(`🔧 [Path Utils] File exists check: ${absolutePath} → ${exists ? '✅' : '❌'}`);
  return exists;
}

/**
 * Convert absolute path to web-style relative path
 * URLs are returned as-is since they're already web-accessible
 */
export function convertToWebPath(absolutePath: string): string {
  // If it's a URL, return as-is (already web-accessible)
  if (isUrl(absolutePath)) {
    console.log(`🌐 [Path Utils] URL detected, returning as-is: ${absolutePath}`);
    return absolutePath;
  }
  
  const workspaceRoot = process.cwd();
  
  // If it's already a web-style path (starts with /uploads, /temp, etc.), return as-is
  if (absolutePath.startsWith('/uploads') || absolutePath.startsWith('/temp') || absolutePath.startsWith('/pdfs') || absolutePath.startsWith('/words')) {
    console.log(`🔧 [Path Utils] Already web path: ${absolutePath}`);
    return absolutePath;
  }
  
  // If not absolute, convert to web path
  if (!path.isAbsolute(absolutePath)) {
    const webPath = '/' + absolutePath.replace(/\\/g, '/');
    console.log(`🔧 [Path Utils] Converting to web path: ${absolutePath} → ${webPath}`);
    return webPath;
  }
  
  // Convert absolute path to relative path
  const relativePath = path.relative(workspaceRoot, absolutePath);
  
  // Convert Windows backslashes to forward slashes for web URLs
  const webPath = '/' + relativePath.replace(/\\/g, '/');
  
  console.log(`🔧 [Path Utils] Absolute to web path: ${absolutePath} → ${webPath}`);
  return webPath;
}