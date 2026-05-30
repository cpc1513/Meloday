# Meloday / 日聆

> 写下一天，让 AI 替你挑一张属于今天的歌单。

Meloday（日聆）是一款面向 Windows 的 AI 音乐日记应用。它把“写日记”变成一个更轻的音乐仪式：你只需要记录今天发生了什么、心情如何，Meloday 会分析文字里的情绪、场景和节奏，再为这一天生成一张私人歌单。

它不是传统播放器，也不是单纯的日记本。Meloday 更像一个把文字、情绪、日历和音乐放在一起的桌面小空间：今天写下来的东西，会和当天的歌单一起被保存，之后可以在日历和历史记录里重新打开。

[下载最新 Windows 便携版](https://github.com/cpc1513/Meloday/releases/latest)

## 应用截图

### 写下今天，生成今日音乐

![Meloday diary screen](docs/screenshots/dairy.png)

### 在播放器中预览歌词，歌单，收藏今天

![Meloday player screen](docs/screenshots/player.png)

### 用日历回看每天的情绪和音乐

![Meloday calendar screen](docs/screenshots/calendar.png)

### 在历史里找回过去的日记

![Meloday history screen](docs/screenshots/history.png)


## Meloday 能做什么

- **AI 音乐日记**：输入一段日记，应用会根据文字内容生成当日歌单。
- **情绪理解**：后端通过 DeepSeek 分析日记里的情绪、关键词和场景，新用户有365次免费生成次数，后续可以选择添加自己的apikey
- **音乐推荐**：把 AI 生成的推荐意图转成可搜索的歌曲候选，再匹配在线音乐数据。
- **日历归档**：每天的日记、情绪和歌单会以日期为单位保存，适合长期回看。
- **历史记录**：用时间线方式回顾过去写过的内容和生成过的音乐。
- **迷你播放器**：在应用底部保留轻量播放入口，不打断写作和浏览。
- **本地优先**：日记和歌单数据保存在本机 SQLite 数据库中。
- **Windows 便携版**：发布包为 `Meloday-Portable-*.exe`，无需安装即可运行。



## 说明

- Meloday 是个人项目，目前更适合个人学习、体验和继续迭代。
- 音乐播放能力依赖在线音乐源，歌曲可用性可能因版权、地区或接口变化而变化。
- `.env`、本地数据库、构建产物和打包后的 exe 不会提交到仓库。
- 如果你想体验完整生成流程，需要可用的 DeepSeek API 配置。

## License

Personal project. Please respect the terms and copyright rules of the services you connect to.
