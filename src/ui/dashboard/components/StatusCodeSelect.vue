<template>
  <div class="relative" ref="container">
    <div 
      class="w-full bg-black/80 border rounded p-2 text-sm focus:outline-none font-mono flex justify-between items-center cursor-pointer transition-colors shadow-inner"
      :class="[disabled ? 'opacity-30 cursor-not-allowed border-gray-700' : 'hover:border-cyber-cyan', open ? 'border-cyber-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'border-gray-700']"
      @click="!disabled && (open = !open)"
    >
      <span :class="getStatusColor(modelValue)" class="font-bold drop-shadow-md">{{ modelValue }} <span class="text-gray-400 font-normal ml-1">{{ getStatusText(modelValue) }}</span></span>
      <span class="text-gray-500 text-[10px] transition-transform duration-300" :class="open ? 'rotate-180' : ''">▼</span>
    </div>
    
    <div v-if="open" class="absolute z-50 w-full mt-1 bg-gray-900 border border-cyber-cyan rounded shadow-[0_5px_20px_rgba(0,240,255,0.15)] max-h-48 overflow-y-auto custom-scrollbar">
      <div v-for="group in groups" :key="group.label">
        <div class="px-2 py-1.5 text-[10px] text-cyber-cyan font-bold uppercase tracking-widest bg-black/90 sticky top-0 border-b border-gray-800 backdrop-blur z-10">{{ group.label }}</div>
        <div 
          v-for="opt in group.options" :key="opt.code"
          @click="select(opt.code)"
          class="px-3 py-1.5 text-sm font-mono cursor-pointer hover:bg-gray-800 flex gap-2 items-center transition"
          :class="modelValue === opt.code ? 'bg-cyber-cyan/10 border-l-2 border-cyber-cyan pl-2' : 'border-l-2 border-transparent pl-3'"
        >
          <span :class="getStatusColor(opt.code)" class="font-bold drop-shadow-md">{{ opt.code }}</span>
          <span class="text-gray-400">{{ opt.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ modelValue: number, disabled?: boolean }>();
const emit = defineEmits(['update:modelValue']);

const open = ref(false);
const container = ref<HTMLElement | null>(null);

const groups = [
  {
    label: '2xx Success',
    options: [
      { code: 200, text: 'OK' },
      { code: 201, text: 'Created' },
      { code: 204, text: 'No Content' }
    ]
  },
  {
    label: '4xx Client Error',
    options: [
      { code: 400, text: 'Bad Request' },
      { code: 401, text: 'Unauthorized' },
      { code: 403, text: 'Forbidden' },
      { code: 404, text: 'Not Found' },
      { code: 422, text: 'Unprocessable' }
    ]
  },
  {
    label: '5xx Server Error',
    options: [
      { code: 500, text: 'Server Error' },
      { code: 502, text: 'Bad Gateway' },
      { code: 503, text: 'Unavailable' },
      { code: 504, text: 'Gateway Timeout' }
    ]
  }
];

const getStatusText = (code: number) => {
  for (const g of groups) {
    const found = g.options.find(o => o.code === code);
    if (found) return found.text;
  }
  return 'Unknown';
};

const getStatusColor = (code: number) => {
  if (code >= 200 && code < 300) return 'text-green-400';
  if (code >= 400 && code < 500) return 'text-yellow-400';
  if (code >= 500) return 'text-red-500';
  return 'text-gray-400';
};

const select = (code: number) => {
  emit('update:modelValue', code);
  open.value = false;
};

const closeOnOutsideClick = (e: MouseEvent) => {
  if (container.value && !container.value.contains(e.target as Node)) {
    open.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeOnOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', closeOnOutsideClick);
});
</script>
