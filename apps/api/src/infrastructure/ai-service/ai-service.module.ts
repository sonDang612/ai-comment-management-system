import { Global, Module } from '@nestjs/common';
import { AiModerationClient } from './ai-moderation.client.js';
import { AiServiceClient } from './ai-service.client.js';

@Global()
@Module({
  providers: [AiServiceClient, AiModerationClient],
  exports: [AiServiceClient, AiModerationClient],
})
export class AiServiceModule {}
