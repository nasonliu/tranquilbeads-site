# TranquilBeads 零售运营 MCP

这个 MCP 让本机或其他受信任 Agent 通过现有的强类型 Retail Agent API 管理独立站。
它不会直连数据库，不提供 raw SQL、任意 HTTP、退款、取消订单、客户完整地址或 PayPal
结算写入能力。

## 运行方式

服务器以 `stdio` 运行，认证只从 MCP 进程环境变量读取，不要把 token 写进提示词、聊天、
代码、截图或 MCP 参数：

```bash
export RETAIL_AGENT_BASE_URL='https://your-preview.example.com'
export RETAIL_AGENT_TOKEN='read-from-your-secret-manager'
export RETAIL_AGENT_MEDIA_ROOT='/absolute/path/to/approved-product-media'
export RETAIL_AGENT_EXPORT_ROOT='/absolute/path/to/private-agent-exports'
npm run mcp:retail
```

服务端还要配置：

- `RETAIL_AGENT_ENABLED=true`：允许机器读取。
- `RETAIL_AGENT_CATALOG_WRITE_ENABLED=true`：允许确认后的写入。
- Production 只有在 `RETAIL_AGENT_PRODUCTION_ENABLED=true` 时才允许写；默认关闭。
- `RETAIL_AGENT_OPERATORS_JSON`：配置机器 principal、角色和至少 32 字符的 token。
- `RETAIL_AGENT_HUB_TOKEN`：仅 Production 生效的独立 Hub secret；固定映射为
  `ppcme-agent-hub-vm104` / `PPC-ME Agent Hub VM 104` / `owner`。缺失、字面量
  `[SENSITIVE]` 或少于 32 字符时会被忽略并失败关闭。它不会替换或改写
  `RETAIL_AGENT_OPERATORS_JSON`。

建议先只连接 Preview。Production 使用单独 principal 和 token，角色按最小权限分配。

Codex/Claude Desktop 等支持 stdio MCP 的客户端可把 command 配为 `npm`，参数配为
`run --silent mcp:retail`，工作目录指向本仓库；环境变量通过客户端 secret/environment
配置注入。不要把 token 写进模型 instruction。

### macOS 本机免输入授权（推荐）

跨平台启动器为 `scripts/run-retail-ops-mcp.sh`，按以下顺序读取凭据：已经注入的
`RETAIL_AGENT_TOKEN`、`RETAIL_AGENT_TOKEN_FILE` 指定的只读 secret 文件、macOS
钥匙串、Linux Secret Service。token 只进入 MCP 子进程；Codex 配置、Shell 历史、Prompt
和项目文件中都不会出现 token。

Codex 注册命令只需要执行一次：

```bash
codex mcp add tranquilbeads-retail-ops -- \
  /bin/sh /absolute/path/to/scripts/run-retail-ops-mcp.sh
```

之后用 `codex mcp get tranquilbeads-retail-ops` 检查 command；不要用带 `-e
RETAIL_AGENT_TOKEN=...` 的注册方式。轮换凭据时只替换钥匙串记录和 Vercel 中对应机器
principal，然后重新部署，不需要修改 MCP 配置。

启动器会在未显式配置代理时检测本机 `127.0.0.1:7890`；可用时为 Node `fetch` 启用
环境代理，避免浏览器能访问正式站而本地 MCP 报 `fetch failed`。如果 Agent 已经传入
`HTTPS_PROXY` / `HTTP_PROXY`，启动器会保留现有设置。

### 其他电脑与服务器

每台机器应使用独立 principal/token，不要多人共用本机 `production-agent`。MCP 仍在各机器
本地以 stdio 运行，只通过 HTTPS 调用 `www.tranquilbeads.com`，无需在防火墙上开放 MCP
端口。

PPC-ME Agent Hub VM 104 使用独立的 `RETAIL_AGENT_HUB_TOKEN`：服务端值只放在 Vercel
Production secret，VM 侧同一凭据只经 systemd `LoadCredential` 注入启动器。注册 JSON、命令
参数、日志和 Prompt 只记录变量名，不记录值。该固定 principal 的 `owner` 角色仅用于覆盖
现有只读目录、订单、销售和审计接口；Hub 工具白名单与服务端写开关仍独立失败关闭。

这里不是把 MCP Server 部署到 Vercel：Vercel 承载的是受控的
`/api/agent/retail/*` HTTPS API、数据库与 Blob；MCP Server 在每台受信任的 Mac、Linux
服务器或 Agent 容器中以 stdio 运行。这样无需公开 MCP 端口，也不会把机器凭据交给网页。

- Linux 桌面：可用 `secret-tool store --label='TranquilBeads retail Agent' service
  tranquilbeads-retail-ops account <machine-account>` 保存，然后设置
  `RETAIL_AGENT_CREDENTIAL_ACCOUNT=<machine-account>`。
- systemd：用 `LoadCredential=retail-agent-token:/secure/source`，并把
  `RETAIL_AGENT_TOKEN_FILE` 指向 `/run/credentials/<unit>/retail-agent-token`。
- Docker / Kubernetes：把 Secret 只读挂载为文件，设置
  `RETAIL_AGENT_TOKEN_FILE=/run/secrets/tranquilbeads-retail-agent`；不要把 token 烘焙进镜像。
- CI 或托管 Agent：用平台 Secret Manager 注入 `RETAIL_AGENT_TOKEN`，任务结束即销毁进程
  环境。

普通 secret 文件权限必须严格为 `0400` 或 `0600`。systemd `LoadCredential` 是唯一例外：
只有文件位于 `$CREDENTIALS_DIRECTORY` 的同一物理目录、权限严格为 `0440`，并且所有者和
组均为 root（uid/gid 0）时才接受。普通目录中的 `0440`、`0640`、`0644`、符号链接或无法
读取权限元数据的文件都会失败关闭。需要代理的服务器显式配置 `RETAIL_AGENT_PROXY_URL`
或标准 `HTTPS_PROXY`，不依赖 Mac 的本地 `127.0.0.1:7890`。

这个本机 principal 虽然拥有零售运营角色，但可调用面仍由 `/api/agent/retail/*` 白名单
限制：没有退款、取消订单、客户 PII、任意 SQL、任意 HTTP 或 PayPal 写入工具。生产写入
仍必须同时满足服务端开关、工具 `confirm=true`、稳定幂等键及真实 readback。

## 工具

| 工具 | 读/写 | 用途 |
| --- | --- | --- |
| `retail_catalog_get` | 读 | Product、SKC、SKU、价格、库存、图片完整快照 |
| `retail_product_create_draft` | 写 | 新建草稿商品和默认 SKU |
| `retail_product_update` | 写 | 更新商品标题、描述、slug 或草稿/归档状态 |
| `retail_product_content_replace` | 写 | 整体更新五点描述、详情表和 A+ 模块 |
| `retail_style_create` / `retail_style_update` | 写 | 新建或更新 SKC/款式及款式主图 |
| `retail_variant_create` | 写 | 新建可售 SKU、价格、库存和物流事实 |
| `retail_variant_update` | 写 | 更新 SKU 价格、库存、状态、重量和包裹尺寸 |
| `retail_media_upload` | 写 | 从允许的本地媒体目录上传并关联当前商品图片 |
| `retail_media_reorder` | 写 | 设置主图并重排当前商品完整图片集合 |
| `retail_product_publish` | 写 | 独立的最终发布动作，默认只预览不写入 |
| `retail_inventory_get` | 读 | 库存余额和调整流水 |
| `retail_inventory_adjust` | 写 | 有理由的库存增减 |
| `retail_orders_list` | 读 | 脱敏订单列表，不返回完整客户资料 |
| `retail_orders_export` | 本地写文件 | 分页导出脱敏订单 JSON/CSV |
| `retail_order_fulfil` | 写 | 写入承运商、追踪号并标记发货 |
| `retail_sales_summary` | 读 | 指定周期的订单额、退款额、待发货汇总 |
| `retail_sales_breakdown` | 读 | 按日期或 SKU 分页读取销量、件数和销售额 |
| `retail_sales_export` | 本地写文件 | 按日期或 SKU 导出销量 JSON/CSV |
| `retail_activity_log` | 读 | 管理员与 Agent 的操作回执 |

首版明确不提供：退款、取消订单、商品/图片删除、客户 PII、PayPal 报表导入、任意 SQL、
任意外链图片抓取。此类动作应继续由后台人工执行并经过独立权限检查。

订单导出仍是脱敏数据：邮箱为掩码，地址只保留国家/地区/城市，不含姓名、电话、街道或
邮编。导出文件只能写到 `RETAIL_AGENT_EXPORT_ROOT`，目录权限为 `0700`、新文件权限为
`0600`，同名文件不会被覆盖。建议不同 Agent/服务器使用各自的私有导出目录，并由操作系统
负责到期清理。

## 写入协议

每个写工具都使用同一流程：

1. 先以 `confirm=false` 调用，获取 `dryRun`、目标当前状态和拟议变更。
2. 人或上层 Agent 核对商品/SKU/订单 ID、金额、库存和目标环境。
3. 使用同一个 UUID `idempotencyKey`、同一请求内容，以 `confirm=true` 再调用。
4. MCP 在写入后立即重新读取，并返回 `before`/`after` 或完整目录快照。
5. 超时或 `unknown` 时，不要更换 idempotency key；使用同一个请求重试或先读回。

示例（概念参数）：

```json
{
  "tool": "retail_inventory_adjust",
  "arguments": {
    "confirm": false,
    "idempotencyKey": "11111111-1111-4111-8111-111111111111",
    "productId": "22222222-2222-4222-8222-222222222222",
    "delta": 5,
    "reason": "Received and counted purchase order PO-1042"
  }
}
```

核对预览后只把 `confirm` 改为 `true`。同一个 key 不能用于不同动作或不同 payload。

## Product / SKC / SKU

- Product：顾客看到的一张商品详情页。
- SKC / Style：同一商品下的款式或颜色族，可以关联该商品的一张图片。
- SKU / Variant：真正定价、扣库存和发货的可售组合。

创建 Product 时系统会同时建立默认 SKC/SKU。Agent 必须先读回，再决定更新默认 SKU 或新增
款式，不能把多个规格的库存合并写到 Product。价格使用美元最小单位，例如 `6900` 表示
`USD 69.00`；尺寸单位为毫米，运输重量单位为克。

推荐的智能上新顺序：

1. `retail_catalog_get` 检查 SKU、slug 和图片哈希，先去重。
2. `retail_product_create_draft` 创建草稿并读回默认 SKC/SKU。
3. `retail_media_upload` 上传审核过的本地图片，再用 `retail_media_reorder` 设置主图和顺序。
4. `retail_product_update` 与 `retail_product_content_replace` 完善标题、描述、五点、详情和 A+。
5. 用 `retail_style_create/update` 管理 SKC，用 `retail_variant_create/update` 管理 SKU、价格、库存、重量和尺寸。
6. 读取目录并人工查看公开预览；最后单独调用 `retail_product_publish`，先 `confirm=false`，确认后才写入。

任何一步的确认写入都必须使用预览时相同的 payload 和相同 `idempotencyKey`；不能把创建草稿
和发布合并为一次不可审查的动作。

## 图片

`retail_media_upload` 只读取 `RETAIL_AGENT_MEDIA_ROOT` 内的本地 PNG/JPEG/WebP，服务端会重新
验证、规范化、计算哈希并写入 Vercel Blob。工具不接受 URL，因此 Agent 不会在后台偷偷下载
第三方图片。上传后以目录快照中的 image ID/URL 做排序、SKC 主图和 A+ 关联。

视频上传尚未对 Agent 开放。后台会明确显示当前媒体能力；在视频的数据表、MIME 校验、Blob
限制、PDP 播放器和删除引用规则全部上线前，Agent 不得把视频伪装成图片上传。

## 错误处理

- `401 unauthorized`：principal/token 不匹配，停止并修复 secret 配置。
- `403 forbidden`：角色缺少该业务权限。
- `503 agent_*_disabled`：开关关闭，不要绕过。
- `409 media_version_conflict`：重新读取当前图片集合和版本。
- 写入超时/结果不明：相同 key 重试或先读取；不能报告成功。
- 只有返回写后 readback 且目标字段真实变化，才可汇报完成。

更底层的 Catalog REST 字段、幂等语义和完整上新顺序见
[`retail-catalog-agent-api.md`](./retail-catalog-agent-api.md)。

## 交给另一个 Agent 会话试用

同一台 Mac 上已经注册过 `tranquilbeads-retail-ops` 时，新建一个 Codex 会话即可重新加载
最新工具；不要把 token 写进交接提示。建议先发送下面这段只读验收任务：

```text
请使用 tranquilbeads-retail-ops MCP 做只读验收：
1. 调用 retail_catalog_get；
2. 调用 retail_orders_list，limit=5；
3. 调用 retail_sales_summary，days=30；
4. 调用 retail_sales_breakdown，groupBy=sku，limit=10；
5. 汇报连接状态、工具总数、返回水位和脱敏边界。
不要执行任何写入，不要索要、读取或打印认证 token。
```

如要验证上新流程，只先使用 `confirm=false` 和测试 UUID，确认返回
`dryRun=true`、`confirmationRequired=true`；未取得用户对具体商品的确认，不得改成
`confirm=true`。另一台电脑或服务器必须建立自己的 machine principal，并按“其他电脑与服务器”
一节从该机器的 Secret Manager 注入凭据，不能复制这台 Mac 的钥匙串条目。

PPC-ME Integration Hub 可读取同目录的
[`retail-agent-hub.registration.json`](./retail-agent-hub.registration.json) 作为非秘密注册描述。
它只定义 reviewed stdio launcher、20-tool allowlist、写工具分组和 readiness 检查；真实机器
凭据仍必须由 Hub 的 `passEnv` allowlist 配合 LoadCredential/Secret Manager 注入。
