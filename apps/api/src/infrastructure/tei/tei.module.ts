import { Global, Module } from '@nestjs/common';
import { TeiClient } from './tei.client.js';

@Global()
@Module({
  providers: [TeiClient],
  exports: [TeiClient],
})
export class TeiModule {}
