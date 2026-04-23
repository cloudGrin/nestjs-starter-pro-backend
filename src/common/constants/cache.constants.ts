/**
 * 缓存TTL常量（单位：秒）
 */
export const CACHE_TTL = {
  /** 5分钟 - 频繁变更的数据 */
  SHORT: 300,
  /** 30分钟 - 中等频率变更的数据 */
  MEDIUM: 1800,
  /** 1小时 - 不常变更的数据 */
  LONG: 3600,
  /** 2小时 - 几乎不变的数据 */
  VERY_LONG: 7200,
} as const;

/**
 * 缓存键生成函数
 *
 * 命名规范：{模块}:{资源}:{操作}:{标识符}
 *
 * 示例：
 * - user:permissions:123
 * - user:menus:123
 * - role:permissions:456
 * - menu:tree:all
 */
export const CACHE_KEYS = {
  // ==================== 用户相关缓存 ====================

  /** 用户权限列表: user:permissions:{userId} */
  USER_PERMISSIONS: (userId: number) => `user:permissions:${userId}`,

  // ==================== 菜单相关缓存 ====================

  /** 菜单树: menu:tree:all */
  MENU_TREE: () => 'menu:tree:all',

  // ==================== 模式匹配（用于批量删除） ====================

  /** 所有用户权限缓存: user:permissions:* */
  PATTERN_USER_PERMISSIONS: () => 'user:permissions:*',

  /** 所有用户菜单缓存: menu:user:* */
  PATTERN_USER_MENUS: () => 'menu:user:*',

  /** 所有菜单相关缓存: menu:* */
  PATTERN_MENU_ALL: () => 'menu:*',
} as const;

/**
 * 缓存策略配置
 */
export const CACHE_STRATEGIES = {
  /** 用户权限 - 30分钟，权限变更时立即失效 */
  USER_PERMISSIONS: {
    ttl: CACHE_TTL.MEDIUM,
    key: CACHE_KEYS.USER_PERMISSIONS,
  },

  /** 菜单树 - 30分钟，菜单结构变化不频繁 */
  MENU_TREE: {
    ttl: CACHE_TTL.MEDIUM,
    key: CACHE_KEYS.MENU_TREE,
  },
} as const;
