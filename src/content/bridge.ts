// ISOLATED WORLD - Content Script
console.log("[Quantum Mock] Content script loaded.");

function updateHUDStatus(rules: any[]) {
  const hasActiveRules = rules && rules.some((r: any) => r.active);
  const hudContainer = document.getElementById('quantum-mock-hud');
  if (hudContainer && hudContainer.shadowRoot) {
    const dot = hudContainer.shadowRoot.querySelector('.rec-dot') as HTMLElement;
    const statusText = hudContainer.shadowRoot.querySelector('.status-text') as HTMLElement;
    if (dot && statusText) {
      if (hasActiveRules) {
        dot.style.background = '#00F0FF';
        dot.style.boxShadow = '0 0 8px #00F0FF';
        statusText.textContent = 'Active';
        statusText.style.color = '#00F0FF';
      } else {
        dot.style.background = '#A0AEC0';
        dot.style.boxShadow = 'none';
        statusText.textContent = 'Standby';
        statusText.style.color = '#A0AEC0';
      }
    }
  }
}

// Relay messages from BACKGROUND to MAIN WORLD (Rules update)
try {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'UPDATE_STATE') {
      window.postMessage({ source: 'quantum-mock-bridge', type: 'UPDATE_STATE', rules: message.rules, isRecording: message.isRecording }, '*');
      updateHUDStatus(message.rules);
    }
  });
} catch (e) {
  // Ignore Extension context invalidated errors
}

// Relay messages from MAIN WORLD to BACKGROUND
window.addEventListener('message', (event) => {
  if (event.source !== window || event.data.source !== 'quantum-mock-interceptor') return;
  
  try {
    if (event.data.type === 'REQUEST_INTERCEPTED') {
      if (event.data.ruleId) {
        chrome.runtime.sendMessage({ type: 'INCREMENT_INTERCEPT_COUNT', ruleId: event.data.ruleId }).catch(() => {});
      }
    }
    
    if (event.data.type === 'RECORD_TRAFFIC') {
      chrome.runtime.sendMessage({ type: 'RECORD_TRAFFIC', payload: event.data.payload }).catch(() => {});
    }
  } catch (e) {
    // Ignore Extension context invalidated errors
  }
});

// Ask background for initial rules once loaded
try {
  chrome.runtime.sendMessage({ type: 'REQUEST_INITIAL_STATE' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response) {
      window.postMessage({ source: 'quantum-mock-bridge', type: 'UPDATE_STATE', rules: response.rules, isRecording: response.isRecording }, '*');
      setTimeout(() => {
        updateHUDStatus(response.rules);
      }, 100);
    }
  });
} catch (e) {
  // Ignore Extension context invalidated errors
}

// --- HUD SETUP ---
const hudContainer = document.createElement('div');
hudContainer.id = 'quantum-mock-hud';
hudContainer.style.position = 'fixed';
hudContainer.style.bottom = '20px';
hudContainer.style.right = '20px';
hudContainer.style.zIndex = '2147483647';
hudContainer.style.pointerEvents = 'none';

const shadowRoot = hudContainer.attachShadow({ mode: 'open' });

const style = document.createElement("style");
style.textContent = `
  .wrapper {
    background: rgba(5, 5, 5, 0.65);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 240, 255, 0.3);
    border-radius: 12px;
    padding: 6px 12px;
    color: #00F0FF;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 240, 255, 0.1) inset;
    pointer-events: none;
    box-sizing: border-box;
    display: inline-block;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .rec-dot {
    width: 6px;
    height: 6px;
    background: #A0AEC0;
    border-radius: 50%;
    flex-shrink: 0;
    transition: all 0.3s ease;
  }
  .status-text {
    color: #A0AEC0;
    transition: all 0.3s ease;
  }
`;
shadowRoot.appendChild(style);

const wrapper = document.createElement("div");
wrapper.className = "wrapper";
wrapper.innerHTML = `
  <div class="header">
    <span class="rec-dot"></span>
    <span>Quantum Mock: <span class="status-text">Standby</span></span>
  </div>
`;
shadowRoot.appendChild(wrapper);

(document.documentElement || document.body).appendChild(hudContainer);
