import { Module } from '@nestjs/common';
import { RuleSettingsController } from './rule-settings.controller.js';
import { RuleSettingsService } from './rule-settings.service.js';

@Module({
  controllers: [RuleSettingsController],
  providers: [RuleSettingsService],
  exports: [RuleSettingsService],
})
export class RuleSettingsModule {}
