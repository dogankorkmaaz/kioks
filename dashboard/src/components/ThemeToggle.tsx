import { useState } from "react";
import { applyTheme, isDarkNow } from "../theme";
import { IconMoon, IconSun } from "./Icons";

/**
 * Flips between an explicit light and dark stamp. Only one instance renders at a
 * time, so local state is enough — no context needed.
 */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const [dark, setDark] = useState(isDarkNow);

  const toggle = () => {
    const next = !dark;
    applyTheme(next ? "dark" : "light");
    setDark(next);
  };

  return (
    <button
      type="button"
      className={withLabel ? "ghost" : "ghost icon-only"}
      onClick={toggle}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <IconSun /> : <IconMoon />}
      {withLabel && <span>{dark ? "Light theme" : "Dark theme"}</span>}
    </button>
  );
}
