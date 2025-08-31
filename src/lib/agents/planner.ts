import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { getPolarTrackedModel } from '../polar-llm-strategy';

// Get model dynamically to use current context
const getModel = () => getPolarTrackedModel('gpt-5');

export const PlanSchema = z.object({
  subclaims: z.array(z.string().min(5)).min(2).max(10),
  keyVariables: z.array(z.string()).min(2).max(15),
  searchSeeds: z.array(z.string()).min(3).max(20),
  decisionCriteria: z.array(z.string()).min(3).max(8)
});

export type Plan = z.infer<typeof PlanSchema>;

export async function planAgent(question: string): Promise<Plan> {
  const { object } = await generateObject({
    model: getModel(),
    schema: PlanSchema,
    system: `You are the Planner. Break the forecasting question into checkable subclaims and search seeds. Keep it concise and rigorous. Limit subclaims to 2-10 items.`,
    prompt: `Question: ${question}

Break this down into:
- subclaims: 2-10 specific, testable claims that would resolve the question
- keyVariables: 2-15 measurable variables that would influence the outcome  
- searchSeeds: 3-20 specific search queries to find relevant information
- decisionCriteria: 3-8 clear criteria for how to resolve the question

Return JSON matching the schema.`,
  });
  return object;
}
