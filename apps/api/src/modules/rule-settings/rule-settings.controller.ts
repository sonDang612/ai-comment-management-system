import { Body, Controller, Get, Put } from '@nestjs/common';
import type { RuleSettings } from '@acms/shared';
import { parseRuleSettings } from './rule-settings-input.js';
import { RuleSettingsService } from './rule-settings.service.js';

@Controller('rule-settings')
export class RuleSettingsController {
  constructor(private readonly ruleSettings: RuleSettingsService) {}

  @Get()
  get(): Promise<RuleSettings> {
    return this.ruleSettings.get();
  }

  @Put()
  update(@Body() body: unknown): Promise<RuleSettings> {
    return this.ruleSettings.update(parseRuleSettings(body));
  }
}
