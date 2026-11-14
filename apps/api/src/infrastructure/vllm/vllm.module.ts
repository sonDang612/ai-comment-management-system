import { Global, Module } from '@nestjs/common';
import { VllmClient } from './vllm.client.js';

@Global()
@Module({
  providers: [VllmClient],
  exports: [VllmClient],
})
export class VllmModule {}
