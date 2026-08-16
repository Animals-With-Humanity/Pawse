import { useEffect } from "react";

/**
 * Applies an event's theme object as CSS custom properties on <html>.
 * legacy.css already defines --bg / --accent / --accent-2 / --text etc,
 * so themed events only need to override those variables — no component
 * needs to know about colors directly.
 */
export default function ThemeProvider({ theme, children }) {
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    if (theme.background) root.style.setProperty("--bg", theme.background);
    if (theme.primary) root.style.setProperty("--accent", theme.primary);
    if (theme.secondary) root.style.setProperty("--accent-2", theme.secondary);
    if (theme.text) root.style.setProperty("--text", theme.text);
    return () => {
      // Leave variables in place between event pages within the same
      // session is fine since each event page sets its own on mount.
    };
  }, [theme]);

  return children;
}
