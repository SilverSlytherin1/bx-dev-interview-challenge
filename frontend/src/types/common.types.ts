// UI component types
export type ButtonVariant = 'text' | 'outlined' | 'contained';
export type AlertSeverity = 'error' | 'warning' | 'info' | 'success';
export type Size = 'small' | 'medium' | 'large';

// File upload types
export type UploadMethod = 'presigned' | 'direct';
export type DownloadMethod = 'presigned' | 'stream';

// Authentication states
export type AuthState = 'authenticated' | 'unauthenticated' | 'pending';

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Theme modes
export type ThemeMode = 'light' | 'dark' | 'auto';

// File upload status
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

// Form validation states
export type ValidationState = 'valid' | 'invalid' | 'pending';

// API response status
export type ApiStatus = 'success' | 'error' | 'loading';
