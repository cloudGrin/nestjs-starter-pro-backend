import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 插入默认菜单数据
 * 包含：仪表盘、系统管理（用户、角色、权限、菜单）
 */
export class InsertDefaultMenus1730282400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('📋 开始插入默认菜单数据...');

    // 检查是否已有菜单数据
    const existingMenus = await queryRunner.query(`SELECT COUNT(*) as count FROM menus`);
    if (existingMenus[0].count > 0) {
      console.log('⏭️  菜单数据已存在，跳过插入');
      return;
    }

    // 1. 插入仪表盘（顶级菜单）
    await queryRunner.query(`
      INSERT INTO menus (name, path, type, icon, component, parent_id, sort, isActive, isVisible, isExternal, isCache, remark)
      VALUES
      ('仪表盘', '/dashboard', 'menu', 'DashboardOutlined', '@/pages/Dashboard', NULL, 1, true, true, false, true, '系统仪表盘')
    `);

    // 2. 插入系统管理（目录）
    await queryRunner.query(`
      INSERT INTO menus (name, path, type, icon, component, parent_id, sort, isActive, isVisible, isExternal, isCache, remark)
      VALUES
      ('系统管理', '/system', 'directory', 'SettingOutlined', NULL, NULL, 10, true, true, false, true, '系统管理目录')
    `);

    // 获取系统管理的ID
    const systemMenu = await queryRunner.query(`SELECT id FROM menus WHERE path = '/system'`);
    const systemMenuId = systemMenu[0].id;

    // 3. 插入系统管理的子菜单
    await queryRunner.query(`
      INSERT INTO menus (name, path, type, icon, component, parent_id, sort, isActive, isVisible, isExternal, isCache, remark)
      VALUES
      ('用户管理', '/users', 'menu', 'UserOutlined', '@/pages/UserList', ${systemMenuId}, 1, true, true, false, true, '用户列表管理'),
      ('角色管理', '/roles', 'menu', 'TeamOutlined', '@/pages/RoleList', ${systemMenuId}, 2, true, true, false, true, '角色权限管理'),
      ('权限管理', '/permissions', 'menu', 'SafetyCertificateOutlined', '@/pages/PermissionList', ${systemMenuId}, 3, true, true, false, true, '权限列表管理'),
      ('菜单管理', '/menus', 'menu', 'MenuOutlined', '@/pages/MenuList', ${systemMenuId}, 4, true, true, false, true, '菜单树管理')
    `);

    console.log('✅ 默认菜单数据插入完成');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('📋 开始回滚默认菜单数据...');

    // 删除所有默认菜单（按路径匹配）
    await queryRunner.query(`
      DELETE FROM menus WHERE path IN (
        '/dashboard',
        '/system',
        '/users',
        '/roles',
        '/permissions',
        '/menus'
      )
    `);

    console.log('✅ 默认菜单数据回滚完成');
  }
}
