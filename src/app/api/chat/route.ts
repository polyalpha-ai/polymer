import { streamText, CoreMessage, NoSuchToolError, InvalidToolInputError, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { valyuAdvancedToolSet } from "@/lib/tools";

export async function POST(req: Request) {
  try {
    const { messages }: { messages: CoreMessage[] } = await req.json();

    const result = await streamText({
      model: openai("gpt-5"),
      messages,
      system: `You are a helpful AI assistant with access to real-time information through Valyu search tools and intelligent memory storage.

Instructions for using search tools:
- Use "valyuDeepSearchWithMemory" for intelligent searches that check memory first, then fetch fresh data if needed
- Use "valyuWebSearch" for dedicated web searches and current information
- Use "memorySearch" to quickly find previously retrieved information using semantic/keyword search
- Use "memoryManagement" to check system status, get statistics, or cleanup old entries

Advanced embedding tools:
- Use "embeddingConfig" to optimize embedding settings for performance, quality, or cost
- Use "semanticSimilarity" to analyze similarity between different texts
- Use "memoryOptimization" to analyze and optimize memory system performance

Search Types for valyuDeepSearchWithMemory:
- "academic" for research papers and scholarly content
- "market" for financial and market data  
- "web" for web content
- "all" for comprehensive searches across all domains
- "proprietary" for Valyu's specialized datasets

Memory Features:
- The system automatically stores search results for future use
- Memory searches are much faster than API calls
- Use memory search first for recently asked questions
- Set forceRefresh=true to bypass memory and get fresh data
- Adjust memoryThreshold (0-1) to control result quality

**Always cite information from search results using Markdown links: [Source Title](URL_from_result).**
**Indicate when information comes from memory vs fresh API calls.**

When you receive search results:
1. Check if results came from memory (look for from_memory in metadata)
2. Analyze results for relevance and accuracy
3. Synthesize information from multiple sources
4. Always provide proper citations
5. If results are insufficient, try memory search first, then fresh API calls

Be helpful, accurate, and always provide sources for your information.`,
      tools: valyuAdvancedToolSet,
      toolChoice: "auto",
      stopWhen: stepCountIs(5), // Allow up to 5 steps for multi-step reasoning
      
      // Handle step completion for logging and debugging
      onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
        console.log('Step finished:', {
          toolCallsCount: toolCalls.length,
          toolResultsCount: toolResults.length,
          finishReason,
          usage,
        });
        
        // Log any tool errors
        toolResults.forEach((toolResult, index) => {
          // Check if this is a static tool result with our expected structure
          if ('result' in toolResult && typeof toolResult.result === 'object' && toolResult.result !== null) {
            const result = toolResult.result as any;
            if (result.success === false) {
              console.error(`Tool error in ${toolCalls[index]?.toolName}:`, result.error);
            }
          }
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in chat API:", error);
    
    let errorMessage = "Internal server error";
    let statusCode = 500;
    
    if (NoSuchToolError.isInstance(error)) {
      errorMessage = "The model tried to call an unknown tool";
      statusCode = 400;
    } else if (InvalidToolInputError.isInstance(error)) {
      errorMessage = "Invalid tool input provided";
      statusCode = 400;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
        type: error?.constructor?.name || "UnknownError"
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
