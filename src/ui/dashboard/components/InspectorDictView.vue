<template>
  <div class="h-full flex flex-col font-mono text-sm overflow-hidden">
    <div class="flex justify-between items-center mb-4 pb-2 border-b border-gray-800 shrink-0">
      <h3 class="text-gray-400 uppercase tracking-widest text-xs font-bold">{{ title }}</h3>
      <span class="text-cyber-cyan bg-cyber-cyan/10 px-2 py-0.5 rounded text-[10px]">{{ Object.keys(data || {}).length }} items</span>
    </div>

    <div v-if="isDictionaryLoading" class="text-cyber-cyan text-xs text-center py-4 animate-pulse font-bold tracking-widest flex flex-col items-center gap-2">
      <span class="text-2xl">⏳</span>
      Cargando Base de Conocimiento...
    </div>
    <div v-else-if="!data || Object.keys(data).length === 0" class="text-gray-600 text-xs text-center py-8">
      No data captured.
    </div>
    <div v-else-if="data['_quantum_error']" class="text-cyber-magenta bg-cyber-magenta/10 border border-cyber-magenta/30 p-3 rounded text-xs flex items-center gap-2">
      <span class="text-lg">⚠️</span> 
      <div>
        <strong>Security Block:</strong>
        <p>{{ data['_quantum_error'] }}</p>
      </div>
    </div>
    <div v-else class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1 pb-4">
      <div v-for="(val, key) in data" :key="key" class="flex flex-col group p-1.5 hover:bg-gray-800/50 rounded transition">
        <div class="flex items-center gap-2 mb-1">
          <span 
            v-if="hasKnowledge(key)" 
            class="text-cyber-cyan font-bold border-b border-dashed border-cyber-cyan cursor-help"
            @mouseenter="showTooltip(key, $event)"
            @mouseleave="hideTooltip"
          >
            {{ key }}
          </span>
          <span v-else class="text-gray-300 font-bold">
            {{ key }}
          </span>
          
          <button v-if="!hasKnowledge(key)" @click="promptAddKnowledge(key)" class="opacity-0 group-hover:opacity-100 text-[10px] text-cyber-magenta hover:text-white bg-cyber-magenta/20 px-1.5 py-0.5 rounded transition">
            + Define
          </button>
        </div>
        <div class="text-gray-500 break-all text-xs pl-2 border-l border-gray-700">
          {{ val }}
        </div>
      </div>
    </div>
    
    <!-- Inline Add Definition Form -->
    <div v-if="definingKey" class="absolute bottom-4 left-4 right-4 bg-black/95 backdrop-blur-md border border-cyber-magenta shadow-[0_0_20px_rgba(255,0,60,0.3)] p-4 rounded-lg z-20">
      <h4 class="text-cyber-magenta font-bold mb-2 text-xs uppercase">Add Custom Definition: {{ definingKey }}</h4>
      <input v-model="newDefTitle" placeholder="Display Title (e.g. Auth Token)" class="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-white mb-2 focus:border-cyber-magenta outline-none">
      <textarea v-model="newDefDesc" placeholder="Description of what this header/cookie does..." class="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-gray-300 mb-3 h-16 resize-none focus:border-cyber-magenta outline-none custom-scrollbar"></textarea>
      <div class="flex justify-end gap-2">
        <button @click="definingKey = null" class="px-3 py-1 text-xs bg-gray-800 text-gray-400 hover:text-white rounded">Cancel</button>
        <button @click="saveDefinition" class="px-3 py-1 text-xs bg-cyber-magenta text-white font-bold rounded shadow-[0_0_10px_#FF003C]">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { activeDictionary, addCustomEntry, loadHttpDictionary, isDictionaryLoading } from '../knowledge';

onMounted(() => {
  loadHttpDictionary();
});

const props = defineProps<{
  data: Record<string, string>;
  title: string;
}>();

const emit = defineEmits(['show-tooltip', 'hide-tooltip']);

const hasKnowledge = (key: string) => {
  return !!activeDictionary.value[String(key).toLowerCase()];
};

const showTooltip = (key: string, event: MouseEvent) => {
  const entry = activeDictionary.value[String(key).toLowerCase()];
  if (entry) {
    emit('show-tooltip', { entry, event });
  }
};

const hideTooltip = () => {
  emit('hide-tooltip');
};

// Custom definition logic
const definingKey = ref<string | null>(null);
const newDefTitle = ref('');
const newDefDesc = ref('');

const promptAddKnowledge = (key: string) => {
  definingKey.value = String(key);
  newDefTitle.value = String(key);
  newDefDesc.value = '';
};

const saveDefinition = async () => {
  if (definingKey.value && newDefTitle.value && newDefDesc.value) {
    await addCustomEntry(definingKey.value, newDefTitle.value, newDefDesc.value);
    definingKey.value = null;
  }
};
</script>
