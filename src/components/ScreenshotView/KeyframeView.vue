<template>
  <div class="keyframe-view">
    <div v-if="imageUrl" class="image-container">
      <img
        :src="imageUrl"
        class="preview-image"
        :alt="`关键帧 ${sequenceNumber}`"
        @click="$emit('preview')"
      />
    </div>
    <button
      v-else
      @click="$emit('capture')"
      class="btn-capture"
      :disabled="isCapturing"
      :title="`截取 ${timeInfo} 的关键帧`"
    >
      {{ isCapturing ? '截图中...' : '截取截图' }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  sequenceNumber: number;
  imageUrl?: string;
  timeInfo: string;
  isCapturing: boolean;
}>();

defineEmits<{
  (e: 'capture'): void;
  (e: 'preview'): void;
}>();
</script>

<style scoped>
.keyframe-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.preview-image {
  width: 120px;
  height: 90px; /* 固定高度，或者使用 auto 保持比例 */
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  cursor: zoom-in;
  transition: all 0.2s;
  background: #f0f0f0;
}

.preview-image:hover {
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
}

.btn-capture {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-capture:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #2563eb;
  color: #2563eb;
}

.btn-capture:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
  border-color: #e5e7eb;
}
</style>