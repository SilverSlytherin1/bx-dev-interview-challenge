import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
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

    if (!this.bucketName) {
      throw new Error('S3_BUCKET_NAME is not defined in the configuration');
    }
    if (!region || !endpoint || !awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error(
        'AWS credentials (region, access key ID, secret access key) are not defined in the configuration',
      );
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
      endpoint,
    });
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      // Ensure bucket exists for local development
      if (this.configService.get<string>('NODE_ENV') === 'development') {
        await this.ensureBucketExists();
      }

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
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
        const headCommand = new HeadBucketCommand({ Bucket: this.bucketName });
        await this.s3Client.send(headCommand);
        this.logger.log(`Bucket ${this.bucketName} already exists`);
      } catch {
        // Bucket doesn't exist, create it
        this.logger.log(`Creating bucket: ${this.bucketName}`);
        const createCommand = new CreateBucketCommand({
          Bucket: this.bucketName,
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

  async getFileDownloadUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error generating download URL: ${error.message}`);
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

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
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
        Bucket: this.bucketName,
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
}
