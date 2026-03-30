# Resend 配置说明

这份文档说明 `ProjectNoor` 里 `Resend` 是怎么接入的，以及生产环境应该怎么配。

当前仓库里，`Resend` 主要负责两件事：

1. 发首封开发邮件
2. 接收客户邮件回复，并把回复同步进 outreach reply 流程
3. 把收到的客户回复自动转发到人工邮箱

相关代码入口：

- 发送邮件：[email-outreach.ts](/Volumes/新加卷/Documents/ProjectNoor/src/lib/email-outreach.ts)
- 邮件 webhook 解析：[outreach-webhooks.ts](/Volumes/新加卷/Documents/ProjectNoor/src/lib/outreach-webhooks.ts)
- App Router webhook 路由：[route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/outreach/webhooks/email/route.ts)
- 总体说明：[outreach-automation.md](/Volumes/新加卷/Documents/ProjectNoor/docs/outreach-automation.md)

## 1. 这套仓库怎么用 Resend

在这个项目里，邮件发送 provider 由环境变量控制：

- `OUTREACH_EMAIL_PROVIDER=dry_run|webhook|resend`

当值为 `resend` 时：

- `npm run outreach:send` 会直接调用 `https://api.resend.com/emails`
- 发件人来自 `OUTREACH_EMAIL_FROM`
- 回复地址来自 `OUTREACH_EMAIL_REPLY_TO`
- 图片附件会根据 `OUTREACH_PUBLIC_BASE_URL` 转成公网 URL 后交给 Resend

代码里对应逻辑：

- `createConfiguredEmailOutreachSender()`
- `createResendTransport()`

## 2. Resend 后台需要配什么

### 2.1 创建 API Key

在 Resend Dashboard 创建一把 API Key，然后填到：

```env
OUTREACH_RESEND_API_KEY=re_xxx
```

### 2.2 验证发信域名

如果你要正式给客户发邮件，不能长期依赖测试发件人。你需要在 Resend 里验证自己的域名，例如：

- `tranquilbeads.com`
- 或者专门拿一个子域名，例如 `mail.tranquilbeads.com`

验证完成后，`OUTREACH_EMAIL_FROM` 必须使用这个已验证域名下的地址，例如：

```env
OUTREACH_EMAIL_FROM="Nason <sales@tranquilbeads.com>"
```

如果只用默认测试域，通常只能发给你自己的邮箱，不能正式群发客户。这一点也是 Resend 官方文档强调的限制。

### 2.3 配 Receiving Domain

如果你希望客户直接回复开发邮件，然后系统自动同步回复，就要开启收件能力。

Resend 支持两种收件方式：

1. Resend 托管的 `*.resend.app` receiving domain
2. 你自己的自定义域名，通过加 `MX` 记录接收邮件

对这个仓库，更推荐你用自己的收件地址，例如：

- `reply@tranquilbeads.com`
- `sales@tranquilbeads.com`

这样客户看到的回复地址更自然，也方便后续人工接管。

## 3. 这个仓库需要的环境变量

生产推荐配置：

```env
OUTREACH_EMAIL_PROVIDER=resend
OUTREACH_RESEND_API_KEY=re_xxx
OUTREACH_RESEND_WEBHOOK_SECRET=whsec_xxx
OUTREACH_EMAIL_FROM="Nason <sales@agent.tranquilbeads.com>"
OUTREACH_EMAIL_REPLY_TO=reply@agent.tranquilbeads.com
OUTREACH_EMAIL_FORWARD_TO=sales@tranquilbeads.com
OUTREACH_PUBLIC_BASE_URL=https://www.tranquilbeads.com
OUTREACH_WEBHOOK_SECRET=your_shared_secret
```

说明：

- `OUTREACH_EMAIL_PROVIDER=resend`
  - 打开 Resend 发信通道
- `OUTREACH_RESEND_API_KEY`
  - 给发送接口和接收邮件正文拉取接口共用
- `OUTREACH_RESEND_WEBHOOK_SECRET`
  - Resend `email.received` webhook 的官方签名秘钥
- `OUTREACH_EMAIL_FROM`
  - Resend 实际发送时使用的发件人
- `OUTREACH_EMAIL_REPLY_TO`
  - 客户点回复时的目标地址
- `OUTREACH_EMAIL_FORWARD_TO`
  - 收到客户回信后，系统自动转发到的人工作业邮箱
- `OUTREACH_PUBLIC_BASE_URL`
  - 把本地附件路径转成公开 URL，供 Resend 附件引用
- `OUTREACH_WEBHOOK_SECRET`
  - 可选的共享 secret，给自定义 webhook 转发层使用

## 4. 邮件发送链路怎么走

发送时，这个仓库会 POST 到：

```text
https://api.resend.com/emails
```

请求体核心字段是：

- `from`
- `to`
- `reply_to`
- `subject`
- `text`
- `attachments`

当前实现是纯文本 `text` 发送，不是 HTML 模板优先。

如果发送成功，系统会把返回值里的：

- `messageId`
- `channelMessageId`
- 或 `id`

记录成当前 outreach task 的 `channelMessageId`。

## 5. 邮件回复 webhook 怎么配

你这个仓库已经预留好了接收路由：

```text
/api/outreach/webhooks/email
```

生产环境完整 URL 例如：

```text
https://www.tranquilbeads.com/api/outreach/webhooks/email
```

### 5.1 在 Resend 后台添加 Webhook

建议至少订阅：

- `email.received`

这样客户回复后，Resend 会把事件 POST 到你的路由。

### 5.2 这个仓库如何校验 webhook

当前代码优先支持两种校验方式：

1. Resend 官方 `svix-*` 签名校验
2. 共享 secret `x-outreach-webhook-secret`

对直接由 Resend 打进来的生产 webhook，更推荐第一种。

如果你用 Resend 官方签名：

- 在 Resend Dashboard 建 webhook 后，会生成一个 `whsec_...` 签名秘钥
- 把它填到 `OUTREACH_RESEND_WEBHOOK_SECRET`
- Resend 会自动带上：
  - `svix-id`
  - `svix-timestamp`
  - `svix-signature`

如果你走中间转发层，仍然可以继续用共享 secret：

- 请求头：`x-outreach-webhook-secret`
- 值：`OUTREACH_WEBHOOK_SECRET`

### 5.3 为什么代码还要再调一次 Resend API

这是一个很关键的点。

Resend 的 `email.received` webhook 事件里，不一定直接包含完整的正文。这个仓库当前逻辑是：

1. 先读 webhook 里的 `data.email_id`
2. 再调用：

```text
GET https://api.resend.com/emails/{email_id}
```

3. 拿到真正的 `text` / `body`
4. 再归一化成内部 reply 对象

这和 Resend 官方文档是一致的：接收邮件 webhook 可能只给元数据，正文要通过 Receiving API 再取。

## 6. 项目里当前的回信解析规则

Resend `email.received` 事件在当前代码里会映射成：

- `channel = "email"`
- `channelMessageId = data.thread_id || data.message_id`
- `recipientAddress = data.from`
- `receivedAt = data.created_at`
- `body = webhook 内联文本 || Resend API 拉回的文本`

然后交给：

- `syncOutreachReplies()`

再把对应任务推进到：

- `replied`
- `needs_human_followup`

接着当前实现还会再做一步：

- 用 `OUTREACH_EMAIL_FORWARD_TO` 把这封回信自动转发到人工邮箱

默认推荐的人工邮箱是：

- `sales@tranquilbeads.com`

## 7. 生产配置建议

推荐搭配是：

- WhatsApp：`OUTREACH_WHATSAPP_PROVIDER=openclaw`
- Email：`OUTREACH_EMAIL_PROVIDER=resend`

也就是：

- WhatsApp 用 OpenClaw 原生频道发
- Email 用 Resend 发
- 客户邮件回复走 Resend webhook 进来

这和你当前项目的自动获客路线是最匹配的。

## 8. 本地联调步骤

### 8.1 先配环境变量

```env
OUTREACH_EMAIL_PROVIDER=resend
OUTREACH_RESEND_API_KEY=re_xxx
OUTREACH_RESEND_WEBHOOK_SECRET=whsec_xxx
OUTREACH_EMAIL_FROM="Nason <sales@agent.tranquilbeads.com>"
OUTREACH_EMAIL_REPLY_TO=reply@agent.tranquilbeads.com
OUTREACH_EMAIL_FORWARD_TO=sales@tranquilbeads.com
OUTREACH_PUBLIC_BASE_URL=https://www.tranquilbeads.com
OUTREACH_WEBHOOK_SECRET=test_secret
```

### 8.2 发一轮邮件任务

```bash
npm run outreach:send
```

### 8.3 模拟邮件 webhook

向下面路由发 POST：

```text
/api/outreach/webhooks/email
```

并带上：

```http
x-outreach-webhook-secret: test_secret
```

如果你要模拟真实 Resend 直连，则改成带 `svix-id / svix-timestamp / svix-signature`，并确保 `OUTREACH_RESEND_WEBHOOK_SECRET` 已配置。

### 8.4 检查落库

看这些文件是否更新：

- `src/data/outreach/tasks.json`
- `src/data/outreach/events.json`

## 9. 常见问题

### 9.1 报 `Missing Resend email configuration.`

通常是这两个变量没配完整：

- `OUTREACH_RESEND_API_KEY`
- `OUTREACH_EMAIL_FROM`

### 9.2 报 `Resend email transport failed with status 4xx/5xx`

优先检查：

- API Key 是否有效
- `from` 地址是否属于已验证域名
- `to` 地址是否合法
- 附件 URL 是否能公网访问

### 9.3 收到 webhook 但没有正文

这不一定是 bug。当前代码已经兼容这种情况，会尝试用 `email_id` 再请求 Resend 的接收邮件 API。

### 9.4 附件发不出去

当前实现不是上传本地二进制，而是给 Resend 传附件 URL。所以：

- `OUTREACH_PUBLIC_BASE_URL` 必须可访问
- `attachmentImagePaths` 对应资源必须能被公网访问

## 10. 官方文档

- Resend 文档首页： [Introduction](https://resend.com/docs)
- 收件能力： [Receiving Emails](https://resend.com/inbound)
- 获取收到邮件正文： [Get Email Content](https://resend.com/docs/dashboard/receiving/get-email-content)
- Webhooks： [Managing Webhooks](https://resend.com/docs/webhooks/introduction)
- API 错误说明： [Errors](https://www.resend.com/docs/api-reference/errors)
