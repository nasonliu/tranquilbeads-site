# 零售目录 Agent API

这是 Direct Retail 目录的受控机器接口。它只操作 Product、SKC/Style、SKU/Variant、
PDP 内容和 Product 媒体；不提供订单、客户、付款、raw SQL、迁移、内部后台路由或外部
URL 导入能力。机器可读定义见
[`retail-catalog-agent-openapi.yaml`](./retail-catalog-agent-openapi.yaml)。

## 对象与安全边界

```text
Product（公开商品；初始必须为 draft）
├── Style / SKC（颜色、款式家族，可设置本商品的一张主图）
│   └── Variant / SKU（实际销售、价格和库存的权威）
├── PDP（highlights、details、A+ 三语内容）
└── Media（共享商品图片；按 position 排序）
```

API 使用静态 Bearer 机器 token。服务端以 `RETAIL_AGENT_OPERATORS_JSON` 配置机器
principal：每项含 `id`、`name`、零售角色
（如 `owner`、`operations`）和至少 32 字符的 `token`。角色复用零售后台的
`products:write` 权限；token 仅保存在 server-side secret manager，绝不写入代码、浏览器、
日志、截图、Prompt 或 `NEXT_PUBLIC_*`。

```bash
export RETAIL_AGENT_BASE_URL='https://preview.example.com'
export RETAIL_AGENT_TOKEN='replace-with-configured-machine-token'
```

总开关为 `RETAIL_AGENT_ENABLED=true`。所有写方法（Catalog `POST`、Media `POST` /
`PATCH` / `DELETE`）还要求 `RETAIL_AGENT_CATALOG_WRITE_ENABLED=true`；若
`VERCEL_ENV=production`，写入还要求 `RETAIL_AGENT_PRODUCTION_ENABLED=true`。这三个
开关任一未满足即失败关闭，分别返回 `503 agent_api_disabled`、
`agent_write_disabled` 或 `agent_production_write_disabled`。`GET` 只需总开关和角色权限。

所有写入都会通过现有领域服务记录 actor 审计信息，并且每个写请求必须有 UUID 格式的
`idempotencyKey`。同一 actor/操作/请求体用同一键重放时返回原有结果并标记 `replayed`；
同一键却改变操作或请求体会失败。网络不确定时先使用**相同**请求和同一键重试，或 `GET`
读回快照，绝不要直接换键。

## Agent 操作规则

1. 先 `GET /api/agent/retail/catalog` 读取完整快照（`products`、`styles`、`variants`），
   以当前 `public_id`、SKU 和 slug 确认目标；每次写入后再读回。
2. 新 Product 只能以 `status: "draft"` 创建。即使 DTO 接收 `published`，服务端也会拒绝
   `product.create` 的已发布请求。
3. 上传媒体、创建/更新 Style 与 Variant、替换 PDP 后，读回快照核对关系、库存、价格和
   媒体版本。不要猜测 ID，不要覆盖冲突 SKU/slug。
4. 发布是**显式** `product.update`：传入 `status: "published"`。服务端会验证已存在可用
   图片；未通过时不发布。创建、媒体上传、Style/SKU/PDP 更新都不会隐式发布。
5. 图片只接受本地文件 multipart 上传到 Media API。禁止写入/抓取任意 URL；PDP A+ 的
   `image` 值必须为 HTTPS URL，且应当使用本 Product 已上传、读回的媒体 URL。

## Catalog API

### 读取快照

```bash
curl --fail-with-body "$RETAIL_AGENT_BASE_URL/api/agent/retail/catalog" \
  -H "Authorization: Bearer $RETAIL_AGENT_TOKEN"
```

成功响应：

```json
{ "ok": true, "snapshot": { "products": [], "styles": [], "variants": [] } }
```

`GET` 无查询参数，返回全部管理目录快照。

### 写入动作

向 `POST /api/agent/retail/catalog` 发送**扁平 JSON**：`action` 与该 action 的字段位于同一
层级，不使用 `input` 包装。所有 action 都需要 `idempotencyKey` UUID 和
`Authorization: Bearer $RETAIL_AGENT_TOKEN`。

| action | 必填字段 | 可选/更新字段 | 成功结果 |
| --- | --- | --- | --- |
| `product.create` | `sku`、`slug`、`titleEn`、`titleAr`、`status:"draft"`、`amountMinor`、`idempotencyKey` | `titleZh`、三语 description、`onHand` | `201 {ok,action,entity:"product",result,created:true}` |
| `product.update` | `productId`、`idempotencyKey` | slug、三语 title/description、`status`（draft/published/archived） | `200 {ok,action,entity:"product",result}` |
| `product.content.replace` | `productId`、`idempotencyKey` | `highlights`、`details`、`aPlus`（省略时各自默认为空数组） | `entity:"product_content"` |
| `style.create` | `productId`、`code`、`titleEn`、`idempotencyKey` | titleAr/titleZh、三语 `optionValues`、`primaryImageId`、status、position | `201 entity:"style"` |
| `style.update` | `styleId`、`idempotencyKey` | code、title、optionValues、primaryImageId、status、position（至少一个更新字段） | `entity:"style"` |
| `variant.create` | `productId`、`sku`、三语 title、`optionValues`、`amountMinor`、`onHand`、`idempotencyKey` | `styleId` | `201 entity:"variant"` |
| `variant.update` | `variantId`、`idempotencyKey` | styleId、sku、title、optionValues、status、amountMinor、onHand（至少一个更新字段） | `entity:"variant"` |
| `media.reorder` | `productId`、完整 `imageIds`、`expectedVersion`、`idempotencyKey` | 无 | `entity:"media"`；`result` 有 mediaVersion/imageIds/replayed |

金额 `amountMinor` 使用货币最小单位，必须为正整数；`onHand` 是非负整数。Variant/SKU 是价格
与库存权威。`product.create` 会用传入的 `sku`、`amountMinor` 和 `onHand` 同时建立默认
Style/SKU；需要多款式时，应在读回默认对象后再新增或更新 SKC/SKU，不能把默认 SKU 当成
多个变体的合计。SKU/style code 只能使用字母数字开头且后续为字母数字、`.`、`_` 或 `-`。

`optionValues` 是严格的三语对象，例如：

```json
{"en":{"color":"Red"},"ar":{"color":"أحمر"},"zh":{"color":"红色"}}
```

PDP 是完整替换：`highlights` 至多 5 项、`details` 至多 12 项、`aPlus` 至多 6 项；未传的
数组会写为 `[]`，因此要保留内容时必须发送完整数组。每个本地化文本对象必须同时有非空
`en`、`ar`、`zh`。`details` 项为 `label` 与 `value`，A+ 项为 `title`、`body`，并可有
`eyebrow`、`image`。

### 发布

没有单独 `publish` action。先完成媒体和目录数据、读回快照，才可以以更新状态发布：

```bash
curl --fail-with-body "$RETAIL_AGENT_BASE_URL/api/agent/retail/catalog" \
  -H "Authorization: Bearer $RETAIL_AGENT_TOKEN" -H 'Content-Type: application/json' \
  --data '{"action":"product.update","productId":"<product-uuid>","status":"published","idempotencyKey":"11111111-1111-4111-8111-111111111111"}'
```

发布至少需要服务端认可的 Product 图片；失败时响应为 `400 {"ok":false,"error":"invalid_request"}`。
成功后必须重新 `GET` 快照确认该 Product `status` 已为 `published`。

## Media API

`GET /api/agent/retail/media` 返回当前环境开关允许的实际写能力；写开关关闭，或 Production
未显式允许写入时，三个值都会是 `false`：

```json
{ "ok": true, "capabilities": { "upload": true, "delete": true, "reorder": true } }
```

### 上传

`POST /api/agent/retail/media` 只接受 `multipart/form-data`，字段为 `productId` UUID、
`idempotencyKey` UUID、`file`，以及可选 `altEn`/`altAr`（最多 300 字符）。服务端验证图片、
大小、Blob hostname 和 Product 归属。成功为新建 `201` 或幂等重放 `200`：

```bash
curl --fail-with-body "$RETAIL_AGENT_BASE_URL/api/agent/retail/media" \
  -H "Authorization: Bearer $RETAIL_AGENT_TOKEN" \
  -F 'productId=<product-uuid>' \
  -F 'idempotencyKey=22222222-2222-4222-8222-222222222222' \
  -F 'altEn=Red tasbih front view' -F 'altAr=مسبحة حمراء من الأمام' \
  -F 'file=@./red-tasbih.jpg;type=image/jpeg'
```

```json
{ "ok": true, "image": { "id": "<image-uuid>", "url": "https://..." }, "replayed": false }
```

### 排序与删除

`PATCH /api/agent/retail/media` 发送 JSON 的 `productId`、完整有序 `imageIds`（1–8 个）、
`expectedVersion` 与 `idempotencyKey`；成功返回 `mediaVersion`、`imageIds`、`replayed`。
`DELETE` 发送 `imageId`、`removeReferences`、`idempotencyKey`。若图片被 PDP 引用，只有
`removeReferences: true` 才会同时移除引用；成功返回 `deleted`、`removedReferences`、
`replayed`。Blob 物理删除通过 outbox 完成，接口成功表示已安全分离引用，并不保证即时物理
删除。

媒体排序也可通过 Catalog 的 `media.reorder` action；两种路径使用同一版本与幂等语义。

## 失败与完整上新序列

| HTTP / error | 含义与处理 |
| --- | --- |
| 400 `invalid_request` | DTO、业务规则、发布前图片或媒体格式不合法；修正后用新 key。 |
| 401 `unauthorized` | token 缺失、格式错误或不匹配；停止并从 secret manager 修复。 |
| 403 `forbidden` | 配置角色没有 `products:write`；停止，按最小权限调整角色。 |
| 409 `media_version_conflict` | 媒体被并发修改；先 GET 快照，采用当前 version 和完整集合后用新 key。 |
| 422 `image_set_mismatch` / `duplicate_image` | 排序集合不是该 Product 当前完整集合或重复；读回后重做。 |
| 503 `agent_api_disabled` / `agent_write_disabled` / `agent_production_write_disabled` | kill switch 生效；不绕过，等待运维明确开启。 |
| 503 `media_result_unknown` | 结果不可确认；同 key 重试或 GET 读回，不要换 key。 |

完整上新：

1. 确认所选环境、三个开关和静态机器 principal；`GET /catalog` 查 SKU/slug 冲突。
2. `product.create` 创建 `draft`，随后 `GET /catalog` 读回 Product UUID。
3. 用 multipart 上传每张已审核本地图片；记录返回 image ID/URL，再读回快照。
4. 使用 `PATCH /media` 或 `media.reorder` 传完整 `imageIds` 与读取到的版本；如需，创建
   Style 并把其 `primaryImageId` 设为此 Product 的图片。
5. 创建/更新 Variant，准确写入价格、库存和三语选项；替换完整三语 PDP；每一步后读回。
6. 人工/Agent 核对图片、SKU、价格、库存、PDP 后，以 `product.update` 将状态显式设为
   `published`，再 GET 确认状态。最后在公开店铺验证页面；快照读回前不得宣称成功。
