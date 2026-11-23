# Whale Demo 公网部署手册（骨架）

目标域名：`tianchi.wangfanlab.com`（Cloudflare 黄云代理 → 本源站）。本目录仅为部署骨架与说明，**实际 SSH 推送由维护者执行**；文中不含服务器 IP、SSH 端口、密钥或 token。`deploy/` 不在 web 静态白名单内，不会被 `server.mjs` 暴露（已验证 404）。

## 0. 安全默认

- 公网默认**不配置** `DEEPSEEK_API_KEY`，三个 AI 端点返回 `AI_NOT_CONFIGURED`，前端自动走规则/模拟判断，绝不假装已调用模型。
- 如需在公网启用 AI，密钥只放源站受保护的 `.env`（`EnvironmentFile`），不进 Git、不进浏览器、不写日志。
- `server.mjs` 默认监听 `127.0.0.1`，只经 nginx 反代暴露；POST 端点仅放行回环同源或 `PUBLIC_ORIGIN` 配置的公网来源。

## 1. 上传代码

在本地（Windows PowerShell 示例，主机名/用户按实际替换，勿写死 IP/端口）：

```
scp -r whale-demo user@your-server:/opt/whale-demo
```

或先打包再上传：`tar czf whale-demo.tar.gz whale-demo` → `scp whale-demo.tar.gz user@your-server:/opt/` → 源站解压到 `/opt/whale-demo`。

## 2. Node 环境

源站安装 Node.js ≥ 18（建议 20 LTS）。本 Demo 无第三方依赖、无构建，`node server.mjs` 即可。验证：`node --version`。

## 3. systemd 服务

```
sudo cp deploy/whale-demo.service /etc/systemd/system/whale-demo.service
# 按实际安装路径修改 WorkingDirectory / ExecStart
sudo systemctl daemon-reload
sudo systemctl enable --now whale-demo
sudo systemctl status whale-demo
```

单元已设 `HOST=127.0.0.1 PORT=18761 PUBLIC_ORIGIN=https://tianchi.wangfanlab.com Restart=always`。

## 4. nginx 站点

```
sudo cp deploy/whale-demo.nginx.conf /etc/nginx/sites-available/whale-demo.conf
sudo ln -s /etc/nginx/sites-available/whale-demo.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

配置含必要 proxy 头（Host/X-Real-IP/X-Forwarded-For/X-Forwarded-Proto）与静态资源 10 分钟短缓存。

## 5. Cloudflare SSL 模式

- **Flexible**：CF→源站走 HTTP 80。源站无需证书；nginx 保持 `listen 80`。简单但 CF→源站段不加密，仅适合演示。
- **Full / Full(strict)**（推荐）：CF→源站走 HTTPS 443。源站需证书（可用 CF Origin CA 证书），nginx 增加 `listen 443 ssl` 与 `ssl_certificate/ssl_certificate_key`（证书路径由宿主管理，勿写入本仓库）。Full(strict) 校验证书链，安全性最高。
- 无论哪种模式，浏览器→CF 均为 HTTPS；`PUBLIC_ORIGIN` 须与浏览器 Origin 一致（`https://tianchi.wangfanlab.com`）。

## 6. 验证

```
curl -I https://tianchi.wangfanlab.com/            # 200
curl https://tianchi.wangfanlab.com/api/v1/ai-status  # configured:false（默认模拟）
```

## 边界

- 本部署不接真实 QQ / 真实设备；设备执行均为模拟受理回执。
- 记忆/建议/账本仅存浏览器 localStorage，公网多用户各自隔离，不共享私人数据。
- 真实接入（Whale 提取端点、HomeAssistant、可信成员目录）见 docs/ 各文档，均为待实现配置，不声称已集成。
