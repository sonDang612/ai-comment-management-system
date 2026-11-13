import type { RuleSettings } from '@acms/shared';

export const DEFAULT_RULE_SETTINGS: RuleSettings = {
  validation: {
    min_length: 1,
    max_length: 1000,
    allow_empty: false,
    allow_emoji_only: true,
    max_repeated_chars: 10,
  },
  keywords: [],
  links: {
    domain_whitelist: [],
  },
};
