import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 添加Dict和Config模块的权限和菜单
 * 包含：
 * - 8个权限（dict:create/read/update/delete + config:create/read/update/delete）
 * - 2个菜单（数据字典、系统配置）
 * - 为super_admin角色分配权限和菜单
 */
export class AddDictConfigPermissionsAndMenus1730390000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('📋 开始添加Dict和Config模块的权限和菜单...');

    // ============================================
    // 第一步：添加权限（Permissions）
    // ============================================
    console.log('1️⃣ 添加Dict和Config权限...');

    // 字典管理权限
    await queryRunner.query(`
      INSERT INTO permissions (code, name, type, description, module, sort, isActive, createdAt, updatedAt)
      VALUES
        ('dict:create', '创建字典', 'api', '创建字典类型和字典项', 'dict', 1, 1, NOW(), NOW()),
        ('dict:read', '查看字典', 'api', '查看字典类型和字典项列表', 'dict', 2, 1, NOW(), NOW()),
        ('dict:update', '更新字典', 'api', '更新字典类型和字典项，切换状态', 'dict', 3, 1, NOW(), NOW()),
        ('dict:delete', '删除字典', 'api', '删除字典类型和字典项', 'dict', 4, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        updatedAt = NOW()
    `);

    // 系统配置权限
    await queryRunner.query(`
      INSERT INTO permissions (code, name, type, description, module, sort, isActive, createdAt, updatedAt)
      VALUES
        ('config:create', '创建配置', 'api', '创建系统配置项', 'config', 1, 1, NOW(), NOW()),
        ('config:read', '查看配置', 'api', '查看系统配置列表', 'config', 2, 1, NOW(), NOW()),
        ('config:update', '更新配置', 'api', '更新系统配置，切换状态，批量更新', 'config', 3, 1, NOW(), NOW()),
        ('config:delete', '删除配置', 'api', '删除系统配置项', 'config', 4, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        updatedAt = NOW()
    `);

    console.log('✅ 权限添加完成（8个）');

    // ============================================
    // 第二步：添加菜单（Menus）
    // ============================================
    console.log('2️⃣ 添加Dict和Config菜单...');

    // 确保系统管理目录存在
    const systemMenuResult = await queryRunner.query(`
      SELECT id FROM menus WHERE path = '/system' AND parent_id IS NULL LIMIT 1
    `);

    let systemMenuId: number;
    if (systemMenuResult.length === 0) {
      // 如果系统管理目录不存在，创建它
      await queryRunner.query(`
        INSERT INTO menus (name, path, type, icon, component, parent_id, sort, isVisible, isActive, isExternal, isCache, displayCondition, meta, createdAt, updatedAt)
        VALUES (
          '系统管理',
          '/system',
          'directory',
          'SettingOutlined',
          NULL,
          NULL,
          100,
          1,
          1,
          0,
          0,
          JSON_OBJECT('requireAnyPermission', JSON_ARRAY('dict:read', 'config:read', 'user:read', 'role:read', 'permission:read', 'menu:read')),
          JSON_OBJECT('title', '系统管理', 'icon', 'SettingOutlined'),
          NOW(),
          NOW()
        )
      `);
      const newSystemMenu = await queryRunner.query(`SELECT LAST_INSERT_ID() as id`);
      systemMenuId = newSystemMenu[0].id;
      console.log('📁 系统管理目录已创建');
    } else {
      systemMenuId = systemMenuResult[0].id;
      console.log('📁 系统管理目录已存在');
    }

    // 添加数据字典菜单
    await queryRunner.query(`
      INSERT INTO menus (name, path, type, icon, component, parent_id, sort, isVisible, isActive, isExternal, isCache, displayCondition, meta, createdAt, updatedAt)
      SELECT
        '数据字典',
        '/dicts',
        'menu',
        'BookOutlined',
        'system/dicts/index',
        ${systemMenuId},
        50,
        1,
        1,
        0,
        1,
        JSON_OBJECT('requireAnyPermission', JSON_ARRAY('dict:read')),
        JSON_OBJECT('title', '数据字典', 'icon', 'BookOutlined', 'noCache', false),
        NOW(),
        NOW()
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM menus WHERE path = '/dicts'
      )
    `);

    // 添加系统配置菜单
    await queryRunner.query(`
      INSERT INTO menus (name, path, type, icon, component, parent_id, sort, isVisible, isActive, isExternal, isCache, displayCondition, meta, createdAt, updatedAt)
      SELECT
        '系统配置',
        '/configs',
        'menu',
        'ToolOutlined',
        'system/configs/index',
        ${systemMenuId},
        51,
        1,
        1,
        0,
        1,
        JSON_OBJECT('requireAnyPermission', JSON_ARRAY('config:read')),
        JSON_OBJECT('title', '系统配置', 'icon', 'ToolOutlined', 'noCache', false),
        NOW(),
        NOW()
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM menus WHERE path = '/configs'
      )
    `);

    console.log('✅ 菜单添加完成（2个）');

    // ============================================
    // 第三步：为super_admin角色分配权限
    // ============================================
    console.log('3️⃣ 为super_admin分配权限...');

    await queryRunner.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = 'super_admin'
        AND p.code IN ('dict:create', 'dict:read', 'dict:update', 'dict:delete', 'config:create', 'config:read', 'config:update', 'config:delete')
    `);

    console.log('✅ super_admin权限分配完成');

    // ============================================
    // 第四步：为super_admin角色分配菜单
    // ============================================
    console.log('4️⃣ 为super_admin分配菜单...');

    await queryRunner.query(`
      INSERT IGNORE INTO role_menus (role_id, menu_id)
      SELECT r.id, m.id
      FROM roles r
      CROSS JOIN menus m
      WHERE r.code = 'super_admin'
        AND m.path IN ('/dicts', '/configs')
    `);

    console.log('✅ super_admin菜单分配完成');

    // ============================================
    // 验证结果
    // ============================================
    const permissionCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM permissions WHERE code LIKE 'dict:%' OR code LIKE 'config:%'
    `);
    const menuCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM menus WHERE path IN ('/dicts', '/configs')
    `);

    console.log('📊 验证结果：');
    console.log(`   - 权限数量: ${permissionCount[0].count}`);
    console.log(`   - 菜单数量: ${menuCount[0].count}`);
    console.log('✅ Dict和Config模块的权限和菜单添加完成！');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('📋 开始回滚Dict和Config模块的权限和菜单...');

    // 1. 删除角色权限关联
    console.log('1️⃣ 删除角色权限关联...');
    await queryRunner.query(`
      DELETE rp FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE p.code LIKE 'dict:%' OR p.code LIKE 'config:%'
    `);

    // 2. 删除角色菜单关联
    console.log('2️⃣ 删除角色菜单关联...');
    await queryRunner.query(`
      DELETE rm FROM role_menus rm
      INNER JOIN menus m ON rm.menu_id = m.id
      WHERE m.path IN ('/dicts', '/configs')
    `);

    // 3. 删除菜单
    console.log('3️⃣ 删除菜单...');
    await queryRunner.query(`
      DELETE FROM menus WHERE path IN ('/dicts', '/configs')
    `);

    // 4. 删除权限
    console.log('4️⃣ 删除权限...');
    await queryRunner.query(`
      DELETE FROM permissions WHERE code LIKE 'dict:%' OR code LIKE 'config:%'
    `);

    console.log('✅ Dict和Config模块的权限和菜单回滚完成');
  }
}
