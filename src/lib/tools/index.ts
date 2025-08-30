import { valyuDeepSearchTool, valyuWebSearchTool } from './valyu_search';
import { 
  valyuDeepSearchWithMemoryTool, 
  memorySearchTool, 
  memoryManagementTool 
} from './valyu_search_with_memory';
import {
  embeddingConfigTool,
  semanticSimilarityTool,
  memoryOptimizationTool,
} from './embedding_tools';

// Export all tools from a central location
export { valyuDeepSearchTool, valyuWebSearchTool } from './valyu_search';
export { 
  valyuDeepSearchWithMemoryTool, 
  memorySearchTool, 
  memoryManagementTool 
} from './valyu_search_with_memory';
export {
  embeddingConfigTool,
  semanticSimilarityTool,
  memoryOptimizationTool,
} from './embedding_tools';

// Basic tool set (original tools)
export const valyuToolSet = {
  valyuDeepSearch: valyuDeepSearchTool,
  valyuWebSearch: valyuWebSearchTool,
} as const;

// Enhanced tool set with memory capabilities
export const valyuMemoryToolSet = {
  valyuDeepSearchWithMemory: valyuDeepSearchWithMemoryTool,
  valyuWebSearch: valyuWebSearchTool, // Keep original web search
  memorySearch: memorySearchTool,
  memoryManagement: memoryManagementTool,
} as const;

// Advanced tool set with embedding optimization
export const valyuAdvancedToolSet = {
  ...valyuMemoryToolSet,
  embeddingConfig: embeddingConfigTool,
  semanticSimilarity: semanticSimilarityTool,
  memoryOptimization: memoryOptimizationTool,
} as const;

// Complete tool set with all tools
export const completeToolSet = {
  ...valyuAdvancedToolSet,
} as const;

// Export types for external use
export type { ValyuSearchResult, ValyuToolResult } from './valyu_search';
export type { EnhancedSearchResult, HybridSearchResult } from './valyu_search_with_memory';
