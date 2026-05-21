import { db } from '../db/db';

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
    
    db.mockRules.toArray().then(async (allRules) => {
      // FIFO Garbage Collection
      if (allRules.length >= 1000) {
        const toDeleteCount = allRules.length - 999;
        const toDeleteIds = allRules.slice(0, toDeleteCount).map(r => r.id);
        await db.mockRules.bulkDelete(toDeleteIds);
      }
      
      db.mockRules.put(newRule).then(() => {
        broadcastState();
        chrome.runtime.sendMessage({ type: 'RULES_UPDATED' }).catch(() => {});
      });
    });
  }
});
