import { Entity, Column, Index } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';

/**
 * 配置类型
 */
export enum ConfigType {
  /** 文本 */
  TEXT = 'text',
  /** 数字 */
  NUMBER = 'number',
  /** 布尔值 */
  BOOLEAN = 'boolean',
  /** JSON对象 */
  JSON = 'json',
  /** 数组 */
  ARRAY = 'array',
}

/**
 * 配置分组
 */
export enum ConfigGroup {
  /** 系统配置 */
  SYSTEM = 'system',
  /** 业务配置 */
  BUSINESS = 'business',
  /** 安全配置 */
  SECURITY = 'security',
  /** 第三方配置 */
  THIRD_PARTY = 'third_party',
  /** 其他 */
  OTHER = 'other',
}

/**
 * 系统配置实体
 */
@Entity('system_configs')
@Index(['configKey'], { unique: true })
export class SystemConfigEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: '配置键名',
  })
  configKey: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '配置名称',
  })
  configName: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '配置值',
  })
  configValue: string;

  @Column({
    type: 'enum',
    enum: ConfigType,
    default: ConfigType.TEXT,
    comment: '配置类型',
  })
  configType: ConfigType;

  @Column({
    type: 'enum',
    enum: ConfigGroup,
    default: ConfigGroup.OTHER,
    comment: '配置分组',
  })
  configGroup: ConfigGroup;

  @Column({
    type: 'text',
    nullable: true,
    comment: '配置描述',
  })
  description?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '默认值',
  })
  defaultValue?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否系统内置（不可删除）',
  })
  isSystem: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  isEnabled: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序',
  })
  sort: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: '扩展属性',
  })
  extra?: Record<string, any>;

  /**
   * 获取解析后的配置值
   */
  getParsedValue(): any {
    if (!this.configValue) {
      return this.defaultValue ? this.parseValue(this.defaultValue) : null;
    }

    return this.parseValue(this.configValue);
  }

  /**
   * 解析配置值
   */
  private parseValue(value: string): any {
    if (!value) return null;

    try {
      switch (this.configType) {
        case ConfigType.NUMBER:
          return Number(value);
        case ConfigType.BOOLEAN:
          return value === 'true' || value === '1';
        case ConfigType.JSON:
        case ConfigType.ARRAY:
          return JSON.parse(value);
        case ConfigType.TEXT:
        default:
          return value;
      }
    } catch (error) {
      return value;
    }
  }
}
