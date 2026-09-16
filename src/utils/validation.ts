/**
 * ICOH Portal - Validation Utilities
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePassword(password: string): ValidationResult {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one numerical digit (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special symbol (e.g. @, #, $, !).' };
  }
  return { valid: true };
}

export function validateStaffId(staffId: string): ValidationResult {
  if (!staffId || staffId.trim().length === 0) {
    return { valid: false, error: 'Staff ID is required.' };
  }
  const clean = staffId.trim();
  if (clean.length > 32) {
    return { valid: false, error: 'Staff ID cannot exceed 32 characters.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { valid: false, error: 'Staff ID can only contain letters, numbers, hyphens, and underscores.' };
  }
  return { valid: true };
}

export function validatePayslipFile(file: File, maxSizeMB: number = 10): ValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // Type validation: strictly application/pdf
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'Only PDF documents (.pdf) are permitted for payslip uploads.' };
  }

  // Size limit validation (10MB default)
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `File size exceeds the maximum allowed limit of ${maxSizeMB}MB.` };
  }

  // Filename sanitation check to prevent directory traversal or script injection
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (sanitizedName.length > 150) {
    return { valid: false, error: 'Filename is too long. Please rename file before uploading.' };
  }

  return { valid: true };
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 120);
}
