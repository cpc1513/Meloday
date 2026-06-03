# Meloday / 日聆

> 写下一天，让 AI 替你挑一张属于今天的歌单。

Meloday 是一款面向 Windows 的 AI 音乐日记应用。你写下当天发生了什么、心情如何，应用会通过 AI 理解文字里的情绪、场景和节奏，再为这一天生成一张私人歌单。日记、情绪和歌单会按日期保存在本机，之后可以从日历、历史记录和播放器里重新打开。

[下载最新版本](https://github.com/cpc1513/Meloday/releases/latest)

## 应用截图

### 写下今天，生成今日音乐

![Meloday diary screen](docs/screenshots/dairy.png)

### 在播放器中查看歌词、歌单和收藏状态

![Meloday player screen](docs/screenshots/player.png)

### 用日历回看每天的情绪和音乐

![Meloday calendar screen](docs/screenshots/calendar.png)

### 在历史里找回过去的日记

![Meloday history screen](docs/screenshots/history.png)

## 功能

- **AI 音乐日记**：输入一段日记，Meloday 会根据内容生成当天歌单。
- **情绪理解**：AI 会分析日记里的情绪、场景和具体线索，不只是套用情绪模板。
- **云端免费额度**：新用户可使用官方云端 AI 网关的免费额度；额度用完后可在设置中填写自己的 DeepSeek API Key。
- **QQ 音乐匹配**：后端会把 AI 推荐转成 QQ 音乐可检索、尽量可播放的歌曲。
- **播放器与歌词**：提供底部迷你播放器和独立播放器页，支持歌词显示、进度、音量、收藏和歌单切换。
- **日历与历史**：每天的日记、情绪、节日信息和歌单会按日期保存，支持历史搜索和删除。
- **本地优先**：日记和歌单数据默认保存在当前 Windows 用户目录下的 SQLite 数据库中。
- **Windows 发布包**：提供安装器版本和便携版。

## 安装版与便携版

- `Meloday-Setup-*.exe`：推荐普通用户使用。安装后会创建快捷方式，启动体验更接近正式桌面应用。
- `Meloday-Portable-*.exe`：适合临时体验或免安装运行。

两种版本的数据都保存在当前 Windows 用户的数据目录中，不会保存在 GitHub 仓库或安装包里。你可以在应用的 **设置 → 数据目录 → 打开目录** 中查看实际位置。

## 工作原理

```text
Windows 应用
  - React / Electron 界面
  - 本地 Express 后端
  - 本地 SQLite 数据库
        |
        | HTTPS
        v
Meloday 云端 AI 网关
  - 保存 DeepSeek Key
  - 控制免费额度
  - 记录使用次数与限流
        |
        v
DeepSeek API

本地后端还会连接 QQ 音乐接口，用于搜索歌曲、获取播放链接、封面和歌词。
```

如果用户在设置页填写自己的 DeepSeek API Key，本地后端会优先使用用户自己的 Key；否则使用 Meloday 官方云端 AI 网关。官方 DeepSeek Key 不会被打包进客户端。

## 隐私说明

- 日记、歌单、收藏、歌词缓存等数据默认保存在本机 SQLite 数据库。
- 生成歌单时，日记文本会发送到 AI 服务用于情绪分析和音乐推荐。
- 如果使用官方云端免费额度，日记文本会发送到 Meloday 云端 AI 网关，再由云端请求 DeepSeek。
- 如果使用自有 DeepSeek API Key，日记文本会由本地后端直接发送到 DeepSeek 官方 API。
- Meloday 不会把你的本地数据库、导出文件或自有 API Key 提交到 GitHub。

## 常见问题

**为什么有些歌曲不能播放？**
Meloday 依赖在线音乐源获取播放链接。歌曲可用性可能受版权、地区、接口变化和网络环境影响。应用会尽量跳过不可播放歌曲，但不能保证所有歌曲都可播放。

**为什么生成失败？**
常见原因包括：云端 AI 服务暂时不可用、免费额度用完、DeepSeek API Key 无效、QQ 音乐没有找到足够可播放歌曲。可以稍后重试，或在设置页填写自己的 DeepSeek API Key。

**免费额度在哪里看？**
进入 **设置 → DeepSeek 配置**，可以看到官方云端免费额度的剩余次数和本机设备 ID。

**数据存在哪里？**
进入 **设置 → 数据目录 → 打开目录**。数据库文件通常在 `%APPDATA%/Meloday/data/meloday.db` 附近。

**这个项目可以商用吗？**
这是个人学习项目。请遵守 DeepSeek、QQ 音乐等外部服务的使用条款和版权规则。

## 本地开发

要求：

- Node.js 20+
- npm
- 可用的 DeepSeek API Key，或可用的 Meloday 云端 AI 网关

后端：

```bash
cd backend
npm install
npm run build
npm start
```

前端 / Electron：

```bash
cd frontend
npm install
npm run electron:dev
```

## 打包 Windows 应用

```bash
cd backend
npm run build

cd ../frontend
npm run dist
```

输出文件位于：

```text
release/Meloday-Setup-*.exe
release/Meloday-Portable-*.exe
```

打包产物、数据库、`.env`、云端密钥和本地缓存不会提交到仓库。

## 项目结构

```text
backend/      Express + SQLite 本地 API
frontend/     React + Vite + Electron 应用
docs/         截图与说明文档
data/         本地开发数据库，忽略提交
release/      打包输出，忽略提交
```

## License

Personal project. Please respect the terms and copyright rules of the services you connect to.
