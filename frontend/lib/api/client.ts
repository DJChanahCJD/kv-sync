import { hc } from "hono/client";
import { API_URL } from "./config";
import type { AppType } from "@functions/app";

const REDIRECT_FLAG_KEY = "kv-sync-auth-redirecting";

function getSafeRedirectTarget() {
  if (typeof window === "undefined") {
    return "/admin";
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const redirect = currentPath.startsWith("/admin") ? "" : `?redirect=${encodeURIComponent(currentPath)}`;
  return `/admin${redirect}`;
}

function redirectToAdmin() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname === "/admin" || sessionStorage.getItem(REDIRECT_FLAG_KEY) === "1") {
    return;
  }

  sessionStorage.setItem(REDIRECT_FLAG_KEY, "1");
  window.location.replace(getSafeRedirectTarget());
}

const customFetch: typeof fetch = async (input, init) => {
  const requestInit: RequestInit = {
    ...init,
    credentials: init?.credentials || "include",
  };

  const res = await fetch(input, requestInit);

  if (res.status === 401) {
    redirectToAdmin();
  }

  return res;
};

export function resetRedirectFlag() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(REDIRECT_FLAG_KEY);
  }
}

export const client = hc<AppType>(API_URL, { fetch: customFetch }) as any;
