export type LanguagePair = {
  source: string;
  target: string;
};

export function selectSourceLanguage(
  currentSource: string,
  currentTarget: string,
  nextSource: string,
): LanguagePair {
  if (nextSource === "auto" || nextSource !== currentTarget) {
    return { source: nextSource, target: currentTarget };
  }
  const target = currentSource !== "auto" && currentSource !== nextSource
    ? currentSource
    : nextSource === "en" ? "es" : "en";
  return { source: nextSource, target };
}

export function selectTargetLanguage(
  currentSource: string,
  currentTarget: string,
  nextTarget: string,
): LanguagePair {
  return {
    source: currentSource !== "auto" && currentSource === nextTarget
      ? currentTarget
      : currentSource,
    target: nextTarget,
  };
}
