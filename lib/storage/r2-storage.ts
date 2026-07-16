// lib/storage/r2-storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type BucketType = 'public' | 'private';

export class R2Storage {
  private client: S3Client;
  private bucketName: string;
  private basePath: string;
  private customDomain?: string;

  constructor(bucket: BucketType) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    
    this.bucketName = bucket === 'public' 
      ? process.env.R2_PUBLIC_BUCKET! 
      : process.env.R2_PRIVATE_BUCKET!;
    
    if (bucket === 'public' && process.env.R2_PUBLIC_CUSTOM_DOMAIN) {
      this.customDomain = process.env.R2_PUBLIC_CUSTOM_DOMAIN;
    }
    
    this.basePath = '';
  }

  /**
   * 将本地文件路径（相对于项目根目录）转换为存储 Key
   */
  private localPathToKey(localPath: string): string {
    if (localPath.startsWith('data/')) {
      return localPath.substring(5);
    }
    if (localPath.startsWith('public/')) {
      return localPath.substring(7);
    }
    return localPath;
  }

  async read(localPath: string, encoding?: 'utf8' | 'binary'): Promise<string | Buffer> {
    const key = this.localPathToKey(localPath);
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    const response = await this.client.send(command);
    const body = await response.Body?.transformToByteArray();
    if (!body) throw new Error(`File not found: ${key}`);
    const buffer = Buffer.from(body);
    return encoding === 'utf8' ? buffer.toString('utf-8') : buffer;
  }

  async write(localPath: string, content: string | Buffer, options?: { contentType?: string }): Promise<void> {
    const key = this.localPathToKey(localPath);
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: content,
      ContentType: options?.contentType,
    });
    await this.client.send(command);
  }

  async delete(localPath: string): Promise<void> {
    const key = this.localPathToKey(localPath);
    const command = new DeleteObjectCommand({ Bucket: this.bucketName, Key: key });
    await this.client.send(command);
  }

  async list(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({ Bucket: this.bucketName, Prefix: prefix });
    const response = await this.client.send(command);
    return response.Contents?.map(item => item.Key!) || [];
  }

  /**
   * 获取文件元数据（包括 Content-Type, Content-Length, Last-Modified 等）
   */
  async head(localPath: string): Promise<{ contentType?: string; contentLength?: number; lastModified?: Date; etag?: string } | null> {
    const key = this.localPathToKey(localPath);
    try {
      const command = new HeadObjectCommand({ Bucket: this.bucketName, Key: key });
      const response = await this.client.send(command);
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
      };
    } catch (error) {
      // 如果文件不存在，返回 null
      if ((error as any).name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(localPath: string): Promise<boolean> {
    const metadata = await this.head(localPath);
    return metadata !== null;
  }

  async getPresignedUploadUrl(localPath: string, expiresIn: number = 3600): Promise<string> {
    const key = this.localPathToKey(localPath);
    const command = new PutObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(localPath: string, expiresIn: number = 3600): Promise<string> {
    const key = this.localPathToKey(localPath);
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * 获取公开文件的永久 URL（仅对公开桶有效）
   * 优先使用自定义域名，否则使用 R2.dev 子域（需桶已开启公共访问）
   */
  getPublicUrl(localPath: string): string {
    const key = this.localPathToKey(localPath);
    // 优先使用环境变量配置的公共基础 URL
    if (process.env.R2_PUBLIC_URL) {
      const base = process.env.R2_PUBLIC_URL.replace(/\/$/, '');
      return `${base}/${key}`;
    }
    // 降级：自定义域名
    if (this.customDomain) {
      return `${this.customDomain}/${key}`;
    }
    // 最后降级：默认 r2.dev（可能无效）
    return `https://${this.bucketName}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/${key}`;
  }
}