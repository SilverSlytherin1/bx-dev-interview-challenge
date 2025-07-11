import { Injectable, Logger, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  CreateBucketCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable({
  scope: Scope.DEFAULT,
})
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName?: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME');
    const region = this.configService.get<string>('AWS_REGION');
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const awsAccessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const awsSecretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );

    // Log configuration for debugging (without credentials)
    this.logger.log(
      `S3 Configuration - Bucket: ${this.bucketName}, Region: ${region}, Endpoint: ${endpoint}`,
    );

    if (!this.bucketName) {
      throw new Error('S3_BUCKET_NAME is not defined in the configuration');
    }
    if (!region || !endpoint || !awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error(
        'AWS credentials (region, access key ID, secret access key) are not defined in the configuration',
      );
    }

    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
      endpoint,
      region,
      forcePathStyle: true, // Required for local S3 implementations
    });
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      this.logger.log(`Attempting to upload file with key: ${key}`);

      // Ensure bucket exists for local development
      if (this.configService.get<string>('NODE_ENV') === 'development') {
        await this.ensureBucketExists();
      }

      const command = new PutObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully: ${key}`);
      return key;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error uploading file: ${error.message}`);
        // Log additional details for signature errors
        if (error.message.includes('signature')) {
          this.logger.error(
            'Signature error - check S3 credentials and endpoint configuration',
          );
        }
        throw new Error(`Failed to upload file: ${error.message}`);
      }
      this.logger.error('Error uploading file: Unknown error occurred');
      throw new Error('Failed to upload file: Unknown error occurred');
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      // Check if bucket exists
      try {
        const headCommand = new HeadBucketCommand({ Bucket: this.bucketName! });
        await this.s3Client.send(headCommand);
        this.logger.log(`Bucket ${this.bucketName} already exists`);
      } catch {
        // Bucket doesn't exist, create it
        this.logger.log(`Creating bucket: ${this.bucketName}`);
        const createCommand = new CreateBucketCommand({
          Bucket: this.bucketName!,
        });
        await this.s3Client.send(createCommand);
        this.logger.log(`Bucket created successfully: ${this.bucketName}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Could not ensure bucket exists: ${errorMessage}`);
    }
  }

  async getFileDownloadUrl(key: string): Promise<string> {
    try {
      this.logger.log(`Generating download URL for key: ${key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 60 * 60, // 1 hour expiration
      });

      this.logger.log(`Generated download URL successfully for key: ${key}`);
      return signedUrl;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error generating download URL: ${error.message}`);
        this.logger.error(`Stack trace: ${error.stack}`);
        throw new Error(`Failed to generate download URL: ${error.message}`);
      }
      this.logger.error(
        'Error generating download URL: Unknown error occurred',
      );
      throw new Error(
        'Failed to generate download URL: Unknown error occurred',
      );
    }
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contentLength?: number,
  ): Promise<{ uploadUrl: string; fields: Record<string, string> }> {
    try {
      this.logger.log(`Generating presigned upload URL for key: ${key}`);
      this.logger.debug(`Content-Type: ${contentType}`);
      this.logger.debug(
        `S3 Endpoint: ${this.configService.get<string>('S3_ENDPOINT')}`,
      );
      this.logger.debug(`S3 Bucket: ${this.bucketName}`);
      this.logger.debug(
        `AWS Region: ${this.configService.get<string>('AWS_REGION')}`,
      );

      // Ensure bucket exists for local development
      if (this.configService.get<string>('NODE_ENV') === 'development') {
        await this.ensureBucketExists();
      }

      const commandInput: PutObjectCommandInput = {
        Bucket: this.bucketName!,
        Key: key,
        ContentType: contentType,
      };

      const command = new PutObjectCommand(commandInput);

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 60 * 30, // 30 minutes expiration for better UX
      });

      this.logger.log(
        `Generated presigned upload URL successfully for key: ${key}`,
      );

      return {
        uploadUrl,
        fields: {
          'Content-Type': contentType,
          key,
          bucket: this.bucketName!,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error generating presigned upload URL: ${error.message}`,
        );
        this.logger.error(`Stack trace: ${error.stack}`);
        throw new Error(
          `Failed to generate presigned upload URL: ${error.message}`,
        );
      }
      this.logger.error(
        'Error generating presigned upload URL: Unknown error occurred',
      );
      throw new Error(
        'Failed to generate presigned upload URL: Unknown error occurred',
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting file: ${error.message}`);
        throw new Error(`Failed to delete file: ${error.message}`);
      }
      this.logger.error('Error deleting file: Unknown error occurred');
      throw new Error('Failed to delete file: Unknown error occurred');
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName!,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);
      return (
        response.Contents?.map((object) => object.Key).filter(
          (k): k is string => !!k,
        ) || []
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error listing files: ${error.message}`);
        throw new Error(`Failed to list files: ${error.message}`);
      }
      this.logger.error('Error listing files: Unknown error occurred');
      throw new Error('Failed to list files: Unknown error occurred');
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFound') {
        return false;
      }
      this.logger.error(
        `Error checking if file exists: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new Error(
        `Failed to check if file exists: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      );
    }
  }

  async getFileMetadata(key: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error getting file metadata: ${error.message}`);
        throw new Error(`Failed to get file metadata: ${error.message}`);
      }
      this.logger.error('Error getting file metadata: Unknown error occurred');
      throw new Error('Failed to get file metadata: Unknown error occurred');
    }
  }

  async getFileStream(key: string): Promise<Readable | null> {
    try {
      this.logger.log(`Getting file stream for key: ${key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        this.logger.warn(`No body in response for key: ${key}`);
        return null;
      }

      // AWS SDK v3 returns a Readable stream in Node.js environment
      // Use explicit type assertion to ensure compatibility
      const stream = response.Body as Readable;
      return stream;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error getting file stream: ${error.message}`);
        if (error.name === 'NoSuchKey') {
          return null;
        }
      }
      this.logger.error('Error getting file stream: Unknown error occurred');
      throw new Error(
        `Failed to get file stream: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      );
    }
  }

  /**
   * Validate S3 configuration and connectivity
   */
  async validateConfiguration(): Promise<void> {
    try {
      this.logger.log('Validating S3 configuration...');

      // Test bucket access
      await this.ensureBucketExists();

      // Test upload capability with a small test file
      const testKey = `test-${Date.now()}.txt`;
      const testContent = Buffer.from('S3 configuration test');

      await this.uploadFile(testKey, testContent, 'text/plain');
      this.logger.log('S3 upload test successful');

      // Clean up test file
      await this.deleteFile(testKey);
      this.logger.log('S3 configuration validation completed successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`S3 configuration validation failed: ${errorMessage}`);
      throw new Error(`S3 configuration validation failed: ${errorMessage}`);
    }
  }
}
