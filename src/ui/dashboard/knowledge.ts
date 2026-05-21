import { ref } from 'vue';

export type KnowledgeEntry = { title: string; desc: string; category?: string; mdnLink?: string };

export const activeDictionary = ref<Record<string, KnowledgeEntry>>({});
export const isDictionaryLoading = ref(false);

// Load dynamic standard dictionary JSON via Lazy Loading
export const loadHttpDictionary = async () => {
  if (Object.keys(activeDictionary.value).length > 0) return; // already loaded
  
  isDictionaryLoading.value = true;
  try {
    const module = await import('../../assets/http-dictionary.json');
    const staticDict = module.default as Record<string, KnowledgeEntry>;
    
    // Merge with custom overrides
    const data = await chrome.storage.local.get('customDictionary');
    const customDict = (data.customDictionary || {}) as Record<string, KnowledgeEntry>;
    
    activeDictionary.value = { ...staticDict, ...customDict };
  } catch (err) {
    console.error("Failed to lazy load HTTP dictionary:", err);
  } finally {
    isDictionaryLoading.value = false;
  }
};

// Add a custom entry and persist it
export const addCustomEntry = async (key: string, title: string, desc: string) => {
  const lowerKey = key.toLowerCase();
  
  const data = await chrome.storage.local.get('customDictionary');
  const customDict = (data.customDictionary || {}) as Record<string, KnowledgeEntry>;
  
  customDict[lowerKey] = { title, desc, category: 'Custom' };
  await chrome.storage.local.set({ customDictionary: customDict });
  
  activeDictionary.value = { ...activeDictionary.value, [lowerKey]: { title, desc, category: 'Custom' } };
};
