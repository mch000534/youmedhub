# 视频分析 API 模式说明

本项目支持两种视频分析模式：**常规输出**和**流式输出**。

---

## 📋 当前使用模式

**常规输出模式（默认）**

应用当前使用常规输出模式，即等待 AI 完全分析完成后一次性返回所有结果。

---

## 🔄 两种模式对比

### 1. 常规输出模式（Normal Mode）

**特点：**
- ✅ 简单可靠，无需处理流式数据
- ✅ 代码逻辑清晰，易于维护
- ✅ 结果一次性返回，保证完整性
- ⏳ 需要等待完整响应，延迟较高
- 📦 适合小型视频或对实时性要求不高的场景

**使用方法：**
```typescript
import { analyzeVideo } from '@/api/videoAnalysis';

const result = await analyzeVideo(
  videoFile,
  apiKey,
  (message) => {
    // 进度回调
    console.log(message);
  }
);
```

---

### 2. 流式输出模式（Streaming Mode）

**特点：**
- ⚡ 实时显示分析进度，用户体验更好
- 📊 支持部分结果预览
- 🔄 需要处理流式数据和增量更新
- 💻 代码复杂度较高
- 📦 适合大型视频或需要实时反馈的场景

**使用方法：**
```typescript
import { analyzeVideoStreaming } from '@/api/videoAnalysis';

const result = await analyzeVideoStreaming(
  videoFile,
  apiKey,
  (message) => {
    // 进度回调
    console.log(message);
  },
  (content) => {
    // 流式内容回调
    const partialResult = tryParsePartialJSON(content);
    if (partialResult) {
      // 实时更新 UI
    }
  }
);
```

---

## 🛠️ API 函数说明

### 常规输出函数

#### `analyzeVideo(source, apiKey, onProgress)`

**参数：**
- `source`: `File | string` - 视频文件或在线视频 URL
- `apiKey`: `string` - DashScope API Key
- `onProgress?`: `(message: string) => void` - 可选的进度回调

**返回：**
- `Promise<VideoAnalysisResponse>` - 完整的分析结果

**内部实现：**
- 视频 URL → `analyzeVideoByUrlNormal()`
- 本地文件 → `analyzeVideoByFileNormal()`

---

### 流式输出函数

#### `analyzeVideoStreaming(source, apiKey, onProgress, onStreamContent)`

**参数：**
- `source`: `File | string` - 视频文件或在线视频 URL
- `apiKey`: `string` - DashScope API Key
- `onProgress?`: `(message: string) => void` - 可选的进度回调
- `onStreamContent?`: `(content: string) => void` - 可选的流式内容回调

**返回：**
- `Promise<VideoAnalysisResponse>` - 完整的分析结果

**内部实现：**
- 视频 URL → `analyzeVideoByUrlStreaming()`
- 本地文件 → `analyzeVideoByFileStreaming()`

---

## 🔧 切换模式

### 从常规模式切换到流式模式

1. **修改导入：**
```typescript
// 旧代码
import { analyzeVideo } from '@/api/videoAnalysis';

// 新代码
import { analyzeVideoStreaming, tryParsePartialJSON } from '@/api/videoAnalysis';
```

2. **修改调用：**
```typescript
// 旧代码
const result = await analyzeVideo(videoFile, apiKey, onProgress);

// 新代码
const result = await analyzeVideoStreaming(
  videoFile,
  apiKey,
  onProgress,
  (content) => {
    // 处理流式内容
    const partialResult = tryParsePartialJSON(content);
    if (partialResult) {
      // 增量更新 UI
    }
  }
);
```

3. **添加增量更新逻辑：**

参考 [STREAMING_TEST.md](./STREAMING_TEST.md) 中的详细实现。

---

### 从流式模式切换到常规模式

1. **修改导入：**
```typescript
// 旧代码
import { analyzeVideoStreaming, tryParsePartialJSON } from '@/api/videoAnalysis';

// 新代码
import { analyzeVideo } from '@/api/videoAnalysis';
```

2. **简化调用：**
```typescript
// 旧代码
const result = await analyzeVideoStreaming(
  videoFile,
  apiKey,
  onProgress,
  onStreamContent
);

// 新代码
const result = await analyzeVideo(videoFile, apiKey, onProgress);
```

3. **移除流式相关代码：**
- 删除 `onStreamContent` 回调
- 删除 `tryParsePartialJSON` 调用
- 删除增量更新逻辑
- 删除节流相关代码

---

## 📂 代码结构

```
src/api/videoAnalysis.ts
├── 工具函数
│   ├── videoToBase64()        # 视频转 base64
│   ├── getVideoMimeType()     # 获取 MIME 类型
│   ├── parseAnalysisResult()  # 解析完整 JSON
│   └── tryParsePartialJSON()  # 解析部分 JSON（流式专用）
│
├── 常规输出版本
│   ├── analyzeVideoByUrlNormal()   # URL 常规
│   └── analyzeVideoByFileNormal()  # 文件 常规
│
├── 流式输出版本
│   ├── analyzeVideoByUrlStreaming()   # URL 流式
│   └── analyzeVideoByFileStreaming()  # 文件 流式
│
└── 统一接口
    ├── analyzeVideo()           # 常规输出（默认导出）
    └── analyzeVideoStreaming()  # 流式输出
```

---

## 🎯 推荐使用场景

### 使用常规模式
- ✅ 视频文件较小（< 5MB）
- ✅ 对实时性要求不高
- ✅ 追求代码简洁性
- ✅ 初期开发阶段

### 使用流式模式
- ✅ 视频文件较大（> 5MB）
- ✅ 需要实时反馈用户
- ✅ 要求更好的用户体验
- ✅ 愿意处理复杂的增量更新逻辑

---

## 📝 注意事项

### 常规模式
- API 调用时设置 `stream: false`
- 使用 `response.json()` 获取完整结果
- 从 `data.choices[0].message.content` 提取内容

### 流式模式
- API 调用时设置 `stream: true`
- 使用 `response.body.getReader()` 读取流
- 从 SSE 格式中提取 `delta.content`
- 需要累积所有片段才能得到完整内容
- 使用 `tryParsePartialJSON()` 解析不完整的 JSON

---

## 🐛 调试建议

### 常规模式
```typescript
console.log('开始分析...');
const result = await analyzeVideo(videoFile, apiKey, (msg) => {
  console.log('[进度]', msg);
});
console.log('分析完成:', result);
```

### 流式模式
```typescript
console.log('开始流式分析...');
let totalBytes = 0;

const result = await analyzeVideoStreaming(
  videoFile,
  apiKey,
  (msg) => console.log('[进度]', msg),
  (content) => {
    totalBytes += content.length;
    console.log('[流式]', totalBytes, '字节');

    const partial = tryParsePartialJSON(content);
    if (partial) {
      console.log('[部分结果]', partial.rep.length, '项');
    }
  }
);
console.log('分析完成:', result);
```

---

## 📚 相关文档

- [STREAMING_TEST.md](./STREAMING_TEST.md) - 流式输出测试指南
- [CLAUDE.md](./CLAUDE.md) - 项目架构说明
- [README.md](./README.md) - 项目使用说明

---

**当前版本**：常规输出模式
**最后更新**：2025-11-22
