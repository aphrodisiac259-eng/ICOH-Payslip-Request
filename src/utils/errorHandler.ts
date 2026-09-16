/**
 * ICOH Portal - User-Friendly Error Handler
 * Translates Firebase and system exceptions into clear, professional corporate messages.
 */

export function getFriendlyErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = error instanceof Error ? error.message : String(error);

  // Check if it's our JSON-formatted FirestoreErrorInfo
  if (message.startsWith('{') && message.includes('"error"')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.error && parsed.error.includes('permission')) {
        return 'Access denied. You do not have the required institutional authorization for this resource.';
      }
      return parsed.error || 'Database operation was rejected by security rules.';
    } catch {
      // Fall through
    }
  }

  // Firebase Auth specific error codes
  if (message.includes('auth/invalid-api-key') || message.includes('auth/api-key-not-valid') || message.includes('your_api_key')) {
    return 'Firebase Web API Key is invalid or set to placeholder ("your_api_key"). Please provide your valid Firebase Web API Key in .env (found in Firebase Console > Project Settings).';
  }
  if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) {
    return 'Invalid Staff ID, email, or password. Please verify your credentials.';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Access temporarily blocked due to multiple failed login attempts. Please wait a few minutes before trying again.';
  }
  if (message.includes('auth/user-disabled')) {
    return 'This staff account has been deactivated by the administrator. Contact Payroll Desk.';
  }
  if (message.includes('auth/email-already-in-use')) {
    return 'An account with this email address already exists in the portal.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Password is too weak. Please ensure it has at least 8 characters with numbers and symbols.';
  }
  if (message.includes('auth/requires-recent-login')) {
    return 'For your security, please sign out and sign in again before modifying security credentials.';
  }
  if (message.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
    return 'Permission denied: You are not authorized to perform this operation or view this record.';
  }
  if (message.includes('unavailable') || message.includes('client is offline')) {
    return 'Service connection temporarily unavailable. Please check your internet connectivity.';
  }

  return message.length < 150 ? message : 'An unexpected error occurred. Please contact the ICOH IT Helpdesk.';
}
