import { Global, Module } from '@nestjs/common';
import { AiServiceClient } from './ai-service.client.js';

@Global()
@Module({
  providers: [AiServiceClient],
  exports: [AiServiceClient],
})
export class AiServiceModule {}
