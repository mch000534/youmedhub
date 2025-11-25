<template>
  <MarkdownRenderComponent :content="props.content" />
</template>

<script setup lang="ts">
import MarkdownRenderComponent from 'vue-renderer-markdown'
import 'vue-renderer-markdown/index.css'

// Props
const props = defineProps<{
  content: string;
}>();
</script>

<style scoped>
/* 自定义 Markdown 样式覆盖 */
:deep(.markdown-render) {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text-primary);
}

/* 表格样式优化 */
:deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.85rem;
  box-shadow: var(--shadow-sm);
  border-radius: 6px;
  overflow: hidden;
}

:deep(table th),
:deep(table td) {
  border: 1px solid var(--color-border);
  padding: 0.6rem 0.75rem;
  text-align: left;
  vertical-align: top;
}

:deep(table th) {
  background-color: var(--color-bg-hover);
  font-weight: 600;
  color: var(--color-text-primary);
  position: sticky;
  top: 0;
  z-index: 10;
}

:deep(table tr:nth-child(even)) {
  background-color: var(--color-bg-hover);
}

:deep(table tr:hover) {
  background-color: var(--color-primary-subtle);
  transition: background-color 0.2s ease;
}

/* 代码块样式 */
:deep(pre) {
  background-color: var(--color-bg-hover);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1rem 0;
}

:deep(code) {
  background-color: var(--color-bg-hover);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
}

:deep(pre code) {
  background-color: transparent;
  padding: 0;
}

/* 标题样式 */
:deep(h1),
:deep(h2),
:deep(h3),
:deep(h4),
:deep(h5),
:deep(h6) {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

:deep(h1) { font-size: 1.5rem; }
:deep(h2) { font-size: 1.3rem; }
:deep(h3) { font-size: 1.1rem; }

/* 段落和列表 */
:deep(p) {
  margin-bottom: 1rem;
}

:deep(ul),
:deep(ol) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

:deep(li) {
  margin-bottom: 0.25rem;
}

/* 链接样式 */
:deep(a) {
  color: var(--color-primary);
  text-decoration: none;
}

:deep(a:hover) {
  text-decoration: underline;
}

/* 引用块 */
:deep(blockquote) {
  border-left: 4px solid var(--color-primary);
  padding-left: 1rem;
  margin-left: 0;
  color: var(--color-text-secondary);
  font-style: italic;
}

/* 水平线 */
:deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1.5rem 0;
}

/* 图片 */
:deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 1rem 0;
}
</style>
