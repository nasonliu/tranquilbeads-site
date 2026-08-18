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
npm run mcp:retail
```

服务端还要配置：

- `RETAIL_AGENT_ENABLED=true`：允许机器读取。
- `RETAIL_AGENT_CATALOG_WRITE_ENABLED=true`：允许确认后的写入。
- Production 只有在 `RETAIL_AGENT_PRODUCTION_ENABLED=true` 时才允许写；默认关闭。
- `RETAIL_AGENT_OPERATORS_JSON`：配置机器 principal、角色和至少 32 字符的 token。

建议先只连接 Preview。Production 使用单独 principal 和 token，角色按最小权限分配。

Codex/Claude Desktop 等支持 stdio MCP 的客户端可把 command 配为 `npm`，参数配为
`run --silent mcp:retail`，工作目录指向本仓库；环境变量通过客户端 secret/environment
配置注入。不要把 token 写进模型 instruction。

### macOS 本机免输入授权（推荐）

生产 Agent token 存在 macOS 钥匙串的服务 `tranquilbeads-retail-ops`、账户
`production-agent` 中。仓库提供的 `scripts/run-retail-ops-mcp-keychain.sh` 会在启动时读取
钥匙串，并把 token 只注入 MCP 子进程；Codex 配置、Shell 历史、Prompt 和项目文件中都
不会出现 token。

Codex 注册命令只需要执行一次：

```bash
codex mcp add tranquilbeads-retail-ops -- \
  /bin/zsh /absolute/path/to/scripts/run-retail-ops-mcp-keychain.sh
```

之后用 `codex mcp get tranquilbeads-retail-ops` 检查 command；不要用带 `-e
RETAIL_AGENT_TOKEN=...` 的注册方式。轮换凭据时只替换钥匙串记录和 Vercel 中对应机器
principal，然后重新部署，不需要修改 MCP 配置。

这个本机 principal 虽然拥有零售运营角色，但可调用面仍由 `/api/agent/retail/*` 白名单
限制：没有退款、取消订单、客户 PII、任意 SQL、任意 HTTP 或 PayPal 写入工具。生产写入
仍必须同时满足服务端开关、工具 `confirm=true`、稳定幂等键及真实 readback。

## 工具

| 工具 | 读/写 | 用途 |
| --- | --- | --- |
| `retail_catalog_get` | 读 | Product、SKC、SKU、价格、库存、图片完整快照 |
| `retail_product_create_draft` | 写 | 新建草稿商品和默认 SKU |
| `retail_variant_update` | 写 | 更新 SKU 价格、库存、状态、重量和包裹尺寸 |
| `retail_media_upload` | 写 | 从允许的本地媒体目录上传并关联当前商品图片 |
| `retail_inventory_get` | 读 | 库存余额和调整流水 |
| `retail_inventory_adjust` | 写 | 有理由的库存增减 |
| `retail_orders_list` | 读 | 脱敏订单列表，不返回完整客户资料 |
| `retail_order_fulfil` | 写 | 写入承运商、追踪号并标记发货 |
| `retail_sales_summary` | 读 | 指定周期的订单额、退款额、待发货汇总 |
| `retail_activity_log` | 读 | 管理员与 Agent 的操作回执 |

首版明确不提供：退款、取消订单、商品/图片删除、客户 PII、PayPal 报表导入、任意 SQL、
任意外链图片抓取。此类动作应继续由后台人工执行并经过独立权限检查。

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
