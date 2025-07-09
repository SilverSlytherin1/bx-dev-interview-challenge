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

  constructor() {
    // Since we have a proxy configured in rsbuild.config.ts, we can use relative URLs
    // The proxy will forward /api requests to http://localhost:3000
    this.baseUrl = '';
  }

  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async listFiles(): Promise<FileListResponse> {
    const response = await fetch(`${this.baseUrl}/api/files`);

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/files/${fileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  }

  getDownloadUrl(fileId: string): string {
    return `${this.baseUrl}/api/files/${fileId}/download`;
  }
}
