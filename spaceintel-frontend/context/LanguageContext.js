"use client";

import { createContext, useContext, useEffect, useState } from "react";
import i18n from "../i18n";

const SUPPORTED_LANGUAGES = ["en", "hi", "te", "ta", "kn", "ml", "bn"];

const LanguageContext = createContext({
  language: "en",
  changeLanguage: () => {},
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");

  const changeLanguage = async (lang) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    await i18n.changeLanguage(lang);
    localStorage.setItem("spaceintel_language", lang);
    setLanguage(lang);
  };

  useEffect(() => {
    const savedLanguage = localStorage.getItem("spaceintel_language");
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      changeLanguage(savedLanguage);
      return;
    }

    changeLanguage("en");
  }, []);

  useEffect(() => {
    const handleLanguageChanged = (lang) => {
      setLanguage(lang);
      document.documentElement.lang = lang;
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}