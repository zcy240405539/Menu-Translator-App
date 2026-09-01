"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useText } from "@/hooks/useText";
import type { WebLanguageCode } from "@/lib/i18n";

export default function UtilityPageHeader({ lang }: { lang: WebLanguageCode }) {
  const text = useText(lang);
  const homeHref = `/?lang=${encodeURIComponent(lang)}`;

  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <Link href={homeHref} className="inline-flex items-center gap-2 font-semibold text-purple-700 hover:text-purple-900">
        <ArrowLeft className="h-4 w-4" />
        {text.settings.backHome}
      </Link>
      <Link href={homeHref} className="inline-flex items-center gap-2 rounded-md hover:opacity-85">
        <Image src="/ai-menu-logo.png" alt="" width={34} height={34} className="scale-150 object-contain" priority />
        <span className="font-bold text-[#5f259f]">{text.common.brand}</span>
      </Link>
    </header>
  );
}
