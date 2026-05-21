<template>
  <div class="font-mono text-xs leading-relaxed">
    <div v-if="isObject || isArray" class="relative">
      <div class="flex items-center gap-1 group">
        <button @click="collapsed = !collapsed" class="text-gray-500 hover:text-cyber-cyan w-4 h-4 flex items-center justify-center rounded border border-transparent hover:border-cyber-cyan/50 transition">
          {{ collapsed ? '▶' : '▼' }}
        </button>
        <span class="text-gray-400 font-bold">{{ isArray ? '[' : '{' }}</span>
        <span v-show="collapsed" class="text-gray-500 text-[10px] mx-1 bg-gray-800 px-1 rounded cursor-pointer" @click="collapsed = false">
          {{ objectKeys.length }} items
        </span>
        <span v-show="collapsed" class="text-gray-400 font-bold">{{ isArray ? ']' : '}' }}</span>
      </div>
      
      <div v-show="!collapsed" class="pl-4 ml-2 my-0.5 border-l border-gray-800">
        <div v-for="(key, index) in objectKeys" :key="key" class="flex flex-wrap items-start">
          <span v-if="!isArray" class="text-cyber-cyan mr-1">"{{ key }}":</span>
          <JsonViewer :data="data[key]" />
          <span v-if="index < objectKeys.length - 1" class="text-gray-500">,</span>
        </div>
      </div>
      
      <span v-show="!collapsed" class="text-gray-400 font-bold ml-1">{{ isArray ? ']' : '}' }}</span>
    </div>
    <span v-else :class="valueClass" class="break-all whitespace-pre-wrap">{{ formattedValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{ data: any }>();
const collapsed = ref(false);

const isObject = computed(() => props.data !== null && typeof props.data === 'object' && !Array.isArray(props.data));
const isArray = computed(() => Array.isArray(props.data));

const objectKeys = computed(() => {
  if (isObject.value || isArray.value) {
    return Object.keys(props.data);
  }
  return [];
});

const formattedValue = computed(() => {
  if (typeof props.data === 'string') return `"${props.data}"`;
  if (props.data === null) return 'null';
  return String(props.data);
});

const valueClass = computed(() => {
  if (typeof props.data === 'string') return 'text-green-400';
  if (typeof props.data === 'number') return 'text-orange-400';
  if (typeof props.data === 'boolean') return 'text-purple-400';
  if (props.data === null) return 'text-gray-500 font-bold';
  return 'text-gray-300';
});
</script>
<script lang="ts">
export default { name: 'JsonViewer' }
</script>
