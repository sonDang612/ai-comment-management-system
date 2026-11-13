import { Injectable } from '@nestjs/common';
import type { RuleSettings } from '@acms/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { toRuleSettingsData, toRuleSettingsDto } from './rule-settings.mapper.js';

const RULE_SETTINGS_ID = 1;

@Injectable()
export class RuleSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<RuleSettings> {
    const [settings, keywords] = await this.prisma.$transaction([
      this.prisma.ruleSettings.findUnique({ where: { id: RULE_SETTINGS_ID } }),
      this.prisma.restrictedKeyword.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }),
    ]);
    return toRuleSettingsDto(settings, keywords);
  }

  async update(settings: RuleSettings): Promise<RuleSettings> {
    await this.prisma.$transaction(async (tx) => {
      const data = toRuleSettingsData(settings);
      await tx.ruleSettings.upsert({
        where: { id: RULE_SETTINGS_ID },
        create: { id: RULE_SETTINGS_ID, ...data },
        update: data,
      });

      const existing = await tx.restrictedKeyword.findMany({ select: { id: true } });
      const existingIds = new Set(existing.map((row) => row.id));
      const keptIds = settings.keywords.map((keyword) => keyword.id).filter((id) => existingIds.has(id));
      await tx.restrictedKeyword.deleteMany({ where: { id: { notIn: keptIds } } });

      for (const [position, keyword] of settings.keywords.entries()) {
        const keywordData = {
          keyword: keyword.keyword,
          matchMode: keyword.match_mode,
          action: keyword.action,
          enabled: keyword.enabled,
          position,
        };
        if (existingIds.has(keyword.id)) {
          await tx.restrictedKeyword.update({ where: { id: keyword.id }, data: keywordData });
        } else {
          await tx.restrictedKeyword.create({ data: keywordData });
        }
      }
    });
    return this.get();
  }
}
