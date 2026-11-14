import { Logger } from '@nestjs/common';
import type { AiCommentAnalysis, AiCommentAnalysisRequest } from '@acms/shared';
import { ServiceUnavailableException } from '../../../common/errors/app.exception.js';
import type { VllmClient } from '../../../infrastructure/vllm/vllm.client.js';
import type { CommentAnalyzer } from './comment-analyzer.js';
import { buildModerationMessages, MODERATION_RESPONSE_FORMAT, PROMPT_VERSION } from './moderation-prompt.js';
import { labelConfidence, parseModerationAnswer, toCommentAnalysis } from './moderation-response.js';

const MAX_COMPLETION_TOKENS = 192;
const TOP_LOGPROBS = 10;

export class VllmCommentAnalyzer implements CommentAnalyzer {
  readonly name = 'vllm';
  private readonly logger = new Logger(VllmCommentAnalyzer.name);

  constructor(private readonly vllm: VllmClient) {}

  async analyze(request: AiCommentAnalysisRequest): Promise<AiCommentAnalysis> {
    const choice = await this.vllm.chatCompletion({
      messages: buildModerationMessages(request.content),
      max_tokens: MAX_COMPLETION_TOKENS,
      temperature: 0,
      logprobs: true,
      top_logprobs: TOP_LOGPROBS,
      response_format: MODERATION_RESPONSE_FORMAT,
      chat_template_kwargs: { enable_thinking: false },
    });

    const answer = parseModerationAnswer(choice.content);
    if (!answer) {
      this.logger.warn(
        `Invalid moderation answer for comment ${request.comment_id} (finish_reason=${choice.finishReason ?? 'none'})`,
      );
      throw new ServiceUnavailableException('AI model returned an invalid moderation answer');
    }
    const confidence = choice.logprobs ? labelConfidence(choice.content, choice.logprobs, answer.label) : null;
    if (confidence === null) {
      this.logger.warn(`No label confidence in the AI answer for comment ${request.comment_id}`);
      throw new ServiceUnavailableException('AI model returned no label confidence');
    }
    return toCommentAnalysis(answer, confidence);
  }

  async health(timeoutMs: number): Promise<Record<string, unknown>> {
    const models = await this.vllm.listModelIds(timeoutMs);
    if (!models.includes(this.vllm.model)) {
      throw new Error(`Model ${this.vllm.model} is not served by vLLM`);
    }
    return { analyzer: this.name, model: this.vllm.model, prompt_version: PROMPT_VERSION };
  }
}
