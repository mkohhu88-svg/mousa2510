export function recoveryLinkState(hash: string, search: string): "recovery" | "invalid" | "missing" {
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  if (fragment.has("error") || fragment.has("error_code") || query.has("error") || query.has("error_code")) return "invalid";
  if (fragment.get("type") === "recovery" && fragment.has("access_token")) return "recovery";
  return "missing";
}

// Capture before the auth SDK consumes and removes the one-use URL fragment.
export const initialRecoveryLink = typeof window === "undefined" ? "missing" : recoveryLinkState(window.location.hash, window.location.search);