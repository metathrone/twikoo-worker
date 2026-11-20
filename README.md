# Twikoo 2.0 Cloudflare Worker

自动同步上游 [twikoojs/twikoo](https://github.com/twikoojs/twikoo) 的 `packages/server-cloudflare` 并在 Cloudflare Workers + D1 上构建和部署。

## 架构说明
- **Upstream**: `https://github.com/twikoojs/twikoo/tree/main/packages/server-cloudflare`
- **Database**: Cloudflare D1 (`twikoo`, ID: `8a81fe04-e662-4d34-aa20-b1f61045fce3`)
- **Domain**: `comment.rushia.eu.org`
- **Runtime**: Node.js 26 + Workerd (`compatibility_flags = ["nodejs_compat"]`)

---

## 高级功能与配置指南

### 1. Akismet 与腾讯云内容安全 (TMS) 原生支持
上游默认未为 Cloudflare Workers 适配 `akismet-api` 与 `tencentcloud-sdk-nodejs-tms`。本项目通过 Fetch + TC3-HMAC-SHA256 签名轻量垫片原生实现了这两项能力，且均在 **Twikoo 管理面板** 中直接配置：

- **Akismet 反垃圾评论**：
  - 在 Twikoo 管理面板中配置：
    - `AKISMET_KEY`: 您的 Akismet API Key
    - `SITE_URL`: 博客站点完整网址（如 `https://blog.rushia.eu.org`）
- **腾讯云内容安全 (TMS)**：
  - 在 Twikoo 管理面板中配置：
    - `QCLOUD_SECRET_ID`: 腾讯云访问密钥 SecretId
    - `QCLOUD_SECRET_KEY`: 腾讯云访问密钥 SecretKey
    - `QCLOUD_CMS_BIZTYPE`: （可选）审核策略 BizType，默认为空

### 2. Cloudflare R2 图片上传（S3 兼容协议）
Twikoo 2.0 服务端统一通过 S3 协议支持图片上传。使用 Cloudflare R2 时，请在 **Twikoo 管理面板** 中配置如下项：

1. **进入 Cloudflare 控制台 -> R2 对象存储**：
   - 创建存储桶（例如命名为 `twikoo-images`）。
   - 在存储桶设置中绑定自定义域名（例如 `img.rushia.eu.org`）或开启 R2.dev 访问。
   - 在 R2 总览页点击 **管理 R2 API 令牌 (Manage R2 API Tokens)**，创建一个拥有读写权限的 API 令牌，获取：
     - `Access Key ID`
     - `Secret Access Key`
     - 终结点 URL（格式为 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`）
2. **在 Twikoo 管理面板中填写**：
   - `IMAGE_CDN`: 选择或填入 `s3`
   - `S3_BUCKET`: 填写 R2 存储桶名（如 `twikoo-images`）
   - `S3_ENDPOINT`: 填写 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - `S3_ACCESS_KEY_ID`: 填写 R2 的 Access Key ID
   - `S3_SECRET_ACCESS_KEY`: 填写 R2 的 Secret Access Key
   - `S3_CDN_URL`: 填写绑定的访问域名（如 `https://img.rushia.eu.org`）
   - `S3_FORCE_PATH_STYLE`: 填 `true`（路径风格访问）
   - `S3_PATH_PREFIX`: （可选）前缀路径，例如 `uploads/`
