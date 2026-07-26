import { getText, translations } from "./i18n";

export const legalContent = Object.fromEntries(
  Object.entries(translations).map(([language, catalog]) => [language, catalog.legal])
);

export function getLegalContent(lang) {
  return getText(lang).legal;
}
