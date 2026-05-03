# 阿里云 OSS 文件存储配置指南

本文记录 `home-admin` 文件管理模块接入阿里云 OSS 时需要配置的环境变量，以及阿里云控制台侧需要完成的 Bucket、RAM、CORS 配置。

当前实现支持两类 OSS 上传：

- 后端中转上传：前端把文件传给 `home-admin`，后端再写入 OSS。
- 浏览器直传 OSS：前端先向后端申请签名 URL，再直接 `PUT` 到 OSS，最后调用后端完成入库。

## 1. 环境变量

### 1.1 必填配置

```env
FILE_OSS_ENABLE=true
FILE_OSS_REGION=oss-cn-hangzhou
FILE_OSS_BUCKET=your-bucket-name
FILE_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
FILE_OSS_ACCESS_KEY_ID=your-ram-access-key-id
FILE_OSS_ACCESS_KEY_SECRET=your-ram-access-key-secret
```

说明：

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `FILE_OSS_ENABLE` | 是否启用 OSS。只有为 `true` 且关键配置完整时，前端才会看到 OSS 上传选项。 | `true` |
| `FILE_OSS_REGION` | Bucket 所在地域。注意这里使用 `ali-oss` 的 region 格式，通常是 `oss-cn-xxx`。 | `oss-cn-hangzhou` |
| `FILE_OSS_BUCKET` | Bucket 名称。 | `my-home-files` |
| `FILE_OSS_ENDPOINT` | OSS Endpoint。建议服务端使用外网 Endpoint；同地域 ECS 可改用内网 Endpoint。 | `oss-cn-hangzhou.aliyuncs.com` |
| `FILE_OSS_ACCESS_KEY_ID` | RAM 用户 AccessKey ID。不要使用主账号 AccessKey。 | `LTAI...` |
| `FILE_OSS_ACCESS_KEY_SECRET` | RAM 用户 AccessKey Secret。只在创建时显示一次，需要保存到本机 `.env.local` 或部署环境。 | `xxx` |

### 1.2 推荐配置

```env
FILE_STORAGE=local
FILE_MAX_SIZE=52428800
FILE_ALLOWED_TYPES=.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.mp4,.mov,.webm,.mkv,.avi,.wmv,.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip
FILE_PRIVATE_LINK_TTL_SECONDS=86400
FILE_OSS_DIRECT_UPLOAD_TTL_SECONDS=900
FILE_OSS_SECURE=true
```

说明：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `FILE_STORAGE` | 默认上传存储。个人本地开发建议保留 `local`，上传时在前端选择 OSS。若想默认走 OSS，可设为 `oss`。 | `local` |
| `FILE_MAX_SIZE` | 普通文件上传和通用 OSS 直传的单文件最大大小，单位字节。家庭媒体接口使用 OSS 直传并单独允许 500MB。 | `52428800` |
| `FILE_ALLOWED_TYPES` | 允许上传的扩展名，逗号分隔。 | `.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.mp4,.mov,.webm,.mkv,.avi,.wmv,.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip` |
| `FILE_PRIVATE_LINK_TTL_SECONDS` | 私有文件临时访问链接有效期，单位秒。 | `86400` |
| `FILE_OSS_DIRECT_UPLOAD_TTL_SECONDS` | OSS 浏览器直传签名有效期，单位秒。当前校验范围是 `60` 到 `3600`。 | `900` |
| `FILE_OSS_SECURE` | 是否使用 HTTPS 访问 OSS。 | `true` |

### 1.3 可选公开访问域名

```env
FILE_OSS_BASE_URL=https://cdn.example.com
```

`FILE_OSS_BASE_URL` 用于公开文件的 URL 拼接。如果配置了自定义域名或 CDN 域名，公开文件会返回：

```text
https://cdn.example.com/<object-key>
```

如果不配置，后端会使用 OSS SDK 生成的默认 Object URL。

### 1.4 本地开发示例

如果只想在本地开发时可选 OSS，推荐这样配置后端 `.env.local`：

```env
FILE_STORAGE=local
FILE_OSS_ENABLE=true
FILE_OSS_REGION=oss-cn-hangzhou
FILE_OSS_BUCKET=your-bucket-name
FILE_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
FILE_OSS_ACCESS_KEY_ID=your-ram-access-key-id
FILE_OSS_ACCESS_KEY_SECRET=your-ram-access-key-secret
FILE_OSS_SECURE=true
FILE_OSS_DIRECT_UPLOAD_TTL_SECONDS=900
FILE_PRIVATE_LINK_TTL_SECONDS=86400
```

前端 `.env.local` 只需要保证 API 地址指向后端。例如：

```env
VITE_API_URL=http://localhost:3001/api/v1
```

## 2. 阿里云控制台配置步骤

### 2.1 创建 OSS Bucket

1. 登录阿里云控制台，进入 OSS 对象存储。
2. 创建 Bucket。
3. 选择离服务端较近的地域，例如华东 1 杭州。
4. 记录 Bucket 名称、地域和 Endpoint。
5. 读写权限建议选择私有。
6. 不建议把整个 Bucket 设置为公共读。公开文件由业务字段 `isPublic` 控制；私有文件通过后端签发临时访问链接。

环境变量映射示例：

```env
FILE_OSS_REGION=oss-cn-hangzhou
FILE_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
FILE_OSS_BUCKET=your-bucket-name
```

### 2.2 创建 RAM 用户和 AccessKey

1. 进入 RAM 访问控制控制台。
2. 创建一个专用于 `home-admin` 的 RAM 用户，例如 `home-admin-oss-uploader`。
3. 访问方式选择 OpenAPI 调用或永久 AccessKey 访问。
4. 创建 AccessKey，保存 `AccessKey ID` 和 `AccessKey Secret`。
5. 不要使用阿里云主账号 AccessKey。主账号权限过大，泄漏后影响整个账号。

### 2.3 RAM 最小权限策略

给 RAM 用户绑定一个自定义策略，限制到当前 Bucket 和文件对象。

将下面策略里的 `<account-id>` 和 `<bucket-name>` 替换成自己的值：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject",
        "oss:DeleteObject"
      ],
      "Resource": [
        "acs:oss:*:<account-id>:<bucket-name>/*"
      ]
    }
  ]
}
```

说明：

- `oss:PutObject`：后端中转上传、签名直传 PUT 都需要。
- `oss:GetObject`：私有文件下载签名、`HeadObject` 元信息读取都需要。阿里云文档中 `HeadObject` 对应权限也是 `oss:GetObject`。
- `oss:DeleteObject`：删除文件和异常回滚时清理 OSS 对象需要。

如果你希望后续在后台列出 OSS 对象，再额外增加 `oss:ListObjects` 并授权 Bucket 级资源：

```json
{
  "Effect": "Allow",
  "Action": ["oss:ListObjects"],
  "Resource": ["acs:oss:*:<account-id>:<bucket-name>"]
}
```

当前文件管理功能不依赖直接列举 OSS Bucket。

### 2.4 配置 Bucket CORS

浏览器直传 OSS 会从 `home-web` 所在 Origin 直接请求 OSS，所以 Bucket 必须配置 CORS。否则前端会在预检请求或 PUT 时失败。

进入 OSS Bucket：

1. 基础设置或权限控制中找到跨域设置 CORS。
2. 新增规则。
3. `AllowedOrigin` 填前端访问域名。
4. `AllowedMethod` 至少包含 `PUT`、`GET`、`HEAD`。
5. `AllowedHeader` 必须允许直传请求会带的头。
6. `ExposeHeader` 建议暴露 `ETag`、`x-oss-request-id`。

本地开发示例：

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>http://localhost:3000</AllowedOrigin>
    <AllowedOrigin>http://localhost:3001</AllowedOrigin>
    <AllowedOrigin>http://localhost:5173</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>content-type</AllowedHeader>
    <AllowedHeader>content-length</AllowedHeader>
    <AllowedHeader>x-oss-forbid-overwrite</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>x-oss-request-id</ExposeHeader>
    <MaxAgeSeconds>600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

生产示例：

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://admin.example.com</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>content-type</AllowedHeader>
    <AllowedHeader>content-length</AllowedHeader>
    <AllowedHeader>x-oss-forbid-overwrite</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>x-oss-request-id</ExposeHeader>
    <MaxAgeSeconds>600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

如果临时排障，也可以把 `AllowedHeader` 设置为 `*`。长期配置建议显式列出请求头。

当前代码的 OSS 直传请求头是：

```http
Content-Type: <file.type>
x-oss-forbid-overwrite: true
```

同时后端签名时把 `Content-Length` 纳入了 V4 签名约束。浏览器会自动带实际 `Content-Length`，不能手动设置该 header。CORS 规则里仍建议允许 `content-length`，避免不同浏览器或预检行为差异。

### 2.5 禁止覆盖同名文件

当前后端签发的 OSS PUT URL 会要求客户端带：

```http
x-oss-forbid-overwrite: true
```

含义：

- 如果目标 Object 已存在，OSS 会拒绝覆盖并返回冲突错误。
- 可以避免同一个签名 URL 在过期前覆盖已完成入库的对象。

如果你想在 Bucket 层面进一步兜底，可以在 OSS 控制台配置“禁止文件覆盖写”规则：

- 规则前缀建议覆盖业务上传目录，例如 `image/`、`document/`、`user-avatar/`，或者留空覆盖整个 Bucket。
- 授权用户如果留空，规则会对所有用户生效，包括 Bucket 所有者。
- OSS 的前缀、后缀匹配不是通配表达式，`logs/*.txt` 不会表示通配匹配；应使用前缀 `logs/` 和后缀 `.txt`。

这个 Bucket 级规则是额外保护，不是当前项目正常运行的必需项。

## 3. 代码流程对应关系

### 3.1 OSS 直传

1. 前端调用：

```http
POST /api/v1/files/direct-upload/initiate
```

2. 后端校验：

- 文件名和扩展名；
- MIME 类型；
- 文件大小 `dto.size <= FILE_MAX_SIZE`；
- OSS 是否启用。

3. 后端返回：

- `uploadUrl`：OSS 签名 PUT URL；
- `headers`：必须原样带给 OSS 的请求头；
- `uploadToken`：完成上传时交给后端入库的令牌。

4. 前端直接 PUT 到 OSS：

```http
PUT <uploadUrl>
Content-Type: <file.type>
x-oss-forbid-overwrite: true
```

5. 前端调用：

```http
POST /api/v1/files/direct-upload/complete
```

6. 后端通过 OSS `HeadObject` 校验对象大小，写入数据库。

### 3.2 私有文件访问

私有文件不会直接保存公开 URL。访问流程是：

1. 前端调用后端创建临时访问链接。
2. 本地存储私有文件：后端校验 token 后流式返回文件。
3. OSS 私有文件：后端校验 token 后返回短期 OSS 下载签名 URL。

## 4. 验证步骤

### 4.1 后端启动检查

启动后端：

```sh
cd home-admin
pnpm start:dev
```

打开文件管理页面，上传弹窗中能看到“阿里云 OSS”选项，说明：

- `FILE_OSS_ENABLE=true`；
- Bucket、AK 等配置完整；
- 后端 `/files/storage-options` 已返回 OSS 可用。

### 4.2 CORS 预检检查

如果安装了 `ossutil`，可以用类似命令检查：

```sh
ossutil cors-options \
  --acr-method put \
  --origin "http://localhost:3000" \
  --acr-headers "content-type,x-oss-forbid-overwrite,content-length" \
  oss://your-bucket-name/test-object.txt
```

能看到 `Access-Control-Allow-Methods`、`Access-Control-Allow-Headers` 等响应时，说明规则匹配成功。

### 4.3 浏览器直传检查

1. 前端选择 OSS 上传。
2. 浏览器 Network 中应看到一次到后端的 `direct-upload/initiate`。
3. 随后应看到一次到 OSS 域名的 `PUT`。
4. 最后应看到一次到后端的 `direct-upload/complete`。

常见失败：

| 现象 | 可能原因 |
| --- | --- |
| 上传弹窗没有 OSS 选项 | `FILE_OSS_ENABLE` 未开启，或 Bucket、AK 配置不完整 |
| OSS PUT 被浏览器拦截 | Bucket CORS 没有允许当前前端 Origin、`PUT` 方法或请求头 |
| OSS 返回 403 | RAM 权限不足、签名过期、请求头和签名不一致 |
| OSS 返回 409 | 目标 Object 已存在，`x-oss-forbid-overwrite=true` 生效 |
| complete 返回大小不匹配 | 上传对象大小和初始化时声明的 `size` 不一致 |

## 5. 参考链接

- 阿里云 OSS PutObject：<https://help.aliyun.com/zh/oss/developer-reference/putobject>
- 阿里云 OSS CORS PutBucketCors：<https://help.aliyun.com/zh/oss/developer-reference/putbucketcors>
- 阿里云 ossutil 配置 CORS：<https://help.aliyun.com/zh/oss/developer-reference/put-bucket-cors>
- 阿里云 ossutil 检测 CORS：<https://help.aliyun.com/zh/oss/developer-reference/cors-options>
- 阿里云 OSS 禁止覆盖同名文件（Node.js SDK）：<https://help.aliyun.com/zh/oss/developer-reference/prevent-objects-from-being-overwritten-by-objects-that-have-the-same-names-1>
- 阿里云 OSS 禁止文件覆盖写：<https://help.aliyun.com/zh/oss/user-guide/prevent-file-overwrite>
- 阿里云 RAM 创建用户：<https://help.aliyun.com/zh/ram/user-guide/create-a-ram-user>
- 阿里云 RAM 创建 AccessKey：<https://help.aliyun.com/zh/ram/user-guide/create-an-accesskey-pair>
