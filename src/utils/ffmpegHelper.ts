/**
 * FFmpeg.wasm 工具模块
 * 用于在浏览器中处理视频截取
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isLoaded = false;

// 加载 FFmpeg
export async function loadFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance;
  }

  ffmpegInstance = new FFmpeg();

  // 监听日志（可选，用于调试）
  ffmpegInstance.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  // 监听进度
  if (onProgress) {
    ffmpegInstance.on('progress', ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  // 加载 FFmpeg.wasm 核心文件
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  isLoaded = true;
  console.log('✅ FFmpeg 加载完成');
  return ffmpegInstance;
}

// 截取视频片段
export async function cutVideoSegment(
  videoFile: File,
  startTime: string,  // 格式: "00:00:00"
  duration: string,   // 格式: "00:00:15"
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg(onProgress);

  // 写入输入文件
  const inputFileName = 'input.mp4';
  const outputFileName = 'output.mp4';

  await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

  console.log(`📹 [FFmpeg] 开始截取视频: 起始=${startTime}, 时长=${duration}`);

  // 执行 FFmpeg 命令
  await ffmpeg.exec([
    '-i', inputFileName,
    '-ss', startTime,
    '-t', duration,
    '-c', 'copy',  // 直接复制流，不重新编码（快速）
    outputFileName
  ]);

  console.log('✅ [FFmpeg] 视频截取完成');

  // 读取输出文件
  const data = await ffmpeg.readFile(outputFileName);

  // 清理文件
  await ffmpeg.deleteFile(inputFileName);
  await ffmpeg.deleteFile(outputFileName);

  // 转换为 Blob
  // @ts-ignore - ffmpeg.readFile returns Uint8Array which is compatible with BlobPart in modern browsers
  return new Blob([data], { type: 'video/mp4' });
}

// 截取视频截图
export async function captureScreenshot(
  videoFile: File,
  time: string, // 格式: "00:00:05"
  onProgress?: (progress: number) => void
): Promise<string> {
  const ffmpeg = await loadFFmpeg(onProgress);

  // 写入输入文件
  const inputFileName = 'input_shot.mp4';
  const outputFileName = 'output_shot.jpg';

  await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

  console.log(`📸 [FFmpeg] 开始截图: 时间点=${time}`);

  // 执行 FFmpeg 命令
  // -ss time: 指定时间点
  // -vframes 1: 只截取一帧
  // -q:v 2: 图片质量 (2-31, 越小质量越高)
  await ffmpeg.exec([
    '-i', inputFileName,
    '-ss', time,
    '-vframes', '1',
    '-q:v', '2',
    outputFileName
  ]);

  console.log('✅ [FFmpeg] 截图完成');

  // 读取输出文件
  const data = await ffmpeg.readFile(outputFileName);
  
  // 清理文件
  await ffmpeg.deleteFile(inputFileName);
  await ffmpeg.deleteFile(outputFileName);

  // 转换为 Base64 URL
  // @ts-ignore
  const blob = new Blob([data], { type: 'image/jpeg' });
  return URL.createObjectURL(blob);
}

// 批量截取多个片段
export async function cutMultipleSegments(
  videoFile: File,
  segments: Array<{ start: string; duration: string; name: string }>,
  onProgress?: (current: number, total: number, segmentProgress: number) => void
): Promise<Array<{ name: string; blob: Blob }>> {
  const results: Array<{ name: string; blob: Blob }> = [];

  // 串行处理，但复用 FFmpeg 实例
  await loadFFmpeg();

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    // 这里的进度稍微有点问题，因为 cutVideoSegment 内部也会 loadFFmpeg，
    // 但由于有实例检查，应该很快。为了更好的体验，可以在这里手动控制 FFmpeg 流程优化，
    // 但简单起见，直接调用 cutVideoSegment 也是可行的。
    // 更好的做法可能是重构 cutVideoSegment 让其接受 ffmpeg 实例，
    // 但为了不破坏现有 API，我们保持现状，或者直接在这里实现核心逻辑。
    
    // 使用核心逻辑复用文件写入（优化点：如果支持大文件，写入一次多次处理）
    // 目前 FFmpeg.wasm 写入文件可能耗时，如果文件大，每次写入都不划算。
    // 优化方案：写入一次 input.mp4，然后多次执行 exec，最后删除。
    
    // 下面是优化后的批量处理逻辑：
    
    const ffmpeg = await loadFFmpeg();
    const inputFileName = 'batch_input.mp4';
    
    // 仅第一次写入文件
    if (i === 0) {
       onProgress?.(0, segments.length, 0); // 初始化进度
       console.log('📝 [FFmpeg] 批量处理：写入视频文件到内存...');
       await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));
    }

    const outputFileName = `output_${i}.mp4`;
    
    if (segment) {
      console.log(`📹 [FFmpeg] 批量截取片段 ${i+1}/${segments.length}: ${segment.start} + ${segment.duration}`);
      
      await ffmpeg.exec([
        '-i', inputFileName,
        '-ss', segment.start,
        '-t', segment.duration,
        '-c', 'copy',
        outputFileName
      ]);
      
      const data = await ffmpeg.readFile(outputFileName);
      await ffmpeg.deleteFile(outputFileName);
      
      results.push({
        name: segment.name,
        // @ts-ignore
        blob: new Blob([data], { type: 'video/mp4' })
      });
    }
    
    onProgress?.(i + 1, segments.length, 100);
    
    // 最后一次清理输入文件
    if (i === segments.length - 1) {
      await ffmpeg.deleteFile(inputFileName);
    }
  }

  return results;
}

// 批量截取截图
export async function captureMultipleScreenshots(
  videoFile: File,
  timestamps: Array<{ time: string; name: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ name: string; url: string }>> {
  const results: Array<{ name: string; url: string }> = [];
  const ffmpeg = await loadFFmpeg();
  const inputFileName = 'batch_shot_input.mp4';

  console.log('📝 [FFmpeg] 批量截图：写入视频文件到内存...');
  onProgress?.(0, timestamps.length);
  
  await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

  for (let i = 0; i < timestamps.length; i++) {
    const item = timestamps[i];
    const outputFileName = `shot_${i}.jpg`;

    if (item) {
      console.log(`📸 [FFmpeg] 批量截图 ${i+1}/${timestamps.length}: ${item.time}`);

      await ffmpeg.exec([
        '-i', inputFileName,
        '-ss', item.time,
        '-vframes', '1',
        '-q:v', '2',
        outputFileName
      ]);

      const data = await ffmpeg.readFile(outputFileName);
      await ffmpeg.deleteFile(outputFileName);

      // @ts-ignore
      const blob = new Blob([data], { type: 'image/jpeg' });
      results.push({
        name: item.name,
        url: URL.createObjectURL(blob)
      });
    }

    onProgress?.(i + 1, timestamps.length);
  }

  await ffmpeg.deleteFile(inputFileName);
  return results;
}

// 释放 FFmpeg 实例
export function unloadFFmpeg() {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
    isLoaded = false;
    console.log('🔄 FFmpeg 实例已释放');
  }
}
