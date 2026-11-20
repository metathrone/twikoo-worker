# Twikoo 2.0 Cloudflare Worker

自动同步上游 [twikoojs/twikoo](https://github.com/twikoojs/twikoo) 的 `packages/server-cloudflare` 并在 Cloudflare Workers + D1 上构建和部署。

## 架构说明
- **Upstream**: `https://github.com/twikoojs/twikoo/tree/main/packages/server-cloudflare`
- **Database**: Cloudflare D1 (`twikoo`, ID: `8a81fe04-e662-4d34-aa20-b1f61045fce3`)
- **Domain**: `comment.rushia.eu.org`
- **Runtime**: Node.js 26 + Workerd (`compatibility_flags = ["nodejs_compat"]`)
