"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import { LanguageProvider } from "../context/LanguageContext";

const FONT_SIZE_CONFIG = {
  small: { base: "14px", scale: "0.95" },
  medium: { base: "16px", scale: "1" },
  large: { base: "18px", scale: "1.08" },
};

function applyGlobalFontSize(fontSize) {
  const root = document.documentElement;
  const config = FONT_SIZE_CONFIG[fontSize] || FONT_SIZE_CONFIG.medium;
  root.style.setProperty("--spaceintel-base-font-size", config.base);
  root.style.setProperty("--spaceintel-ui-scale", config.scale);
}

function readSavedFontSize() {
  try {
    const raw = localStorage.getItem("spaceintel_settings");
    if (!raw) return "medium";
    const parsed = JSON.parse(raw);
    return parsed?.fontSize || "medium";
  } catch {
    return "medium";
  }
}

export default function Providers({ children }) {
  useEffect(() => {
    const syncFontSize = () => {
      applyGlobalFontSize(readSavedFontSize());
    };

    const onStorage = (e) => {
      if (e.key === "spaceintel_settings") {
        syncFontSize();
      }
    };

    syncFontSize();
    window.addEventListener("storage", onStorage);
    window.addEventListener("spaceintel:settings-updated", syncFontSize);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("spaceintel:settings-updated", syncFontSize);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nextProvider>
  );
}