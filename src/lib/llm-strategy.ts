// For now, we'll track LLM usage manually through the Polar API
// The @polar-sh/ingestion package with LLMStrategy is still in development
// This approach matches what was shown in the spec

const POLAR_API_URL = 'https://api.polar.sh/v1'
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN

export async function trackLLMUsage(
  customerId: string,
  promptTokens: number,
  completionTokens: number,
  model: string = 'gpt-5'
) {
  try {
    const response = await fetch(`${POLAR_API_URL}/metrics/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metric_slug: 'llm_tokens',
        customer_id: customerId,
        properties: {
          promptTokens,
          completionTokens,
          model,
          timestamp: new Date().toISOString(),
        },
      }),
    })

    if (!response.ok) {
      console.error('Failed to track LLM tokens:', await response.text())
    }
  } catch (error) {
    console.error('Error tracking LLM tokens:', error)
  }
}