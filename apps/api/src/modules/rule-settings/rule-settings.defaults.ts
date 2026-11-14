import type { RuleSettings } from '@acms/shared';

export const DEFAULT_RULE_SETTINGS: RuleSettings = {
  validation: {
    min_length: 1,
    max_length: 1000,
    max_repeated_chars: 10,
    max_repeated_words: 5,
  },
  keywords: [],
  links: {
    allow_ip_addresses: false,
    domain_whitelist: [],
  },
};
