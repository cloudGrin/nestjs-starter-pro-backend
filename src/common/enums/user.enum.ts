/**
 * 用户相关枚举
 */

/**
 * 用户状态
 */
export enum UserStatus {
  ACTIVE = 'active', // 激活
  INACTIVE = 'inactive', // 未激活
  DISABLED = 'disabled', // 禁用
  LOCKED = 'locked', // 锁定
}

/**
 * 用户性别
 */
export enum UserGender {
  MALE = 'male', // 男
  FEMALE = 'female', // 女
  UNKNOWN = 'unknown', // 未知
}
