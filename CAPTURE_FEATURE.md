# 视频截图和片段截取功能说明

本项目新增了视频关键帧截图功能，帮助用户快速导出分析结果中的关键画面。

---

## 🎯 功能概述

在分析结果表格中，新增了两列：

1. **视频片段**（位于"时长"列之后）
2. **关键帧截图**（位于"关键帧"列之后）

---

## 📸 关键帧截图功能

### 功能说明

- 基于 AI 分析结果中的 `keyframeTimes` 字段自动定位视频时间点
- 截取该时间点的视频画面并保存为 JPEG 图片
- 自动下载到本地

### 使用方法

1. 上传视频并完成 AI 分析
2. 在结果表格的"关键帧截图"列，点击 **"截取截图"** 按钮
3. 等待截图完成（按钮显示"截图中..."）
4. 图片自动下载到浏览器默认下载目录

### 文件命名规则

```
keyframe_{序号}_{时间}.jpg
```

**示例：**
- `keyframe_1_00-15-10.jpg` - 第 1 项，时间 00:15:10
- `keyframe_2_01-30-25.jpg` - 第 2 项，时间 01:30:25

### 技术实现

使用 HTML5 Canvas API：
```typescript
// 1. 解析时间字符串为秒数
const seconds = parseTimeToSeconds(item.keyframeTimes);

// 2. 定位视频到指定时间
video.currentTime = seconds;

// 3. 在 seeked 事件中截取当前帧
canvas.drawImage(video, 0, 0);

// 4. 转换为 JPEG 并下载
const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
```

---

## 🎬 视频片段截取功能

### 功能说明

- 基于 `duration` 字段，从视频开始（00:00）截取到指定时长
- 提供 FFmpeg 命令参考，方便使用专业工具处理

### 使用方法

1. 在结果表格的"视频片段"列，点击 **"截取片段"** 按钮
2. 弹窗显示建议的截取参数和 FFmpeg 命令
3. 复制命令，使用 FFmpeg 工具处理视频

### 为什么不直接在浏览器截取？

浏览器端视频截取存在以下限制：

1. **兼容性问题**
   - `HTMLMediaElement.captureStream()` 支持有限
   - Chrome 支持，但 Safari/Firefox 支持不完整

2. **性能问题**
   - 大视频文件处理慢，可能导致浏览器卡顿
   - 需要将整个视频加载到内存

3. **格式问题**
   - MediaRecorder 只能输出 WebM 格式
   - 不保留原视频编码格式

4. **精度问题**
   - 难以精确控制截取起止点
   - 可能丢失关键帧

### FFmpeg 命令示例

**基本截取：**
```bash
ffmpeg -i input.mp4 -ss 00:00 -to 00:15 -c copy output_1.mp4
```

**参数说明：**
- `-i input.mp4` - 输入文件
- `-ss 00:00` - 起始时间（从开始）
- `-to 00:15` - 结束时间（duration 值）
- `-c copy` - 直接复制流，不重新编码（速度快）
- `output_1.mp4` - 输出文件

**重新编码（更精确）：**
```bash
ffmpeg -i input.mp4 -ss 00:00 -to 00:15 -c:v libx264 -c:a aac output_1.mp4
```

**批量截取脚本：**
```bash
#!/bin/bash
# 根据分析结果批量截取片段

ffmpeg -i input.mp4 -ss 00:00 -to 00:15 -c copy segment_1.mp4
ffmpeg -i input.mp4 -ss 00:00 -to 00:30 -c copy segment_2.mp4
ffmpeg -i input.mp4 -ss 00:00 -to 00:45 -c copy segment_3.mp4
```

---

## 🔧 时间格式支持

### 支持的时间格式

1. **MM:SS** - 分:秒
   - 示例：`01:30` = 90 秒

2. **HH:MM:SS** - 时:分:秒
   - 示例：`01:30:45` = 5445 秒

3. **MM:SS:FF** - 分:秒:帧数（按 30fps 计算）
   - 示例：`01:30:15` = 90.5 秒（假设 FF=15，15/30=0.5秒）

### 解析逻辑

```typescript
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');

  if (parts.length === 2) {
    // MM:SS
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // 判断是 HH:MM:SS 还是 MM:SS:FF
    if (first < 60) {
      // MM:SS:FF (帧数格式)
      return minutes * 60 + seconds + frames / 30;
    } else {
      // HH:MM:SS
      return hours * 3600 + minutes * 60 + seconds;
    }
  }
}
```

---

## 🎨 UI 说明

### 表格列顺序

| 序号 | 景别 | 运镜方式 | 画面内容 | 画面文案 | 口播 | 音效/音乐 | 时长 | **视频片段** | 关键帧 | **关键帧截图** |
|------|------|----------|----------|----------|------|-----------|------|------------|--------|-------------|

### 按钮状态

**截取截图按钮：**
- ✅ 正常：蓝色边框，悬停高亮
- ⏳ 截图中：灰色，显示"截图中..."
- ❌ 禁用：视频未加载时灰色不可点击

**截取片段按钮：**
- ✅ 正常：蓝色边框，悬停高亮
- ❌ 禁用：视频未加载时灰色不可点击

### 样式定义

```css
.btn-capture {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-capture:hover:not(:disabled) {
  border-color: #2563eb;
  color: #2563eb;
}
```

---

## 🐛 常见问题

### 1. 点击"截取截图"没有反应

**可能原因：**
- 视频尚未完全加载
- 浏览器不支持 Canvas API

**解决方案：**
- 等待视频加载完成（检查视频预览是否正常）
- 使用现代浏览器（Chrome、Edge、Firefox）

---

### 2. 截图时间不准确

**可能原因：**
- AI 分析的 `keyframeTimes` 格式不标准
- 视频关键帧位置与实际时间有偏差

**解决方案：**
- 检查 AI 返回的时间格式是否正确
- 视频本身的关键帧间隔可能影响定位精度

---

### 3. 截图质量较低

**原因：**
- 当前设置为 JPEG 80% 质量，平衡文件大小和质量

**调整方法：**

修改 `videoCapture.ts`：
```typescript
// 从 0.8 调整为 0.95（更高质量，更大文件）
const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
```

或改为 PNG 格式（无损）：
```typescript
const imageDataUrl = canvas.toDataURL('image/png');
```

---

### 4. 为什么不支持浏览器内视频截取？

请参考上文"视频片段截取功能 - 为什么不直接在浏览器截取"部分。

建议使用 FFmpeg 等专业工具，优势：
- ✅ 更快的处理速度
- ✅ 更高的精度
- ✅ 保留原始编码格式
- ✅ 支持批量处理

---

## 📚 相关文件

- `src/utils/videoCapture.ts` - 截图和时间解析工具函数
- `src/components/VideoAnalyzer.vue` - 主组件，包含截图按钮和处理逻辑
- `CAPTURE_FEATURE.md` - 本文档

---

## 🔮 未来增强

### 可能的改进方向

1. **批量截图**
   - 一键截取所有关键帧
   - 打包下载为 ZIP

2. **截图预览**
   - 在表格中直接显示缩略图
   - 点击放大查看

3. **浏览器内视频截取（实验性）**
   - 使用 FFmpeg.wasm
   - 支持多种输出格式
   - 进度条显示

4. **导出增强**
   - 导出为 HTML 报告，包含截图
   - 导出为 PDF，包含所有关键帧

---

**当前版本**：v1.0
**最后更新**：2025-11-22
