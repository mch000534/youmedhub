// 本機檔案處理模組（不再使用 OSS）

// 上传进度回调函数
export type UploadProgressCallback = (loaded: number, total: number) => void;

// 將檔案讀取為 base64 字串
export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data URL 前綴，只保留 base64 部分
      const base64 = result.split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('無法讀取檔案為 base64'));
      }
    };

    reader.onerror = () => {
      reject(new Error('讀取檔案失敗'));
    };

    reader.readAsDataURL(file);
  });
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 验证文件类型和大小
export function validateVideoFile(file: File): { isValid: boolean; error?: string } {
  // 检查文件类型
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: '不支援的檔案格式。請使用 MP4、WebM、MOV、AVI 或 MKV 格式的視頻檔案。'
    };
  }

  // 检查文件大小 (20MB 限制，因為使用 base64 傳輸)
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `檔案過大（${formatFileSize(file.size)}），請選擇小於 20MB 的視頻檔案。`
    };
  }

  // 检查文件是否为空
  if (file.size === 0) {
    return {
      isValid: false,
      error: '檔案為空，請選擇有效的視頻檔案。'
    };
  }

  return { isValid: true };
}