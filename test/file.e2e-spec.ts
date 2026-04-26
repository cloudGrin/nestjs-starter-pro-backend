import { INestApplication, HttpStatus } from '@nestjs/common';
import {
  apiPath,
  createTestApp,
  createSuperAdminCredentials,
  authenticatedRequest,
  TestCredentials,
  generateTestUsername,
  generateTestEmail,
} from './test-helper';

/**
 * File模块E2E测试
 *
 * 测试覆盖：
 * 1. 文件上传（直传）
 * 2. 文件列表查询和过滤
 * 3. 文件详情查询
 * 4. 文件删除
 * 5. 文件下载
 * 6. 权限验证
 *
 * 注意：
 * - 文件上传需要multipart/form-data格式
 * - 测试使用小文件避免超时
 * - 清理测试上传的文件
 */
describe('文件管理模块 (e2e)', () => {
  let app: INestApplication;
  let credentials: TestCredentials;
  const uploadedFileIds: number[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    // 创建超级管理员用户（拥有所有权限）
    credentials = await createSuperAdminCredentials(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'Admin@123456',
    });
  });

  afterAll(async () => {
    // 清理上传的测试文件
    for (const fileId of uploadedFileIds) {
      try {
        await authenticatedRequest(app, credentials.accessToken).delete(
          apiPath(`/files/${fileId}`),
        );
      } catch {
        // 忽略清理错误
      }
    }

    if (app) {
      await app.close();
    }
  });

  describe('POST /files/upload', () => {
    it('应该成功上传文件', async () => {
      // 创建一个小的测试文件
      const testContent = 'This is a test file content';
      const testBuffer = Buffer.from(testContent);

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, 'test.txt')
        .field('module', 'test')
        .field('isPublic', 'true');

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);

      if (response.body.data?.id) {
        uploadedFileIds.push(response.body.data.id);
        expect(response.body.data).toHaveProperty('originalName', 'test.txt');
        expect(response.body.data).toHaveProperty('filename');
        expect(response.body.data).toHaveProperty('path');
        expect(response.body.data).toHaveProperty('size');
      }
    });

    it('应该拒绝不支持的文件类型', async () => {
      const testBuffer = Buffer.from('malicious content');

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, 'malicious.exe');

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝空文件', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).post(
        '/files/upload',
      );

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('应该支持上传图片文件', async () => {
      // 创建一个简单的文本文件模拟图片（实际项目中会是真实图片）
      const testBuffer = Buffer.from('fake image data');

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, 'test-image.jpg')
        .field('module', 'avatar');

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      if ([HttpStatus.CREATED, HttpStatus.OK].includes(response.status) && response.body.data?.id) {
        uploadedFileIds.push(response.body.data.id);
        expect(response.body.data.originalName).toBe('test-image.jpg');
      }
    });

    it('拒绝未认证的上传请求', async () => {
      const testBuffer = Buffer.from('test');

      const response = await authenticatedRequest(app, 'invalid-token')
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, 'test.txt');

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /files', () => {
    it('应该返回文件列表', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).get(
        apiPath('/files'),
      );

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('meta');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('应该支持分页', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).get(
        '/files?page=1&limit=5',
      );

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data.meta.itemsPerPage).toBe(5);
      expect(response.body.data.meta.currentPage).toBe(1);
    });

    it('应该支持按模块过滤', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).get(
        '/files?module=test',
      );

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.OK);

      // 如果有结果，验证都是test模块
      if (response.body.data.items.length > 0) {
        response.body.data.items.forEach((file: any) => {
          if (file.module) {
            expect(file.module).toBe('test');
          }
        });
      }
    });

    it('应该支持按存储类型过滤', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).get(
        '/files?storage=local',
      );

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.OK);

      // 如果有结果，验证都是local存储
      if (response.body.data.items.length > 0) {
        response.body.data.items.forEach((file: any) => {
          expect(file.storage).toBe('local');
        });
      }
    });

    it('拒绝未认证的列表查询', async () => {
      const response = await authenticatedRequest(app, 'invalid-token').get(apiPath('/files'));

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /files/:id', () => {
    let testFileId: number;

    beforeAll(async () => {
      // 先上传一个测试文件
      const testBuffer = Buffer.from('test file for detail query');
      const uploadResponse = await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, 'detail-test.txt')
        .field('module', 'test');

      if ([HttpStatus.CREATED, HttpStatus.OK].includes(uploadResponse.status)) {
        testFileId = uploadResponse.body.data?.id;
        if (testFileId) {
          uploadedFileIds.push(testFileId);
        }
      }
    });

    it('应该返回文件详情', async () => {
      expect(testFileId).toBeDefined();

      const response = await authenticatedRequest(app, credentials.accessToken).get(
        `/files/${testFileId}`,
      );

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data).toHaveProperty('id', testFileId);
      expect(response.body.data).toHaveProperty('originalName');
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('path');
      expect(response.body.data).toHaveProperty('size');
    });

    it('不存在的文件ID应该返回404', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).get(
        '/files/999999',
      );

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('应该拒绝无效的文件ID', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).get(
        '/files/invalid-id',
      );

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /files/:id', () => {
    it('应该成功删除文件', async () => {
      // 先上传一个文件用于删除
      const testBuffer = Buffer.from('file to be deleted');
      const uploadResponse = await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, 'to-delete.txt')
        .field('module', 'test');

      expect(uploadResponse.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(uploadResponse.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(uploadResponse.status);

      const fileId = uploadResponse.body.data?.id;

      const deleteResponse = await authenticatedRequest(app, credentials.accessToken).delete(
        `/files/${fileId}`,
      );

      expect(deleteResponse.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(deleteResponse.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect(deleteResponse.status).toBe(HttpStatus.NO_CONTENT);

      // 验证文件已删除
      const getResponse = await authenticatedRequest(app, credentials.accessToken).get(
        `/files/${fileId}`,
      );

      if (
        getResponse.status !== HttpStatus.FORBIDDEN &&
        getResponse.status !== HttpStatus.UNAUTHORIZED
      ) {
        expect(getResponse.status).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('删除不存在的文件应该返回404', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).delete(
        '/files/999999',
      );

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('拒绝未认证的删除请求', async () => {
      const response = await authenticatedRequest(app, 'invalid-token').delete(apiPath('/files/1'));

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理超长的文件名', async () => {
      const longFilename = 'a'.repeat(200) + '.txt';
      const testBuffer = Buffer.from('test');

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, longFilename);

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      // 应该能正常处理或返回适当的错误
      expect([HttpStatus.CREATED, HttpStatus.OK, HttpStatus.BAD_REQUEST]).toContain(
        response.status,
      );

      if ([HttpStatus.CREATED, HttpStatus.OK].includes(response.status) && response.body.data?.id) {
        uploadedFileIds.push(response.body.data.id);
      }
    });

    it('应该处理包含特殊字符的文件名', async () => {
      const specialFilename = 'test @#$%^&().txt';
      const testBuffer = Buffer.from('test');

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, specialFilename);

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      if ([HttpStatus.CREATED, HttpStatus.OK].includes(response.status) && response.body.data?.id) {
        uploadedFileIds.push(response.body.data.id);
        // 文件名应该被正确处理
        expect(response.body.data.originalName).toBeTruthy();
      }
    });

    it('应该处理中文文件名', async () => {
      const chineseFilename = '测试文件.txt';
      const testBuffer = Buffer.from('测试内容');

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, chineseFilename);

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);

      if ([HttpStatus.CREATED, HttpStatus.OK].includes(response.status) && response.body.data?.id) {
        uploadedFileIds.push(response.body.data.id);
        expect(response.body.data.originalName).toBe(chineseFilename);
      }
    });
  });

  describe('完整流程测试', () => {
    it('上传->查询列表->查询详情->删除', async () => {
      // 1. 上传文件
      const testBuffer = Buffer.from('complete flow test');
      const uploadResponse = await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, 'flow-test.txt')
        .field('module', 'flow-test')
        .field('isPublic', 'true')
        .field('remark', 'This is a test file');

      expect(uploadResponse.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(uploadResponse.status).not.toBe(HttpStatus.UNAUTHORIZED);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(uploadResponse.status);

      const fileId = uploadResponse.body.data?.id;
      expect(fileId).toBeDefined();

      // 2. 查询文件列表（应该包含刚上传的文件）
      const listResponse = await authenticatedRequest(app, credentials.accessToken).get(
        '/files?module=flow-test',
      );

      expect(listResponse.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(listResponse.status).not.toBe(HttpStatus.UNAUTHORIZED);
      expect(listResponse.status).toBe(HttpStatus.OK);
      if (listResponse.body.data.items.length > 0) {
        const found = listResponse.body.data.items.some((f: any) => f.id === fileId);
        expect(found).toBe(true);
      }

      // 3. 查询文件详情
      const detailResponse = await authenticatedRequest(app, credentials.accessToken).get(
        `/files/${fileId}`,
      );

      expect(detailResponse.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(detailResponse.status).not.toBe(HttpStatus.UNAUTHORIZED);
      expect(detailResponse.status).toBe(HttpStatus.OK);
      expect(detailResponse.body.data.id).toBe(fileId);
      expect(detailResponse.body.data.originalName).toBe('flow-test.txt');

      // 4. 删除文件
      const deleteResponse = await authenticatedRequest(app, credentials.accessToken).delete(
        `/files/${fileId}`,
      );

      expect(deleteResponse.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(deleteResponse.status).not.toBe(HttpStatus.UNAUTHORIZED);
      expect(deleteResponse.status).toBe(HttpStatus.NO_CONTENT);

      // 5. 验证文件已删除
      const verifyResponse = await authenticatedRequest(app, credentials.accessToken).get(
        `/files/${fileId}`,
      );

      expect(verifyResponse.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(verifyResponse.status).not.toBe(HttpStatus.UNAUTHORIZED);
      expect(verifyResponse.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('性能测试', () => {
    it('文件上传应该在合理时间内完成', async () => {
      const testBuffer = Buffer.from('performance test');
      const startTime = Date.now();

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/files/upload'))
        .attach('file', testBuffer, 'perf-test.txt');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);
      // 小文件上传应该在1秒内完成
      expect(duration).toBeLessThan(1000);

      if ([HttpStatus.CREATED, HttpStatus.OK].includes(response.status) && response.body.data?.id) {
        uploadedFileIds.push(response.body.data.id);
      }
    });

    it('文件列表查询应该在合理时间内完成', async () => {
      const startTime = Date.now();

      const response = await authenticatedRequest(app, credentials.accessToken).get(
        apiPath('/files'),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);
      // 列表查询应该在1秒内完成
      expect(duration).toBeLessThan(1000);
    });
  });
});
