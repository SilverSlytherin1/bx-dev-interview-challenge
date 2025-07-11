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

export class FileService {
  private readonly baseUrl: string;
  private getAuthHeaders: () => Record<string, string>;

  constructor(getAuthHeaders: () => Record<string, string>) {
    // Since we have a proxy configured in rsbuild.config.ts, we can use relative URLs
    // The proxy will forward /api requests to http://localhost:3000
    this.baseUrl = "";
    this.getAuthHeaders = getAuthHeaders;
  }

  async uploadFile(file: File): Promise<FileUploadResponse> {
    // Step 1: Get presigned URL
    const presignedResponse = await this.getPresignedUploadUrl(
      file.name,
      file.type,
      file.size,
    );

    // Step 2: Upload directly to S3 using presigned URL
    await this.uploadToS3(file, presignedResponse);

    // Step 3: Confirm upload with backend
    const confirmResponse = await this.confirmUpload(presignedResponse.fileId);

    return confirmResponse;
  }

  private async getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    contentLength: number,
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

  private async uploadToS3(
    file: File,
    presignedData: PresignedUploadResponse,
  ): Promise<void> {
    const { uploadUrl } = presignedData;

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.statusText}`);
    }
  }

  private async confirmUpload(fileId: string): Promise<FileUploadResponse> {
    const response = await fetch(`${this.baseUrl}/api/upload/${fileId}/confirm`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to confirm upload: ${response.statusText}`);
    }

    return response.json();
  }

  // Keep the legacy method for backward compatibility
  async uploadFileLegacy(file: File): Promise<FileUploadResponse> {
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
      throw new Error(`Upload failed: ${response.statusText}`);
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
      throw new Error(`Failed to get download URL: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  }

  async getDownloadBlob(
    fileId: string
  ): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/api/files/${fileId}/download`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );
    const data = await response.blob();
    console.log("Download URL response:", data);

    if (!response.ok) {
      throw new Error(`Failed to get download URL: ${response.statusText}`);
    }
    return data;
  }
}
