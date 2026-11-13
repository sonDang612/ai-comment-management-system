import { Injectable } from '@nestjs/common';
import type { RuleSettings } from '@acms/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { toRuleSettingsData, toRuleSettingsDto } from './rule-settings.mapper.js';

const RULE_SETTINGS_ID = 1;

@Injectable()
export class RuleSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<RuleSettings> {
    const row = await this.prisma.ruleSettings.findUnique({ where: { id: RULE_SETTINGS_ID } });
    return toRuleSettingsDto(row);
  }

  async update(settings: RuleSettings): Promise<RuleSettings> {
    const data = toRuleSettingsData(settings);
    const row = await this.prisma.ruleSettings.upsert({
      where: { id: RULE_SETTINGS_ID },
      create: { id: RULE_SETTINGS_ID, ...data },
      update: data,
    });
    return toRuleSettingsDto(row);
  }
}
