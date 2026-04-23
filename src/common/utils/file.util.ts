import { extname, basename } from 'path';
import { StringUtil } from './string.util';

/**
 * 文件工具类
 */
export class FileUtil {
  /**
   * MIME类型映射
   */
  private static readonly MIME_TYPES: Record<string, string> = {
    // 图片
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',

    // 文档
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.rtf': 'application/rtf',

    // 压缩文件
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',

    // 视频
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska',

    // 音频
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',

    // 其他
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
  };

  /**
   * 获取文件扩展名（包含点号）
   * @example getExtension('file.txt') => '.txt'
   */
  static getExtension(filename: string): string {
    return extname(filename).toLowerCase();
  }

  /**
   * 获取文件扩展名（不包含点号）
   * @example getExtensionWithoutDot('file.txt') => 'txt'
   */
  static getExtensionWithoutDot(filename: string): string {
    return this.getExtension(filename).substring(1);
  }

  /**
   * 获取文件名（不含扩展名）
   * @example getBasename('path/to/file.txt') => 'file'
   */
  static getBasename(filename: string): string {
    const base = basename(filename);
    const ext = extname(base);
    return base.substring(0, base.length - ext.length);
  }

  /**
   * 根据扩展名获取MIME类型
   */
  static getMimeType(filename: string): string {
    const ext = this.getExtension(filename);
    return this.MIME_TYPES[ext] || 'application/octet-stream';
  }

  /**
   * 根据MIME类型获取扩展名
   */
  static getExtensionByMime(mimeType: string): string {
    const entry = Object.entries(this.MIME_TYPES).find(([_, mime]) => mime === mimeType);
    return entry ? entry[0] : '';
  }

  /**
   * 格式化文件大小
   * @example formatSize(1024) => '1.00 KB'
   */
  static formatSize(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
  }

  /**
   * 解析文件大小字符串为字节数
   * @example parseSize('1.5 MB') => 1572864
   */
  static parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
      TB: 1024 * 1024 * 1024 * 1024,
    };

    const match = sizeStr.match(/^([\d.]+)\s*([A-Z]+)$/i);
    if (!match) return 0;

    const [, size, unit] = match;
    const unitMultiplier = units[unit.toUpperCase()] || 1;

    return parseFloat(size) * unitMultiplier;
  }

  /**
   * 生成安全的文件名
   * 移除特殊字符，保留扩展名
   */
  static generateSafeFilename(original: string): string {
    const ext = this.getExtension(original);
    const base = this.getBasename(original);

    // 移除特殊字符，只保留字母、数字、下划线、连字符
    const safeName = base.replace(/[^a-zA-Z0-9_-]/g, '_');

    return `${safeName}${ext}`;
  }

  /**
   * 生成唯一文件名
   * @param original 原始文件名
   * @param useTimestamp 是否使用时间戳
   */
  static generateUniqueFilename(original: string, useTimestamp = true): string {
    const ext = this.getExtension(original);
    const base = this.getBasename(original);
    const safeName = base.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (useTimestamp) {
      const timestamp = Date.now();
      const random = StringUtil.random(6);
      return `${safeName}_${timestamp}_${random}${ext}`;
    }

    const uuid = StringUtil.shortUuid();
    return `${safeName}_${uuid}${ext}`;
  }

  /**
   * 判断是否为图片文件
   */
  static isImage(filename: string): boolean {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExts.includes(this.getExtension(filename));
  }

  /**
   * 判断是否为视频文件
   */
  static isVideo(filename: string): boolean {
    const videoExts = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
    return videoExts.includes(this.getExtension(filename));
  }

  /**
   * 判断是否为音频文件
   */
  static isAudio(filename: string): boolean {
    const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg'];
    return audioExts.includes(this.getExtension(filename));
  }

  /**
   * 判断是否为文档文件
   */
  static isDocument(filename: string): boolean {
    const docExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'];
    return docExts.includes(this.getExtension(filename));
  }

  /**
   * 判断是否为压缩文件
   */
  static isArchive(filename: string): boolean {
    const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz'];
    return archiveExts.includes(this.getExtension(filename));
  }

  /**
   * 验证文件类型
   * @param filename 文件名
   * @param allowedTypes 允许的类型（扩展名数组或MIME类型数组）
   */
  static validateFileType(filename: string, allowedTypes: string[]): boolean {
    const ext = this.getExtension(filename);
    const mime = this.getMimeType(filename);

    return allowedTypes.some((type) => {
      if (type.startsWith('.')) {
        return type.toLowerCase() === ext;
      }
      return type === mime;
    });
  }

  /**
   * 验证文件大小
   * @param size 文件大小（字节）
   * @param maxSize 最大大小（字节）
   */
  static validateFileSize(size: number, maxSize: number): boolean {
    return size > 0 && size <= maxSize;
  }

  /**
   * 获取文件类别
   */
  static getFileCategory(filename: string): string {
    if (this.isImage(filename)) return 'image';
    if (this.isVideo(filename)) return 'video';
    if (this.isAudio(filename)) return 'audio';
    if (this.isDocument(filename)) return 'document';
    if (this.isArchive(filename)) return 'archive';
    return 'other';
  }

  /**
   * 根据文件大小获取建议的上传策略
   */
  static getUploadStrategy(size: number): {
    strategy: 'direct' | 'multipart' | 'resumable';
    chunkSize?: number;
  } {
    const mb = 1024 * 1024;

    // 小于10MB，直接上传
    if (size < 10 * mb) {
      return { strategy: 'direct' };
    }

    // 10MB-100MB，分片上传
    if (size < 100 * mb) {
      return {
        strategy: 'multipart',
        chunkSize: 5 * mb, // 5MB per chunk
      };
    }

    // 大于100MB，断点续传
    return {
      strategy: 'resumable',
      chunkSize: 10 * mb, // 10MB per chunk
    };
  }

  /**
   * 计算文件上传进度
   */
  static calculateProgress(uploaded: number, total: number): number {
    if (total === 0) return 0;
    const progress = (uploaded / total) * 100;
    return Math.min(100, Math.round(progress * 100) / 100);
  }

  /**
   * 估算剩余上传时间
   * @param uploaded 已上传字节数
   * @param total 总字节数
   * @param speed 上传速度（字节/秒）
   * @returns 剩余秒数
   */
  static estimateRemainingTime(uploaded: number, total: number, speed: number): number {
    if (speed === 0) return Infinity;
    const remaining = total - uploaded;
    return Math.ceil(remaining / speed);
  }

  /**
   * 格式化剩余时间
   */
  static formatRemainingTime(seconds: number): string {
    if (!isFinite(seconds)) return '计算中...';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    }
    return `${secs}秒`;
  }
}
