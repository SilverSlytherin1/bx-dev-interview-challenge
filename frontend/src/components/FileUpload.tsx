import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import {
  FileService,
  FileUploadResponse,
  FileValidationConfig,
} from "../services/file.service";

interface FileUploadProps {
  fileService: FileService;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  fileService,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileUploadResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<"presigned" | "direct">(
    "presigned"
  );
  const [downloadMethod, setDownloadMethod] = useState<"presigned" | "direct">(
    "presigned"
  );
  const [validationConfig, setValidationConfig] =
    useState<FileValidationConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadValidationConfig = useCallback(async () => {
    try {
      const config = await fileService.getValidationConfig();
      setValidationConfig(config);
    } catch (err) {
      console.error("Error loading validation config:", err);
    }
  }, [fileService]);

  const clearFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      const response = await fileService.listFiles();
      setFiles(response.files);
    } catch (err) {
      setError("Failed to load files");
      console.error("Error loading files:", err);
    }
  }, [fileService]);

  // Load validation config and files on component mount
  useEffect(() => {
    if (!disabled) {
      loadValidationConfig();
      loadFiles();
    }
  }, [disabled, loadValidationConfig, loadFiles]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Use the selected upload method
      if (uploadMethod === "direct") {
        await fileService.uploadFileDirect(file);
        setSuccess(
          `File "${file.name}" uploaded successfully via direct upload!`
        );
      } else {
        await fileService.uploadFile(file);
        setSuccess(
          `File "${file.name}" uploaded successfully via presigned URL!`
        );
      }

      // Refresh file list
      await loadFiles();

      // Clear file input after successful upload
      clearFileInput();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      console.error("Upload error:", err);

      // Clear file input after error so user can select a new file
      clearFileInput();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    try {
      await fileService.deleteFile(fileId);
      setSuccess(`File "${fileName}" deleted successfully!`);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      console.error("Delete error:", err);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      await fileService.downloadFile(fileId, fileName, downloadMethod);
      const methodText =
        downloadMethod === "direct" ? "direct download" : "presigned URL";
      setSuccess(
        `File "${fileName}" downloaded successfully via ${methodText}!`
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Download failed");
      console.error("Download error:", error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box>
      {/* Upload Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          File Upload
        </Typography>

        {/* Upload Method Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Upload Method:
          </Typography>
          <ToggleButtonGroup
            value={uploadMethod}
            exclusive
            onChange={(_, newMethod) => {
              if (newMethod !== null) {
                setUploadMethod(newMethod);
              }
            }}
            size="small"
            disabled={uploading || disabled}
          >
            <ToggleButton value="presigned">
              <Tooltip title="Direct upload to S3 using presigned URLs - faster and more efficient">
                <Box>🚀 Presigned URL</Box>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="direct">
              <Tooltip title="Upload through backend server - more traditional approach">
                <Box>🔄 Direct Upload</Box>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography
            variant="caption"
            display="block"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            {uploadMethod === "presigned"
              ? "Files are uploaded directly to S3 using secure presigned URLs for optimal performance"
              : "Files are uploaded through the backend server for traditional processing"}
          </Typography>
        </Box>

        {/* File Validation Rules */}
        {validationConfig && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              gutterBottom
              color="primary"
              sx={{ fontWeight: "bold" }}
            >
              📋 File Upload Requirements
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: "bold" }}
                >
                  Maximum File Size:
                </Typography>
                <Typography variant="body2">
                  {fileService.formatFileSize(validationConfig.maxFileSize)}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: "bold" }}
                >
                  Maximum File Name Length:
                </Typography>
                <Typography variant="body2">
                  {validationConfig.maxFileNameLength} characters
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: "bold" }}
                >
                  Allowed File Types:
                </Typography>
                <Box
                  sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}
                >
                  {validationConfig.allowedExtensions.map((ext) => (
                    <Chip
                      key={ext}
                      label={ext}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            id="file-input"
            disabled={uploading || disabled}
          />
          <label htmlFor="file-input">
            <Button
              variant="contained"
              component="span"
              disabled={uploading || disabled}
              size="large"
            >
              📁{" "}
              {uploading
                ? "Uploading..."
                : disabled
                ? "Please login to upload files"
                : "Choose File to Upload"}
            </Button>
          </label>
        </Box>

        {uploading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {uploadMethod === "presigned"
                ? "Uploading file directly to S3 using presigned URL..."
                : "Uploading file through backend server..."}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {uploadMethod === "presigned"
                ? "This secure method uploads files directly to cloud storage without going through our servers"
                : "Traditional upload method that processes files through the backend before storing in S3"}
            </Typography>
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setError(null)}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  setError(null);
                  // Trigger file input click to allow immediate retry
                  document.getElementById("file-input")?.click();
                }}
              >
                Try Again
              </Button>
            }
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                Upload Failed
              </Typography>
              <Typography variant="body2">{error}</Typography>
            </Box>
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}
      </Paper>

      {/* File List Section */}
      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5">Uploaded Files ({files.length})</Typography>

          {/* Download Method Selection */}
          {files.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Download Method:
              </Typography>
              <ToggleButtonGroup
                value={downloadMethod}
                exclusive
                onChange={(_, newMethod) => {
                  if (newMethod !== null) {
                    setDownloadMethod(newMethod);
                  }
                }}
                size="small"
                disabled={disabled}
              >
                <ToggleButton value="presigned">
                  <Tooltip title="Get presigned download URLs - faster with automatic fallback">
                    <Box sx={{ fontSize: "0.75rem" }}>🔗 Presigned</Box>
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="direct">
                  <Tooltip title="Download through backend server - more reliable but slower">
                    <Box sx={{ fontSize: "0.75rem" }}>📥 Direct</Box>
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
        </Box>

        {files.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {disabled
              ? "Please login to view your uploaded files."
              : "No files uploaded yet. Upload your first file above!"}
          </Typography>
        ) : (
          <List>
            {files.map((file) => (
              <ListItem key={file.id} divider>
                <Box sx={{ mr: 2, fontSize: "1.5rem" }}>📄</Box>
                <ListItemText
                  primary={file.originalName}
                  secondary={
                    <Box component="span">
                      <Chip
                        label={file.mimeType}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={formatFileSize(file.size)}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label="🔒 Secure S3"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ mr: 1 }}
                        title="File stored securely in S3 with presigned URL access"
                      />
                      <Chip
                        label={
                          downloadMethod === "presigned"
                            ? "🚀 Fast Download"
                            : "🛡️ Secure Download"
                        }
                        size="small"
                        color={
                          downloadMethod === "presigned"
                            ? "primary"
                            : "secondary"
                        }
                        variant="outlined"
                        sx={{ mr: 1 }}
                        title={
                          downloadMethod === "presigned"
                            ? "Using presigned URLs for fast downloads with automatic fallback"
                            : "Using direct backend download for maximum security"
                        }
                      />
                      <Typography variant="caption" display="block">
                        Uploaded: {formatDate(file.uploadedAt)}
                      </Typography>
                    </Box>
                  }
                />
                <ListItem secondaryAction>
                  <Tooltip
                    title={`Download via ${
                      downloadMethod === "presigned"
                        ? "presigned URL (fast)"
                        : "direct download (secure)"
                    }`}
                  >
                    <IconButton
                      edge="end"
                      aria-label="download"
                      onClick={() => handleDownload(file.id, file.originalName)}
                      sx={{ mr: 1 }}
                      disabled={disabled}
                    >
                      {downloadMethod === "presigned" ? "⚡" : "📥"}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete file permanently">
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDelete(file.id, file.originalName)}
                      color="error"
                      disabled={disabled}
                    >
                      🗑️
                    </IconButton>
                  </Tooltip>
                </ListItem>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};
