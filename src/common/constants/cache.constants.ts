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

  /** 用户菜单: menu:user:{userId} */
  USER_MENUS: (userId: number) => `menu:user:${userId}`,

  /** 用户详情: user:findOne:{userId} */
  USER_DETAIL: (userId: number) => `user:findOne:${userId}`,

  // ==================== 角色相关缓存 ====================

  /** 角色权限: role:permissions:{roleId} */
  ROLE_PERMISSIONS: (roleId: number) => `role:permissions:${roleId}`,

  /** 角色菜单: menu:role:{roleId} */
  ROLE_MENUS: (roleId: number) => `menu:role:${roleId}`,

  /** 角色详情: role:findOne:{roleId} */
  ROLE_DETAIL: (roleId: number) => `role:findOne:${roleId}`,

  // ==================== 菜单相关缓存 ====================

  /** 菜单树: menu:tree:all */
  MENU_TREE: () => 'menu:tree:all',

  /** 菜单详情: menu:id:{menuId} */
  MENU_DETAIL: (menuId: number) => `menu:id:${menuId}`,

  // ==================== 权限相关缓存 ====================

  /** 权限父级列表: permission:parents:{permissionId} */
  PERMISSION_PARENTS: (permissionId: number) => `permission:parents:${permissionId}`,

  /** 权限详情: permission:findOne:{permissionId} */
  PERMISSION_DETAIL: (permissionId: number) => `permission:findOne:${permissionId}`,

  // ==================== 分布式锁 ====================

  /** 用户权限查询锁: lock:user:permissions:{userId} */
  LOCK_USER_PERMISSIONS: (userId: number) => `lock:user:permissions:${userId}`,

  /** 菜单操作锁: lock:menu:{menuId} */
  LOCK_MENU: (menuId: number) => `lock:menu:${menuId}`,

  // ==================== 模式匹配（用于批量删除） ====================

  /** 所有用户权限缓存: user:permissions:* */
  PATTERN_USER_PERMISSIONS: () => 'user:permissions:*',

  /** 所有用户菜单缓存: menu:user:* */
  PATTERN_USER_MENUS: () => 'menu:user:*',

  /** 所有菜单相关缓存: menu:* */
  PATTERN_MENU_ALL: () => 'menu:*',

  /** 所有角色相关缓存: role:* */
  PATTERN_ROLE_ALL: () => 'role:*',

  /** 所有权限相关缓存: permission:* */
  PATTERN_PERMISSION_ALL: () => 'permission:*',

  /** 特定用户的所有缓存: user:*:{userId}:* 或 *:user:{userId}:* */
  PATTERN_USER_ALL: (userId: number) => [
    `user:*:${userId}*`,
    `*:user:${userId}*`,
    `menu:user:${userId}*`,
  ],

  /** 特定角色的所有缓存 */
  PATTERN_ROLE_ALL_BY_ID: (roleId: number) => [`role:*:${roleId}*`, `menu:role:${roleId}*`],
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

  /** 用户菜单 - 30分钟，菜单变更时立即失效 */
  USER_MENUS: {
    ttl: CACHE_TTL.MEDIUM,
    key: CACHE_KEYS.USER_MENUS,
  },

  /** 权限父级列表 - 1小时，权限层级很少变化 */
  PERMISSION_PARENTS: {
    ttl: CACHE_TTL.LONG,
    key: CACHE_KEYS.PERMISSION_PARENTS,
  },

  /** 菜单树 - 30分钟，菜单结构变化不频繁 */
  MENU_TREE: {
    ttl: CACHE_TTL.MEDIUM,
    key: CACHE_KEYS.MENU_TREE,
  },
} as const;
