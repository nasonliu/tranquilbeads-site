# OpenClaw Handoff: Email Webhook Production Env Sync

## Goal

把线上运行的 `https://www.tranquilbeads.com/api/outreach/webhooks/email` 环境补齐邮件回信所需的生产环境变量，让 Resend 的 `email.received` webhook 可以：

1. 通过官方签名校验
2. 把客户回复同步进 outreach reply 流程
3. 自动转发一份到 `sales@tranquilbeads.com`

这次交接只处理线上环境变量同步与验证，不改业务模板，不重跑历史外联，不改 DNS。

## Why This Matters

当前仓库本地已经完成以下能力：

- Email inbound webhook route:
  - [app/api/outreach/webhooks/email/route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/outreach/webhooks/email/route.ts)
- Resend / shared-secret webhook auth:
  - [src/lib/outreach-webhooks.ts](/Volumes/新加卷/Documents/ProjectNoor/src/lib/outreach-webhooks.ts)
- Auto-forward inbound replies to the human mailbox:
  - [src/lib/email-inbound-forwarding.ts](/Volumes/新加卷/Documents/ProjectNoor/src/lib/email-inbound-forwarding.ts)

Resend 后台也已经创建了生产 webhook：

- Endpoint:
  - `https://www.tranquilbeads.com/api/outreach/webhooks/email`
- Event:
  - `email.received`

如果线上环境缺少对应 env，结果会是：

- Resend webhook 命中线上路由但验签失败
- 或者 reply 能入库但不会转发到 `sales@tranquilbeads.com`
- 或者 webhook 处理链直接报配置缺失

## Required Production Variables

请在线上部署环境里确认并同步以下变量：

```env
OUTREACH_EMAIL_PROVIDER=resend
OUTREACH_RESEND_API_KEY=re_dNBpSLJH_M35Z83jz2AU2SYaQNJhNnsQa
OUTREACH_RESEND_WEBHOOK_SECRET=whsec_G2vUn2VwCJKbIdWBWACsLodiAV2LXj8R
OUTREACH_EMAIL_FROM="Nason <sales@agent.tranquilbeads.com>"
OUTREACH_EMAIL_REPLY_TO=reply@agent.tranquilbeads.com
OUTREACH_EMAIL_FORWARD_TO=sales@tranquilbeads.com
OUTREACH_PUBLIC_BASE_URL=https://www.tranquilbeads.com
```

说明：

- `OUTREACH_RESEND_WEBHOOK_SECRET`
  - 用于验证 Resend 发来的 `svix-id / svix-timestamp / svix-signature`
- `OUTREACH_EMAIL_FORWARD_TO`
  - 收到客户回信后，系统自动转发到这个人工邮箱
- `OUTREACH_EMAIL_REPLY_TO`
  - 客户回复时看到的地址，必须保持为 `reply@agent.tranquilbeads.com`

## Do Not Change

这次不要改这些东西：

- 不要把 `OUTREACH_EMAIL_REPLY_TO` 改成 `sales@tranquilbeads.com`
- 不要删除或替换已创建的 Resend webhook endpoint
- 不要改 Resend 域名验证状态
- 不要把 `agent.tranquilbeads.com` 的 MX 从当前收件链路切走
- 不要改历史 `tasks.json` / `events.json`

## Expected Runtime Behavior

配置正确后，链路应该是：

1. 客户回复之前发出的开发邮件
2. 回复进入 `reply@agent.tranquilbeads.com`
3. Resend 触发 `email.received` webhook
4. 线上路由 `/api/outreach/webhooks/email` 验签通过
5. 系统把 reply 写入 outreach store
6. 系统自动转发一份到 `sales@tranquilbeads.com`

## Verification Checklist

OpenClaw 完成 env 同步后，请按下面顺序验证。

### 1. 线上路由可达

确认公网 webhook 路由存在：

```bash
curl -i https://www.tranquilbeads.com/api/outreach/webhooks/email
```

说明：

- `GET` 不一定返回业务成功
- 这里只是确认域名和路由存在，不是验证 webhook 逻辑

### 2. 线上环境已带变量

在部署平台里确认以下值已经存在：

- `OUTREACH_RESEND_WEBHOOK_SECRET`
- `OUTREACH_EMAIL_FORWARD_TO`
- `OUTREACH_RESEND_API_KEY`

如果部署平台支持 redeploy / restart，变量更新后要确保新实例已生效。

### 3. Resend 后台 webhook 保持启用

Resend Dashboard 中应看到：

- webhook endpoint:
  - `https://www.tranquilbeads.com/api/outreach/webhooks/email`
- status:
  - `enabled`
- event:
  - `email.received`

### 4. 实测一次真实回信

建议做一轮最小真实验证：

1. 选一封已经发出的外联邮件
2. 从外部邮箱回复一句简单文本，例如：
   - `Interested, please send MOQ and price list.`
3. 检查以下结果：
   - [`src/data/outreach/tasks.json`](/Volumes/新加卷/Documents/ProjectNoor/src/data/outreach/tasks.json) 对应 task 进入 `needs_human_followup`
   - [`src/data/outreach/events.json`](/Volumes/新加卷/Documents/ProjectNoor/src/data/outreach/events.json) 出现 `reply_detected` / `handoff_created`
   - `sales@tranquilbeads.com` 收到一封转发邮件

## Success Criteria

满足以下三条就算交接完成：

1. Resend webhook 打到线上时不再报验签错误
2. 客户回复会进入 outreach handoff 流程
3. 同一封回复会自动转发到 `sales@tranquilbeads.com`

## Relevant References

- [docs/resend-configuration.md](/Volumes/新加卷/Documents/ProjectNoor/docs/resend-configuration.md)
- [docs/outreach-automation.md](/Volumes/新加卷/Documents/ProjectNoor/docs/outreach-automation.md)
- [app/api/outreach/webhooks/email/route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/outreach/webhooks/email/route.ts)
- [src/lib/outreach-webhooks.ts](/Volumes/新加卷/Documents/ProjectNoor/src/lib/outreach-webhooks.ts)
- [src/lib/email-inbound-forwarding.ts](/Volumes/新加卷/Documents/ProjectNoor/src/lib/email-inbound-forwarding.ts)
