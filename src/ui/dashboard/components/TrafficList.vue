<template>
  <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar relative h-full" v-bind="containerProps">
    <div v-if="flatItems.length === 0" class="text-sm text-gray-500 text-center py-8 border border-dashed border-gray-800 rounded">
      No rules yet. Create one or start recording.
    </div>
    
    <div v-else v-bind="wrapperProps" class="w-full">
      <div v-for="{ index, data } in list" :key="index" class="w-full">
        
        <!-- Method Header -->
        <div v-if="data.type === 'method'" class="mb-2 mt-4 first:mt-0">
          <h3 class="text-base font-bold tracking-widest bg-cyber-bg/95 backdrop-blur py-2 z-10" :class="getMethodTextColor(data.method)">
            {{ data.method }} ({{ data.count }})
          </h3>
        </div>

        <!-- Path Header -->
        <div v-else-if="data.type === 'path'" class="border-l-2 border-gray-700 pl-3 ml-1 mt-2">
          <div class="text-sm text-gray-300 font-bold font-mono mb-2 truncate bg-gray-900/50 py-1 px-2 rounded w-fit" :title="data.path">{{ data.path }}/*</div>
        </div>

        <!-- Rule Item -->
        <div v-else-if="data.type === 'rule'" class="border-l-2 border-gray-700 pl-3 ml-1 mb-2">
          <div @click="$emit('select-rule', data.rule)"
               class="p-3 rounded bg-cyber-panel border cursor-pointer transition flex items-start gap-3 hover:bg-gray-800"
               :class="selectedRule?.id === data.rule.id ? 'border-cyber-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'border-gray-700'">
            
            <input type="checkbox" :value="data.rule.id" :checked="selectedIds.includes(data.rule.id)" 
                   @change="toggleSelect(data.rule.id)" @click.stop class="accent-red-500 w-5 h-5 mt-1 cursor-pointer">

            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center mb-1">
                <span class="font-mono text-base font-bold truncate flex items-center gap-2" :class="data.rule.active ? 'text-cyber-cyan' : 'text-gray-500'">
                  {{ data.rule.name }}
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)] bg-cyber-cyan text-black leading-none" title="Times intercepted">
                    {{ data.rule.interceptCount || 0 }}
                  </span>
                </span>
                
                <label class="relative inline-flex items-center cursor-pointer ml-2" @click.stop>
                  <input type="checkbox" v-model="data.rule.active" @change="$emit('save-rule', data.rule)" class="sr-only peer">
                  <div class="w-10 h-5 bg-gray-800 border-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-500 peer-checked:after:bg-cyber-cyan after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-cyan/20 peer-checked:border-cyber-cyan border peer-checked:shadow-[0_0_8px_rgba(0,240,255,0.5)]"></div>
                </label>
              </div>
              
              <div class="text-sm text-gray-400 truncate flex items-center gap-1">
                <span class="truncate" :title="data.rule.urlPattern">{{ data.rule.urlPattern.replace(data.path, '') || '/' }}</span>
              </div>
              
              <div class="mt-2 flex gap-2">
                <span v-if="data.rule.responses.length > 1" class="text-xs text-cyber-cyan font-bold border border-cyber-cyan/50 px-2 py-0.5 rounded bg-cyber-cyan/10">State {{ (data.rule.activeResponseIndex || 0) + 1 }}/{{data.rule.responses.length}}</span>
                <span v-if="data.rule.responses[data.rule.activeResponseIndex || 0]?.simulateNetworkError" class="text-xs text-cyber-magenta font-bold border border-cyber-magenta/50 px-2 py-0.5 rounded bg-cyber-magenta/10">ERR</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useVirtualList } from '@vueuse/core';
import type { MockRule } from '../../../schema/mockRule';

const props = defineProps<{
  rules: MockRule[],
  selectedRule: MockRule | null,
  selectedIds: string[]
}>();

const emit = defineEmits(['select-rule', 'save-rule', 'update:selectedIds']);

const toggleSelect = (id: string) => {
  const newIds = [...props.selectedIds];
  const idx = newIds.indexOf(id);
  if (idx > -1) newIds.splice(idx, 1);
  else newIds.push(id);
  emit('update:selectedIds', newIds);
};

// Flatten rules into a 1D array for virtualization
const flatItems = computed(() => {
  const items: any[] = [];
  const groups: Record<string, Record<string, MockRule[]>> = {};
  const order = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'ANY'];
  
  for (const rule of props.rules) {
    if (!groups[rule.method]) groups[rule.method] = {};
    
    let rawUrl = rule.urlPattern?.trim() || '';
    let basePath = rawUrl.split('?')[0];
    
    if (basePath !== '*' && basePath !== '.*' && basePath !== '') {
      try {
        if (basePath.startsWith('http')) {
          const u = new URL(basePath);
          const parts = u.pathname.split('/').filter(Boolean);
          const groupSegments = parts.slice(0, 2);
          basePath = u.origin + (groupSegments.length ? '/' + groupSegments.join('/') : '');
        } else {
          const parts = basePath.split('/').filter(Boolean);
          const groupSegments = parts.slice(0, 2);
          basePath = groupSegments.length ? '/' + groupSegments.join('/') : basePath;
        }
      } catch(e) {
        const parts = basePath.split('/');
        basePath = parts.slice(0, 3).join('/');
      }
    }
    
    if (!groups[rule.method][basePath]) groups[rule.method][basePath] = [];
    groups[rule.method][basePath].push(rule);
  }
  
  order.forEach(method => {
    if (groups[method]) {
      const paths = groups[method];
      items.push({ type: 'method', method, count: Object.values(paths).flat().length, size: 50 });
      for (const [path, groupRules] of Object.entries(paths)) {
        items.push({ type: 'path', path, size: 40 });
        for (const rule of groupRules) {
          items.push({ type: 'rule', rule, path, size: 120 });
        }
      }
    }
  });
  
  return items;
});

const { list, containerProps, wrapperProps } = useVirtualList(
  flatItems,
  {
    itemHeight: (idx) => flatItems.value[idx].size,
    overscan: 10
  }
);

const getMethodTextColor = (method: string) => {
  switch(method) {
    case 'GET': return 'text-blue-400';
    case 'POST': return 'text-green-400';
    case 'PUT': return 'text-yellow-400';
    case 'PATCH': return 'text-orange-400';
    case 'DELETE': return 'text-red-400';
    case 'ANY': return 'text-purple-400';
    default: return 'text-gray-400';
  }
};
</script>
