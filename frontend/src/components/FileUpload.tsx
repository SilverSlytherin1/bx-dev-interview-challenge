import React, { useState, useCallback, useRef } from 'react';
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
  ListItemSecondaryAction,
  Chip,
} from '@mui/material';
import { FileService, FileUploadResponse } from '../services/file.service';

interface FileUploadProps {
  fileService: FileService;
}

export const FileUpload: React.FC<FileUploadProps> = ({ fileService }) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileUploadResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      const response = await fileService.listFiles();
      setFiles(response.files);
    } catch (err) {
      setError('Failed to load files');
      console.error('Error loading files:', err);
    }
  }, [fileService]);

  // Load files on component mount
  React.useEffect(() => {
    loadFiles();
  }, [loadFiles]);

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
      await fileService.uploadFile(file);
      setSuccess(`File "${file.name}" uploaded successfully!`);
      
      // Refresh file list
      await loadFiles();
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('Upload error:', err);
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
      setError(err instanceof Error ? err.message : 'Delete failed');
      console.error('Delete error:', err);
    }
  };

  const handleDownload = (fileId: string) => {
    const downloadUrl = fileService.getDownloadUrl(fileId);
    window.open(downloadUrl, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      {/* Upload Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          File Upload
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="file-input"
            disabled={uploading}
          />
          <label htmlFor="file-input">
            <Button
              variant="contained"
              component="span"
              disabled={uploading}
              size="large"
            >
              📁 {uploading ? 'Uploading...' : 'Choose File to Upload'}
            </Button>
          </label>
        </Box>

        {uploading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Uploading file to S3...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
      </Paper>

      {/* File List Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Uploaded Files ({files.length})
        </Typography>

        {files.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No files uploaded yet. Upload your first file above!
          </Typography>
        ) : (
          <List>
            {files.map((file) => (
              <ListItem key={file.id} divider>
                <Box sx={{ mr: 2, fontSize: '1.5rem' }}>📄</Box>
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
                      <Typography variant="caption" display="block">
                        Uploaded: {formatDate(file.uploadedAt)}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="download"
                    onClick={() => handleDownload(file.id)}
                    sx={{ mr: 1 }}
                  >
                    ⬇️
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDelete(file.id, file.originalName)}
                    color="error"
                  >
                    🗑️
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};
