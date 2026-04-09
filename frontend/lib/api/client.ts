import { API_URL } from './config'

export const apiFetch = async (path: string, init?: RequestInit) => {
  // 确保请求携带 Cookie
  const requestInit: RequestInit = {
    ...init,
    credentials: init?.credentials || "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  };

  const res = await fetch(`${API_URL}${path}`, requestInit)

  if (res.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      // 保存当前 URL 作为重定向目标
      const currentUrl = window.location.href;
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentUrl)}`;
      window.location.href = redirectUrl;
    }
  }

  return res
}
