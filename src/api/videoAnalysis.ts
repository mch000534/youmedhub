import type { VideoAnalysisResponse, TokenUsage } from '../types/video';
import { validateVideoFile } from './temporaryFile';
import { extractFramesFromVideoFile } from '../utils/videoCapture';
import { VIDEO_ANALYSIS_PROMPT } from '../prompts/videoAnalysis';

// 导出提示词供组件使用
export { VIDEO_ANALYSIS_PROMPT };

// OpenRouter 支援的視覺模型
export const AI_MODELS = [
  { id: 'qwen/qwen-vl-max', name: 'Qwen VL Max', description: '旗艦版' },
  { id: 'qwen/qwen-vl-plus', name: 'Qwen VL Plus', description: '推薦' },
  { id: 'qwen/qwen-2.5-vl-72b-instruct', name: 'Qwen 2.5 VL 72B', description: '高精確度' },
  { id: 'qwen/qwen-2.5-vl-32b-instruct', name: 'Qwen 2.5 VL 32B', description: '平衡' },
  { id: 'qwen/qwen-2.5-vl-7b-instruct:free', name: 'Qwen 2.5 VL 7B', description: '免費' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', description: 'Google' },
] as const;

export type AIModel = typeof AI_MODELS[number]['id'];

// 預設模型
export const DEFAULT_MODEL: AIModel = 'qwen/qwen-vl-plus';

// 流式输出回调类型
export type StreamCallback = (chunk: string) => void;

// Token 使用回调类型
export type TokenUsageCallback = (usage: TokenUsage) => void;

// 解析 Markdown 表格转换为 JSON
function parseMarkdownTable(markdown: string): VideoAnalysisResponse {
  const lines = markdown.trim().split('\n');
  const rep: VideoAnalysisResponse['rep'] = [];

  // 找到表格开始位置（包含表头的行）
  // 兼容两种表头格式：'运镜方式' 或 '运镜'
  let tableStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 兼容多种表头格式：完整格式或截断格式（如 '号', '别', '镜'）
    const isSeq = line.includes('序号') || line.includes('号');
    const isShot = line.includes('景别') || line.includes('别');
    const isMov = line.includes('运镜') || line.includes('镜');

    if (line && isSeq && isShot && isMov) {
      tableStartIndex = i;
      break;
    }
  }

  if (tableStartIndex === -1) {
    if (tableStartIndex === -1) {
      throw new Error('未找到有效的 Markdown 表格。請檢查 AI 返回的內容格式。\n(已在控制台輸出原始內容)');
    }
  }

  // 跳过表头和分隔线，从数据行开始解析
  for (let i = tableStartIndex + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim() || !line.startsWith('|')) continue;

    // 分割单元格，去除首尾的 |
    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);

    // console.log(`[DEBUG] 第 ${i} 行，共 ${cells.length} 列:`, cells);

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
    } else {
      // console.warn(`[DEBUG] 第 ${i} 行列数不足（${cells.length} < 10），跳过`);
    }
  }

  if (rep.length === 0) {
    throw new Error('未能解析出有效的数据行');
  }

  return { rep };
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
    return '视频文件过大，请使用小于 20MB 的视频';
  }
  if (message.includes('AuthenticationNotPass') || message.includes('invalid_api_key')) {
    return 'API Key 验证失败，请检查 OpenRouter API Key 是否正确';
  }
  if (message.includes('Throttling') || message.includes('rate_limit')) {
    return 'API 请求频率过高，请稍后重试';
  }

  return message || 'API 请求失败，请重试';
}

// 使用帧序列分析视频（OpenRouter API）
async function analyzeVideoWithFrames(
  frames: string[],
  apiKey: string,
  model: AIModel,
  prompt: string,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback
): Promise<VideoAnalysisResponse> {
  onProgress?.('正在調用 AI 分析视频帧...');

  // 构造消息内容
  const content: any[] = frames.map(frame => ({
    type: 'image_url',
    image_url: {
      url: frame,
    },
  }));

  // 添加提示词
  content.push({
    type: 'text',
    text: prompt,
  });

  // OpenRouter API 端點
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'YouMedHub Video Analyzer',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status !== 500) {
      console.error('[API Error]', response.status, errorBody);
    }
    let data;
    try {
      data = JSON.parse(errorBody);
    } catch {
      throw new Error(`API 請求失敗 (${response.status}): ${errorBody}`);
    }
    throw new Error(parseErrorMessage(data));
  }

  onProgress?.('正在接收 AI 分析結果...');

  // 处理流式响应
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let chunkCount = 0;

  if (!reader) {
    throw new Error('无法读取响应流');
  }

  // console.log('[DEBUG] 开始处理流式响应...');

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // console.log(`[DEBUG] 流式响应结束，共接收 ${chunkCount} 个 chunks，总长度: ${fullContent.length}`);
        break;
      }

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
              chunkCount++;
              fullContent += content;
              // console.log(`[DEBUG] 接收第 ${chunkCount} 个 chunk，长度: ${content.length}，累计: ${fullContent.length}`);
              onStream?.(content); // 调用流式回调
            }

            // 最后一个 chunk 包含 usage 信息
            if (json.usage) {
              onTokenUsage?.(json.usage);
              // console.log('[DEBUG] Token 使用统计:', json.usage);
            }
          } catch (e) {
            // 忽略解析错误，继续处理下一行
            // console.warn('[DEBUG] 解析 SSE 数据失败:', e);
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

  onProgress?.('正在解析分析結果...');

  // console.log('[DEBUG] 完整的 Markdown 内容:', fullContent);

  // 将 Markdown 转换为 JSON
  return parseMarkdownTable(fullContent);
}

// 通过本機檔案分析视频（主要方法）
async function analyzeVideoByLocalFile(
  file: File,
  apiKey: string,
  model: AIModel,
  prompt: string,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback
): Promise<VideoAnalysisResponse> {
  // 验证文件
  const validation = validateVideoFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  onProgress?.('正在從視頻中提取關鍵幀...');

  try {
    // 提取关键帧（每秒1帧，最多20帧）
    const frames = await extractFramesFromVideoFile(file, 1.0, 20);

    if (frames.length === 0) {
      throw new Error('未能从视频中提取到有效帧');
    }

    onProgress?.(`已提取 ${frames.length} 幀，正在調用 AI 分析...`);

    // 使用帧序列进行分析
    return await analyzeVideoWithFrames(
      frames,
      apiKey,
      model,
      prompt,
      onProgress,
      onStream,
      onTokenUsage
    );

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`分析失敗: ${error.message}`);
    }
    throw new Error('視頻分析過程中發生未知錯誤');
  }
}

// 统一分析接口
export async function analyzeVideo(
  source: File | string,
  apiKey: string,
  model: AIModel = DEFAULT_MODEL,
  prompt: string = VIDEO_ANALYSIS_PROMPT,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback
): Promise<VideoAnalysisResponse> {
  if (typeof source === 'string') {
    // 如果是 URL，暫不支援（需要後端代理）
    throw new Error('目前只支援本機檔案分析，請上傳 MP4 檔案');
  } else {
    // 如果是文件，使用本機檔案分析
    return analyzeVideoByLocalFile(source, apiKey, model, prompt, onProgress, onStream, onTokenUsage);
  }
}
