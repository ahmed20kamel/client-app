// Maps API error messages to translation keys in the "errors" namespace
const ERROR_MAP: Record<string, string> = {
  // Auth errors
  'Unauthorized': 'errors.unauthorized',
  'unauthorized': 'errors.unauthorized',
  'Forbidden': 'errors.forbidden',
  'forbidden': 'errors.forbidden',
  'Invalid credentials': 'errors.invalidCredentials',
  'Invalid email or password': 'errors.invalidCredentials',
  'Account is disabled': 'errors.accountDisabled',
  'Session expired': 'errors.sessionExpired',

  // CRUD errors
  'Not found': 'errors.notFound',
  'Customer not found': 'errors.notFound',
  'User not found': 'errors.notFound',
  'Task not found': 'errors.notFound',
  'Department not found': 'errors.notFound',
  'Attachment not found': 'errors.notFound',

  // Duplicate/conflict errors
  'National ID already exists': 'errors.nationalIdExists',
  'Email already exists': 'errors.emailExists',
  'Email is already in use': 'errors.emailExists',
  'Phone already exists': 'errors.phoneExists',

  // File errors
  'File too large (max 10MB)': 'errors.fileTooLarge',
  'File type not allowed': 'errors.fileTypeNotAllowed',
  'No file provided': 'errors.noFileProvided',
  'Category is required': 'errors.categoryRequired',

  // Password errors
  'Current password is incorrect': 'errors.currentPasswordWrong',
  'Current password is wrong': 'errors.currentPasswordWrong',

  // Server errors
  'Internal server error': 'errors.serverError',
  'Internal Server Error': 'errors.serverError',
  'Failed to update customer. Please try again.': 'errors.updateFailed',
  'Failed to create customer. Please try again.': 'errors.createFailed',
  'Please restart the server to apply database changes': 'errors.serverRestart',
};

// Patterns to match partial error messages
const ERROR_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /phone.*valid.*uae/i, key: 'validation.invalidPhone' },
  { pattern: /emirates.*id.*format/i, key: 'validation.invalidEmiratesId' },
  { pattern: /email.*invalid|invalid.*email/i, key: 'validation.invalidEmail' },
  { pattern: /password.*uppercase|password.*lowercase|password.*number|password.*special/i, key: 'errors.passwordTooWeak' },
  { pattern: /must be at least (\d+) characters/i, key: 'validation.minLength' },
  { pattern: /already exists|already in use|duplicate/i, key: 'errors.conflict' },
  { pattern: /not found/i, key: 'errors.notFound' },
  { pattern: /required/i, key: 'validation.required' },
  { pattern: /too large/i, key: 'errors.fileTooLarge' },
  { pattern: /not allowed|not supported/i, key: 'errors.fileTypeNotAllowed' },
];

/**
 * Translates an API error response into a user-friendly localized message.
 *
 * @param error - The error string from the API response
 * @param t - The translation function from next-intl
 * @returns A user-friendly error message in the current locale
 */
export function getApiErrorMessage(
  error: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  // 1. Try exact match
  const exactKey = ERROR_MAP[error];
  if (exactKey) {
    try {
      return t(exactKey);
    } catch {
      return error;
    }
  }

  // 2. Try pattern match
  for (const { pattern, key } of ERROR_PATTERNS) {
    if (pattern.test(error)) {
      try {
        return t(key);
      } catch {
        return error;
      }
    }
  }

  // 3. Fallback: return unknown error message
  try {
    return t('errors.unknown');
  } catch {
    return error;
  }
}

/**
 * Handles API response errors and shows appropriate toast message.
 * Use this instead of manual toast.error() for consistent error handling.
 *
 * @param response - The fetch Response object
 * @param t - The translation function from next-intl
 * @returns The error message string, or null if response was ok
 */
export async function handleApiError(
  response: Response,
  t: (key: string, params?: Record<string, string | number>) => string
): Promise<string | null> {
  if (response.ok) return null;

  try {
    const data = await response.json();
    const errorMsg = data.error || data.message || '';
    return getApiErrorMessage(errorMsg, t);
  } catch {
    // If we can't parse the response, map by status code
    switch (response.status) {
      case 401:
        return t('errors.unauthorized');
      case 403:
        return t('errors.forbidden');
      case 404:
        return t('errors.notFound');
      case 409:
        return t('errors.conflict');
      case 500:
        return t('errors.serverError');
      default:
        return t('errors.unknown');
    }
  }
}
