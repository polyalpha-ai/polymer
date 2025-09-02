import { z } from "zod";
import { tool } from "ai";
import { Valyu, SearchType as ValyuSearchSDKType } from "valyu-js";
import { trackValyuUsageImmediate } from "../usage-tracking";
import { memoryService } from '@/lib/memory/weaviate-memory';

// Types for Valyu search results
export interface ValyuSearchResult {
  title: string;
  url: string;
  content: string;
  relevance_score: number;
  source: string;
  metadata?: Record<string, any>;
}

interface ValyuSearchResponse {
  success: boolean;
  results?: ValyuSearchResult[];
  tx_id?: string;
  error?: string;
}

// Input schema for deep search
const deepSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Detailed search query (e.g., "latest advancements in AI for healthcare" or "current price of Bitcoin").'
    ),
  searchType: z
    .enum(["all", "web", "market", "academic", "proprietary"])
    .default("all")
    .describe(
      'Search domain: "academic" for research papers, "web" for web content, "market" for financial data, "all" for comprehensive search, or "proprietary" for Valyu datasets.'
    ),
  startDate: z.string().optional().describe('Optional ISO date (YYYY-MM-DD) to filter results published on/after this date'),
});

// Input schema for web search
const webSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("The search query for web content."),
  startDate: z.string().optional().describe('Optional ISO date (YYYY-MM-DD) to filter results published on/after this date'),
});

// Tool result type for better type safety
export type ValyuToolResult = {
  success: boolean;
  query: string;
  results: ValyuSearchResult[];
  tx_id?: string | null;
  error?: string;
  totalCost?: number; // Cost in dollars
};

// Valyu DeepSearch Tool - Comprehensive search across multiple domains
export const valyuDeepSearchTool = tool({
  description:
    "Search Valyu for real-time academic papers, web content, market data, etc. Use for specific, up-to-date information across various domains. Always cite sources using [Title](URL) format.",
  inputSchema: deepSearchInputSchema,
  execute: async ({ query, searchType, startDate }) => {
    const VALYU_API_KEY = process.env.VALYU_API_KEY;
    if (!VALYU_API_KEY) {
      console.error("VALYU_API_KEY is not set.");
      const errorResult: ValyuToolResult = {
        success: false,
        error: "Valyu API key not configured. Please set VALYU_API_KEY environment variable.",
        query,
        results: [],
      };
      return errorResult;
    }

    const valyu = new Valyu(VALYU_API_KEY);

    const searchTypeMap: { [key: string]: ValyuSearchSDKType } = {
      all: "all",
      web: "web",
      market: "all",
      academic: "proprietary",
      proprietary: "proprietary",
    };
    const mappedSearchType: ValyuSearchSDKType =
      searchTypeMap[searchType] || "all";

    // Compute default startDate if LLM didn't pass one
    const days = Number(process.env.VALYU_DEFAULT_START_DAYS || 180);
    const defaultStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    try {
      console.log(
        `[ValyuDeepSearchTool] Query: "${query}", LLM Type: ${searchType}, Valyu Type: ${mappedSearchType}, startDate=${startDate || defaultStart}`
      );
      const response = await valyu.search(
        query,
        {
          searchType: mappedSearchType,
          maxNumResults: 8,
          maxPrice: 50.0,
          relevanceThreshold: 0.5,
          startDate: startDate || defaultStart,
        }
      );

      if (!response.success) {
        console.error("[ValyuDeepSearchTool] API Error:", response.error);
        const errorResult: ValyuToolResult = {
          success: false,
          error: response.error || "Valyu API request failed.",
          query,
          results: [],
        };
        return errorResult;
      }

      const cost = response.total_deduction_dollars || 0;
      console.log(
        `[ValyuDeepSearchTool] Success. Results: ${response.results?.length}, TX_ID: ${response.tx_id}, Cost: $${cost}`
      );
      
      // Track cost immediately to Polar
      if (cost > 0) {
        trackValyuUsageImmediate(cost, query, 'deep_search').catch(err => 
          console.error('[ValyuDeepSearchTool] Failed to track usage:', err)
        );
      }
      
      let results = response.results || [];
      // Note: Date filtering is now handled server-side by the Valyu API using startDate in SearchOptions
      // Client-side filtering removed since SearchResult doesn't include metadata with date information

      const toolResult: ValyuToolResult = {
        success: true,
        query,
        results,
        tx_id: response.tx_id,
        totalCost: cost,
      };
      // Optionally ingest into memory if enabled
      try {
        if (process.env.MEMORY_ENABLED === 'true' && toolResult.results.length > 0) {
          await memoryService.storeSearchResults(toolResult.results, query);
        }
      } catch (e) {
        console.warn('[ValyuDeepSearchTool] Memory ingest skipped:', e instanceof Error ? e.message : e);
      }

      return toolResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error.";
      console.error("[ValyuDeepSearchTool] Exception:", errorMessage);
      const errorResult: ValyuToolResult = {
        success: false,
        error: errorMessage,
        query,
        results: [],
      };
      return errorResult;
    }
  },
});

// Valyu Web Search Tool - Dedicated web search
export const valyuWebSearchTool = tool({
  description:
    "Perform a web search using Valyu for up-to-date information from the internet. Always cite sources using [Title](URL) format.",
  inputSchema: webSearchInputSchema,
  execute: async ({ query, startDate }) => {
    const VALYU_API_KEY = process.env.VALYU_API_KEY;
    if (!VALYU_API_KEY) {
      console.error("VALYU_API_KEY is not set for web search.");
      const errorResult: ValyuToolResult = {
        success: false,
        error: "Valyu API key not configured. Please set VALYU_API_KEY environment variable.",
        query,
        results: [],
      };
      return errorResult;
    }
    
    const valyu = new Valyu(VALYU_API_KEY);
    
    // Compute default startDate if LLM didn't pass one
    const days = Number(process.env.VALYU_DEFAULT_START_DAYS || 180);
    const defaultStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    try {
      console.log(`[ValyuWebSearchTool] Web Query: "${query}", startDate=${startDate || defaultStart}`);
      const response = await valyu.search(
        query,
        {
          searchType: "web" as ValyuSearchSDKType,
          maxNumResults: 8,
          maxPrice: 30.0,
          relevanceThreshold: 0.5,
          startDate: startDate || defaultStart,
        }
      );
      
      if (!response.success) {
        console.error("[ValyuWebSearchTool] API Error:", response.error);
        const errorResult: ValyuToolResult = {
          success: false,
          error: response.error || "Valyu Web API request failed.",
          query,
          results: [],
        };
        return errorResult;
      }
      
      const cost = response.total_deduction_dollars || 0;
      console.log(
        `[ValyuWebSearchTool] Success. Results: ${response.results?.length}, TX_ID: ${response.tx_id}, Cost: $${cost}`
      );
      
      // Track cost immediately to Polar
      if (cost > 0) {
        trackValyuUsageImmediate(cost, query, 'web_search').catch(err => 
          console.error('[ValyuWebSearchTool] Failed to track usage:', err)
        );
      }
      
      let results = response.results || [];
      // Note: Date filtering is now handled server-side by the Valyu API using startDate in SearchOptions
      // Client-side filtering removed since SearchResult doesn't include metadata with date information

      const toolResult: ValyuToolResult = {
        success: true,
        query,
        results,
        tx_id: response.tx_id,
        totalCost: cost,
      };
      // Optionally ingest into memory if enabled
      try {
        if (process.env.MEMORY_ENABLED === 'true' && toolResult.results.length > 0) {
          await memoryService.storeSearchResults(toolResult.results, query);
        }
      } catch (e) {
        console.warn('[ValyuWebSearchTool] Memory ingest skipped:', e instanceof Error ? e.message : e);
      }

      return toolResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error.";
      console.error("[ValyuWebSearchTool] Exception:", errorMessage);
      const errorResult: ValyuToolResult = {
        success: false,
        error: errorMessage,
        query,
        results: [],
      };
      return errorResult;
    }
  },
});
