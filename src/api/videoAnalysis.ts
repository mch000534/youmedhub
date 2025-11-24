import type { VideoAnalysisResponse } from '../types/video';
import { uploadToTemporaryFile, validateVideoFile } from './temporaryFile';

// AI 模型类型
export type AIModel = 'qwen3-vl-flash' | 'qwen3-vl-plus';

// 流式输出回调类型
export type StreamCallback = (chunk: string) => void;

const ANALYSIS_PROMPT = `你是一个资深且专业的视频创作者,从业多年,不仅能够独立完成视频的脚本创作、视频拍摄、视频剪辑等工作,还能够很好的鉴赏、分析识别,准确的拆解一个视频的内容及要点内容。
根据提供给你的视频,对视频进行分析,并结构化的输出你从视频中分析出的内容。

输出要求:以 Markdown 表格格式输出
表格标题:序号、景别、运镜方式、画面内容、画面文案、口播、音效/音乐、开始时间、结束时间、时长

字段说明:
- 序号: 场景序号
- 景别: 镜头景别类型
- 运镜方式: 运镜方式是视频中运镜的方式，包括平移、旋转、缩放、上摇、跟焦等
- 画面内容: 画面中的内容描述，包括画面中的物体、人物、场景、行为、动作等
- 画面文案: 画面中显示的花字文案、介绍文案、标语口号等
- 口播/字幕: 口播是视频中人物的说话内容，字幕是视频中显示的文字内容
- 音效/音乐: 视频中背景音乐、环境音效、物品声音等音效
- 开始时间: 场景开始时间 (格式: MM:SS)
- 结束时间: 场景结束时间 (格式: MM:SS)
- 时长: 场景持续时间 (格式: MM:SS)

其他要求:脚本不要拆的太细，单个片段要考虑内容的完整性，如：多句口播内容描述的是相同内容则可以合并为一个片段，但是单个片段不要超过15秒。

请按照以下格式输出 Markdown 表格，不要包含其他文字说明:

| 序号 | 景别 | 运镜方式 | 画面内容 | 画面文案 | 口播 | 音效/音乐 | 开始时间 | 结束时间 | 时长 |
|------|------|----------|----------|----------|------|-----------|----------|----------|------|`;

// const ANALYSIS_PROMPT = `你是一个资深且专业的视频创作者,从业多年,不仅能够独立完成视频的脚本创作、视频拍摄、视频剪辑等工作,还能够很好的鉴赏、分析识别,准确的拆解一个视频的内容及要点内容。
// 根据提供给你的视频,对视频进行分析,并结构化的输出你从视频中分析出的内容。
// 输出要求:以 json 结构输出
// 表格标题:序号、景别、运镜方式、画面内容、画面文案、口播、音效/音乐、开始时间、结束时间、时长
// 口播定义:口播是视频中人物的说话内容。
// 运镜方式定义:运镜方式是视频中运镜的方式，包括平移、旋转、缩放、上摇、跟焦等。
// 音效/音乐定义:音效/音乐是视频中背景音乐、环境音效、物品声音等音效。
// 时长定义:时长是视频中每个画面或场景的持续时间，包括画面停留时间、画面切换时间、画面过渡时间等。
// 开始时间定义:开始时间是指视频中每个画面或场景的开始时间。
// 结束时间定义:结束时间是指视频中每个画面或场景的结束时间。
// 其他要求：脚本不要拆的太细，单个片段要考虑内容的完整性，如：多句口播内容描述的是相同内容则可以合并为一个片段，但是单个片段不要超过15秒。
// json格式字段对应:
// {
//   "rep": [
//     {
//       "sequenceNumber": 1,
//       "shotType": "",
//       "cameraMovement": "",
//       "visualContent": "",
//       "onScreenText": "",
//       "voiceover": "",
//       "audio": "",
//       "startTime": "MM:SS",
//       "endTime": "MM:SS",
//       "duration": "MM:SS",
//     }
//   ]
// }
// 字段说明:
// - sequenceNumber: 序号
// - shotType: 景别
// - cameraMovement: 运镜方式
// - visualContent: 画面内容
// - onScreenText: 画面文案
// - voiceover: 口播
// - audio: 音效/音乐
// - startTime: 开始时间
// - endTime: 结束时间
// - duration: 时长

// 请只返回JSON格式的结果，不要包含其他文字说明。`;

// 解析 Markdown 表格转换为 JSON
function parseMarkdownTable(markdown: string): VideoAnalysisResponse {
  const lines = markdown.trim().split('\n');
  const rep: VideoAnalysisResponse['rep'] = [];

  // 找到表格开始位置（包含表头的行）
  let tableStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.includes('序号') && line.includes('景别') && line.includes('运镜方式')) {
      tableStartIndex = i;
      break;
    }
  }

  if (tableStartIndex === -1) {
    throw new Error('未找到有效的 Markdown 表格');
  }

  // 跳过表头和分隔线，从数据行开始解析
  for (let i = tableStartIndex + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim() || !line.startsWith('|')) continue;

    // 分割单元格，去除首尾的 |
    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);

    if (cells.length >= 10) {
      rep.push({
        sequenceNumber: parseInt(cells[0] || '0') || 0,
        shotType: cells[1] || '',
        cameraMovement: cells[2] || '',
        visualContent: cells[3] || '',
        onScreenText: cells[4] || '',
        voiceover: cells[5] || '',
        audio: cells[6] || '',
        startTime: cells[7] || '',
        endTime: cells[8] || '',
        duration: cells[9] || '',
      });
    }
  }

  if (rep.length === 0) {
    throw new Error('未能解析出有效的数据行');
  }

  return { rep };
}

// 解析 API 返回的 JSON 内容
function parseAnalysisResult(content: string): VideoAnalysisResponse {
  // 尝试从返回内容中提取 JSON
  let jsonContent = content;

  // 如果返回内容包含 markdown 代码块，提取其中的 JSON
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch && jsonMatch[1]) {
    jsonContent = jsonMatch[1].trim();
  }

  try {
    const result = JSON.parse(jsonContent) as VideoAnalysisResponse;
    return result;
  } catch {
    // 尝试直接查找 JSON 对象
    const jsonObjectMatch = content.match(/\{[\s\S]*"rep"[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]) as VideoAnalysisResponse;
    }
    throw new Error('无法解析 AI 返回的 JSON 格式');
  }
}

// 解析错误信息
function parseErrorMessage(error: any): string {
  const message = error?.error?.message || error?.message || '';

  if (message.includes('SafetyError') || message.includes('DataInspection')) {
    return '视频内容安全检查未通过，请尝试使用其他视频';
  }
  if (message.includes('InvalidParameter')) {
    return '参数无效，请检查视频格式是否支持（建议使用 MP4 格式）';
  }
  if (message.includes('TooLarge') || message.includes('size') || message.includes('Exceeded limit')) {
    return '视频文件过大，请使用小于 100MB 的视频或检查网络连接';
  }
  if (message.includes('AuthenticationNotPass')) {
    return 'API Key 验证失败，请检查 API Key 是否正确';
  }
  if (message.includes('Throttling')) {
    return 'API 请求频率过高，请稍后重试';
  }

  return message || 'API 请求失败，请重试';
}

// 使用视频 URL 分析（核心分析逻辑）
async function analyzeVideoByUrl(
  videoUrl: string,
  apiKey: string,
  model: AIModel,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback
): Promise<VideoAnalysisResponse> {
  onProgress?.('正在调用 AI 分析视频...');

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'video_url',
              video_url: {
                url: videoUrl,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      stream: true, // 启用流式输出
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(parseErrorMessage(data));
  }

  onProgress?.('正在接收 AI 分析结果...');

  // 处理流式响应
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  if (!reader) {
    throw new Error('无法读取响应流');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // 解码数据块
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        // SSE 格式: data: {...}
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // 移除 "data: " 前缀

          // 检查是否是结束信号
          if (data === '[DONE]') {
            continue;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;

            if (content) {
              fullContent += content;
              onStream?.(content); // 调用流式回调
            }
          } catch (e) {
            // 忽略解析错误，继续处理下一行
            console.warn('解析 SSE 数据失败:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!fullContent) {
    throw new Error('AI 返回内容为空');
  }

  onProgress?.('正在解析分析结果...');

  // 将 Markdown 转换为 JSON
  return parseMarkdownTable(fullContent);
}

// 通过临时文件服务分析视频（主要方法）
async function analyzeVideoByTemporaryFile(
  file: File,
  apiKey: string,
  model: AIModel,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback
): Promise<VideoAnalysisResponse> {
  // 验证文件
  const validation = validateVideoFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  onProgress?.('正在上传视频到临时文件服务...');

  try {
    // 上传到临时文件服务
    const uploadResult = await uploadToTemporaryFile(file);

    onProgress?.('视频上传成功，正在调用 AI 分析...');

    // 使用返回的链接进行分析
    return await analyzeVideoByUrl(uploadResult.downloadLink, apiKey, model, onProgress, onStream);

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`上传失败: ${error.message}`);
    }
    throw new Error('视频上传过程中发生未知错误');
  }
}

// 统一分析接口
export async function analyzeVideo(
  source: File | string,
  apiKey: string,
  model: AIModel = 'qwen3-vl-flash',
  onProgress?: (message: string) => void,
  onStream?: StreamCallback
): Promise<VideoAnalysisResponse> {
  if (typeof source === 'string') {
    // 如果是 URL，直接分析
    return analyzeVideoByUrl(source, apiKey, model, onProgress, onStream);
  } else {
    // 如果是文件，通过临时文件服务上传后分析
    return analyzeVideoByTemporaryFile(source, apiKey, model, onProgress, onStream);
  }
}
