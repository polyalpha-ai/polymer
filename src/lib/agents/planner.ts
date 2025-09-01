import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { getPolarTrackedModel } from '../polar-llm-strategy';

// Get model dynamically to use current context
const getModel = () => getPolarTrackedModel('gpt-5');

export const PlanSchema = z.object({
  subclaims: z.array(z.string().min(5)).min(2).max(10).describe('Causal factors and pathways that could lead to the outcome'),
  keyVariables: z.array(z.string()).min(2).max(15).describe('Observable indicators and metrics to monitor'),
  // Require exactly 20 search seeds as requested
  searchSeeds: z.array(z.string()).min(5).max(20).describe('Specific search queries to find relevant information (exactly 20).'),
  decisionCriteria: z.array(z.string()).min(3).max(8).describe('Clear criteria for how to resolve the question')
});

export type Plan = z.infer<typeof PlanSchema>;

export async function planAgent(question: string): Promise<Plan> {
  const { object } = await generateObject({
    model: getModel(),
    schema: PlanSchema,
    system: `You are the Planner. Break the forecasting question into causal pathways and research directions. Focus on WHAT COULD CAUSE the outcome, not what the final state looks like.`,
    prompt: `Question: ${question}

CRITICAL: This is a PREDICTION question, not a fact-checking question. Focus on causal factors and pathways to the outcome.

Break this down into:

- subclaims: 2-10 CAUSAL PATHWAYS that could lead to this outcome
  * NOT final states like "Xi holds office on Dec 31"  
  * Instead: "Health crisis forces Xi to step down", "Elite power struggle removes Xi", "Economic crisis undermines Xi's authority"
  * Focus on MECHANISMS and CAUSES that could produce the outcome

- keyVariables: 2-15 LEADING INDICATORS to monitor for early signals
  * Health indicators, political signals, economic metrics, institutional changes
  * Things that would change BEFORE the outcome occurs

- searchSeeds: 20 specific search queries targeting causal factors
  * e.g., "Xi Jinping health concerns 2025", "CCP leadership changes", "China economic crisis 2025"
  * Prefer diversified phrasing, include time qualifiers (e.g., 2025, recent)
  * Focus on searching for drivers, not end states

- decisionCriteria: 3-8 clear criteria for what would constitute evidence of the pathways

Return JSON matching the schema.`,
  });
  return object;
}
