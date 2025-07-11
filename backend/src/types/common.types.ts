// Authentication and authorization types
export type UserRole = 'admin' | 'user';
export type AuthProvider = 'local' | 'google' | 'github';

// File upload types
export type UploadMethod = 'presigned' | 'direct';
export type DownloadMethod = 'presigned' | 'stream';

// HTTP status types
export type HttpStatus = 200 | 201 | 400 | 401 | 403 | 404 | 500;

// Environment types
export type Environment = 'development' | 'production' | 'test';

// S3 configuration types
export type S3Region =
  | 'us-east-1'
  | 'us-west-1'
  | 'us-west-2'
  | 'eu-west-1'
  | 'eu-central-1'
  | 'ap-southeast-1'
  | 'ap-northeast-1';

// File validation result types
export type ValidationResult =
  | 'valid'
  | 'invalid_size'
  | 'invalid_type'
  | 'invalid_name';

// Database connection types
export type DatabaseType = 'postgres' | 'mysql' | 'sqlite';
