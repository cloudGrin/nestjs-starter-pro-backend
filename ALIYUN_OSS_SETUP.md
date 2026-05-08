# 阿里云 OSS 文件存储配置指南

本文记录 `home-admin` 文件管理模块接入阿里云 OSS 时需要配置的环境变量，以及阿里云控制台侧需要完成的 Bucket、RAM、CORS 配置。

当前实现支持两类 OSS 上传：

- 后端中转上传：前端把文件传给 `home-admin`，后端再写入 OSS。
- 浏览器直传 OSS：前端先向后端申请签名 URL，再直接 `PUT` 到 OSS，最后调用后端完成入库。

> 这份文档按“第一次配置阿里云 OSS”的方式写。先照着第 0 节和第 2 节完成控制台配置，再把第 1 节环境变量填进 `home-admin/.env.local`，最后用第 4 节排查。

## 0. 新手先读

### 0.1 最终要拿到哪些信息

配置完成后，你手里至少应该有这些值：

| 要拿到的值 | 从哪里拿 | 填到哪个环境变量 |
| --- | --- | --- |
| Bucket 所在地域 | OSS Bucket 概览页 | `FILE_OSS_REGION` |
| Bucket 名称 | OSS Bucket 列表或概览页 | `FILE_OSS_BUCKET` |
| Bucket Endpoint | OSS Bucket 概览页的访问域名或 Endpoint | `FILE_OSS_ENDPOINT` |
| RAM AccessKey ID | RAM 用户创建 AccessKey 后显示 | `FILE_OSS_ACCESS_KEY_ID` |
| RAM AccessKey Secret | RAM 用户创建 AccessKey 后只显示一次 | `FILE_OSS_ACCESS_KEY_SECRET` |
| 前端访问地址 | 浏览器地址栏 | OSS Bucket 的 CORS `AllowedOrigin` |

本地开发最常见的组合是：

```env
FILE_STORAGE=local
FILE_OSS_ENABLE=true
FILE_OSS_REGION=oss-cn-hangzhou
FILE_OSS_BUCKET=你的-bucket-名称
FILE_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
FILE_OSS_ACCESS_KEY_ID=你的-ram-access-key-id
FILE_OSS_ACCESS_KEY_SECRET=你的-ram-access-key-secret
```

`FILE_STORAGE=local` 的意思是默认仍然保存到本地；只是在上传弹窗里额外出现“阿里云 OSS”选项。这样对本地开发最稳，出问题时也方便退回本地上传。

### 0.2 先理解几个名词

| 名词 | 可以理解成 | 这份项目里怎么用 |
| --- | --- | --- |
| OSS | 阿里云的文件存储服务 | 用来保存图片、视频、文档等上传文件 |
| Bucket | 一个文件仓库 | 项目所有 OSS 文件放进同一个 Bucket |
| Object | Bucket 里的一个文件 | 例如 `image/2026/05/xxx.jpg` |
| Region | Bucket 所在地域 | 例如 `oss-cn-hangzhou` |
| Endpoint | 程序访问 Bucket 的域名 | 例如 `oss-cn-hangzhou.aliyuncs.com` |
| RAM 用户 | 给程序用的子账号 | 只给上传、读取、删除当前 Bucket 的权限 |
| AccessKey | 程序登录阿里云 API 的账号密码 | 只放在后端 `.env.local`，不能放前端 |
| CORS | 浏览器跨域规则 | 允许 `home-web` 页面直接 `PUT` 文件到 OSS |

### 0.3 推荐的配置策略

第一次配置建议按这个策略来：

1. Bucket 读写权限选“私有”。
2. 不使用阿里云主账号 AccessKey，只创建专用 RAM 用户。
3. RAM 用户只授权当前 Bucket 的 `PutObject`、`GetObject`、`DeleteObject`。
4. 本地开发保留 `FILE_STORAGE=local`，同时打开 `FILE_OSS_ENABLE=true`。
5. 只有浏览器地址栏里真正访问的前端 Origin 才加入 CORS，例如 `http://localhost:5173`。
6. 配完环境变量后重启后端，前端如果还在运行通常刷新页面即可。

### 0.4 操作顺序

建议严格按这个顺序做：

1. 在阿里云 OSS 创建 Bucket，记下 Bucket 名称、地域、Endpoint。
2. 在 RAM 创建专用用户和 AccessKey。
3. 给 RAM 用户绑定最小权限策略。
4. 给 Bucket 配 CORS，允许前端 Origin 直传。
5. 把环境变量填进 `home-admin/.env.local`。
6. 重启 `home-admin`。
7. 打开前端文件上传弹窗，看是否出现“阿里云 OSS”。
8. 上传一个小图片，用浏览器 Network 看是否完成 `initiate -> OSS PUT -> complete`。

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

怎么填这些值：

- `FILE_OSS_REGION`：填 `oss-cn-xxx` 这种格式，不是中文地域名。比如控制台显示“华东 1（杭州）”，通常对应 `oss-cn-hangzhou`。
- `FILE_OSS_BUCKET`：只填 Bucket 名称，不要带 `https://`，不要带 Endpoint。
- `FILE_OSS_ENDPOINT`：只填 Endpoint 域名，不要带 Bucket 名称，不要带 `https://`。例如填 `oss-cn-hangzhou.aliyuncs.com`，不要填 `https://my-bucket.oss-cn-hangzhou.aliyuncs.com`。
- `FILE_OSS_ACCESS_KEY_ID` 和 `FILE_OSS_ACCESS_KEY_SECRET`：只放在后端 `home-admin/.env.local` 或部署环境变量里。不要写进 `home-web/.env.local`，也不要提交到 Git。
- `FILE_OSS_ENABLE=true` 只表示 OSS 功能可用；是否默认上传到 OSS 由 `FILE_STORAGE` 决定。

填错时最常见的表现：

| 填错项 | 常见表现 |
| --- | --- |
| Region 或 Endpoint 不匹配 | 后端上传或签名时报 403、404、连接失败，或 OSS 返回签名相关错误 |
| Bucket 名称错 | OSS 返回 `NoSuchBucket` 或上传失败 |
| AccessKey ID/Secret 错 | OSS 返回 `InvalidAccessKeyId`、`SignatureDoesNotMatch` 或 403 |
| RAM 权限不足 | OSS 返回 `AccessDenied` 或 403 |
| `FILE_OSS_ENABLE` 没有设成 `true` | 前端上传弹窗没有 OSS 选项 |

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

注意：

- 这里的 URL 只影响公开文件的展示地址，不会改变上传到哪个 Bucket。
- 如果 Bucket 是私有读，直接访问公开拼出来的 URL 可能仍然打不开；私有文件应走后端签发的临时访问链接。
- 第一次配置 OSS 时可以先不填 `FILE_OSS_BASE_URL`，等上传和下载都确认正常后再接 CDN 或自定义域名。

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

本地文件放置位置：

- 后端密钥和 OSS 配置：放在 `home-admin/.env.local`。
- 前端只放后端 API 地址：放在 `home-web/.env.local`。
- AccessKey 不需要也不应该放进 `home-web`，因为浏览器里的前端环境变量会被打包给用户看到。

修改 `.env.local` 后需要重启后端：

```sh
cd home-admin
pnpm start:dev
```

如果前端页面已经打开，重启后端后刷新页面，再打开上传弹窗检查 OSS 选项。

## 2. 阿里云控制台配置步骤

### 2.1 创建 OSS Bucket

1. 登录阿里云控制台，进入 OSS 对象存储。
2. 创建 Bucket。
3. 选择离服务端较近的地域，例如华东 1 杭州。
4. 记录 Bucket 名称、地域和 Endpoint。
5. 读写权限建议选择私有。
6. 不建议把整个 Bucket 设置为公共读。公开文件由业务字段 `isPublic` 控制；私有文件通过后端签发临时访问链接。

新手填写建议：

| 控制台选项 | 建议值 | 原因 |
| --- | --- | --- |
| Bucket 名称 | 用容易识别的英文、数字、短横线名称 | 后续会写进环境变量，建议不要太长 |
| 地域 | 选离后端服务器近的地域 | 服务端中转上传和签名请求延迟更低 |
| 存储类型 | 标准存储 | 适合常用文件，第一次配置最省心 |
| 读写权限 ACL | 私有 | 避免整个 Bucket 被公网直接读取 |
| 版本控制 | 可先不开 | 个人项目先保持简单 |
| 服务端加密 | 可先不开或按自己需要开启 | 开启后注意下载权限可能涉及更多配置 |

地域和 Endpoint 的关系：

- 控制台可能显示中文地域，例如“华东 1（杭州）”；环境变量要填代码形式，例如 `oss-cn-hangzhou`。
- Endpoint 通常长得像 `oss-cn-hangzhou.aliyuncs.com`。
- 如果后端部署在同地域阿里云 ECS，可以考虑内网 Endpoint；本地电脑开发请用外网 Endpoint。
- `FILE_OSS_REGION` 和 `FILE_OSS_ENDPOINT` 必须对应同一个地域。

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

建议做法：

- RAM 用户名可以叫 `home-admin-oss-uploader`，以后看到就知道是这个项目在用。
- 只给这个 RAM 用户 OSS 所需权限，不要直接绑定 `AdministratorAccess`。
- AccessKey Secret 只会完整显示一次，创建后立刻保存到本地密码管理器或部署平台的环境变量里。
- 如果 AccessKey 曾经发到聊天工具、提交到 Git、贴到截图里，直接禁用并重新创建。
- 配置完成后，后端服务端持有 AccessKey，浏览器直传时只拿到一次性的签名 URL，不会拿到 AccessKey。

### 2.3 RAM 最小权限策略

给 RAM 用户绑定一个自定义策略，限制到当前 Bucket 和文件对象。

先准备两个值：

- `<account-id>`：阿里云账号 ID，可在账号头像、账号中心或安全设置里查看。
- `<bucket-name>`：刚才创建的 Bucket 名称。

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

创建和绑定策略的一般流程：

1. RAM 控制台进入“权限策略”。
2. 创建权限策略，类型选“脚本编辑”或类似 JSON 编辑方式。
3. 粘贴上面的 JSON，并替换 `<account-id>`、`<bucket-name>`。
4. 保存策略，名称可以叫 `HomeAdminOssBucketAccess`。
5. 回到 RAM 用户 `home-admin-oss-uploader`。
6. 给该用户新增授权，选择刚创建的自定义策略。

替换后的资源示例：

```json
"Resource": [
  "acs:oss:*:1234567890123456:my-home-files/*"
]
```

这里的 `/*` 表示授权 Bucket 里的文件对象。不要漏掉，否则用户可能只有 Bucket 级权限，没有文件读写权限。

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

先确认前端 Origin：

- 打开 `home-web` 页面，看浏览器地址栏。
- 如果地址栏是 `http://localhost:5173/files`，Origin 就是 `http://localhost:5173`。
- Origin 只包含协议、域名、端口，不包含路径。
- `http://localhost:5173` 和 `http://127.0.0.1:5173` 是两个不同 Origin。
- `http://localhost:5173` 和 `https://localhost:5173` 也是两个不同 Origin。
- 不要在 Origin 末尾加 `/`。

控制台字段可以这样填：

| CORS 字段 | 本项目建议值 | 说明 |
| --- | --- | --- |
| 来源 / AllowedOrigin | `http://localhost:5173`，生产环境填真实前端域名 | 必须和浏览器地址栏 Origin 完全一致 |
| 允许 Methods / AllowedMethod | `PUT`、`GET`、`HEAD` | 直传用 `PUT`，访问和校验可能用 `GET`、`HEAD` |
| 允许 Headers / AllowedHeader | `content-type`、`content-length`、`x-oss-forbid-overwrite` | 这些是直传和签名约束会涉及的头 |
| 暴露 Headers / ExposeHeader | `ETag`、`x-oss-request-id` | 方便前端和排障读取响应信息 |
| 缓存时间 / MaxAgeSeconds | `600` | 浏览器缓存预检结果 10 分钟 |

如果本地前端端口变了，例如 Vite 改成 `http://localhost:5174`，需要把新的 Origin 也加入 CORS。

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

### 2.6 配完后要重启和刷新

阿里云控制台配置保存后通常会很快生效，但本地服务不会自动重新读取 `.env.local`。

推荐检查顺序：

1. 保存 Bucket、RAM、CORS 配置。
2. 修改 `home-admin/.env.local`。
3. 停掉后端 `pnpm start:dev`，重新启动。
4. 刷新前端页面。
5. 重新打开上传弹窗。

如果后端启动时环境变量缺失，上传弹窗通常不会显示 OSS 选项。先不要急着改 CORS，优先检查 `.env.local` 是否填完整并且后端是否重启。

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

更具体地看：

| Network 请求 | 成功时应该怎样 | 失败时优先查什么 |
| --- | --- | --- |
| `POST /api/v1/files/direct-upload/initiate` | 返回 `uploadUrl`、`headers`、`uploadToken` | 后端环境变量、文件大小、文件类型、OSS 是否启用 |
| `OPTIONS <oss-url>` | 204 或 200，带 CORS 响应头 | Bucket CORS 的 Origin、Method、Header |
| `PUT <oss-url>` | 200，响应里有 `ETag` | RAM 权限、签名是否过期、请求头是否一致 |
| `POST /api/v1/files/direct-upload/complete` | 返回文件记录 | `HeadObject` 权限、对象大小是否一致 |

浏览器里判断 CORS 问题：

- 如果 Network 里 `OPTIONS` 失败，基本是 Bucket CORS 没配对。
- 如果 Console 里出现 `CORS policy`、`preflight`、`Access-Control-Allow-Origin`，先查 `AllowedOrigin`。
- 如果 `PUT` 根本没发出去，通常是预检失败。
- 如果 `PUT` 发出去了但 OSS 返回 403，通常不是浏览器跨域，而是 RAM 权限、签名或请求头问题。

常见失败：

| 现象 | 可能原因 |
| --- | --- |
| 上传弹窗没有 OSS 选项 | `FILE_OSS_ENABLE` 未开启，或 Bucket、AK 配置不完整 |
| OSS PUT 被浏览器拦截 | Bucket CORS 没有允许当前前端 Origin、`PUT` 方法或请求头 |
| OSS 返回 403 | RAM 权限不足、签名过期、请求头和签名不一致 |
| OSS 返回 409 | 目标 Object 已存在，`x-oss-forbid-overwrite=true` 生效 |
| complete 返回大小不匹配 | 上传对象大小和初始化时声明的 `size` 不一致 |

### 4.4 不装 ossutil 的验证方式

如果不想安装 `ossutil`，直接用页面也可以完成验证：

1. 启动后端和前端。
2. 打开浏览器开发者工具。
3. 切到 Network。
4. 上传一个很小的 `.jpg` 或 `.png` 文件。
5. 过滤 `direct-upload` 和 `aliyuncs`。
6. 确认三段请求都成功：`initiate`、OSS `PUT`、`complete`。

这个方式最适合第一次配置，因为它覆盖了前端、后端、签名、CORS、RAM 权限和数据库入库整条链路。

### 4.5 详细排障表

| 错误或现象 | 优先检查 | 处理方式 |
| --- | --- | --- |
| 上传弹窗没有“阿里云 OSS” | 后端 `.env.local`、后端是否重启 | 确认 `FILE_OSS_ENABLE=true`，Bucket、AccessKey 都非空，然后重启后端 |
| 后端启动正常，但 `storage-options` 没有 OSS | `FILE_OSS_BUCKET`、`FILE_OSS_ACCESS_KEY_ID`、`FILE_OSS_ACCESS_KEY_SECRET` | 这些值只要缺一个，代码就认为 OSS 不可用 |
| 浏览器报 CORS | Bucket CORS 的 Origin、Method、Header | Origin 必须和地址栏一致；允许 `PUT`；允许 `content-type`、`content-length`、`x-oss-forbid-overwrite` |
| OSS 返回 `AccessDenied` | RAM 自定义策略 | 确认策略绑定到了正确 RAM 用户，资源里 Bucket 名称正确，包含 `/*` |
| OSS 返回 `InvalidAccessKeyId` | AccessKey ID | 重新复制 RAM 用户的 AccessKey ID，确认没有空格 |
| OSS 返回 `SignatureDoesNotMatch` | AccessKey Secret、Region、Endpoint、请求头 | 重新复制 Secret；确认 Region/Endpoint 同地域；前端必须原样使用后端返回的 headers |
| OSS 返回 `NoSuchBucket` | Bucket 名称或地域 | 确认 `FILE_OSS_BUCKET` 没写错，Endpoint 对应同一个地域 |
| OSS 返回 409 | 同名 Object 已存在 | 这是禁止覆盖生效。换一个文件名或清理测试对象 |
| `complete` 失败并提示对象不存在 | OSS `PUT` 没成功或 object key 不一致 | 先看 Network 里 OSS `PUT` 是否 200 |
| `complete` 提示大小不匹配 | 初始化传的 size 和实际上传文件不一致 | 不要在 initiate 后更换文件；让前端用同一个 File 对象完成上传 |
| 私有文件打不开 | 临时访问链接过期或下载签名失败 | 重新打开文件获取新链接；检查 RAM 是否有 `oss:GetObject` |
| 只有生产环境失败 | 生产前端 Origin 未加入 CORS | 把生产域名加入 `AllowedOrigin`，例如 `https://admin.example.com` |

### 4.6 最小自检清单

遇到问题时按下面顺序打勾，通常能很快定位：

- `home-admin/.env.local` 里 `FILE_OSS_ENABLE=true`。
- `FILE_OSS_BUCKET` 只填 Bucket 名，不带域名。
- `FILE_OSS_ENDPOINT` 只填 Endpoint，不带 `https://`。
- RAM 用户绑定了自定义策略，不是只创建了 AccessKey。
- 自定义策略里的 `<account-id>` 和 `<bucket-name>` 已替换成真实值。
- CORS 的 `AllowedOrigin` 和浏览器地址栏 Origin 完全一致。
- CORS 的 `AllowedMethod` 包含 `PUT`。
- CORS 的 `AllowedHeader` 包含 `content-type`、`content-length`、`x-oss-forbid-overwrite`。
- 修改 `.env.local` 后重启过后端。
- 浏览器 Network 能看到 `initiate -> OSS PUT -> complete`。

## 5. 新手常见问题

### 5.1 为什么不建议 Bucket 公共读

这个项目里文件是否公开由业务字段 `isPublic` 控制：

- 公开文件：可以返回公开 URL。
- 私有文件：通过后端校验后生成短期访问链接。

如果直接把整个 Bucket 设成公共读，私有文件也可能被知道路径的人直接访问，业务里的私有控制就没有意义了。

### 5.2 为什么 AccessKey 不能放前端

`home-web` 是浏览器应用，打包后的代码会发给用户。任何放进前端环境变量里的密钥，都可以被用户在浏览器里看到。

本项目的安全边界是：

1. 后端保存 RAM AccessKey。
2. 前端向后端申请一次性上传签名。
3. 前端只拿签名 URL 上传文件。
4. 签名过期后不能继续使用。

### 5.3 `FILE_STORAGE=local` 和 `FILE_OSS_ENABLE=true` 会冲突吗

不冲突。

- `FILE_STORAGE=local`：默认上传方式是本地。
- `FILE_OSS_ENABLE=true`：OSS 作为可选上传方式出现在前端。

第一次接入建议这样配。等确认 OSS 稳定后，如果希望默认上传 OSS，再改成：

```env
FILE_STORAGE=oss
FILE_OSS_ENABLE=true
```

### 5.4 本地开发 CORS 应该填 3000、3001 还是 5173

填浏览器里打开前端页面的 Origin。

例如：

- 前端地址是 `http://localhost:5173`，就填 `http://localhost:5173`。
- 前端地址是 `http://localhost:3000`，就填 `http://localhost:3000`。
- 后端 API 地址 `http://localhost:3001` 通常不是浏览器直传 OSS 的 Origin，除非你真的在浏览器里打开的是这个地址。

不确定时，可以把本地实际用到的几个 Origin 都加上，但生产环境建议只填真实前端域名。

### 5.5 需要开 CDN 或自定义域名吗

第一次配置不需要。先让默认 OSS 域名上传、下载成功。

等确认功能正常后，如果你需要更好看的公开访问地址或 CDN 加速，再配置 `FILE_OSS_BASE_URL`。

### 5.6 费用上要注意什么

OSS 通常会按存储量、请求次数、流量等计费。个人项目建议：

- 先用小文件测试。
- 不要把大量视频一次性上传到测试 Bucket。
- 不用的测试文件及时删掉。
- 如果开启 CDN、自定义域名、跨地域流量，另外留意对应费用。

## 6. 参考链接

- 阿里云 OSS PutObject：<https://help.aliyun.com/zh/oss/developer-reference/putobject>
- 阿里云 OSS CORS PutBucketCors：<https://help.aliyun.com/zh/oss/developer-reference/putbucketcors>
- 阿里云 ossutil 配置 CORS：<https://help.aliyun.com/zh/oss/developer-reference/put-bucket-cors>
- 阿里云 ossutil 检测 CORS：<https://help.aliyun.com/zh/oss/developer-reference/cors-options>
- 阿里云 OSS 禁止覆盖同名文件（Node.js SDK）：<https://help.aliyun.com/zh/oss/developer-reference/prevent-objects-from-being-overwritten-by-objects-that-have-the-same-names-1>
- 阿里云 OSS 禁止文件覆盖写：<https://help.aliyun.com/zh/oss/user-guide/prevent-file-overwrite>
- 阿里云 RAM 创建用户：<https://help.aliyun.com/zh/ram/user-guide/create-a-ram-user>
- 阿里云 RAM 创建 AccessKey：<https://help.aliyun.com/zh/ram/user-guide/create-an-accesskey-pair>
