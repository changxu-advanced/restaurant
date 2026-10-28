export function formatBackToTopParts(language: string): string[] {
  switch (language) {
    case "en": return ["Back", "to", "top"];
    case "ja": return ["ト", "ッ", "プ", "へ", "戻", "る"];
    case "zh-TW": return ["回", "到", "頂", "部"];
    case "ko": return ["맨", "위로"];
    case "vi": return ["Về", "đầu", "trang"];
    default: return ["回", "到", "顶", "部"];
  }
}
