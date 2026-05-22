export {};

declare global {
  interface Window {
    __quantumMockRules: any[];
    __quantumIsRecording: boolean;
  }

  interface XMLHttpRequest {
    _quantumMethod?: string;
    _quantumUrl?: string;
    _quantumReqHeaders?: Record<string, string>;
    _quantumReqBody?: string;
  }
}
