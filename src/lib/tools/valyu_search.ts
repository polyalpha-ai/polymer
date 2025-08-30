import { z } from "zod";
import { tool } from "ai";
import { Valyu, SearchType as ValyuSearchSDKType } from "valyu-js";

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
});

// Input schema for web search
const webSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("The search query for web content."),
});

// Tool result type for better type safety
export type ValyuToolResult = {
  success: boolean;
  query: string;
  results: ValyuSearchResult[];
  tx_id?: string | null;
  error?: string;
};

// Valyu DeepSearch Tool - Comprehensive search across multiple domains
export const valyuDeepSearchTool = tool({
  description:
    "Search Valyu for real-time academic papers, web content, market data, etc. Use for specific, up-to-date information across various domains. Always cite sources using [Title](URL) format.",
  inputSchema: deepSearchInputSchema,
  execute: async ({ query, searchType }) => {
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

    try {
      console.log(
        `[ValyuDeepSearchTool] Query: "${query}", LLM Type: ${searchType}, Valyu Type: ${mappedSearchType}`
      );
      const response = await valyu.search(
        query,
        {
          searchType: mappedSearchType,
          maxNumResults: 5,
          maxPrice: 50.0,
          relevanceThreshold: 0.5,
          ...(searchType === "academic"
            ? { includedSources: ["valyu/valyu-arxiv"] }
            : {}),
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

      console.log(
        `[ValyuDeepSearchTool] Success. Results: ${response.results?.length}, TX_ID: ${response.tx_id}`
      );
      
      const toolResult: ValyuToolResult = {
        success: true,
        query,
        results: response.results || [],
        tx_id: response.tx_id,
      };
      
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
  execute: async ({ query }) => {
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
    
    try {
      console.log(`[ValyuWebSearchTool] Web Query: "${query}"`);
      const response = await valyu.search(
        query,
        {
          searchType: "web" as ValyuSearchSDKType,
          maxNumResults: 5,
          maxPrice: 30.0,
          relevanceThreshold: 0.5,
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
      
      console.log(
        `[ValyuWebSearchTool] Success. Results: ${response.results?.length}, TX_ID: ${response.tx_id}`
      );
      
      const toolResult: ValyuToolResult = {
        success: true,
        query,
        results: response.results || [],
        tx_id: response.tx_id,
      };
      
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
