// MIME type whitelist for file uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/x-wav',
  'video/mp4',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MIME_EXT_MAP = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'application/pdf': ['.pdf'],
  'audio/mpeg': ['.mp3'],
  'audio/mp3': ['.mp3'],
  'audio/mp4': ['.m4a', '.mp4'],
  'audio/x-m4a': ['.m4a'],
  'audio/ogg': ['.ogg'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'video/mp4': ['.mp4'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

/**
 * Validate MIME type of uploaded media.
 * Checks both the declared type and the file extension.
 */
export function validateMimeType(fileName, mimeType) {
  if (!mimeType) return { valid: false, error: 'Tipo de archivo no especificado' };
  
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Tipo de archivo no permitido: ${mimeType}` };
  }

  // Cross-check extension if filename provided
  if (fileName) {
    const ext = ('.' + fileName.split('.').pop()).toLowerCase();
    const allowedExts = MIME_EXT_MAP[mimeType];
    if (allowedExts && !allowedExts.includes(ext)) {
      return { valid: false, error: `La extensión del archivo no coincide con el tipo declarado` };
    }
  }

  return { valid: true };
}
