"use client";

import { Globe } from "@phosphor-icons/react";
import type { Locale } from "@/lib/i18n";

export function LanguageSelect({ locale, label, onChange }: {
  locale: Locale;
  label: string;
  onChange: (locale: Locale) => void;
}) {
  return (
    <label className="language-select">
      <Globe size={19} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select value={locale} onChange={(event) => onChange(event.target.value as Locale)} aria-label={label}>
        <option value="es">ES</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
