import type { Catalog } from "@/lib/i18n";

export type LegalKind = "privacy" | "terms";

export type LegalDocument = {
  title: string;
  intro: string;
  sections: { heading: string; items: string[] }[];
};

export function getLegalDocument(catalog: Catalog, kind: LegalKind) {
  return catalog.legalDocuments[kind] as LegalDocument;
}
