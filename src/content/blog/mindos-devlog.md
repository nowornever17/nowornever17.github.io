---
title: 我做了个 AI 个人成长 Widget，把脑子里乱七八糟的想法交给 AI 整理
date: 2026-07-23
tag: 项目日志
excerpt: 从 4 层架构到 8 个 tab、从单一 Claude API 到多 provider 兼容、从想法到上线——一篇开发日志记录 MindOS 的完整构建过程与踩过的坑。
redirect: /blog/devlog.html
---

> 一篇开发日志，记录从 4 层架构到 8 个 tab、从单一 Claude API 到多 provider 兼容、从想法到上线的过程，还有中间踩过的坑。

---

## 起因

我脑子里经常比手头做的事多得多。

读书时冒出一个论文选题想法，地铁上突然想通一个设计问题，凌晨焦虑明天该怎么安排——这些想法像潮水一样来去，留下来的是零碎的便签、聊天记录、和"我好像之前想到过什么但忘了"。

试过 Notion、Obsidian、各种日记 app。**都败在同一件事上**：它们要求我先想清楚怎么分类，再写。但想法来的时候，我不想分类，我只想把它记下来。等我事后想整理，几百条原始记录摊在那里，整理成本高到让我直接放弃。

所以我想做一个工具，满足三件事：

1. **记的时候零摩擦**——不用选标签、不用选 notebook、不用想标题，打开就写。
2. **AI 帮我整理**——不是我去看几百条记录找规律，是 AI 读完后告诉我："你最近一直在想 X，但你嘴上说在意 Y，行为上却在做 Z。"
3. **最终落到行动**——不是给我 10 条 todo，而是告诉我今天最该做的那一件事。

这就是 MindOS 的起点。

---

## 架构：从 4 层到 8 个 tab

最早的设计是 4 层，很纯粹：

```
01 CAPTURE → 02 UNDERSTAND → 03 GROWTH → 04 ACTION
  记录         理解            成长         行动
```

每层只做一件事，单向流动：**chaos → clarity → action**。这是我从 Tiago Forte 的 PARA 那套里偷的灵感，但砍掉了所有"分类"环节——分类是后置的，由 AI 来做，不是用户做。

但实际做下来发现 4 层不够。最明显的问题是 **04 ACTION 缺乏监督**：AI 每天给我推荐一件事，我做没做？没人管。一周下来回看，发现 AI 推的事我压根没动——它就成了装饰品。

于是加了 **07 COACH**：一个 AI 教练，每天读我的任务完成率，按完成度给三档反馈：

| 完成率  | tone      | 风格             |
| ------- | --------- | ---------------- |
| ≥ 70%  | encourage | 鼓励，但不浮夸   |
| 30–70% | push      | 推一把，指出卡点 |
| < 30%   | critique  | 批评，但不羞辱   |

不是 habit tracker 那种打卡+streak，是真正的"读你的数据+说实话"。

然后又发现回顾这件事必须有结构。光"理解"是当下的、即时的，但人需要周期性的回顾——日回顾、周回顾、月回顾、年回顾。所以加了 **04 REVIEW**，AI 基于用户的记录生成结构化的周期回顾。

加了 review 之后又发现，review 里 AI 经常会推荐"下周可以试试 X"——那这个 X 总不能让它飘在回顾里吧？得有个地方承接。于是加了 **05 SCHEDULE**，最简的任务清单，可以从周报里一键导入下一步。

最后再加 **08 CONFIG** 放设置。

最终 8 个 tab：

```
01 CAPTURE    →  02 UNDERSTAND  →  03 GROWTH   →  04 REVIEW
   记录             理解               成长           回顾
05 SCHEDULE   →  06 ACTION       →  07 COACH    →  08 CONFIG
   日程             行动               教练           设置
```

设计原则始终是单向流动：从混乱到清晰，从思考到行动，从行动到监督。**没有任何 tab 是为了"管理"而存在的**——每个 tab 都对应认知链路上的一个真实环节。

---

## 多 API 兼容：为什么不用 Claude 一家

最早这玩意是设计在 claude.ai 里跑的 artifact。但很快遇到问题：

1. **Claude API 在国内访问不便**，普通用户用不了。
2. **Claude API 收费**，而且不便宜。
3. **claude.ai 的 artifact 用 Claude 自己的模型**，但用户没法插自己的 key。

我想让这个 widget 给更多人用，所以做了一件笨但正确的事：**把所有 AI 调用统一成 OpenAI Chat Completions 协议**，然后维护一个 PROVIDERS 注册表：

```js
const PROVIDERS = {
  deepseek: {
    label:'DeepSeek',
    base_url:'https://api.deepseek.com/v1',
    model:'deepseek-chat',
    keyHint:'申请：platform.deepseek.com → API Keys...',
    keyUrl:'https://platform.deepseek.com/api_keys',
  },
  zhipu: {
    label:'智谱 GLM-4-Flash',
    base_url:'https://open.bigmodel.cn/api/paas/v4',
    model:'glm-4-flash',
    keyHint:'GLM-4-Flash 完全免费，无需付费即可使用全部功能。',
    keyUrl:'https://open.bigmodel.cn/usercenter/apikeys',
  },
  claude: { ... },
  openai: { ... },
};
```

架构上抄了 CaseForge 的 `config.example.py` 思路：**一个注册表，每个 provider 一行 `base_url` + `model`**，运行时根据用户选的 provider 解析端点。要加新 provider，注册表里加一行 + dropdown 里加一个 `<option>` 就完事了。

只要对方暴露 OpenAI 兼容的 `/chat/completions` 端点，就能直接接入。

实测过的：

- **DeepSeek**：完美兼容，端到端真实调用通过，价格感人（输入 ¥0.27/百万 tokens）
- **智谱 GLM-4-Flash**：完美兼容，**完全免费**——这是我最推荐的方案，普通用户注册就能用
- **Claude**：走 Anthropic 的 OpenAI 兼容接口，能跑
- **OpenAI**：标准接口

这套架构最大的好处是：**用户用自己的 key，调自己的额度，开发者不用付任何中转成本**。 widget 只是个前端，所有 AI 调用都是浏览器直接打到 provider 端点。

---

## 关键技术决策：API key 的安全边界

这个决策踩过坑，值得单独说。

claude.ai 的 artifact 环境有两个存储：

- **`window.storage`**：artifact 范围的持久化存储，**会跨会话同步到服务器**。
- **`localStorage`**：浏览器本地存储，**永远不会离开浏览器**（除了用户主动调用的 AI provider 请求）。

最初的设计是：API key 存 localStorage，其他配置（provider、model 等）也存 localStorage。简单粗暴。

后来有一次让 Claude（claude.ai 里的）改文件，它把所有配置合并成一个 `mindos:cfg` 对象，统一写到 `window.storage`——**代码更优雅了，但 API key 被上传到了服务器**。这是个安全回归：API key 是用户私密的东西，绝不应该离开浏览器。

修复方案：**严格区分敏感数据和非敏感数据的存储边界**。

```js
async function saveSetting(k, v) {
  // 同步写 localStorage（apiKey 始终只在这里）
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); } catch {}

  // ⚠️ 写 window.storage 时排除 apiKey（防止上传到服务器）
  if (typeof window.storage !== 'undefined') {
    try {
      const safeCfg = Object.assign({}, _cfgCache, { apiKey: '' });
      await window.storage.set('mindos:cfg', JSON.stringify(safeCfg));
    } catch {}
  }
}

async function loadSettings() {
  // ...从 window.storage 读非敏感配置
  _cfgCache = Object.assign({}, defaults, JSON.parse(r.value));
  // apiKey 强制从 localStorage 覆盖（不信 window.storage 里的值）
  _cfgCache.apiKey = (typeof localStorage !== 'undefined')
    ? (localStorage.getItem(LS.apiKey) || '')
    : '';
  return _cfgCache;
}
```

写的时候主动剔除 `apiKey` 字段；读的时候不信 `window.storage` 里的 apiKey 值，强制用 localStorage 覆盖。这样即使 `window.storage` 里有历史残留的 apiKey，也不会被采用。

**这个坑的教训**：让 AI 改代码时，安全相关的边界条件一定要在 prompt 里明确写出来，否则它会为了"代码优雅"无意中破坏安全约束。AI 不会主动考虑"这个数据能不能上传服务器"这种语义层面的问题。

---

## 周期回顾的层级设计：月报读周报，年报读月报

Review 这个 tab 看起来简单，其实有个隐藏的工程问题：**做年回顾的时候，要喂给 AI 多少数据？**

最 naive 的做法：把一整年的 captures 全部塞给 AI。问题：

1. **token 爆炸**：一年 500 条 captures，每条平均 100 字，光输入就是 5 万字。年回顾调用一次成本惊人。
2. **信息损失**：AI 处理超长上下文会丢细节，500 条原始记录里那些微妙的转折会被淹没。
3. **重复劳动**：月报已经总结过的内容，年报再总结一遍是浪费。

我的解法是 **混合层级**：

- **日回顾**：直接读当天的 captures（最少 1 条）
- **周回顾**：直接读本周的 captures（最少 3 条）
- **月回顾**：**优先读本月所有周回顾的摘要**，没有周回顾时降级到读原始 captures（最少 5 条）
- **年回顾**：**优先读本年所有月回顾的摘要**，没有月回顾时降级到读原始 captures（最少 20 条）

这样年回顾的输入是 12 个月报摘要（每个几百字），而不是 500 条原始记录。**token 成本降一个数量级，叙事连贯性反而更好**——因为月报已经做过一次提炼，年报是在提炼过的内容上做更高一层的抽象。

代价是：如果用户从没生成过月报，那年报会降级到读原始 captures，token 成本会上去。但这个降级路径是显式的、可控的。

---

## 语音输入：浏览器原生 vs 云端 API 的取舍

最后一个加的功能。最早没打算做，因为觉得"记下来"这个动作打字就够了。但实际用下来发现，**有些场景下打字确实是摩擦**：

- 走路时有想法，掏手机打字危险
- 情绪强烈时（焦虑、兴奋），打字跟不上思绪
- 长想法（>50 字）打字累

加语音输入时面临选择：用浏览器原生的 **Web Speech API**，还是用 **Whisper API**（OpenAI）？

| 方案           | 优点                       | 缺点                              |
| -------------- | -------------------------- | --------------------------------- |
| Web Speech API | 免费、本地、实时、无需 key | 仅 Chrome/Edge 支持               |
| Whisper API    | 多浏览器、质量高           | 要 OpenAI key、要上传音频、有成本 |

最后选了**两者结合，自动降级**：

```js
const _SR = window.SpeechRecognition || window.webkitSpeechRecognition;

async function _micStart() {
  if (_SR) _micStartWebSpeech();  // Chrome/Edge 走原生
  else await _micStartWhisper();   // Firefox 走 Whisper（需 OpenAI key）
}
```

Web Speech API 这条路有意思的细节：

1. **`continuous: true` + `interimResults: true`**：让识别持续运行，并把中间结果实时填进 textarea。用户说话过程中就能看到文字浮现，反馈感很强。
2. **自动重启**：部分浏览器在静默几秒后会自动停止识别。我在 `onend` 里加了判断——如果用户没点停止按钮，就自动重启识别：

```js
r.onend = () => {
  if (_isRec) { try { r.start(); } catch {} }
};
```

3. **增量拼接**：识别结果分 final 和 interim 两种。我用 `baseText + finalText + interim` 的方式拼接到 textarea，保证已确认的内容不会丢，未确认的内容实时更新。

Whisper 降级路径的限制：**只有当前 provider 是 `openai` 且配了 API key 时才能用**。否则会提示用户切换到 OpenAI provider 或者换 Chrome/Edge。这是有意的设计——不为了"功能完整"而引入隐式的 API 调用成本。

---

## UI 精修：被忽视的细节决定质感

最后做了整整一轮 UI 精修，没加新功能，全是细节。但这些细节决定了 widget 看起来是"是个 demo"还是"是个产品"。

### 可访问性

给所有 nav-item 加了 `role="button" tabindex="0"` 和键盘事件：

```js
t.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    t.click();
  }
});
```

加上 `:focus-visible` 样式。**这不仅是无障碍，也让自动化测试能正常点击 nav-item**——之前用 Playwright 测试时点击没反应，就是因为缺这俩属性。

### 响应式

`@media (max-width: 520px)` 把侧边栏缩到 52px 图标-only，label 改成 hover 浮窗：

```css
.nav-label {
  position: absolute;
  left: 54px;
  opacity: 0;
  /* ... */
}
.nav-item:hover .nav-label { opacity: 1; }
```

桌面端用鼠标 hover 显示，移动端窄屏下侧边栏不占空间。

### 排版的层次感

字体选了三种，故意拉开差距：

- **Crimson Pro**（衬线，斜体）：所有 AI 生成的内容——insights、reviews、coach 消息、action 文案。营造"读一本关于自己的杂志"的感觉。
- **Instrument Sans**（无衬线）：用户输入和 UI 标签。
- **DM Mono**（等宽）：所有元数据、时间戳、label。

**AI 的输出和用户的输入在视觉上是两种不同的物体**——这是刻意的。让用户感觉到"这是 AI 写的关于我的话"，而不是"这是我写的笔记"。

### 暗色模式

暗色模式没另写一套样式，而是用 CSS 变量覆盖：

```css
.app { --ms-bg: #F8F8F6; --ms-tx: #1A1A1A; /* ...浅色变量 */ }
.app.dark { --ms-bg: #141414; --ms-tx: #F0F0EE; /* ...暗色变量 */ }
```

切换时只是给 `.app` 加/移除 `.dark` 类，所有 CSS 自动重算。主题偏好存 `window.storage`，跨会话保留。

---

## 技术栈选型理由

做这种"形态特殊"的项目，每个技术决策背后都有具体的约束。把选型理由列出来，比讲实现细节更有价值。

### 1. 为什么是单文件 HTML widget，不是 React/Vue SPA

这是个**部署形态决定架构**的典型案例。MindOS 最初的目标是跑在 claude.ai 的 artifact 环境里——artifact 只接受一段自包含的 HTML，不能有外部文件、不能有构建步骤、不能 import npm 包。

这个约束反过来塑造了所有后续决策：

- **不能用框架**：React/Vue 都需要 build step 或者大型 CDN bundle，artifact 环境不友好
- **不能用模块化**：没有 import，所有 JS 必须塞进一个 `<script>` 标签
- **不能用外部资源**（除了 CDN 字体和图标）：所有 CSS/JS 必须内联

最后就是 vanilla JS + 一个大 `<script>` + 一个大 `<style>`。听起来很 retro，但实际上**对一个状态简单的 CRUD-like 应用，vanilla JS 完全够用**。整个 widget 的状态就是几个数组（captures、tasks、reviews、coach history），加几个 UI 状态变量。这种规模的代码用 React 反而 overkill。

### 2. 为什么用 OpenAI Chat Completions 协议作为统一接口

不是因为它最好，是因为它是**事实标准**。

国内主流 LLM provider（DeepSeek、智谱、月之暗面、MiniMax）几乎全部提供 OpenAI 兼容的 `/chat/completions` 端点。这意味着只要 MindOS 会说 OpenAI 协议，就能接所有这些 provider，**不需要为每家写一套适配器**。

代码上就是一个 PROVIDERS 注册表 + 一个 `resolveEndpoint()` 函数：

```js
function resolveEndpoint(s) {
  const p = PROVIDERS[s.provider] || PROVIDERS.deepseek;
  const base = (s.baseUrl || p.base_url || '').replace(/\/+$/, '');
  return base + '/chat/completions';
}
```

加新 provider 就是注册表加一行 + UI 加一个 `<option>`。**架构复杂度不随 provider 数量增长**。

### 3. 为什么用 localStorage + window.storage 双层

这是**安全边界和用户体验的折中**。

- `window.storage`（claude.ai artifact 提供）：跨会话同步，但**会上传到服务器**
- `localStorage`（浏览器原生）：只在本地，**永远不离开浏览器**

正确的设计是：

- **敏感数据（API key）**：只存 localStorage，**绝对不写 window.storage**
- **非敏感配置（provider、theme 等）**：双写，跨会话保留方便用户

这个边界在代码里是显式的：

```js
async function saveSetting(k, v) {
  // localStorage 永远写
  localStorage.setItem(k, v);
  // window.storage 写之前剔除 apiKey
  const safeCfg = Object.assign({}, _cfgCache, { apiKey: '' });
  await window.storage.set('mindos:cfg', JSON.stringify(safeCfg));
}
```

### 4. 为什么用 Web Speech API 优先，Whisper 降级

语音识别这事有个反直觉的事实：**浏览器原生 API 反而比云端 API 体验更好**，前提是浏览器支持。

| 维度     | Web Speech API | Whisper API          |
| -------- | -------------- | -------------------- |
| 延迟     | 实时（<100ms） | 几秒（要上传+识别）  |
| 中间结果 | 支持，实时显示 | 不支持，要等整段说完 |
| 成本     | 免费           | 按 audio 分钟计费    |
| 网络     | 不需要         | 必须                 |
| 浏览器   | Chrome/Edge    | 全部                 |

Web Speech API 的 `interimResults: true` 让用户说话时文字就实时浮现，这种反馈感是 Whisper 给不了的。所以默认走 Web Speech，只在浏览器不支持时才降级到 Whisper。

### 5. 为什么字体选 Crimson Pro + Instrument Sans + DM Mono

不是 Inter + Playfair Display 这种"安全牌"。

- **Crimson Pro**（衬线，斜体）：所有 AI 生成的内容。衬线+斜体的组合让 AI 输出读起来像"一本关于你的杂志"，和用户输入视觉上完全区隔。
- **Instrument Sans**（无衬线）：UI 和用户输入。比 Inter 更有性格，不那么"通用"。
- **DM Mono**（等宽）：所有元数据。等宽字体让时间戳和 label 有"档案感"。

三个字体的层次感拉开了 AI 输出和用户输入的视觉区隔，**强化了"AI 在说关于你的话"这个感知**。

### 6. 为什么 8 个 tab 而不是单一长页面

认知分块。

人面对一个长页面会进入"扫读模式"，看到第二屏就开始走神。8 个 tab 强制用户**一次只看一个认知环节**：

- 想记东西时只看 CAPTURE
- 想理解自己时只看 UNDERSTAND
- 想回顾时只看 REVIEW

每个 tab 的内容量都被限制在一屏左右，**强制保持认知聚焦**。

侧边栏设计也呼应这点：52px 窄边栏 + hover 显示 label，**让 tab 切换的成本足够低（一次点击）但足够明确（视觉反馈强烈）**。

### 7. 为什么用 CSS 变量而不是预处理器

暗色模式用 CSS 变量一套就解决了：

```css
.app { --ms-bg: #F8F8F6; /* ... */ }
.app.dark { --ms-bg: #141414; /* ... */ }
```

切换主题就是 `classList.toggle('dark')`，所有 CSS 自动重算。如果用 Sass/Less，还得引入构建步骤，违反单文件约束。CSS 变量是**原生支持、零成本、运行时切换**的方案。

---

## 踩过的坑

### 1. Edit 工具报告成功但改动没持久化

开发 Phase 2 时连续 6 次 Edit 调用都报告"Successfully modified"，但 `git diff` 一看文件根本没变。换 Node.js 的 `fs.writeFileSync` 直接写文件，从此全部可靠。

**教训**：在 Trae/Claude Code 这类环境里，对工具的"成功"回报要保持怀疑，**关键改动一定要用文件系统层面的 API 验证**。

### 2. 让 AI 改代码可能引入安全回归

前面讲过 API key 那次。AI 为了"代码优雅"把所有配置合并到 `window.storage`，破坏了"API key 不离开浏览器"的安全边界。

**教训**：让 AI 改代码时，**安全相关的边界条件必须在 prompt 里显式写出来**。不能假设 AI 会自己考虑到"这个数据能不能上传服务器"。

### 3. Review 页 "undefined" 的隐性 bug

初始化时调用 `renderReview()` 没传 period 参数，导致 `REV_NAME[undefined]` 渲染成 "undefined"。功能正常，但 UI 上有个 "生成本undefined回顾" 的难看文字。

修了两处：

```js
// 修复 1：init 调用时传参
renderReview(revPeriod);

// 修复 2：函数签名加默认参数（防御性）
function renderReview(period = revPeriod, data) { ... }
```

**教训**：默认参数是廉价的保险。即使调用方"应该"传参，也给个默认值兜底。

### 4. 浏览器权限和自动化测试的冲突

Playwright 自动化点击麦克风按钮时，浏览器可能没弹权限请求就直接拒绝，导致测试结果和真实用户体验不一致。

**教训**：涉及浏览器权限（麦克风、摄像头、地理位置）的功能，**自动化测试只能验证 UI 状态机，真实体验必须手动验证**。

---

## 项目数据

最终交付：

- **代码量**：单文件 widget.md，83638 chars（约 1700 行 HTML/CSS/JS）
- **8 个 tab**：记录 / 理解 / 成长 / 回顾 / 日程 / 行动 / 教练 / 设置
- **4 个 AI provider**：DeepSeek / 智谱 GLM-4-Flash / Claude / OpenAI
- **7 处 AI 调用点**：理解 / 成长 / 行动 / 日回顾 / 周回顾 / 月回顾 / 年回顾 / 教练
- **16 个核心函数**：从 `addCapture()` 到 `_micTranscribeWhisper()`
- **零依赖**：单 HTML 文件，无 npm、无构建、无框架
- **可访问性**：键盘导航、focus 样式、aria-label
- **响应式**：520px 断点，桌面/移动都可用
- **暗色模式**：CSS 变量切换，跨会话保留
- **语音输入**：Web Speech API + Whisper 降级

---

*项目地址：[GitHub](https://github.com/modusensus/Mindos) · 单文件 widget，复制粘贴到 Claude.ai 即可用。智谱 GLM-4-Flash 用户完全免费。*
