<div align="center">
  <img src="public/icon-128.png" alt="Quantum Mock Logo" width="128" />
  <h1>⚡ Quantum Mock</h1>
  <p><strong>A Cyberpunk-themed Chrome Extension for Advanced Network Interception & API Mocking</strong></p>

  <p>
    <img alt="Vue.js" src="https://img.shields.io/badge/Vue.js-35495E?style=flat&logo=vuedotjs&logoColor=4FC08D">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white">
    <img alt="Vite" src="https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E">
    <img alt="TailwindCSS" src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white">
    <img alt="Chrome Extension V3" src="https://img.shields.io/badge/Manifest-V3-4285F4?style=flat&logo=googlechrome&logoColor=white">
  </p>
</div>

<br />

**Quantum Mock** is an advanced developer tool designed to run completely inside the browser as a Chrome Extension. It seamlessly intercepts outgoing network traffic (`fetch` and `XMLHttpRequest`) and replaces the responses with your own mocked data in real-time. 

With a premium **Cyberpunk / Glassmorphism UI**, managing complex API scenarios has never looked so good or felt so fast.

---

## ✨ Key Features

- 🛸 **Network Interception Engine:** Injects safely into the `MAIN` world to intercept and replace API responses before the host application even notices. Supports both `fetch` and `XHR`.
- 🗄️ **Persistent Mocks (IndexedDB):** All rules and traffic data are saved locally using Dexie.js. Your mocks survive browser restarts and page reloads.
- 🎨 **Master-Detail Cyberpunk UI:** A highly optimized Vue 3 Side Panel using dynamic components to manage hundreds of mocks without DOM bloat.
- 📡 **Traffic Inspector:** Automatically captures and logs the payloads, request headers, response headers, and cookies of your mocked requests.
- ⏱️ **Network Simulations:** Add custom delays (Latency) or simulate catastrophic Network Errors (Failed to fetch) at the click of a button.
- 📚 **Knowledge Engine:** Automatically explains what each HTTP header does with localized, professional descriptions. Supports custom dynamic headers.
- 📊 **Real-time HUD & Analytics:** A non-intrusive Glassmorphism HUD injected into the active webpage to confirm active mocks, plus real-time intercept counters on your dashboard.

## 🚀 Installation (Developer Mode)

Since this extension intercepts network requests at the core level, it is designed for local development and testing.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/evolved-dotcom/quantum-mock.git
   cd quantum-mock
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```
   *This will generate the production-ready extension files inside the `dist` folder.*

4. **Load into Chrome:**
   - Open Google Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** using the toggle switch in the top right corner.
   - Click **Load unpacked** in the top left corner.
   - Select the `dist` folder located inside the `quantum-mock` directory.

## 🎯 Usage

1. **Open the Side Panel:** Click on the Quantum Mock extension icon in your toolbar, or open the Chrome Side Panel and select Quantum Mock from the dropdown.
2. **Create a Rule:** Click "New Rule". Define the HTTP Method and the URL Pattern (supports wildcards, e.g., `*/api/users*`).
3. **Set the Mock Data:** In the raw editor, write your custom JSON response. You can also specify the HTTP Status Code (e.g., 200, 404, 500).
4. **Activate & Test:** Ensure the rule is checked (Active). Refresh your target webpage and watch the extension intercept the request and return your mock!
5. **Inspect:** Once a request is caught, click on the rule to see the captured Original Payload, Headers, and Cookies.

## 🏗️ Architecture

Quantum Mock uses a robust 3-tier architecture to bypass Chrome Manifest V3 isolation restrictions:

1. **Main World (`interceptor.ts`):** Injected directly into the DOM to override `fetch` and `XMLHttpRequest`.
2. **Isolated World (`bridge.ts`):** Acts as a secure message relayer between the intercepted web page and the Extension's background service worker.
3. **Background & UI (`sw.ts` & `App.vue`):** Handles IndexedDB storage, Vue 3 rendering, and state broadcasting.

## 🛠️ Tech Stack

- **Vue 3 (Composition API)** + **Vite** for blazing fast UI development.
- **Tailwind CSS** for custom Cyberpunk/Neon styling and Glassmorphism effects.
- **Dexie.js** for robust IndexedDB interactions.
- **Zod** for strict runtime schema validations of intercepted data.
- **Chrome Extension Manifest V3** APIs (`chrome.storage`, `chrome.runtime`, `chrome.sidePanel`).

## 📜 License

MIT License. See `LICENSE` for more information.
