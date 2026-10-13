import React from "react";
import { useTranslation } from "../context/LanguageContext";

/**
 * LanguageSwitcher — A compact EN/हिंदी toggle pill.
 * Follows the CarbonX design system (green accent, rounded).
 */
export default function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage } = useTranslation();

  return (
    <div
      className={`inline-flex items-center rounded-full bg-[#e3e8e5] dark:bg-[#1a2b21] p-0.5 text-xs font-bold ${className}`}
    >
      <button
        onClick={() => setLanguage("en")}
        className={`px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer border-none font-[Manrope] font-bold text-xs ${
          language === "en"
            ? "bg-[#13ec6d] text-[#0c1510] shadow-sm"
            : "bg-transparent text-[#718b7c] hover:text-[#0c1510] dark:hover:text-[#f0f4f2]"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("hi")}
        className={`px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer border-none font-bold text-xs ${
          language === "hi"
            ? "bg-[#13ec6d] text-[#0c1510] shadow-sm"
            : "bg-transparent text-[#718b7c] hover:text-[#0c1510] dark:hover:text-[#f0f4f2]"
        }`}
        aria-label="हिंदी में बदलें"
      >
        हिंदी
      </button>
    </div>
  );
}
