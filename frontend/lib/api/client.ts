import { API_URL } from './config'

let isRedirecting = false

export const apiFetch = async (path: string, init?: RequestInit) => {
  const requestInit: RequestInit = {
    ...init,
    credentials: init?.credentials || "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  };

  const res = await fetch(`${API_URL}${path}`, requestInit)

  if (res.status === 401 && !isRedirecting) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      isRedirecting = true
      const currentUrl = window.location.href;
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentUrl)}`;
      window.location.href = redirectUrl;
    }
  }

  return res
}

export const resetRedirectFlag = () => {
  isRedirecting = false
}
