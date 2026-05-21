<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex justify-between items-center mb-4 pb-2 border-b border-gray-800 shrink-0">
      <h3 class="text-gray-400 uppercase tracking-widest text-xs font-bold">{{ title }}</h3>
      <button v-if="parsedJson" @click="viewMode = !viewMode" class="text-[10px] px-2 py-1 rounded border transition" :class="viewMode ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-[0_0_10px_rgba(0,240,255,0.4)]' : 'bg-black text-gray-400 border-gray-700 hover:text-white'">
        {{ viewMode ? 'JSON Viewer' : 'Raw Text' }}
      </button>
    </div>

    <div v-if="!body" class="text-gray-600 text-xs text-center py-8">
      No payload body.
    </div>
    <div v-else-if="viewMode && parsedJson" class="flex-1 overflow-auto bg-black/50 border border-gray-800 rounded p-4 custom-scrollbar">
       <JsonViewer :data="parsedJson" />
    </div>
    <textarea v-else readonly :value="body" class="flex-1 w-full bg-black/30 border border-gray-800 rounded p-3 text-xs font-mono text-gray-400 focus:outline-none resize-none custom-scrollbar"></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import JsonViewer from './JsonViewer.vue';

const props = defineProps<{
  body?: string;
  title: string;
}>();

const viewMode = ref(true);

const parsedJson = computed(() => {
  if (!props.body) return null;
  try {
    return JSON.parse(props.body);
  } catch {
    return null;
  }
});
</script>
