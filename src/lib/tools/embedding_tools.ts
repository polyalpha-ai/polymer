import { z } from "zod";
import { tool } from "ai";
import { memoryService, createMemoryService, memoryConfigurations } from "../memory/simple-memory";
import type { EmbeddingOptions } from "../memory/simple-memory";

// Enhanced embedding configuration tool
export const embeddingConfigTool = tool({
  description: "Configure and optimize embedding settings for the memory system. Use this to adjust performance, quality, and cost trade-offs.",
  inputSchema: z.object({
    action: z
      .enum(["get", "set", "benchmark", "presets"])
      .describe("Action: 'get' current config, 'set' new config, 'benchmark' performance, 'presets' show available configurations"),

    dimensions: z
      .number()
      .min(256)
      .max(3072)
      .optional()
      .describe("Embedding dimensions (only for text-embedding-3-* models)"),
    maxRetries: z
      .number()
      .min(0)
      .max(5)
      .optional()
      .describe("Maximum retry attempts for failed embeddings"),
    maxParallelCalls: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Maximum parallel embedding requests"),
    preset: z
      .enum(["development", "production", "highQuality", "fastProcessing"])
      .optional()
      .describe("Use a predefined configuration preset"),
  }),
  execute: async ({ action, dimensions, maxRetries, maxParallelCalls, preset }) => {
    try {
      switch (action) {
        case 'get': {
          const config = memoryService.getEmbeddingConfig();
          return {
            success: true,
            action,
            current_config: config,
            description: "Current embedding configuration",
          };
        }
        
        case 'set': {
          const newConfig: Partial<EmbeddingOptions> = {};
          if (dimensions) newConfig.dimensions = dimensions;
          if (maxRetries !== undefined) newConfig.maxRetries = maxRetries;
          if (maxParallelCalls) newConfig.maxParallelCalls = maxParallelCalls;
          
          if (preset) {
            const presetConfig = memoryConfigurations[preset];
            Object.assign(newConfig, presetConfig);
          }
          
          memoryService.updateEmbeddingConfig(newConfig);
          
          return {
            success: true,
            action,
            updated_config: memoryService.getEmbeddingConfig(),
            description: "Embedding configuration updated successfully",
          };
        }
        
        case 'benchmark': {
          const results = await memoryService.benchmarkEmbedding();
          
          return {
            success: true,
            action,
            benchmark_results: {
              single_embedding_time_ms: results.singleEmbeddingTime,
              batch_embedding_time_ms: results.batchEmbeddingTime,
              average_time_per_embedding_ms: results.averageTimePerEmbedding,
              estimated_tokens_used: results.tokensUsed,
              performance_rating: results.averageTimePerEmbedding < 100 ? 'excellent' : 
                                results.averageTimePerEmbedding < 300 ? 'good' : 'needs_optimization',
            },
            description: "Embedding performance benchmark completed",
          };
        }
        
        case 'presets': {
          return {
            success: true,
            action,
            available_presets: {
              development: {
                ...memoryConfigurations.development,
                model: "text-embedding-3-small",
                description: "Fast and cost-effective for development",
                use_case: "Local development, testing, prototyping",
              },
              production: {
                ...memoryConfigurations.production,
                model: "text-embedding-3-small",
                description: "Balanced for production workloads",
                use_case: "Production applications with moderate load",
              },
              highQuality: {
                ...memoryConfigurations.highQuality,
                model: "text-embedding-3-small",
                description: "High quality embeddings with text-embedding-3-small",
                use_case: "Applications requiring good accuracy with cost efficiency",
              },
              fastProcessing: {
                ...memoryConfigurations.fastProcessing,
                model: "text-embedding-3-small",
                description: "Optimized for speed with reduced dimensions",
                use_case: "High-throughput applications, real-time processing",
              },
            },
            description: "Available embedding configuration presets",
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
      console.error(`[EmbeddingConfigTool] ${action} failed:`, errorMessage);
      
      return {
        success: false,
        error: `Embedding configuration ${action} failed: ${errorMessage}`,
        action,
      };
    }
  },
});

// Semantic similarity analysis tool
export const semanticSimilarityTool = tool({
  description: "Analyze semantic similarity between texts using AI SDK embeddings. Useful for understanding how similar different pieces of content are.",
  inputSchema: z.object({
    texts: z
      .array(z.string())
      .min(2)
      .max(10)
      .describe("Array of texts to compare (2-10 texts)"),
    includeMatrix: z
      .boolean()
      .default(false)
      .describe("Include full similarity matrix in results"),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.7)
      .describe("Similarity threshold for highlighting similar pairs"),
  }),
  execute: async ({ texts, includeMatrix, threshold }) => {
    try {
      // Create a temporary memory service for this analysis
      const analysisService = createMemoryService();
      await analysisService.initialize();
      
      // Generate embeddings for all texts
      const embeddings = await (analysisService as any).generateEmbeddings(texts);
      
      // Calculate similarity matrix
      const similarities: number[][] = [];
      const similarPairs: Array<{
        text1: string;
        text2: string;
        similarity: number;
        index1: number;
        index2: number;
      }> = [];
      
      for (let i = 0; i < texts.length; i++) {
        similarities[i] = [];
        for (let j = 0; j < texts.length; j++) {
          const similarity = (analysisService as any).calculateSimilarity(embeddings[i], embeddings[j]);
          similarities[i][j] = similarity;
          
          // Track similar pairs (avoid duplicates and self-comparison)
          if (i < j && similarity >= threshold) {
            similarPairs.push({
              text1: texts[i],
              text2: texts[j],
              similarity,
              index1: i,
              index2: j,
            });
          }
        }
      }
      
      // Find most and least similar pairs
      let mostSimilar = { similarity: -1, pair: null as any };
      let leastSimilar = { similarity: 2, pair: null as any };
      
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const similarity = similarities[i][j];
          if (similarity > mostSimilar.similarity) {
            mostSimilar = {
              similarity,
              pair: { text1: texts[i], text2: texts[j], index1: i, index2: j },
            };
          }
          if (similarity < leastSimilar.similarity) {
            leastSimilar = {
              similarity,
              pair: { text1: texts[i], text2: texts[j], index1: i, index2: j },
            };
          }
        }
      }
      
      const result: any = {
        success: true,
        analysis: {
          total_comparisons: (texts.length * (texts.length - 1)) / 2,
          similar_pairs_count: similarPairs.length,
          threshold_used: threshold,
          most_similar: mostSimilar.pair ? {
            ...mostSimilar.pair,
            similarity_score: mostSimilar.similarity,
          } : null,
          least_similar: leastSimilar.pair ? {
            ...leastSimilar.pair,
            similarity_score: leastSimilar.similarity,
          } : null,
          similar_pairs: similarPairs.map(pair => ({
            text1_preview: pair.text1.substring(0, 50) + (pair.text1.length > 50 ? '...' : ''),
            text2_preview: pair.text2.substring(0, 50) + (pair.text2.length > 50 ? '...' : ''),
            similarity_score: pair.similarity,
            indices: [pair.index1, pair.index2],
          })),
        },
        description: `Analyzed semantic similarity between ${texts.length} texts`,
      };
      
      // Include full matrix if requested
      if (includeMatrix) {
        result.similarity_matrix = similarities.map((row, i) => 
          row.map((similarity, j) => ({
            text1_index: i,
            text2_index: j,
            similarity_score: similarity,
          }))
        );
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[SemanticSimilarityTool] Analysis failed:", errorMessage);
      
      return {
        success: false,
        error: `Semantic similarity analysis failed: ${errorMessage}`,
        texts_count: texts.length,
      };
    }
  },
});

// Memory optimization tool
export const memoryOptimizationTool = tool({
  description: "Analyze and optimize memory system performance. Get insights about memory usage, embedding efficiency, and optimization recommendations.",
  inputSchema: z.object({
    action: z
      .enum(["analyze", "optimize", "cleanup", "recommendations"])
      .describe("Action: 'analyze' current state, 'optimize' settings, 'cleanup' old data, 'recommendations' get suggestions"),
    aggressiveCleanup: z
      .boolean()
      .default(false)
      .describe("For cleanup: remove more aggressively (shorter retention)"),
    targetMemoryMB: z
      .number()
      .positive()
      .optional()
      .describe("Target memory usage in MB for optimization"),
  }),
  execute: async ({ action, aggressiveCleanup, targetMemoryMB }) => {
    try {
      switch (action) {
        case 'analyze': {
          const stats = await memoryService.getStats();
          const memorySize = memoryService.getMemorySize();
          const config = memoryService.getEmbeddingConfig();
          
          // Calculate efficiency metrics
          const avgEmbeddingSize = stats.totalEntries > 0 ? memorySize / stats.totalEntries : 0;
          const recentActivityRatio = stats.totalEntries > 0 ? stats.entriesLast24h / stats.totalEntries : 0;
          
          return {
            success: true,
            action,
            analysis: {
              memory_usage: {
                total_size_mb: memorySize,
                total_entries: stats.totalEntries,
                entries_last_24h: stats.entriesLast24h,
                average_entry_size_kb: avgEmbeddingSize * 1024,
                recent_activity_ratio: recentActivityRatio,
              },
              performance_metrics: {
                embedding_model: 'text-embedding-3-small',
                embedding_dimensions: config.dimensions || 1536,
                max_parallel_calls: config.maxParallelCalls,
                max_retries: config.maxRetries,
              },
              health_indicators: {
                memory_efficiency: memorySize < 50 ? 'excellent' : memorySize < 200 ? 'good' : 'needs_attention',
                activity_level: recentActivityRatio > 0.5 ? 'high' : recentActivityRatio > 0.2 ? 'moderate' : 'low',
                storage_utilization: stats.totalEntries > 100 ? 'high' : stats.totalEntries > 20 ? 'moderate' : 'low',
              },
            },
            description: "Memory system analysis completed",
          };
        }
        
        case 'optimize': {
          const currentSize = memoryService.getMemorySize();
          const stats = await memoryService.getStats();
          
          let optimizations = [];
          let newConfig: Partial<EmbeddingOptions> = {};
          
          // Optimize based on current usage
          if (currentSize > 100) {
            // Large memory usage - optimize for efficiency
            newConfig = memoryConfigurations.fastProcessing;
            optimizations.push("Switched to fast processing configuration with reduced dimensions");
          } else if (stats.entriesLast24h > 50) {
            // High activity - optimize for throughput
            newConfig = { ...memoryConfigurations.production, maxParallelCalls: 8 };
            optimizations.push("Increased parallel processing for high activity");
          } else {
            // Low activity - optimize for quality
            newConfig = memoryConfigurations.highQuality;
            optimizations.push("Switched to high quality configuration");
          }
          
          // Apply target memory optimization if specified
          if (targetMemoryMB && currentSize > targetMemoryMB) {
            const cleanupHours = aggressiveCleanup ? 12 : 48;
            const deletedCount = await memoryService.cleanup(cleanupHours);
            optimizations.push(`Cleaned up ${deletedCount} entries to reduce memory usage`);
          }
          
          memoryService.updateEmbeddingConfig(newConfig);
          
          return {
            success: true,
            action,
            optimizations_applied: optimizations,
            new_configuration: memoryService.getEmbeddingConfig(),
            memory_size_before_mb: currentSize,
            memory_size_after_mb: memoryService.getMemorySize(),
            description: "Memory system optimized successfully",
          };
        }
        
        case 'cleanup': {
          const beforeStats = await memoryService.getStats();
          const beforeSize = memoryService.getMemorySize();
          
          const cleanupHours = aggressiveCleanup ? 6 : 24;
          const deletedCount = await memoryService.cleanup(cleanupHours);
          
          const afterStats = await memoryService.getStats();
          const afterSize = memoryService.getMemorySize();
          
          return {
            success: true,
            action,
            cleanup_results: {
              entries_deleted: deletedCount,
              cleanup_threshold_hours: cleanupHours,
              memory_freed_mb: beforeSize - afterSize,
              entries_before: beforeStats.totalEntries,
              entries_after: afterStats.totalEntries,
              cleanup_efficiency: beforeStats.totalEntries > 0 ? 
                (deletedCount / beforeStats.totalEntries) * 100 : 0,
            },
            description: `Cleanup completed: removed ${deletedCount} entries`,
          };
        }
        
        case 'recommendations': {
          const stats = await memoryService.getStats();
          const memorySize = memoryService.getMemorySize();
          const config = memoryService.getEmbeddingConfig();
          
          const recommendations = [];
          
          // Memory usage recommendations
          if (memorySize > 200) {
            recommendations.push({
              category: "memory_usage",
              priority: "high",
              recommendation: "Consider aggressive cleanup or switching to reduced dimensions",
              action: "Use cleanup with aggressiveCleanup=true or fastProcessing preset",
            });
          } else if (memorySize > 100) {
            recommendations.push({
              category: "memory_usage",
              priority: "medium", 
              recommendation: "Monitor memory growth and consider periodic cleanup",
              action: "Schedule regular cleanup every 24-48 hours",
            });
          }
          
          // Performance recommendations
          if (stats.entriesLast24h > 100) {
            recommendations.push({
              category: "performance",
              priority: "medium",
              recommendation: "High activity detected - increase parallel processing",
              action: "Increase maxParallelCalls to 6-8 for better throughput",
            });
          }
          
          // Configuration recommendations
          if (config.dimensions && config.dimensions < 512) {
            recommendations.push({
              category: "configuration",
              priority: "low",
              recommendation: "Very low dimensions may impact accuracy",
              action: "Consider using at least 512 dimensions for better quality",
            });
          }
          
          // Activity-based recommendations
          const recentActivityRatio = stats.totalEntries > 0 ? stats.entriesLast24h / stats.totalEntries : 0;
          if (recentActivityRatio < 0.1 && stats.totalEntries > 50) {
            recommendations.push({
              category: "maintenance",
              priority: "medium",
              recommendation: "Low recent activity with many old entries",
              action: "Consider cleanup to remove stale data",
            });
          }
          
          return {
            success: true,
            action,
            recommendations,
            system_health: {
              overall_score: recommendations.filter(r => r.priority === 'high').length === 0 ? 
                (recommendations.filter(r => r.priority === 'medium').length === 0 ? 'excellent' : 'good') : 'needs_attention',
              total_recommendations: recommendations.length,
              high_priority_issues: recommendations.filter(r => r.priority === 'high').length,
            },
            description: `Generated ${recommendations.length} optimization recommendations`,
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
      console.error(`[MemoryOptimizationTool] ${action} failed:`, errorMessage);
      
      return {
        success: false,
        error: `Memory optimization ${action} failed: ${errorMessage}`,
        action,
      };
    }
  },
});
