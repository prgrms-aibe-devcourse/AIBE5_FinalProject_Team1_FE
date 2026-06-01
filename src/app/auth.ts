const AUTH_SESSION_KEY = "codedock-authenticated";

export function isAuthenticated() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return false;
  }

  return window.localStorage.getItem(AUTH_SESSION_KEY) === "true";
}

export function setAuthenticated() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_KEY, "true");
}

export function clearAuthenticated() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_KEY);
}
