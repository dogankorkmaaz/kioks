/**
 * Theme is stamped as `data-theme` on <html>. The CSS declares its dark steps
 * under both `prefers-color-scheme` and `[data-theme]`, so an explicit choice
 * wins in either direction while "system" leaves the OS in charge.
 */

export type Theme = "light" | "dark" | "system";

const KEY = "kioskhub.theme";

export function getTheme(): Theme {
  const stored = localStorage.getItem(KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    localStorage.removeItem(KEY);
  } else {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
  }
}

/** True when the page is currently rendering dark, whatever the reason. */
export function isDarkNow(): boolean {
  const stamped = document.documentElement.getAttribute("data-theme");
  if (stamped === "dark") return true;
  if (stamped === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Called once before first paint so a stored choice doesn't flash the wrong theme. */
export function initTheme() {
  applyTheme(getTheme());
}
