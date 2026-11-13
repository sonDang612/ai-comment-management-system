import { Global, Module } from '@nestjs/common';
import { AiAnalysisClient } from './ai-analysis.client.js';
import { AiServiceClient } from './ai-service.client.js';

@Global()
@Module({
  providers: [AiServiceClient, AiAnalysisClient],
  exports: [AiServiceClient, AiAnalysisClient],
})
export class AiServiceModule {}
