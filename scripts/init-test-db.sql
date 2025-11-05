-- home E2E测试数据库初始化脚本

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 使用测试数据库
USE home_test;

-- 创建完成后的消息
SELECT 'Test database initialized successfully!' as message;
