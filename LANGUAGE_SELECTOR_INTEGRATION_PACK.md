# SpaceIntel Language Selector Integration Pack

This is a single shareable file with instructions and code to integrate the SpaceIntel language selector into another Next.js App Router project.

## 1) Install Dependencies

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

## 2) Create These Files

- i18n.js
- context/LanguageContext.js
- app/providers.js
- app/components/LanguageSelector.js

Create these locale files too:

- public/locales/en/translation.json
- public/locales/hi/translation.json
- public/locales/te/translation.json
- public/locales/ta/translation.json
- public/locales/kn/translation.json
- public/locales/ml/translation.json
- public/locales/bn/translation.json

## 3) Core Code

### i18n.js

```javascript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./public/locales/en/translation.json";
import hi from "./public/locales/hi/translation.json";
import te from "./public/locales/te/translation.json";
import ta from "./public/locales/ta/translation.json";
import kn from "./public/locales/kn/translation.json";
import ml from "./public/locales/ml/translation.json";
import bn from "./public/locales/bn/translation.json";

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  te: { translation: te },
  ta: { translation: ta },
  kn: { translation: kn },
  ml: { translation: ml },
  bn: { translation: bn },
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",
      fallbackLng: "en",
      supportedLngs: ["en", "hi", "te", "ta", "kn", "ml", "bn"],
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      load: "languageOnly",
    });
}

export default i18n;
```

### context/LanguageContext.js

```javascript
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
```

### app/providers.js

```javascript
"use client";

import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import { LanguageProvider } from "../context/LanguageContext";

export default function Providers({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nextProvider>
  );
}
```

### app/components/LanguageSelector.js

```javascript
"use client";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../context/LanguageContext";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "\u0939\u093f\u0902\u0926\u0940" },
  { code: "te", label: "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41" },
  { code: "ta", label: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd" },
  { code: "kn", label: "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1" },
  { code: "ml", label: "\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02" },
  { code: "bn", label: "\u09ac\u09be\u0982\u09b2\u09be" },
];

export default function LanguageSelector({ onChange, className, style }) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  const handleLanguageChange = async (event) => {
    const nextLanguage = event.target.value;
    await changeLanguage(nextLanguage);
    if (onChange) onChange(nextLanguage);
  };

  return (
    <select
      value={language}
      onChange={handleLanguageChange}
      className={className}
      style={style}
      aria-label={t("settings_language")}
    >
      {LANGUAGE_OPTIONS.map((option) => (
        <option key={option.code} value={option.code} style={{ background: "#03060e" }}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
```

## 4) Root Layout Integration

### app/layout.js

```javascript
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## 5) Locale Files (Minimum For Fully Functional Selector)

### public/locales/en/translation.json
```json
{ "settings_language": "Language" }
```

### public/locales/hi/translation.json
```json
{ "settings_language": "\u092d\u093e\u0937\u093e" }
```

### public/locales/te/translation.json
```json
{ "settings_language": "\u0c2d\u0c3e\u0c37" }
```

### public/locales/ta/translation.json
```json
{ "settings_language": "\u0bae\u0bca\u0bb4\u0bbf" }
```

### public/locales/kn/translation.json
```json
{ "settings_language": "\u0cad\u0cbe\u0cb7\u0cc6" }
```

### public/locales/ml/translation.json
```json
{ "settings_language": "\u0d2d\u0d3e\u0d37" }
```

### public/locales/bn/translation.json
```json
{ "settings_language": "\u09ad\u09be\u09b7\u09be" }
```

## 6) Usage Example

```javascript
"use client";

import { useTranslation } from "react-i18next";
import LanguageSelector from "../components/LanguageSelector";

export default function SettingsPanel() {
  const { t } = useTranslation();

  return (
    <div>
      <label>{t("settings_language")}</label>
      <LanguageSelector className="w-full" />
    </div>
  );
}
```

## 7) Verification Checklist

- Language changes immediately when dropdown changes.
- Selection persists after refresh via localStorage key spaceintel_language.
- html lang updates with active language.
- Existing translated text in your app switches based on locale files.

## 8) For Full SpaceIntel Text Parity

This pack gives full language-selector behavior. To get exact same full UI translations as SpaceIntel, copy the complete locale dictionaries from each `public/locales/*/translation.json` in this project.
