export interface FileUploadResponse {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface FileListResponse {
  files: FileUploadResponse[];
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fields: Record<string, string>;
  fileId: string;
  s3Key: string;
}

export interface FileValidationConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFileNameLength: number;
}

export class FileService {
  private readonly baseUrl: string;
  private getAuthHeaders: () => Record<string, string>;
  private validationConfig: FileValidationConfig | null = null;

  constructor(getAuthHeaders: () => Record<string, string>) {
    // Since we have a proxy configured in rsbuild.config.ts, we can use relative URLs
    // The proxy will forward /api requests to http://localhost:3000
    this.baseUrl = "";
    this.getAuthHeaders = getAuthHeaders;
  }

  // Main upload method using presigned URLs (default)
  async uploadFile(file: File): Promise<FileUploadResponse> {
    // Validate file before starting upload
    await this.validateFile(file);

    // Step 1: Get presigned URL
    const presignedResponse = await this.getPresignedUploadUrl(
      file.name,
      file.type,
      file.size
    );

    // Step 2: Upload directly to S3 using presigned URL with retry logic
    await this.uploadToS3WithRetry(file, presignedResponse);

    // Step 3: Confirm upload with backend
    const confirmResponse = await this.confirmUpload(presignedResponse.fileId);

    return confirmResponse;
  }

  // Direct upload through backend (alternative method)
  async uploadFileDirect(file: File): Promise<FileUploadResponse> {
    await this.validateFile(file);

    const formData = new FormData();
    formData.append("file", file);

    const authHeaders = this.getAuthHeaders();
    const headers: Record<string, string> = {};

    // Only add Authorization header, not Content-Type for FormData
    if (authHeaders.Authorization) {
      headers.Authorization = authHeaders.Authorization;
    }

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  }

  // Get validation configuration from backend
  async getValidationConfig(): Promise<FileValidationConfig> {
    if (!this.validationConfig) {
      const response = await fetch(`${this.baseUrl}/api/files/validation-config`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch validation config: ${response.statusText}`);
      }

      this.validationConfig = await response.json();
    }
    return this.validationConfig!;
  }

  private async validateFile(file: File): Promise<void> {
    // Get validation config from backend
    const config = await this.getValidationConfig();

    if (file.size <= 0) {
      throw new Error("File size must be greater than 0");
    }

    if (file.size > config.maxFileSize) {
      const maxSizeMB = config.maxFileSize / (1024 * 1024);
      throw new Error(
        `File size exceeds maximum allowed size of ${maxSizeMB}MB`
      );
    }

    if (!file.type || !config.allowedMimeTypes.includes(file.type.toLowerCase())) {
      throw new Error(
        `File type '${file.type}' is not allowed. Allowed types: ${config.allowedMimeTypes.join(', ')}`
      );
    }

    if (!file.name || file.name.trim() === "") {
      throw new Error("File name is required");
    }

    if (file.name.length > config.maxFileNameLength) {
      throw new Error(
        `File name exceeds maximum length of ${config.maxFileNameLength} characters`
      );
    }

    // Check for dangerous characters (exclude control characters for regex safety)
    const dangerousChars = /[<>:"/\\|?*]/;
    if (dangerousChars.test(file.name)) {
      throw new Error(
        'File name contains invalid characters'
      );
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(file.name)) {
      throw new Error(
        'File name uses a reserved name'
      );
    }

    // Validate file extension
    const extension = this.getFileExtension(file.name);
    if (!extension) {
      throw new Error('File must have an extension');
    }

    if (!config.allowedExtensions.includes(extension.toLowerCase())) {
      throw new Error(
        `File extension '${extension}' is not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`
      );
    }
  }

  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
      return '';
    }
    return fileName.substring(lastDotIndex);
  }

  /**
   * Format file size for human readability
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  private async getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    contentLength: number
  ): Promise<PresignedUploadResponse> {
    const response = await fetch(`${this.baseUrl}/api/upload/presigned`, {
      method: "POST",
      headers: {
        ...this.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName,
        contentType,
        contentLength,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get presigned URL: ${response.statusText}`);
    }

    return response.json();
  }

  private async uploadToS3WithRetry(
    file: File,
    presignedData: PresignedUploadResponse,
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.uploadToS3(file, presignedData);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Upload failed");
        console.warn(`Upload attempt ${attempt} failed:`, lastError.message);

        if (attempt === maxRetries) {
          break; // Don't wait after the last attempt
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    throw new Error(
      `Upload failed after ${maxRetries} attempts: ${
        lastError?.message || "Unknown error"
      }`
    );
  }

  private async uploadToS3(
    file: File,
    presignedData: PresignedUploadResponse
  ): Promise<void> {
    const { uploadUrl } = presignedData;

    // For presigned URLs, we should not set any headers that weren't included in the signature
    // The Content-Type was already included when generating the presigned URL
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`S3 upload failed (${response.status}): ${errorText}`);
    }

    // Verify the response
    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  }

  private async confirmUpload(fileId: string): Promise<FileUploadResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/upload/${fileId}/confirm`,
      {
        method: "PUT",
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to confirm upload: ${response.statusText}`);
    }

    return response.json();
  }

  async listFiles(): Promise<FileListResponse> {
    const response = await fetch(`${this.baseUrl}/api/files`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/files/${fileId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/api/files/${fileId}/download-url`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Failed to get download URL (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();

    if (!data.url) {
      throw new Error("Download URL not provided in response");
    }

    return data.url;
  }

  // Direct download through backend (alternative method)
  async getDownloadBlob(
    fileId: string,
    method: "direct" | "presigned" = "presigned"
  ): Promise<Blob> {
    const url =
      method === "direct"
        ? `${this.baseUrl}/api/files/${fileId}/download?method=direct`
        : `${this.baseUrl}/api/files/${fileId}/download`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Failed to download file (${response.status}): ${errorText}`
      );
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error("Downloaded file is empty");
    }

    return blob;
  }

  // Main download method with multiple options
  async downloadFile(
    fileId: string,
    fileName: string,
    method: "presigned" | "direct" = "presigned"
  ): Promise<void> {
    try {
      if (method === "presigned") {
        // Try presigned URL first (faster, more efficient)
        const downloadUrl = await this.getDownloadUrl(fileId);

        // Create temporary link and trigger download
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        link.target = "_blank";
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Direct download through backend
        const blob = await this.getDownloadBlob(fileId, "direct");
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (method === "presigned") {
        console.warn(
          "Presigned URL download failed, falling back to direct download:",
          error
        );

        // Fallback to direct download
        const blob = await this.getDownloadBlob(fileId, "direct");
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(url);
      } else {
        throw error;
      }
    }
  }
}
