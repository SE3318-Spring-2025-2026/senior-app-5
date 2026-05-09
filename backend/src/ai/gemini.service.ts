import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

export interface PrReviewInput {
  prTitle: string;
  prBody: string | null;
  reviews: Array<{
    author: string | null;
    state: string;
    body: string | null;
    submittedAt: string | null;
  }>;
  comments: Array<{
    author: string | null;
    body: string | null;
    path: string | null;
  }>;
}

export interface PrReviewVerdict {
  hasMeaningfulReview: boolean;
  score: number;
  reasoning: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI | null;
  private readonly model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set — AI review evaluation will be skipped.',
      );
      this.client = null;
      return;
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async evaluatePrReview(input: PrReviewInput): Promise<PrReviewVerdict | null> {
    if (!this.client) return null;

    const prompt = this.buildPrompt(input);

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              hasMeaningfulReview: { type: 'boolean' },
              score: { type: 'number' },
              reasoning: { type: 'string' },
            },
            required: ['hasMeaningfulReview', 'score', 'reasoning'],
          },
        },
      });

      const text = response.text;
      if (!text) return null;

      const parsed = JSON.parse(text) as PrReviewVerdict;
      return {
        hasMeaningfulReview: !!parsed.hasMeaningfulReview,
        score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
        reasoning: String(parsed.reasoning ?? '').slice(0, 1000),
      };
    } catch (err: any) {
      this.logger.warn(`Gemini evaluatePrReview failed: ${err?.message ?? err}`);
      return null;
    }
  }

  private buildPrompt(input: PrReviewInput): string {
    const reviewLines = input.reviews
      .map(
        (r, i) =>
          `Review #${i + 1} by @${r.author ?? 'unknown'} [${r.state}]: ${r.body?.slice(0, 500) ?? '(no body)'}`,
      )
      .join('\n');
    const commentLines = input.comments
      .map(
        (c, i) =>
          `Comment #${i + 1} by @${c.author ?? 'unknown'}${c.path ? ` on ${c.path}` : ''}: ${c.body?.slice(0, 300) ?? ''}`,
      )
      .join('\n');

    return [
      'You are evaluating whether a GitHub pull request received a meaningful code review.',
      'A meaningful review provides actionable feedback (questions, suggestions, requested changes, or substantive approval reasoning).',
      'Empty bodies, single-word approvals like "lgtm" or "ok", emoji-only comments, or self-reviews do NOT count as meaningful.',
      '',
      `PR title: ${input.prTitle}`,
      `PR body: ${input.prBody?.slice(0, 1000) ?? '(no body)'}`,
      '',
      'Reviews:',
      reviewLines || '(none)',
      '',
      'Inline comments:',
      commentLines || '(none)',
      '',
      'Return JSON: { hasMeaningfulReview: boolean, score: 0-100, reasoning: short explanation (1-2 sentences) }.',
      'score=0 means no review at all; 100 means thorough review with concrete feedback.',
    ].join('\n');
  }
}
