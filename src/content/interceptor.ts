// MAIN WORLD - Interceptor Script
(function() {
  console.log("[Quantum Mock] Interceptor injected into MAIN world.");

  (window as any).__quantumMockRules = [];
  (window as any).__quantumIsRecording = false;

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data.source !== 'quantum-mock-bridge') return;
    if (event.data.type === 'UPDATE_STATE') {
      (window as any).__quantumMockRules = event.data.rules;
      (window as any).__quantumIsRecording = event.data.isRecording;
    }
  });

  function matchUrl(pattern: string, url: string): boolean {
    try {
      const regexString = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp(regexString);
      return regex.test(url);
    } catch (e) {
      return false;
    }
  }

  function findMatchingRule(url: string, method: string) {
    return ((window as any).__quantumMockRules || []).find((rule: any) => {
      const methodMatch = rule.method === 'ANY' || rule.method === method.toUpperCase();
      const urlMatch = matchUrl(rule.urlPattern, url);
      return methodMatch && urlMatch;
    });
  }

  // ---- INTERCEPT FETCH ----
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = '';
    let method = 'GET';
    
    if (typeof input === 'string') url = input;
    else if (input instanceof URL) url = input.href;
    else if (input instanceof Request) {
      url = input.url;
      method = input.method;
    }
    
    if (init && init.method) method = init.method;

    const rule = findMatchingRule(url, method);

    if (rule) {
      window.postMessage({ source: 'quantum-mock-interceptor', type: 'REQUEST_INTERCEPTED', url, method, ruleId: rule.id }, '*');

      const activeResponse = rule.responses[rule.activeResponseIndex || 0] || rule.responses[0];

      if (activeResponse.delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, activeResponse.delayMs));
      }

      if (activeResponse.simulateNetworkError) {
        throw new TypeError('Failed to fetch (Simulated by Quantum Mock)');
      }

      const headers = new Headers(activeResponse.headers);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', activeResponse.responseType || 'application/json');
      }
      // CORS Mitigation
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Credentials', 'true');

      let responseBodyStr = activeResponse.body;

      const response = new Response(responseBodyStr, {
        status: activeResponse.status,
        statusText: 'Quantum Mocked',
        headers: headers
      });

      Object.defineProperty(response, 'url', { value: url });
      return response;
    }

    const response = await originalFetch(input, init);
    
    // Si no está mockeado y estamos grabando
    if ((window as any).__quantumIsRecording) {
      try {
        const clone = response.clone();
        const text = await clone.text();
        const headersMap: Record<string, string> = {};
        clone.headers.forEach((v, k) => headersMap[k] = v);
        
        const reqHeadersMap: Record<string, string> = {};
        if (init && init.headers) {
          const h = new Headers(init.headers);
          h.forEach((v, k) => reqHeadersMap[k] = v);
        } else if (input instanceof Request) {
          input.headers.forEach((v, k) => reqHeadersMap[k] = v);
        }
        
        let cookiesMap: Record<string, string> = {};
        try {
          if (document.cookie) {
            document.cookie.split(';').forEach(c => {
              const [k, v] = c.split('=');
              if (k && v) cookiesMap[k.trim()] = v.trim();
            });
          }
        } catch (e) {
          cookiesMap['_quantum_error'] = 'Security restriction prevented reading cookies';
        }
        
        let reqBody = '';
        if (init && init.body && typeof init.body === 'string') {
          reqBody = init.body;
        } else if (input instanceof Request) {
          try { reqBody = await input.clone().text(); } catch(e) {}
        }

        window.postMessage({
          source: 'quantum-mock-interceptor',
          type: 'RECORD_TRAFFIC',
          payload: { 
            url, 
            method, 
            status: clone.status, 
            headers: headersMap, 
            body: text,
            requestHeaders: reqHeadersMap,
            cookies: cookiesMap,
            requestBody: reqBody
          }
        }, '*');
      } catch (e) {
        // Ignorar si no se puede clonar o leer
      }
    }
    
    return response;
  };

  // ---- INTERCEPT XHR ----
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    (this as any)._quantumMethod = method;
    (this as any)._quantumUrl = url.toString();
    (this as any)._quantumReqHeaders = {};
    return originalXHROpen.apply(this, [method, url, ...args] as any);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
    if (!(this as any)._quantumReqHeaders) (this as any)._quantumReqHeaders = {};
    (this as any)._quantumReqHeaders[header.toLowerCase()] = value;
    return originalXHRSetRequestHeader.apply(this, [header, value]);
  };

  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    if (typeof body === 'string') (this as any)._quantumReqBody = body;
    const url = (this as any)._quantumUrl;
    const method = (this as any)._quantumMethod;
    const rule = findMatchingRule(url, method);
    
    if (rule) {
      window.postMessage({ source: 'quantum-mock-interceptor', type: 'REQUEST_INTERCEPTED', url, method, ruleId: rule.id }, '*');
      
      const activeResponse = rule.responses[rule.activeResponseIndex || 0] || rule.responses[0];

      setTimeout(() => {
        if (activeResponse.simulateNetworkError) {
          Object.defineProperties(this, {
            readyState: { get: () => 4 },
            status: { get: () => 0 },
            statusText: { get: () => '' },
          });
          this.dispatchEvent(new ProgressEvent('error'));
          this.dispatchEvent(new ProgressEvent('loadend'));
          if ((this as any).onerror) (this as any).onerror(new ProgressEvent('error'));
          return;
        }

        const responseHeaders = new Headers(activeResponse.headers);
        if (!responseHeaders.has('Content-Type')) {
          responseHeaders.set('Content-Type', activeResponse.responseType || 'application/json');
        }
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');
        
        let headerStr = '';
        responseHeaders.forEach((value, key) => {
          headerStr += `${key}: ${value}\r\n`;
        });

        let finalResponseStr = activeResponse.body;
        let finalResponse = finalResponseStr;
        
        if ((this as any).responseType === 'json') {
          try {
            finalResponse = JSON.parse(finalResponseStr);
          } catch (e) {
          }
        }

        Object.defineProperties(this, {
          readyState: { get: () => 4 },
          status: { get: () => activeResponse.status },
          statusText: { get: () => 'Quantum Mocked' },
          response: { get: () => finalResponse },
          responseText: { get: () => finalResponseStr },
          getAllResponseHeaders: { value: () => headerStr },
          getResponseHeader: { value: (key: string) => responseHeaders.get(key) }
        });
        
        // Disparar eventos nativos que escuchan las librerías modernas
        this.dispatchEvent(new Event('readystatechange'));
        this.dispatchEvent(new ProgressEvent('load'));
        this.dispatchEvent(new ProgressEvent('loadend'));
        
        // Por si acaso usan los callbacks antiguos
        if (this.onreadystatechange) this.onreadystatechange(new Event('readystatechange') as any);
        if (this.onload) this.onload(new ProgressEvent('load') as any);
        
      }, activeResponse.delayMs || 0);
      
      return;
    }
    
    if ((window as any).__quantumIsRecording) {
      this.addEventListener('load', function() {
        try {
          const headersStr = this.getAllResponseHeaders();
          const headersArr = headersStr.trim().split(/[\r\n]+/);
          const headersMap: Record<string, string> = {};
          headersArr.forEach(line => {
            const parts = line.split(': ');
            const header = parts.shift();
            const value = parts.join(': ');
            if (header) headersMap[header] = value;
          });
          
          let bodyText = '';
          if (this.responseType === '' || this.responseType === 'text') {
            bodyText = this.responseText;
          } else if (this.responseType === 'json') {
            bodyText = JSON.stringify(this.response);
          }

          let cookiesMap: Record<string, string> = {};
          try {
            if (document.cookie) {
              document.cookie.split(';').forEach(c => {
                const [k, v] = c.split('=');
                if (k && v) cookiesMap[k.trim()] = v.trim();
              });
            }
          } catch (e) {
            cookiesMap['_quantum_error'] = 'Security restriction prevented reading cookies';
          }

          window.postMessage({
            source: 'quantum-mock-interceptor',
            type: 'RECORD_TRAFFIC',
            payload: {
              url: (this as any)._quantumUrl,
              method: (this as any)._quantumMethod,
              status: this.status,
              headers: headersMap,
              body: bodyText || '',
              requestHeaders: (this as any)._quantumReqHeaders || {},
              cookies: cookiesMap,
              requestBody: (this as any)._quantumReqBody || ''
            }
          }, '*');
        } catch (e) { }
      });
    }

    return originalXHRSend.apply(this, [body as any]);
  };
})();
