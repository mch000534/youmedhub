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
  border: 1px solid var(--color-border);
  cursor: zoom-in;
  transition: all 0.2s;
  background: var(--color-bg-hover);
}

.preview-image:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px oklch(62% 0.22 var(--primary-hue) / 0.2);
}

.btn-capture {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--card-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-capture:hover:not(:disabled) {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-capture:disabled {
  background: var(--color-bg-hover);
  color: var(--text-tertiary);
  cursor: not-allowed;
  border-color: var(--color-border);
}
</style>