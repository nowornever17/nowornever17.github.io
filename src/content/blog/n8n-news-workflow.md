---
title: n8n 自动化：每日新闻摘要推送工作流搭建记录
date: 2025-06-03
tag: 项目日志
excerpt: 云服务器部署 n8n，接入 DeepSeek 总结 + 企业微信 webhook 推送，从 0 到 1 的全过程踩坑记录。
---

## 目标

每天早上自动推送一条 AI 整理的新闻摘要到微信，不用自己找资讯。

## 技术栈

- **n8n** 运行在阿里云 Ubuntu 24.04（Docker 部署）
- **DeepSeek API** 负责总结
- **企业微信 webhook** 负责推送

## 踩坑记录

### 坑 1：Obsidian Local REST API 认证格式

插件要求 `apikey xxxxxxxx`，不是 `Bearer xxxxxxxx`。这个坑卡了我两个小时。

### 坑 2：n8n cron 时区问题

默认 UTC，需要在环境变量里加：

```bash
GENERIC_TIMEZONE=Asia/Shanghai
```

### 坑 3：DeepSeek 返回的 JSON 格式

偶尔会在 JSON 外面包一层 markdown 代码块，需要在 n8n 的 Function 节点里做一下清洗：

```javascript
const raw = $input.first().json.choices[0].message.content;
const clean = raw.replace(/```json|```/g, '').trim();
return [{ json: JSON.parse(clean) }];
```

## 最终效果

每天 7:30 准时收到摘要，目前稳定运行中 ✓
