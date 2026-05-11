"use client";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../context/LanguageContext";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "te", label: "తెలుగు" },
  { code: "ta", label: "தமிழ்" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
  { code: "bn", label: "বাংলা" },
];

export default function LanguageSelector({
  onChange,
  className,
  style,
  value,
  applyImmediately = true,
}) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  const handleLanguageChange = async (event) => {
    const nextLanguage = event.target.value;
    if (applyImmediately) {
      await changeLanguage(nextLanguage);
    }
    if (onChange) onChange(nextLanguage);
  };

  return (
    <select
      value={value || language}
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