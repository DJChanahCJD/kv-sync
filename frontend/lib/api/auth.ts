import { apiFetch } from "./client";
import { unwrap } from "./config";

/**
 * 登录
 */
export async function login(password: string): Promise<boolean> {
  try {
    await unwrap(
      apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * 登出
 */
export async function logout(): Promise<boolean> {
  try {
    await unwrap(apiFetch("/auth/logout", { method: "POST" }));
    return true;
  } catch {
    return false;
  }
}
