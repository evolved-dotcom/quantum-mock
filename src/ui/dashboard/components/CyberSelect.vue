<template>
  <div class="relative" ref="container">
    <div 
      class="w-full bg-black/80 border rounded p-2 text-sm focus:outline-none flex justify-between items-center cursor-pointer transition-colors shadow-inner"
      :class="[disabled ? 'opacity-30 cursor-not-allowed border-gray-700' : 'hover:border-cyber-cyan', open ? 'border-cyber-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'border-gray-700']"
      @click="!disabled && (open = !open)"
    >
      <span class="text-gray-300 font-bold" :class="colorClass">{{ modelValue }}</span>
      <span class="text-gray-500 text-[10px] transition-transform duration-300" :class="open ? 'rotate-180' : ''">▼</span>
    </div>
    
    <div v-if="open" class="absolute z-50 w-full mt-1 bg-gray-900 border border-cyber-cyan rounded shadow-[0_5px_20px_rgba(0,240,255,0.15)] max-h-48 overflow-y-auto custom-scrollbar">
      <div 
        v-for="opt in options" :key="opt"
        @click="select(opt)"
        class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-800 transition"
        :class="modelValue === opt ? 'bg-cyber-cyan/10 border-l-2 border-cyber-cyan text-cyber-cyan font-bold pl-2' : 'border-l-2 border-transparent text-gray-300 pl-3'"
      >
        {{ opt }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ modelValue: string, options: string[], disabled?: boolean, colorClass?: string }>();
const emit = defineEmits(['update:modelValue']);

const open = ref(false);
const container = ref<HTMLElement | null>(null);

const select = (val: string) => {
  emit('update:modelValue', val);
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
