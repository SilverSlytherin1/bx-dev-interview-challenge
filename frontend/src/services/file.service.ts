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

export class FileService {
  private readonly baseUrl: string;
  private getAuthHeaders: () => Record<string, string>;

  constructor(getAuthHeaders: () => Record<string, string>) {
    // Since we have a proxy configured in rsbuild.config.ts, we can use relative URLs
    // The proxy will forward /api requests to http://localhost:3000
    this.baseUrl = '';
    this.getAuthHeaders = getAuthHeaders;
  }

  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const authHeaders = this.getAuthHeaders();
    const headers: Record<string, string> = {};
    
    // Only add Authorization header, not Content-Type for FormData
    if (authHeaders.Authorization) {
      headers.Authorization = authHeaders.Authorization;
    }

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
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
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  }

  getDownloadUrl(fileId: string): string {
    return `${this.baseUrl}/api/files/${fileId}/download`;
  }
}
