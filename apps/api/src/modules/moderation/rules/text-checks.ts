const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const BARE_DOMAIN_PATTERN = /(?<![\w@.-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?![\w-])/gi;
const EMOJI_PICTOGRAPHIC_PATTERN = /\p{Extended_Pictographic}/u;
const EMOJI_PART_PATTERN =
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|[‍︎️⃣]|[\u{E0020}-\u{E007F}])+$/u;
const WHITESPACE_PATTERN = /\s/u;

export function normalizeText(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

export function contentLength(content: string): number {
  return [...content.trim()].length;
}

export function isEmojiOnly(content: string): boolean {
  const compact = content.replace(/\s+/gu, '');
  return (
    compact !== '' && EMOJI_PART_PATTERN.test(compact) && EMOJI_PICTOGRAPHIC_PATTERN.test(compact)
  );
}

export function longestRepeatedRun(content: string): { char: string; run: number } {
  let best = { char: '', run: 0 };
  let previous: string | null = null;
  let run = 0;
  for (const char of content) {
    if (WHITESPACE_PATTERN.test(char)) {
      previous = null;
      run = 0;
      continue;
    }
    run = char === previous ? run + 1 : 1;
    previous = char;
    if (run > best.run) best = { char, run };
  }
  return best;
}

export function containsKeyword(normalizedContent: string, keyword: string): boolean {
  const normalizedKeyword = normalizeText(keyword.trim());
  return normalizedKeyword !== '' && normalizedContent.includes(normalizedKeyword);
}

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
}

function hostOf(url: string): string | null {
  try {
    const host = new URL(url.includes('://') ? url : `http://${url}`).hostname;
    return host ? normalizeHost(host) : null;
  } catch {
    return null;
  }
}

export function extractDomains(content: string): string[] {
  const domains = new Set<string>();
  for (const match of content.matchAll(URL_PATTERN)) {
    const host = hostOf(match[0]);
    if (host) domains.add(host);
  }
  const remaining = content.replace(URL_PATTERN, ' ');
  for (const match of remaining.matchAll(BARE_DOMAIN_PATTERN)) {
    domains.add(normalizeHost(match[0]));
  }
  return [...domains];
}

export function domainMatches(domain: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => {
    const normalized = normalizeHost(pattern);
    return normalized !== '' && (domain === normalized || domain.endsWith(`.${normalized}`));
  });
}
