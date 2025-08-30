import { z } from "zod";
import { tool } from "ai";
import { Valyu, SearchType as ValyuSearchSDKType } from "valyu-js";
import { memoryService } from "../memory/simple-memory";
import type { HybridSearchResult } from "../memory/simple-memory";

// Re-export for external use
export type { HybridSearchResult };
import { ValyuSearchResult, ValyuToolResult } from "./valyu_search";

// Enhanced search result that includes memory results
export interface EnhancedSearchResult extends ValyuToolResult {
  memory_results?: HybridSearchResult[];
  search_strategy: 'memory_only' | 'valyu_only' | 'hybrid' | 'memory_first';
  total_sources: number;
}

// Input schema for memory-enhanced deep search
const memoryEnhancedSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("Detailed search query for both memory and Valyu search"),
  searchType: z
    .enum(["all", "web", "market", "academic", "proprietary"])
    .default("all")
    .describe("Search domain for Valyu API"),
  useMemory: z
    .boolean()
    .default(true)
    .describe("Whether to search memory first before making API calls"),
  memoryThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.75)
    .describe("Minimum similarity threshold for memory results (0-1)"),
  memoryTimeWindow: z
    .number()
    .positive()
    .default(24)
    .describe("Time window in hours to search memory"),
  forceRefresh: z
    .boolean()
    .default(false)
    .describe("Force new Valyu search even if memory has good results"),
});

// Memory search tool for querying stored snippets
export const memorySearchTool = tool({
  description: "Search stored memory snippets from previous Valyu searches using semantic and keyword search. Use this to find previously retrieved information quickly.",
  inputSchema: z.object({
    query: z.string().min(1).describe("Search query for memory"),
    searchType: z
      .enum(["semantic", "keyword", "hybrid"])
      .default("hybrid")
      .describe("Type of memory search to perform"),
    limit: z
      .number()
      .positive()
      .default(10)
      .describe("Maximum number of results to return"),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.7)
      .describe("Minimum similarity threshold (0-1)"),
    timeWindow: z
      .number()
      .positive()
      .default(24)
      .describe("Time window in hours to search"),
  }),
  execute: async ({ query, searchType, limit, threshold, timeWindow }) => {
    try {
      let results: HybridSearchResult[] = [];

      switch (searchType) {
        case 'semantic':
          results = await memoryService.semanticSearch(query, {
            limit,
            threshold,
            timeWindow,
          });
          break;
        case 'keyword':
          results = await memoryService.keywordSearch(query, {
            limit,
            timeWindow,
          });
          break;
        case 'hybrid':
        default:
          results = await memoryService.hybridSearch(query, {
            limit,
            threshold,
            timeWindow,
          });
          break;
      }

      return {
        success: true,
        query,
        results: results.map(r => ({
          title: r.title,
          url: r.url,
          content: r.content,
          relevance_score: r.similarity_score,
          source: r.source,
          metadata: {
            ...r.metadata,
            search_type: r.search_type,
            original_query: r.query_context,
            stored_at: new Date(r.timestamp).toISOString(),
          },
        })),
        search_strategy: 'memory_only' as const,
        total_sources: results.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[MemorySearchTool] Exception:", errorMessage);
      
      return {
        success: false,
        error: `Memory search failed: ${errorMessage}`,
        query,
        results: [],
        search_strategy: 'memory_only' as const,
        total_sources: 0,
      };
    }
  },
});

// Enhanced Valyu DeepSearch Tool with memory integration
export const valyuDeepSearchWithMemoryTool = tool({
  description: "Intelligent search that first checks memory for relevant information, then optionally queries Valyu API for fresh data. Automatically stores new results for future use. Use this for comprehensive research with memory optimization.",
  inputSchema: memoryEnhancedSearchInputSchema,
  execute: async ({ 
    query, 
    searchType, 
    useMemory, 
    memoryThreshold, 
    memoryTimeWindow, 
    forceRefresh 
  }) => {
    const VALYU_API_KEY = process.env.VALYU_API_KEY;
    let memoryResults: HybridSearchResult[] = [];
    let valyuResults: ValyuSearchResult[] = [];
    let searchStrategy: EnhancedSearchResult['search_strategy'] = 'hybrid';

    try {
      // Step 1: Search memory if enabled
      if (useMemory) {
        console.log(`[ValyuMemorySearch] Searching memory for: "${query}"`);
        memoryResults = await memoryService.hybridSearch(query, {
          limit: 10,
          threshold: memoryThreshold,
          timeWindow: memoryTimeWindow,
        });

        console.log(`[ValyuMemorySearch] Found ${memoryResults.length} memory results`);
      }

      // Step 2: Decide whether to call Valyu API
      const hasGoodMemoryResults = memoryResults.length >= 3 && 
        memoryResults.some(r => r.similarity_score >= memoryThreshold);
      
      const shouldCallValyu = forceRefresh || 
        !useMemory || 
        !hasGoodMemoryResults || 
        !VALYU_API_KEY;

      if (shouldCallValyu && VALYU_API_KEY) {
        console.log(`[ValyuMemorySearch] Calling Valyu API for fresh results`);
        
        const valyu = new Valyu(VALYU_API_KEY);
        const searchTypeMap: { [key: string]: ValyuSearchSDKType } = {
          all: "all",
          web: "web",
          market: "all",
          academic: "proprietary",
          proprietary: "proprietary",
        };
        const mappedSearchType: ValyuSearchSDKType = searchTypeMap[searchType] || "all";

        const response = await valyu.search(query, {
          searchType: mappedSearchType,
          maxNumResults: 5,
          maxPrice: 50.0,
          relevanceThreshold: 0.5,
          ...(searchType === "academic" ? { includedSources: ["valyu/valyu-arxiv"] } : {}),
        });

        if (response.success && response.results) {
          valyuResults = response.results;
          
          // Store new results in memory
          try {
            await memoryService.storeSearchResults(valyuResults, query);
            console.log(`[ValyuMemorySearch] Stored ${valyuResults.length} new results in memory`);
          } catch (error) {
            console.error("[ValyuMemorySearch] Failed to store results in memory:", error);
          }
        } else {
          console.error("[ValyuMemorySearch] Valyu API error:", response.error);
        }

        searchStrategy = memoryResults.length > 0 ? 'hybrid' : 'valyu_only';
      } else if (hasGoodMemoryResults) {
        searchStrategy = 'memory_first';
        console.log(`[ValyuMemorySearch] Using memory results only (${memoryResults.length} found)`);
      } else if (!VALYU_API_KEY) {
        return {
          success: false,
          error: "Valyu API key not configured and no suitable memory results found",
          query,
          results: [],
          search_strategy: 'memory_only' as const,
          total_sources: 0,
        };
      }

      // Step 3: Combine and deduplicate results
      const combinedResults = new Map<string, ValyuSearchResult>();
      
      // Add Valyu results first (they're fresher)
      valyuResults.forEach(result => {
        combinedResults.set(result.url, result);
      });

      // Add memory results that aren't duplicates
      memoryResults.forEach(memResult => {
        if (!combinedResults.has(memResult.url)) {
          combinedResults.set(memResult.url, {
            title: memResult.title,
            url: memResult.url,
            content: memResult.content,
            relevance_score: memResult.similarity_score,
            source: memResult.source,
            metadata: {
              ...memResult.metadata,
              from_memory: true,
              original_query: memResult.query_context,
              stored_at: new Date(memResult.timestamp).toISOString(),
            },
          });
        }
      });

      const finalResults = Array.from(combinedResults.values())
        .sort((a, b) => b.relevance_score - a.relevance_score);

      const result: EnhancedSearchResult = {
        success: true,
        query,
        results: finalResults,
        memory_results: memoryResults,
        search_strategy: searchStrategy,
        total_sources: finalResults.length,
      };

      console.log(`[ValyuMemorySearch] Returning ${finalResults.length} total results (${valyuResults.length} fresh, ${memoryResults.length} from memory)`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[ValyuMemorySearch] Exception:", errorMessage);
      
      // Fallback to memory results if available
      if (memoryResults.length > 0) {
        console.log("[ValyuMemorySearch] Falling back to memory results due to error");
        return {
          success: true,
          query,
          results: memoryResults.map(r => ({
            title: r.title,
            url: r.url,
            content: r.content,
            relevance_score: r.similarity_score,
            source: r.source,
            metadata: {
              ...r.metadata,
              from_memory: true,
              fallback_reason: errorMessage,
            },
          })),
          memory_results: memoryResults,
          search_strategy: 'memory_only' as const,
          total_sources: memoryResults.length,
        };
      }

      return {
        success: false,
        error: errorMessage,
        query,
        results: [],
        search_strategy: 'hybrid' as const,
        total_sources: 0,
      };
    }
  },
});

// Memory management tool
export const memoryManagementTool = tool({
  description: "Manage the memory storage system - get statistics, cleanup old entries, or check system health.",
  inputSchema: z.object({
    action: z
      .enum(["stats", "cleanup", "health"])
      .describe("Action to perform: 'stats' for statistics, 'cleanup' to remove old entries, 'health' for system check"),
    maxAgeHours: z
      .number()
      .positive()
      .default(24)
      .describe("For cleanup: maximum age in hours for entries to keep"),
  }),
  execute: async ({ action, maxAgeHours }) => {
    try {
      switch (action) {
        case 'stats': {
          const stats = await memoryService.getStats();
          return {
            success: true,
            action,
            data: {
              total_entries: stats.totalEntries,
              entries_last_24h: stats.entriesLast24h,
              oldest_entry: stats.oldestEntry ? new Date(stats.oldestEntry).toISOString() : null,
              newest_entry: stats.newestEntry ? new Date(stats.newestEntry).toISOString() : null,
              memory_utilization: stats.entriesLast24h > 0 ? 'active' : 'idle',
            },
          };
        }
        
        case 'cleanup': {
          const deletedCount = await memoryService.cleanup(maxAgeHours);
          return {
            success: true,
            action,
            data: {
              deleted_entries: deletedCount,
              max_age_hours: maxAgeHours,
              cleanup_time: new Date().toISOString(),
            },
          };
        }
        
        case 'health': {
          // Test basic functionality
          const testQuery = "test query for health check";
          const testResults = await memoryService.semanticSearch(testQuery, { limit: 1 });
          
          const stats = await memoryService.getStats();
          
          return {
            success: true,
            action,
            data: {
              weaviate_connection: 'healthy',
              embedding_service: 'healthy',
              total_entries: stats.totalEntries,
              last_test: new Date().toISOString(),
              status: stats.totalEntries > 0 ? 'active' : 'empty',
            },
          };
        }
        
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
            action,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[MemoryManagement] ${action} failed:`, errorMessage);
      
      return {
        success: false,
        error: `Memory management ${action} failed: ${errorMessage}`,
        action,
      };
    }
  },
});
