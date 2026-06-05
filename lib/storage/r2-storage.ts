import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type BucketType = 'public' | 'private';

export class R2Storage {
  private client: S3Client;
  private bucketName: string;
  private basePath: string;      // 存储桶内的基础路径（通常为空字符串）
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
    
    // 公开桶可能绑定自定义域名
    if (bucket === 'public' && process.env.R2_PUBLIC_CUSTOM_DOMAIN) {
      this.customDomain = process.env.R2_PUBLIC_CUSTOM_DOMAIN;
    }
    
    // 不需要额外 basePath，因为 key 已经是相对于桶根目录的完整路径
    this.basePath = '';
  }

  /**
   * 将本地文件路径（相对于项目根目录）转换为存储 Key
   * @param localPath 例如 "data/products/en/xxx.md" 或 "public/uploads/photo.jpg"
   * @returns 存储 Key，例如 "products/en/xxx.md" 或 "uploads/photo.jpg"
   */
  private localPathToKey(localPath: string): string {
    if (localPath.startsWith('data/')) {
      return localPath.substring(5); // 去掉 "data/"
    }
    if (localPath.startsWith('public/')) {
      return localPath.substring(7); // 去掉 "public/"
    }
    // 如果已经是不带前缀的 key，直接返回
    return localPath;
  }

  // 读取文件（参数 localPath 可以是 "data/..." 或 "public/..." 或纯 key）
  async read(localPath: string, encoding?: 'utf8' | 'binary'): Promise<string | Buffer> {
    const key = this.localPathToKey(localPath);
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    const response = await this.client.send(command);
    const body = await response.Body?.transformToByteArray();
    if (!body) throw new Error(`File not found: ${key}`);
    const buffer = Buffer.from(body);
    return encoding === 'utf8' ? buffer.toString('utf-8') : buffer;
  }

  // 写入文件
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

  // 删除文件
  async delete(localPath: string): Promise<void> {
    const key = this.localPathToKey(localPath);
    const command = new DeleteObjectCommand({ Bucket: this.bucketName, Key: key });
    await this.client.send(command);
  }

  // 列出指定前缀下的所有文件（前缀使用存储 key 格式）
  async list(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({ Bucket: this.bucketName, Prefix: prefix });
    const response = await this.client.send(command);
    return response.Contents?.map(item => item.Key!) || [];
  }

  // 生成预签名上传 URL（localPath 会被转换）
  async getPresignedUploadUrl(localPath: string, expiresIn: number = 3600): Promise<string> {
    const key = this.localPathToKey(localPath);
    const command = new PutObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  // 生成预签名下载 URL（用于私有桶）
  async getPresignedDownloadUrl(localPath: string, expiresIn: number = 3600): Promise<string> {
    const key = this.localPathToKey(localPath);
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  // 获取公开文件的永久 URL（仅对公开桶有效）
  getPublicUrl(localPath: string): string {
    const key = this.localPathToKey(localPath);
    if (this.customDomain) {
      return `${this.customDomain}/${key}`;
    }
    // 使用 R2 自带的公开子域名（需开启）
    return `https://${this.bucketName}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
  }
}