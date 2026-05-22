import { db } from '../db/db';
import { MockRuleSchema } from '../schema/mockRule';

console.log("[Quantum Mock] Service Worker initialized.");

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

// Function to fetch active rules and state
async function getActiveState() {
  const result = await chrome.storage.local.get(['activeScenarioId', 'isRecording']);
  const scenarioId = result.activeScenarioId as string | null;
  const isRecording = !!result.isRecording;

  let rules = [];
  if (scenarioId) {
    const allInScenario = await db.mockRules.where('scenarioId').equals(scenarioId as string).toArray();
    rules = allInScenario.filter(r => r.active);
  } else {
    // If no scenario active, maybe grab global active rules (rules with no scenarioId)
    const all = await db.mockRules.toArray();
    rules = all.filter(r => r.active && !r.scenarioId);
  }
  
  // Sort by priority (higher first)
  rules = rules.sort((a, b) => b.priority - a.priority);
  return { rules, isRecording };
}

// Broadcast rules to all tabs
async function broadcastState() {
  const state = await getActiveState();
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_STATE', ...state }).catch(() => {});
    }
  }
}

// Listen to storage changes for ScenarioId or isRecording
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.activeScenarioId || changes.isRecording)) {
    broadcastState();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REQUEST_INITIAL_STATE') {
    getActiveState().then(state => sendResponse(state));
    return true; // Keep channel open for async response
  }
  if (message.type === 'RULES_UPDATED') {
    broadcastState(); // Triggered by Dashboard when it modifies Dexie
  }
  if (message.type === 'INCREMENT_INTERCEPT_COUNT') {
    const ruleId = message.ruleId;
    db.mockRules.get(ruleId).then(rule => {
      if (rule) {
        rule.interceptCount = (rule.interceptCount || 0) + 1;
        db.mockRules.put(rule).then(() => {
          broadcastState();
          chrome.runtime.sendMessage({ type: 'RULES_UPDATED' }).catch(() => {});
        });
      }
    });
  }
  if (message.type === 'RECORD_TRAFFIC') {
    const payload = message.payload;
    let urlObj;
    try { urlObj = new URL(payload.url); } catch(e) { urlObj = { pathname: payload.url }; }
    
    const newRule = {
      id: crypto.randomUUID(),
      name: `Shadow: ${payload.method} ${urlObj.pathname}`,
      active: true,
      urlPattern: payload.url, // save exact URL
      method: payload.method,
      scenarioId: null,
      priority: 1, // lowest priority for auto-generated
      activeResponseIndex: 0,
      responses: [{
        status: payload.status,
        responseType: payload.headers['content-type']?.split(';')[0] || 'application/json',
        headers: payload.headers,
        bodyType: 'static' as const,
        body: payload.body,
        delayMs: 0,
        simulateNetworkError: false
      }],
      capturedTraffic: {
        requestHeaders: payload.requestHeaders || {},
        responseHeaders: payload.headers || {},
        cookies: payload.cookies || {},
        requestBody: payload.requestBody || ''
      }
    };
    
    const parseResult = MockRuleSchema.safeParse(newRule);
    if (!parseResult.success) {
      console.error("[Quantum Mock] Invalid traffic payload blocked by Zod", parseResult.error);
      return;
    }

    const validNewRule = parseResult.data;
    
    const cleanUpAndSave = async () => {
      try {
        await db.transaction('rw', db.mockRules, async () => {
          const count = await db.mockRules.count();
          if (count >= 1000) {
            const excess = count - 999;
            const oldKeys = await db.mockRules.orderBy('id').limit(excess).primaryKeys();
            await db.mockRules.bulkDelete(oldKeys as string[]);
          }
          await db.mockRules.put(validNewRule);
        });
        broadcastState();
        chrome.runtime.sendMessage({ type: 'RULES_UPDATED' }).catch(() => {});
      } catch (e) {
        console.error("[Quantum Mock] Error saving shadow rule", e);
      }
    };

    cleanUpAndSave();
  }
});
