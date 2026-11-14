import { isIP, isIPv4, isIPv6 } from 'node:net';

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const BARE_DOMAIN_PATTERN = /(?<![\w@.-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?![\w-])/gi;
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const IPV4_CANDIDATE_PATTERN = /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g;
const IPV6_CANDIDATE_PATTERN =
  /(?<![0-9a-f:.])(?:[0-9a-f]{0,4}:){2,7}(?:(?:\d{1,3}\.){3}\d{1,3}|[0-9a-f]{0,4})(?:%[0-9a-z]+)?(?![0-9a-f:.])/gi;
const WHITESPACE_PATTERN = /\s/u;
const INVISIBLE_FORMAT_CHARS_PATTERN = /\p{Cf}/gu;
const CJK_FULL_STOP_PATTERN = /[。｡]/g;

export interface RepeatedRun {
  value: string;
  run: number;
}

export function normalizeText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(INVISIBLE_FORMAT_CHARS_PATTERN, '')
    .replace(CJK_FULL_STOP_PATTERN, '.')
    .toLowerCase();
}

export function contentLength(content: string): number {
  return [...content.trim()].length;
}

export function longestRepeatedCharRun(normalizedContent: string): RepeatedRun {
  let best: RepeatedRun = { value: '', run: 0 };
  let previous: string | null = null;
  let run = 0;
  for (const char of normalizedContent) {
    if (WHITESPACE_PATTERN.test(char)) {
      previous = null;
      run = 0;
      continue;
    }
    run = char === previous ? run + 1 : 1;
    previous = char;
    if (run > best.run) best = { value: char, run };
  }
  return best;
}

export function longestRepeatedWordRun(normalizedContent: string): RepeatedRun {
  let best: RepeatedRun = { value: '', run: 0 };
  let previous: string | null = null;
  let run = 0;
  for (const [word] of normalizedContent.matchAll(WORD_PATTERN)) {
    run = word === previous ? run + 1 : 1;
    previous = word;
    if (run > best.run) best = { value: word, run };
  }
  return best;
}

export function containsKeyword(normalizedContent: string, keyword: string): boolean {
  const normalizedKeyword = normalizeText(keyword).trim();
  return normalizedKeyword !== '' && normalizedContent.includes(normalizedKeyword);
}

export function containsIpAddress(content: string): boolean {
  for (const [candidate] of content.matchAll(IPV4_CANDIDATE_PATTERN)) {
    if (isIPv4(candidate)) return true;
  }
  for (const [candidate] of content.matchAll(IPV6_CANDIDATE_PATTERN)) {
    if (isIPv6(candidate)) return true;
  }
  return false;
}

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
}

function hostOf(url: string): string | null {
  try {
    const host = new URL(url.includes('://') ? url : `http://${url}`).hostname;
    const unbracketed = host.replace(/^\[(.*)\]$/, '$1');
    if (!host || isIP(unbracketed) !== 0) return null;
    return normalizeHost(host);
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
