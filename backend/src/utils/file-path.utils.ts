import path from 'path';
import fs from 'fs';

/**
 * Resolve file path to absolute path
 * Handles web-style paths, relative paths, and absolute paths
 */
export function resolveToAbsolutePath(filePath: string): string {
  console.log(`🔧 [Path Utils] Resolving: ${filePath}`);
  
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
 */
export function fileExistsAtPath(filePath: string): boolean {
  const absolutePath = resolveToAbsolutePath(filePath);
  const exists = fs.existsSync(absolutePath);
  console.log(`🔧 [Path Utils] File exists check: ${absolutePath} → ${exists ? '✅' : '❌'}`);
  return exists;
}

/**
 * Convert absolute path to web-style relative path
 */
export function convertToWebPath(absolutePath: string): string {
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