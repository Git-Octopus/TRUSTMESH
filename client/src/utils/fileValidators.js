export function validateEvidenceFile(file, maxMb = 5) {
  if (!file) return { valid: false, error: 'No file selected' };
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `File exceeds maximum size of ${maxMb}MB` };
  }
  return { valid: true };
}
