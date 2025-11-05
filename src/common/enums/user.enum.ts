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

/**
 * 用户类型
 */
export enum UserType {
  ADMIN = 'admin', // 管理员
  USER = 'user', // 普通用户
  GUEST = 'guest', // 访客
}

/**
 * 登录方式
 */
export enum LoginType {
  USERNAME = 'username', // 用户名
  EMAIL = 'email', // 邮箱
  PHONE = 'phone', // 手机号
  WECHAT = 'wechat', // 微信
  GITHUB = 'github', // GitHub
}
