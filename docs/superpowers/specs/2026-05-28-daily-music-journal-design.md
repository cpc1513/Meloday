# Meloday / 日聆 — AI 音乐日记应用设计文档

## 1. 项目概述

**品牌：** Meloday（日聆）

用户输入当天的日记或情绪碎片，应用通过内置 DeepSeek AI 分析情绪并推荐一个10首歌的个性化歌单，接入网易云音乐实现在线播放。用户可在日历视图中回顾每一天的情绪和当时的歌曲。

**设计关键词：** 极简主义、安静治愈、Apple 风格、日系留白、MUJI 质感、高级 SaaS、柔和奶白/暖灰/浅米色、大量留白、精致圆角、微弱阴影、情绪氛围感、深夜安静写日记时听音乐的感觉。不赛博朋克，不高饱和，不复杂科技。

## 2. 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React + Vite，纸间音律（Paper & Rhythm）设计风格 |
| 后端 | Node.js + Express |
| 数据库 | SQLite（`better-sqlite3`） |
| AI | DeepSeek API（由项目维护者提供 API Key） |
| 音乐源 | 网易云音乐（非官方 API：`NeteaseCloudMusicApi` 作为后端依赖集成） |
| 部署 | 前端 Vercel / 后端 Render 或 Railway（均免费） |

## 3. 数据模型

```sql
-- 日记条目（按天唯一）
CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,    -- 'YYYY-MM-DD'
  content TEXT NOT NULL,        -- 用户原始日记
  emotions TEXT,                -- JSON: ["焦虑", "期待"]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 每日歌单（每天一条）
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

-- 歌单中的歌曲（10首）
CREATE TABLE songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  position INTEGER NOT NULL,    -- 1-10
  name TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  cover_url TEXT,
  netease_id INTEGER,
  reason TEXT,                  -- AI 推荐理由
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id)
);

-- 播放记录（可选，用于统计）
CREATE TABLE plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id INTEGER NOT NULL,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER,
  FOREIGN KEY (song_id) REFERENCES songs(id)
);
```

## 4. UI 设计：纸间音律（Paper & Rhythm）

### 4.1 风格定义
以日本侘寂美学与北欧极简为基底，强调留白、材质感与情绪温度。

**色彩系统（CSS 变量）：**
```css
:root {
  --bg: #F5F3F0;           /* 温暖纸白 */
  --text: #2D2A26;         /* 暖墨色 */
  --accent: #8B7E74;       /* 暖灰棕 */
  --divider: #D4CEC7;      /* 浅灰褐 */
  --card-bg: #FFFFFF;
}
```

**情绪色彩（日历/标签）：**
- 开心 `#F5E6D3` | 难过 `#D4E5ED` | 焦虑 `#E8DED4` | 平静 `#DED4E2` | 期待 `#E2DDD4` | 愤怒 `#D4E2D4`

**字体：** 系统无衬线栈（PingFang SC / Microsoft YaHei）+ Inter 用于英文数字。
**材质：** 微弱外阴影 `0 1px 3px rgba(45,42,38,0.04), 0 1px 2px rgba(45,42,38,0.08)`，卡片圆角 16-20px。

### 4.2 页面结构（参考用户设计图）

**全局布局：**
- 左侧边栏（固定）：Logo + 导航（日记 / 日历 / 历史）+ 底部用户头像
- 右侧主内容区（可滚动）

**日记页（主页）：**
- 顶部：日期标题 + 当前日期
- 中间：大卡片文本输入区（带字数统计 `0 / 1000`），输入区下方工具栏（图片/表情/标签）
- 底部：深色「生成音乐」按钮
- 生成后：下方展开播放器卡片 — 大专辑封面左 + 歌曲信息右 + 进度条 + 播放控制栏（随机 ⟳ / 上一首 ⏮ / 播放暂停 ⏯ / 下一首 ⏭ / 列表 ☰）

**日历页：**
- 顶部：年月标题 + 左右翻页 + 「今日」按钮
- 中间：7列月历，每个有记录的日期格子显示：日期数字 + 专辑封面图（歌单第1首封面），情绪色作为封面加载前的底色
- 底部：点击某天展开「历史记录」列表，显示该天日记摘要、情绪标签、歌曲卡片

**历史页：**
- 所有有记录的日期按时间倒序排列
- 每条记录显示日期、歌曲封面、歌名歌手、播放按钮

## 5. AI 交互流程（混合模式）

用户点击「生成音乐」后，后端执行两步 DeepSeek 调用：

### 5.1 第1步：情绪分类
```
你是一位情绪分析专家。请阅读以下日记，判断其中最主要的1-2种情绪。
可选标签：开心、难过、平静、焦虑、愤怒、期待、孤独、兴奋、疲惫、感恩

日记：{content}

返回JSON：{"emotions": ["焦虑", "期待"]}
```

### 5.2 第2步：歌单推荐
```
你是一位音乐治疗师。用户今天的情绪是：{emotions}。
日记内容：{content}

请推荐一个包含10首歌曲的歌单，这些歌曲能陪伴用户度过今天的心情。
要求：
- 只返回JSON数组
- 每首包含 song（歌名）、artist（歌手）、reason（推荐理由，1句话）
- 可以是中文、英文、日语、韩语等任意语言，也可以包含纯音乐
- 优先选择网易云音乐能搜索到的歌曲
- 歌单要有起伏变化，第一首最贴合当前情绪，后面逐渐过渡

[
  {"song": "...", "artist": "...", "reason": "..."},
  ...
]
```

### 5.3 网易云搜索链路
对每首推荐歌曲：
1. `POST /search?keywords={song}+{artist}` → 取搜索结果第1条的 `id`
2. `GET /song/detail?ids={id}` → 获取封面 `picUrl`、专辑名
3. 将10首歌按顺序存入 `songs` 表，`cover_url` 使用网易云 CDN 直链

**Fallback：** 若某首搜索无结果，跳过该首，最终歌单可能少于10首（至少保证3首以上）。

## 6. API 接口设计

基础路径：`/api`

### 6.1 提交日记 & 生成歌单
```
POST /api/entries
Body: {"date": "2026-05-28", "content": "..."}

Response:
{
  "id": 42,
  "date": "2026-05-28",
  "content": "...",
  "emotions": ["焦虑", "期待"],
  "playlist": {
    "id": 7,
    "songs": [
      {
        "id": 101,
        "position": 1,
        "name": "平凡的一天",
        "artist": "毛不易",
        "album": "平凡的一天",
        "cover_url": "https://p1.music.126.net/xxx.jpg",
        "netease_id": 123456,
        "reason": "..."
      },
      ...
    ]
  }
}
```

### 6.2 重新生成歌单（可选，覆盖旧歌单）
```
POST /api/entries/:id/regenerate-playlist
Response: 同上 playlist 对象
```

### 6.3 获取日历月视图
```
GET /api/calendar?year=2026&month=5

Response:
{
  "days": [
    {
      "date": "2026-05-01",
      "has_entry": true,
      "emotions": ["开心"],
      "song_cover": "https://p1.music.126.net/xxx.jpg",
      "emotion_color": "#F5E6D3"
    },
    {"date": "2026-05-02", "has_entry": false}
  ]
}
```

### 6.4 获取某天详情
```
GET /api/entries/:date
Response: entries + playlist + songs 完整数据
```

### 6.5 获取播放直链
```
GET /api/songs/:netease_id/play-url
Response: {"url": "https://m10.music.126.net/xxx.mp3", "expires_in": 300}
```

## 7. 音乐播放流程

```
用户点击播放 / 切歌
  → 前端调用 GET /api/songs/{netease_id}/play-url
    → 后端实时调用网易云 /song/url?id={netease_id}
      → 返回带签名的 MP3 直链
        → 前端赋值给 <audio src="..."> 并播放
```

**播放状态管理（React Context）：**
```typescript
interface PlayerState {
  playlist: Song[];
  currentIndex: number;      // 当前播放第几首
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
}
```

**播放控制栏（底部固定）：**
- 随机播放开关 ⟳
- 上一首 ⏮（currentIndex - 1）
- 播放/暂停 ⏯（大圆按钮，视觉焦点）
- 下一首 ⏭（currentIndex + 1）
- 播放列表 ☰（展开侧边抽屉，显示10首歌列表，当前播放高亮）

## 8. 前端组件结构

```
src/
  components/
    Sidebar.tsx           # 左侧边栏导航
    DiaryEditor.tsx       # 日记文本输入区
    EmotionTags.tsx       # 情绪标签展示
    PlaylistCard.tsx      # 播放器卡片（封面+信息+控制栏）
    ProgressBar.tsx       # 播放进度条
    CalendarGrid.tsx      # 月历网格
    CalendarDay.tsx       # 单个日期格子（含封面）
    DayDetail.tsx         # 日历页下方某天详情展开
    SongList.tsx          # 播放列表抽屉
    HistoryList.tsx       # 历史记录列表
  pages/
    DiaryPage.tsx         # 日记主页
    CalendarPage.tsx      # 日历页
    HistoryPage.tsx       # 历史页
  hooks/
    usePlayer.ts          # 播放器状态管理
    useAudio.ts           # <audio> 元素封装
  api/
    client.ts             # axios/fetch 封装
  styles/
    variables.css         # CSS 变量（颜色、间距、阴影）
    global.css            # 全局样式
```

## 9. 部署方案

| 服务 | 平台 | 说明 |
|---|---|---|
| 前端 | Vercel | GitHub 自动部署，免费 CDN |
| 后端 + SQLite | Render / Railway | 免费额度够用，SQLite 作为本地文件 |
| 环境变量 | — | `DEEPSEEK_API_KEY` 仅存于后端 `.env`，前端不可见 |

**跨域处理：** Express 配置 `cors` 中间件，允许前端域名访问。

## 10. 非功能性需求

- **响应式：** 优先桌面端（1280px+），日历和播放器布局在桌面端体验最佳
- **性能：** 日记提交到歌单展示控制在 5-8 秒内（DeepSeek 调用占大头）
- **降级：** 网易云封面加载失败时显示情绪色块 + 默认音符图标
- **错误处理：** DeepSeek 调用失败时返回友好提示；网易云搜索失败跳过该首
