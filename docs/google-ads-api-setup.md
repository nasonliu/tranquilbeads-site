# Google Ads API / MCP 准备说明

日期：2026-07-01

## 当前状态

- Manager Account：`801-045-9176`（TranquilBeads Manager）
- Advertising Account：`709-112-1019`
- Developer Token：已在 Manager Account 的 API Center 创建并获批
- 当前 API 访问级别：Basic Access
- Basic Access：已批准并激活，每日上限 15,000 operations
- Google Cloud OAuth Client：已创建为桌面应用
- Google Ads API：已在 Google Cloud 项目中启用
- OAuth refresh token：已生成并保存到本机 `.env.local`
- 当前可访问 customers：`customers/7091121019`、`customers/8010459176`
- 当前已读取到的转化动作：
  - `whatsapp`，类型 `WEBPAGE`，类别 `CONTACT`，状态 `ENABLED`，primary
  - `Outbound click - Amazon`，类型 `WEBPAGE`，类别 `OUTBOUND_CLICK`，状态 `ENABLED`，secondary
  - `Outbound click - Noon`，类型 `WEBPAGE`，类别 `OUTBOUND_CLICK`，状态 `ENABLED`，secondary
- 设计文档：`docs/google-ads-api-tool-design.rtf`
- 注意：`7091121019` 当前通过 OAuth 用户直接访问；本机 `.env.local` 里的 `GOOGLE_ADS_LOGIN_CUSTOMER_ID` 先保持为空。设置为 `8010459176` 会导致 Google Ads API 对 `7091121019` 返回 `USER_PERMISSION_DENIED`。

## 目标

把 Google Ads 的日常操作从浏览器迁移到 API/本地工具：

- 查看可访问的 Google Ads 客户账号
- 查看转化动作
- 后续扩展为创建转化动作、创建广告系列草稿、拉取搜索词和报表
- 再把这些能力包成 MCP 工具给 Codex 调用

## Google 官方前置条件

Google Ads API 调用至少需要：

- Google Ads Developer Token
- Google Cloud OAuth Client ID
- Google Cloud OAuth Client Secret
- OAuth refresh token，scope 是 `https://www.googleapis.com/auth/adwords`
- Google Ads Customer ID，例如当前账号 `709-112-1019`
- 如果通过经理账号管理客户账号，还需要 Login Customer ID

官方资料：

- Quick start: https://developers.google.com/google-ads/api/docs/get-started/make-first-call
- Client libraries: https://developers.google.com/google-ads/api/docs/client-libs
- Conversion management: https://developers.google.com/google-ads/api/docs/conversions/overview
- Release notes: https://developers.google.com/google-ads/api/docs/release-notes

当前仓库 API helper 使用 `v24` REST endpoint。

## 为什么还需要一次浏览器

API 不是 Google Ads 登录后自动可用。第一次必须人工完成：

1. 在 Google Ads Manager Account 的 API Center 申请/查看 Developer Token。
2. 在 Google Cloud Console 创建 OAuth Client。
3. 用 Google 账号授权一次，换取 refresh token。

完成 refresh token 后，后续查询、报表和自动化就可以走命令行/MCP。

## 环境变量

放在 `.env.local` 或运行命令时注入。Developer Token、OAuth Client Secret、Refresh Token 都按密码处理，不要发到聊天窗口、文档或 Git 里。

```bash
GOOGLE_ADS_DEVELOPER_TOKEN="replace-me"
GOOGLE_ADS_CLIENT_ID="replace-me.apps.googleusercontent.com"
GOOGLE_ADS_CLIENT_SECRET="replace-me"
GOOGLE_ADS_REFRESH_TOKEN="replace-me"
GOOGLE_ADS_CUSTOMER_ID="7091121019"

# 如果 API 明确需要通过 manager account 代理客户账号，再设置这个。
# 当前 TranquilBeads 的 7091121019 直接访问即可，先留空。
GOOGLE_ADS_LOGIN_CUSTOMER_ID=""

# 仅生成 refresh token 时需要
GOOGLE_ADS_REDIRECT_URI="http://localhost:8080/oauth2callback"
```

## 命令

生成 Google 授权链接：

```bash
npm run google-ads:api -- auth-url
```

浏览器打开授权链接后，复制回调里的 `code`，换取 token：

```bash
npm run google-ads:api -- exchange-code "PASTE_OAUTH_CODE"
```

输出里会包含 `refresh_token`。把它保存到本机 `.env.local` 的 `GOOGLE_ADS_REFRESH_TOKEN`。

列出当前 OAuth 用户可访问的 Google Ads customers：

```bash
npm run google-ads:api -- list-customers
```

列出转化动作：

```bash
npm run google-ads:api -- list-conversions
```

指定客户账号：

```bash
npm run google-ads:api -- list-conversions 7091121019
```

当前实测结果：

- `list-customers` 返回 `customers/7091121019` 和 `customers/8010459176`
- `list-conversions 7091121019` 返回 3 个转化动作：`whatsapp`、`Outbound click - Amazon`、`Outbound click - Noon`

## 下一步 MCP 化

MCP stdio server 已接入：

- `google_ads_list_customers`
- `google_ads_list_conversion_actions`
- `google_ads_auth_url`
- `google_ads_prepare_conversion_action`

当前 `google_ads_prepare_conversion_action` 只生成 dry-run mutate payload，不会写入 Google Ads。等基本访问权限、OAuth client、refresh token 都准备好后，再扩展：

- `google_ads_create_conversion_action`
- `google_ads_create_campaign_draft`
- `google_ads_search_terms_report`

写操作默认必须 dry-run，只有显式 `confirm: true` 才执行。

本地测试：

```bash
npm run test:run -- tests/google-ads-api.test.ts tests/google-ads-mcp.test.ts
npm run test:run -- tests/mcp-smoke.test.ts
```
