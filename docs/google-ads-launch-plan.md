# TranquilBeads Google Ads 启动计划

日期：2026-07-01

## 结论

你贴的链接大多是 Google Groups 论坛入口，适合遇到 API、脚本、SDK 报错时查案例或发帖；它们不是开户后启动投放的主文档。

当前最适合 TranquilBeads 的投放路线是：

1. 先跑 Google Search 获取高意图 B2B 询盘。
2. 同时补齐转化追踪、隐私政策、公司信息、退换货/配送说明。
3. Merchant Center 和 Shopping / Performance Max 等产品广告，等商品价格、库存、配送、退换货信息足够完整后再上。
4. API 和 Scripts 暂时不用，除非以后要批量管理关键词、报表、预算或离线转化。

## 相关 Google 资料

- Google Ads API：用于管理大型或复杂 Google Ads 账号，不是普通投放启动必需项。官方介绍：https://developers.google.com/google-ads/api/docs/get-started/introduction
- Google Ads Scripts：适合在账号内做轻量自动化，例如暂停低效关键词、生成日报、检查预算。
- Performance Max：覆盖 Search、YouTube、Display、Discover、Gmail、Maps 等库存，但需要足够素材和清晰转化目标。官方说明：https://support.google.com/google-ads/answer/10724817
- Web 转化追踪：需要先创建网站转化动作，再安装 Google tag / GTM。官方说明：https://support.google.com/google-ads/answer/16560108
- Enhanced conversions：建议在表单询盘场景启用，但要配合隐私政策和用户数据处理。官方说明：https://support.google.com/google-ads/answer/13258081
- Lead form assets：可在广告里直接收线索，但必须提供隐私政策 URL。官方说明：https://support.google.com/google-ads/answer/16726130
- Final URL suffix / UTM：用于给广告点击自动加追踪参数。官方说明：https://support.google.com/google-ads/answer/9054021
- Merchant Center 商品数据：Shopping / 免费商品列表需要规范商品 feed。官方说明：https://support.google.com/merchants/answer/7052112
- Merchant Center 合规风险：商家信息、联系方式、退换货、配送、支付/结账体验不清晰，容易触发 Misrepresentation。官方说明：https://support.google.com/merchants/answer/13693195

## 网站现状

网站定位清晰：

- 品牌：TranquilBeads
- 主品类：tasbih / misbaha / Islamic prayer beads / Islamic cultural gifts
- 模式：B2B 批发为主，Amazon / Noon 零售入口为辅
- 核心卖点：100 pcs 起订、12+ 出口市场、平均 21 天交期、礼盒/定制包装、英文/阿文内容
- 主要转化：联系表单、WhatsApp 点击、Email 点击

追踪状态：

- Google Tag Manager 已接入 root layout
- GTM Container ID：`GTM-M9JCZKFC`
- 代码位置：`app/layout.tsx`
- 可通过 `NEXT_PUBLIC_GTM_ID` 覆盖容器 ID
- Google Ads base tag 已接入 root layout
- Google Ads ID：`AW-18288748181`
- 已创建并部署 Amazon / Noon 外链点击转化：
  - `Outbound click - Amazon`：`OUTBOUND_CLICK`，secondary conversion
  - `Outbound click - Noon`：`OUTBOUND_CLICK`，secondary conversion
- 网站会监听 `amazon.*`、`amzn.to`、`noon.com` 外链点击，发送对应 Google Ads conversion event，同时推送 `retail_outbound_click` 到 `dataLayer`

冷启动 Search 创建/启用状态（2026-07-02）：

- 已通过 Google Ads API v24 创建 3 个 Search campaigns，并于 2026-07-02 启用。
- `TB Search AE Cold Start 20260702-0620`：ID `23997958969`，预算 USD 5/day。
- `TB Search SA Cold Start 20260702-0620`：ID `23988469083`，预算 USD 2/day。
- `TB Search DE Cold Start 20260702-0620`：ID `23988468408`，预算 USD 2/day。
- 已创建 7 个 ad groups、36 个 exact/phrase keywords、7 条 responsive search ads、16 个 campaign-level exact negative keywords。
- 启用后回查：3 个 campaign 均为 `ENABLED`，`serving_status` 为 `SERVING`；广告审核状态为 `REVIEW_IN_PROGRESS`，campaign `primary_status` 暂为 `PENDING / MOST_ADS_UNDER_REVIEW`。
- `tasbih` 大词策略：只放在独立 controlled ad group，使用 exact/phrase，低 CPC 上限，避免吞掉长尾预算。
- 长尾成交/意图词策略：AE 单独拆 `ayatul kursi for car`、`car hanging tasbih`、`baltic amber tasbih`、`natural hematite prayer beads`；SA 拆 Arabic 和 English longtail；DE 拆 `gebetskette islam` 与 `tespih/tesbih`。

当前缺口：

- 没有明显的隐私政策页，Lead Form 和 Enhanced Conversions 会需要。
- 没有明显的退换货、配送、公司主体信息页，Merchant Center 审核会需要。
- 联系表单如果没有 `NEXT_PUBLIC_FORM_ENDPOINT`，前端会显示成功，但不一定真正入库或发信，需要上线前确认。
- 部分产品涉及天然材质、amber、certified 等表述，广告和商品 feed 里要谨慎，最好有证书或改成更保守表达。

## 投放阶段

### 阶段 0：追踪和合规

先完成这些再花钱放量：

- 创建 GA4，并与 Google Ads 关联。
- 安装 Google tag 或 GTM。
- 在 Google Ads 建立转化动作：
  - Primary：Contact form submitted
  - Primary：WhatsApp click
  - Secondary：Email click
  - Secondary：Amazon outbound click
  - Secondary：Noon outbound click
  - Secondary：Product detail view 或 Wholesale page engagement
- 开启 auto-tagging。
- 设置账户级 Final URL suffix：

```text
utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}&device={device}&matchtype={matchtype}&network={network}
```

- 补隐私政策 URL，至少覆盖表单收集的姓名、公司、国家、邮箱/WhatsApp、询盘内容，以及广告转化追踪。
- 若做 Merchant Center，再补公司主体、地址、客服邮箱、配送、退换货、支付/结账说明。

### 阶段 1：Search 询盘广告

优先建 4 个 Search campaigns：

1. `B2B - Gulf - EN/AR`
2. `B2B - UK/EU - EN`
3. `B2B - Turkey/Germany Diaspora`
4. `B2B - South/Southeast Asia`

推荐落地页：

- `/en/wholesale`
- `/en/contact`
- `/ar/wholesale`
- 高意图产品页，例如 `/en/collections/signature-tasbih/natural-kuka-wood-tasbih`

核心关键词方向：

```text
tasbih wholesale
misbaha wholesale
tasbeeh wholesale
prayer beads wholesale
islamic gifts wholesale
ramadan gifts supplier
eid gifts wholesale
tasbih supplier
misbaha supplier
kuka wood tasbih wholesale
amber tasbih wholesale
33 bead tasbih wholesale
99 bead tasbih wholesale
```

阿语方向：

```text
تسابيح بالجملة
مسبحة بالجملة
مورد سبحة
هدايا رمضان بالجملة
هدايا إسلامية بالجملة
```

土耳其/德国方向：

```text
tesbih wholesale
tespih wholesale
gebetskette großhandel
kehribar tesbih wholesale
```

初始否定关键词：

```text
free
meaning
how to
diy
repair
pattern
tutorial
used
job
history
catholic rosary
rosary making
```

### 阶段 2：素材和广告资产

Search assets：

- Sitelinks：Wholesale、Collections、Gift-Ready Sets、Contact、Amazon Retail、Noon Retail
- Callouts：MOQ from 100 pcs、Custom packaging、Export ready、Arabic/English support、Gift box options
- Structured snippets：Materials: Kuka wood, Hematite, Amber-look, Obsidian, Tiger's eye
- Lead form asset：等隐私政策 URL 准备好后再开

英文广告文案起稿：

```text
Headline ideas:
Wholesale Tasbih Supplier
Premium Misbaha for Retailers
MOQ From 100 Pieces
Gift-Ready Islamic Prayer Beads
Custom Packaging Available
Tasbih for Ramadan & Eid Shelves

Descriptions:
Source elegant tasbih and Islamic gift products for retail, gifting, and distribution. Start with focused assortments from 100 pcs.
Explore Kuka wood, hematite, amber-look, and gift-ready tasbih styles with export-ready packaging and WhatsApp support.
```

阿语广告文案起稿：

```text
Headlines:
تسابيح بالجملة
مسبحة فاخرة للمتاجر
الحد الأدنى 100 قطعة
تغليف هدايا جاهز
توريد تسابيح رمضان والعيد

Descriptions:
تشكيلة تسابيح ومنتجات هدايا إسلامية للمتاجر وشركاء التوزيع، مع تغليف جاهز وخيارات طلب من 100 قطعة.
```

### 阶段 3：Merchant Center / Shopping / Performance Max

只有在以下条件满足后再做：

- 商品有明确价格、库存、币种、配送国家。
- 商品页面和 feed 的价格、可售状态一致。
- 网站有可访问的配送、退换货、隐私、联系信息。
- 产品标题和描述不夸大材质，天然/认证类表述有证据。

如果网站暂时只做 B2B 询盘、不做站内结账，那么先不要把 Shopping 作为主力。可以先用 Search 拿批发询盘，再把 Amazon / Noon 零售页面作为辅助转化和再营销受众。

## 首周预算建议

保守测试：

- Search B2B：USD 30-80 / day
- Brand Search：USD 3-10 / day
- Remarketing：先不开，等至少有访问和转化数据
- Performance Max：先不开，等 Merchant Center 和素材齐备

第一周目标不是追求 ROAS，而是验证：

- 哪些市场有有效询盘
- 哪些词带来批发意图
- 表单和 WhatsApp 是否能被正确追踪
- 哪些产品页能降低无效点击

## 每周优化节奏

- 每天：检查花费、搜索词、无效词、表单/WhatsApp 是否正常。
- 第 3 天：加否定词，暂停明显消费但无询盘的词。
- 第 7 天：按国家、语言、关键词主题拆预算。
- 第 14 天：根据有效询盘质量调整出价策略和落地页。
- 第 21 天后：考虑导入离线线索质量，例如已回复、要报价、已下样品单、已成交。

## 需要你提供的信息

- Google Ads Customer ID。
- 是否已有 GA4 / GTM。
- 是否有 Google Ads conversion ID 和 conversion label。
- 公司主体名称、注册地址、客服邮箱、退换货/配送口径。
- 首批投放国家和每日预算上限。
- 主要目标：批发询盘、Amazon/Noon 零售销量，还是两者都要。
