import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { Evidence } from '../forecasting/types';

const model = openai('gpt-5');

export const CritiqueSchema = z.object({
  missing: z.array(z.string()).describe('missed disconfirming evidence or failure modes'),
  duplicationFlags: z.array(z.string()).describe('evidence ids suspected duplicate wiring'),
  dataConcerns: z.array(z.string()).describe('measurement or selection bias risks')
});
export type Critique = z.infer<typeof CritiqueSchema>;

export async function criticAgent(question: string, pro: Evidence[], con: Evidence[]): Promise<Critique> {
  const { object } = await generateObject({
    model,
    schema: CritiqueSchema,
    system: `You are the Skeptic. Attack the working evidence. Return JSON only.`,
    prompt: `Question: ${question}
We have ${pro.length} supporting and ${con.length} contradicting items.
Flag duplicates by id pattern or originId collisions; list missing counter-evidence avenues; note data-bias risks.`,
  });
  return object;
}
