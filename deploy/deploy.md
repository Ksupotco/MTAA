# Whale Demo 公网部署手册（骨架）

目标域名：`tianchi.wangfanlab.com`（Cloudflare 黄云代理 → 本源站）。本目录仅为部署骨架与说明，**实际 SSH 推送由维护者执行**；文中不含服务器 IP、SSH 端口、密钥或 token。`deploy/` 不在 web 静态白名单内，不会被 `server.mjs` 暴露（已验证 404）。

## 0. 安全默认

> 比赛提交的作品链接必须是 Qoder Sites 地址，见 [qoder-sites.md](qoder-sites.md)。本文是自托管的备用方案。

- 要启用真实 AI，就把 `AGENTSCOPE_API_KEY`（或 `DEEPSEEK_API_KEY`）写进源站受保护的 `.env`（通过 systemd 的 `EnvironmentFile` 加载）。这个文件不进 Git，不下发到浏览器，也不写进日志。未配置时，接口返回 `AI_NOT_CONFIGURED`，前端自动回退规则引擎并标注出来。
- 公网保护：单 IP 滑动窗口限流（`AI_RATE_PER_IP` / `AI_RATE_WINDOW_MIN`），加上全站每日额度（`AI_DAILY_LIMIT`）；超出时返回 429，前端回退规则引擎。部署在 nginx 或 Cloudflare 后面时，请设置 `TRUST_PROXY=1`。
- `server.mjs` 默认只监听 `127.0.0.1`，对外只通过 nginx 反向代理暴露；POST 接口只接受同源请求，或 `ALLOWED_ORIGINS` / `PUBLIC_ORIGIN` 里配置的来源。

## 1. 上传代码

在本地（Windows PowerShell 示例，主机名/用户按实际替换，勿写死 IP/端口）：

```
scp -r whale-demo user@your-server:/opt/whale-demo
```

或先打包再上传：`tar czf whale-demo.tar.gz whale-demo` → `scp whale-demo.tar.gz user@your-server:/opt/` → 源站解压到 `/opt/whale-demo`。

## 2. Node 环境

源站安装 Node.js ≥ 18（建议 20 LTS）。先在本地运行 `npm run verify` 生成 `dist/index.html`，再连同 `dist/` 一起上传；服务端运行时没有第三方依赖，执行 `node server.mjs` 即可。验证：`node --version`。

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
curl https://tianchi.wangfanlab.com/api/v1/ai-status  # configured:true + limits（已配置密钥时）
```

## 边界

- 本部署不接真实 QQ / 真实设备；设备执行均为模拟受理回执。
- 记忆/建议/账本仅存浏览器 localStorage，公网多用户各自隔离，不共享私人数据。
- 真实接入（Whale 提取端点、HomeAssistant、可信成员目录）见 docs/ 各文档，均为待实现配置，不声称已集成。
