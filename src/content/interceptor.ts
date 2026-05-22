// MAIN WORLD - Interceptor Script
(function() {
  console.log("[Quantum Mock] Interceptor injected into MAIN world.");

  window.__quantumMockRules = [];
  window.__quantumIsRecording = false;

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data.source !== 'quantum-mock-bridge') return;
    if (event.data.type === 'UPDATE_STATE') {
      window.__quantumMockRules = (event.data.rules || []).map((rule: any) => {
        try {
          const regexString = rule.urlPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
          rule.compiledRegex = new RegExp(regexString);
        } catch (e) {
          rule.compiledRegex = null;
        }
        return rule;
      });
      window.__quantumIsRecording = event.data.isRecording;
    }
  });

  function matchUrl(rule: any, url: string): boolean {
    if (rule.compiledRegex) {
      return rule.compiledRegex.test(url);
    }
    return false;
  }

  function findMatchingRule(url: string, method: string) {
    return (window.__quantumMockRules || []).find((rule: any) => {
      const methodMatch = rule.method === 'ANY' || rule.method === method.toUpperCase();
      const urlMatch = matchUrl(rule, url);
      return methodMatch && urlMatch;
    });
  }

  // ---- INTERCEPT FETCH ----
  const originalFetch = window.fetch;
  
  const quantumFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
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
    if (window.__quantumIsRecording) {
      try {
        const clone = response.clone();
        
        let text = "[Payload Binario, Streaming o Demasiado Grande]";
        const contentType = clone.headers.get('content-type') || '';
        const contentLengthStr = clone.headers.get('content-length');
        const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;
        
        // Bloquear Event Streams (SSE) porque await clone.text() colgaría la promesa infinitamente
        const isStreaming = contentType.includes('text/event-stream');
        const isText = (contentType.includes('application/json') || contentType.includes('text/')) && !isStreaming;
        
        let safeBody = "[Payload Binario, Streaming o Demasiado Grande]";
        
        if (isText && clone.body) {
          try {
            const reader = clone.body.getReader();
            const decoder = new TextDecoder();
            let totalRead = 0;
            let chunks = '';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              if (value) {
                totalRead += value.length;
                chunks += decoder.decode(value, { stream: true });
                
                if (totalRead > 1048576) {
                  reader.cancel();
                  chunks += "\n...[TRUNCATED BY QUANTUM: PAYLOAD CHUNKED TOO LARGE]";
                  break;
                }
              }
            }
            chunks += decoder.decode();
            safeBody = chunks;
          } catch (e) {
            safeBody = "[Error leyendo body stream]";
          }
        } else if (isText) {
          try { 
            const t = await clone.text(); 
            safeBody = t.length > 1048576 ? t.substring(0, 1048576) + "\n...[TRUNCATED BY QUANTUM: PAYLOAD CHUNKED TOO LARGE]" : t;
          } catch(e) {}
        }
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
            body: safeBody,
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

  // Bloquear re-escritura de fetch pero permitiendo configurabilidad por si otras librerías (Sentry, Datadog)
  // intentan envolverlo usando getter/setter defensivo.
  let currentFetch = quantumFetch;
  Object.defineProperty(window, 'fetch', {
    get: () => currentFetch,
    set: (newFetch) => {
      // Si intentan sobreescribir, forzamos a que su nueva función envuelva a nuestro quantumFetch
      // de esta forma nunca nos puentean.
      currentFetch = async (...args) => {
        return newFetch.apply(window, args);
      };
    },
    configurable: true,
    enumerable: true
  });

  // ---- INTERCEPT XHR ----
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    this._quantumMethod = method;
    this._quantumUrl = url.toString();
    this._quantumReqHeaders = {};
    return originalXHROpen.apply(this, [method, url, ...args] as any);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
    if (!this._quantumReqHeaders) this._quantumReqHeaders = {};
    this._quantumReqHeaders[header.toLowerCase()] = value;
    return originalXHRSetRequestHeader.apply(this, [header, value]);
  };

  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    if (typeof body === 'string') this._quantumReqBody = body;
    const url = this._quantumUrl || '';
    const method = this._quantumMethod || 'GET';
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
          if (this.onerror) this.onerror(new ProgressEvent('error'));
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
        
        if (this.responseType === 'json') {
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
    
    if (window.__quantumIsRecording) {
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
          
          let bodyText = '[Payload Binario, Streaming o Demasiado Grande]';
          const contentType = this.getResponseHeader('content-type') || '';
          // EVITAR DOMException: Si el dev forzó responseType a blob/arraybuffer, 
          // invocar this.responseText crashea el motor.
          const isSafeToReadText = this.responseType === '' || this.responseType === 'text';
          const isSafeToReadJson = this.responseType === 'json';

          if (isSafeToReadText) {
             const rawText = this.responseText || '';
             bodyText = rawText.length > 1048576 ? rawText.substring(0, 1048576) + "\n...[TRUNCATED BY QUANTUM: PAYLOAD CHUNKED TOO LARGE]" : rawText;
          } else if (isSafeToReadJson) {
             const rawJson = JSON.stringify(this.response || {});
             bodyText = rawJson.length > 1048576 ? rawJson.substring(0, 1048576) + "\n...[TRUNCATED BY QUANTUM: PAYLOAD CHUNKED TOO LARGE]" : rawJson;
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

          let safeBody = bodyText || '';

          window.postMessage({
            source: 'quantum-mock-interceptor',
            type: 'RECORD_TRAFFIC',
            payload: {
              url: this._quantumUrl,
              method: this._quantumMethod,
              status: this.status,
              headers: headersMap,
              body: safeBody,
              requestHeaders: this._quantumReqHeaders || {},
              cookies: cookiesMap,
              requestBody: this._quantumReqBody || ''
            }
          }, '*');
        } catch (e) { }
      });
    }

    return originalXHRSend.apply(this, [body as any]);
  };
})();
