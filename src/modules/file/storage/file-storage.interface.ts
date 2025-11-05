export interface FileStorageSaveOptions {
  filename: string;
  relativePath?: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}

export interface StoredFileMetadata {
  filename: string;
  path: string;
  size: number;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface FileStorageStrategy {
  /**
   * 保存二进制数据到存储介质
   */
  saveFile(buffer: Buffer, options: FileStorageSaveOptions): Promise<StoredFileMetadata>;

  /**
   * 从临时路径移动文件到存储介质
   */
  saveFromPath(tempPath: string, options: FileStorageSaveOptions): Promise<StoredFileMetadata>;

  /**
   * 删除指定路径的文件
   */
  delete(path: string): Promise<void>;

  /**
   * 获取可读流，用于下载
   */
  getStream(path: string): Promise<NodeJS.ReadableStream>;

  /**
   * 检查文件是否存在
   */
  exists(path: string): Promise<boolean>;

  /**
   * 获取真实路径（仅本地存储需要）
   */
  toAbsolutePath?(path: string): string;

  /**
   * 🆕 生成临时签名 URL（用于安全下载）
   * @param path 文件路径
   * @param expiresIn 过期时间（秒），默认 3600（1小时）
   * @param filename 下载时的文件名（可选）
   * @returns 签名后的临时访问 URL
   */
  generateSignedUrl?(path: string, expiresIn?: number, filename?: string): Promise<string>;
}
