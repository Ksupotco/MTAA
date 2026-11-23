// 前端 API 地址：默认同源 /api/v1/*；静态页与函数分离部署时，可在构建时设置 VITE_API_BASE，
// 或在 index.html 里设置 window.WHALE_API_BASE。只放地址，绝不放密钥。
const raw = String(((import.meta as any).env?.VITE_API_BASE) || (typeof window !== "undefined" && (window as any).WHALE_API_BASE) || "");
export const API_BASE = raw.replace(/\/+$/, "");
export const apiUrl = (p: string) => (p.startsWith("/") ? API_BASE + p : p);

// 用户在侧栏选择的「供应商 + 模型」：随每个 AI 请求以请求头发送，服务端会对照实时模型列表校验。
let choice = { provider: "", model: "" };
export function setAIChoice(next: { provider: string; model: string }) { choice = { provider: next.provider || "", model: next.model || "" }; }
export const apiFetch: typeof fetch = ((input: any, init?: RequestInit) => {
  const url = typeof input === "string" ? apiUrl(input) : input;
  if (init && String(init.method || "GET").toUpperCase() === "POST" && (choice.provider || choice.model)) {
    const headers = new Headers(init.headers || {});
    if (choice.provider) headers.set("X-Whale-Provider", choice.provider);
    if (choice.model) headers.set("X-Whale-Model", choice.model);
    init = { ...init, headers };
  }
  return fetch(url, init);
}) as typeof fetch;
