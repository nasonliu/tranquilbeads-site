import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SERVER_NAME = "tranquilbeads-ops";

function skillMarkdown(projectDir: string) {
  return `---
name: tranquilbeads-ops
description: TranquilBeads 网站内容、上品、运维检查与线索整理的半自动封装。通过 mcporter 调用本地 MCP 服务，可读取站点快照、导入产品、更新联系信息、检查站点健康、准备询盘跟进草稿。
metadata: {"openclaw":{"emoji":"🧿","requires":{"bins":["mcporter"]}}}
---

# TranquilBeads Ops

通过 \`{baseDir}/scripts/tranquilbeads-ops.sh\` 调用已经注册好的 \`${SERVER_NAME}\` MCP 服务。

## 使用规则

- 用中文回复，优先给结构化结果：结论、阻塞点、下一步。
- 写操作默认先 dry run；只有在明确要求执行时才传 \`confirm: true\`。
- 高风险动作限定为内容文件写入，不直接修改 DNS、Vercel、Google Workspace 或 Resend。
- 商品导入优先使用 JSON 文件或标准 payload，不要手写站点数据文件。

## 常用工具

### 1. get_site_snapshot

\`\`\`bash
{baseDir}/scripts/tranquilbeads-ops.sh get_site_snapshot '{"filePath":"${projectDir}/src/data/site-content.json"}'
\`\`\`

### 2. import_products

\`\`\`bash
{baseDir}/scripts/tranquilbeads-ops.sh import_products '{"confirm":false,"targetFilePath":"${projectDir}/src/data/site-content.json","importFile":"${projectDir}/src/data/imports/products.sample.json"}'
\`\`\`

### 3. update_contact_settings

\`\`\`bash
{baseDir}/scripts/tranquilbeads-ops.sh update_contact_settings '{"confirm":false,"email":"sales@tranquilbeads.com","whatsappHref":"https://wa.me/8618929564545","whatsappDisplay":"+86 189 2956 4545"}'
\`\`\`

### 4. run_ops_check

\`\`\`bash
{baseDir}/scripts/tranquilbeads-ops.sh run_ops_check '{}'
\`\`\`

### 5. prepare_lead_follow_up

\`\`\`bash
{baseDir}/scripts/tranquilbeads-ops.sh prepare_lead_follow_up '{"lead":{"company":"Example Buyer","interest":"Tasbih","quantity":"500 pieces"}}'
\`\`\`
`;
}

function skillScript() {
  return `#!/usr/bin/env bash
set -euo pipefail

if ! command -v mcporter >/dev/null 2>&1; then
  echo "ERROR: mcporter not found on PATH" >&2
  exit 1
fi

TOOL="$1"; shift || true
ARGS_JSON="$*"
exec mcporter call "${SERVER_NAME}.$TOOL" --output json --args "$ARGS_JSON"
`;
}

export function renderSkillAssets(projectDir: string) {
  return {
    "SKILL.md": skillMarkdown(projectDir),
    "scripts/tranquilbeads-ops.sh": skillScript(),
  };
}

export async function installOpenClawHandoff(options: {
  projectDir: string;
  workspaceSkillsDir: string;
  mcporterConfigPath: string;
  serverCommand?: string;
}) {
  const skillDir = resolve(options.workspaceSkillsDir, "tranquilbeads-ops");
  const assets = renderSkillAssets(options.projectDir);

  for (const [relativePath, content] of Object.entries(assets)) {
    const targetPath = resolve(skillDir, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");
    if (relativePath.endsWith(".sh")) {
      await chmod(targetPath, 0o755);
    }
  }

  const mcporterConfigRaw = await readFile(options.mcporterConfigPath, "utf8");
  const mcporterConfig = JSON.parse(mcporterConfigRaw) as {
    mcpServers?: Record<string, { command: string; description?: string }>;
    imports?: string[];
  };

  mcporterConfig.mcpServers ??= {};
  mcporterConfig.imports ??= [];
  mcporterConfig.mcpServers[SERVER_NAME] = {
    command:
      options.serverCommand ??
      `${resolve(options.projectDir, "scripts/run-tranquilbeads-mcp.sh")}`,
    description: "TranquilBeads content and ops MCP server",
  };

  await writeFile(
    options.mcporterConfigPath,
    `${JSON.stringify(mcporterConfig, null, 2)}\n`,
    "utf8",
  );

  return {
    skillDir,
    serverName: SERVER_NAME,
  };
}
