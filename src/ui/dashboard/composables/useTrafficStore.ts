import { ref, computed } from 'vue';
import { db } from '../../../db/db';
import type { MockRule } from '../../../schema/mockRule';

export function useTrafficStore() {
  const rules = ref<MockRule[]>([]);
  const selectedRule = ref<MockRule | null>(null);
  const selectedIds = ref<string[]>([]);
  const isSaving = ref(false);

  let loadTimeout: ReturnType<typeof setTimeout> | null = null;
  let isLoading = false;

  const loadRules = async (forceImmediate = false) => {
    if (!forceImmediate) {
      if (loadTimeout) clearTimeout(loadTimeout);
      return new Promise<void>((resolve) => {
        loadTimeout = setTimeout(async () => {
          await executeLoad();
          resolve();
        }, 150); // Debounce de 150ms
      });
    } else {
      await executeLoad();
    }
  };

  const executeLoad = async () => {
    if (isLoading) return;
    isLoading = true;
    try {
      const rawRules = await db.mockRules.toArray();
      const migratedRules: MockRule[] = [];
      
      for (const r of rawRules) {
        if (!r.responses && (r as any).response) {
          r.responses = [{
            ...((r as any).response),
            delayMs: (r as any).delayMs || 0,
            simulateNetworkError: (r as any).simulateNetworkError || false
          }];
          delete (r as any).response;
          delete (r as any).delayMs;
          delete (r as any).simulateNetworkError;
          r.activeResponseIndex = 0;
          await db.mockRules.put(r);
        }
        if (r.activeResponseIndex === undefined) {
          r.activeResponseIndex = 0;
        }
        migratedRules.push(r as MockRule);
      }
      
      rules.value = migratedRules;
    } finally {
      isLoading = false;
    }
  };

  const notifyBackground = () => {
    chrome.runtime.sendMessage({ type: 'RULES_UPDATED' }).catch(() => {});
  };

  const saveRule = async (rule: MockRule) => {
    await db.mockRules.put(JSON.parse(JSON.stringify(rule)));
    await loadRules();
    notifyBackground();
    
    isSaving.value = true;
    setTimeout(() => {
      isSaving.value = false;
    }, 1200);
  };

  const deleteSelected = async () => {
    if (selectedIds.value.length === 0) return;
    await db.mockRules.bulkDelete(selectedIds.value);
    
    if (selectedRule.value && selectedIds.value.includes(selectedRule.value.id)) {
      selectedRule.value = null;
    }
    
    selectedIds.value = [];
    await loadRules();
    notifyBackground();
  };

  const selectAll = () => {
    if (selectedIds.value.length === rules.value.length) {
      selectedIds.value = [];
    } else {
      selectedIds.value = rules.value.map(r => r.id);
    }
  };

  const createNewRule = () => {
    const newRule: MockRule = {
      id: crypto.randomUUID(),
      name: 'New Mock Rule',
      active: true,
      urlPattern: '*/api/test',
      method: 'GET',
      scenarioId: null,
      priority: 10,
      activeResponseIndex: 0,
      responses: [{
        status: 200,
        responseType: 'application/json',
        headers: {},
        body: '{\n  "message": "Hello from Quantum Mock!"\n}',
        delayMs: 0,
        simulateNetworkError: false
      }]
    };
    rules.value.unshift(newRule);
    selectedRule.value = newRule;
  };

  return {
    rules,
    selectedRule,
    selectedIds,
    isSaving,
    loadRules,
    saveRule,
    deleteSelected,
    selectAll,
    createNewRule,
    notifyBackground
  };
}
