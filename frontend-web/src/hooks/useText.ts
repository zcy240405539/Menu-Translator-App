"use client";

import { useEffect, useState } from "react";
import { getText, loadText, normalizeLanguage, type Catalog, type WebLanguageCode } from "@/lib/i18n";

type LoadedCatalog = {
  language: WebLanguageCode;
  catalog: Catalog;
};

export function useText(language: WebLanguageCode | string) {
  const normalized = normalizeLanguage(language);
  const [loaded, setLoaded] = useState<LoadedCatalog>(() => ({
    language: normalized,
    catalog: getText(normalized),
  }));

  useEffect(() => {
    let active = true;
    void loadText(normalized)
      .then((catalog) => {
        if (active) setLoaded({ language: normalized, catalog });
      })
      .catch(() => {
        if (active) setLoaded({ language: normalized, catalog: getText(normalized) });
      });
    return () => {
      active = false;
    };
  }, [normalized]);

  return loaded.language === normalized ? loaded.catalog : getText(normalized);
}
