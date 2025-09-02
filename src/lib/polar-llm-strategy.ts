import { Ingestion } from '@polar-sh/ingestion';
import { LLMStrategy } from '@polar-sh/ingestion/strategies/LLM';
import { openai } from '@ai-sdk/openai';
import { groq } from '@ai-sdk/groq';

// Store current analysis context for LLM tracking
let currentUserContext: { userId?: string; customerId?: string } = {};

export function setLLMContext(userId: string, customerId: string) {
  currentUserContext = { userId, customerId };
  console.log(`[PolarLLM] Context set for user: ${userId}, customer: ${customerId}`);
}

export function clearLLMContext() {
  currentUserContext = {};
  console.log('[PolarLLM] Context cleared');
}

// Get a wrapped model for the current context
export function getPolarTrackedModel(modelName: string = 'gpt-5') {
  // Decide which base model to use: openai for gpt-5, groq for others
  const baseModel = modelName.includes('gpt-5') ? openai(modelName) : groq(modelName);

  // If no customer ID in context, return unwrapped model
  if (!currentUserContext.customerId) {
    console.log('[PolarLLM] No customer ID in context, returning unwrapped model');
    return baseModel;
  }

  if (!process.env.POLAR_ACCESS_TOKEN) {
    console.error('[PolarLLM] POLAR_ACCESS_TOKEN not found - returning unwrapped model');
    return baseModel;
  }

  try {
    console.log(`[PolarLLM] Creating tracked model for customer: ${currentUserContext.customerId}, model: ${modelName}`);

    const ingestion = Ingestion({
      accessToken: process.env.POLAR_ACCESS_TOKEN
    })
      .strategy(new LLMStrategy(baseModel))
      .ingest('llm_tokens'); // This matches the Polar meter

    // Return the wrapped model with customer tracking
    const trackedModel = ingestion.client({
      customerId: currentUserContext.customerId
    });

    console.log('[PolarLLM] Tracked model created successfully');
    return trackedModel;
  } catch (error) {
    console.error('[PolarLLM] Failed to create tracked model:', error);
    console.log('[PolarLLM] Falling back to unwrapped model');
    return baseModel;
  }
}