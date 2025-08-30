import weaviate from 'weaviate-client';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { ValyuSearchResult } from '../tools/valyu_search';

// Types for memory storage
export interface MemorySnippet {
  id: string;
  content: string;
  title: string;
  url: string;
  source: string;
  relevance_score: number;
  timestamp: number;
  query_context: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface HybridSearchResult extends MemorySnippet {
  similarity_score: number;
  search_type: 'semantic' | 'keyword' | 'hybrid';
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  includeKeyword?: boolean;
  timeWindow?: number; // hours
}

export class WeaviateMemoryService {
  private client: any;
  private className = 'ValyuMemorySnippet';
  private isInitialized = false;

  constructor() {
    const weaviateUrl = process.env.WEAVIATE_URL || 'http://localhost:8080';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY;

    this.client = weaviate.client({
      url: weaviateUrl,
      ...(weaviateApiKey && { 
        authClientSecret: {
          clientSecret: weaviateApiKey,
        },
      }),
    });
  }

  /**
   * Initialize the Weaviate schema for memory storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if class already exists
      const exists = await this.client.collections
        .exists(this.className)
        .catch(() => false);

      if (!exists) {
        // Create the collection
        await this.client.collections.create({
            name: this.className,
            description: 'Memory snippets from Valyu search results with embeddings',
            vectorizers: weaviate.configure.vectorizer.none(),
            properties: [
              weaviate.configure.property.text('content', {
                description: 'The main content of the snippet',
              }),
              weaviate.configure.property.text('title', {
                description: 'Title of the source document',
              }),
              weaviate.configure.property.text('url', {
                description: 'URL of the source document',
              }),
              weaviate.configure.property.text('source', {
                description: 'Source identifier (e.g., valyu/arxiv)',
              }),
              weaviate.configure.property.number('relevance_score', {
                description: 'Original relevance score from Valyu',
              }),
              weaviate.configure.property.number('timestamp', {
                description: 'Unix timestamp when stored',
              }),
              weaviate.configure.property.text('query_context', {
                description: 'The original query that retrieved this result',
              }),
              weaviate.configure.property.object('metadata', {
                description: 'Additional metadata from the search result',
              }),
            ],
          });

        console.log(`Created Weaviate class: ${this.className}`);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Weaviate schema:', error);
      throw new Error('Weaviate initialization failed');
    }
  }

  /**
   * Generate embeddings for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: text,
      });
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error('Embedding generation failed');
    }
  }

  /**
   * Store Valyu search results in memory with embeddings
   */
  async storeSearchResults(
    results: ValyuSearchResult[],
    queryContext: string
  ): Promise<string[]> {
    await this.initialize();

    const storedIds: string[] = [];
    const timestamp = Date.now();

    for (const result of results) {
      try {
        // Generate embedding for the content
        const embedding = await this.generateEmbedding(
          `${result.title} ${result.content}`
        );

        // Create memory snippet
        const snippet: MemorySnippet = {
          id: `valyu_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
          content: result.content,
          title: result.title,
          url: result.url,
          source: result.source,
          relevance_score: result.relevance_score,
          timestamp,
          query_context: queryContext,
          metadata: result.metadata || {},
          embedding,
        };

        // Store in Weaviate
        const collection = this.client.collections.get(this.className);
        const response = await collection.data.insert({
          id: snippet.id,
          properties: {
            content: snippet.content,
            title: snippet.title,
            url: snippet.url,
            source: snippet.source,
            relevance_score: snippet.relevance_score,
            timestamp: snippet.timestamp,
            query_context: snippet.query_context,
            metadata: snippet.metadata,
          },
          vectors: embedding,
        });

        storedIds.push(snippet.id);
        console.log(`Stored memory snippet: ${snippet.id}`);
      } catch (error) {
        console.error(`Failed to store result: ${result.title}`, error);
      }
    }

    return storedIds;
  }

  /**
   * Perform semantic search using vector similarity
   */
  async semanticSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    await this.initialize();

    const {
      limit = 10,
      threshold = 0.7,
      timeWindow,
    } = options;

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Build the query
      const collection = this.client.collections.get(this.className);
      let queryBuilder = collection.query.nearVector(queryEmbedding, {
        limit,
        distance: 1 - threshold, // Convert similarity to distance
        returnMetadata: ['distance'],
      });

      // Add time window filter if specified
      if (timeWindow) {
        const cutoffTime = Date.now() - (timeWindow * 60 * 60 * 1000);
        queryBuilder = queryBuilder.where(
          collection.filter.byProperty('timestamp').greaterThan(cutoffTime)
        );
      }

      const response = await queryBuilder;

      const results: HybridSearchResult[] = response.objects?.map((item: any) => ({
        id: item.uuid || 'unknown',
        content: item.properties.content,
        title: item.properties.title,
        url: item.properties.url,
        source: item.properties.source,
        relevance_score: item.properties.relevance_score,
        timestamp: item.properties.timestamp,
        query_context: item.properties.query_context,
        metadata: item.properties.metadata || {},
        similarity_score: item.metadata?.distance ? 1 - item.metadata.distance : 0,
        search_type: 'semantic' as const,
      })) || [];

      return results;
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Perform keyword search using BM25
   */
  async keywordSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    await this.initialize();

    const {
      limit = 10,
      timeWindow,
    } = options;

    try {
      // Build the query
      const collection = this.client.collections.get(this.className);
      let queryBuilder = collection.query.bm25(query, {
        limit,
        properties: ['content', 'title', 'query_context'],
        returnMetadata: ['score'],
      });

      // Add time window filter if specified
      if (timeWindow) {
        const cutoffTime = Date.now() - (timeWindow * 60 * 60 * 1000);
        queryBuilder = queryBuilder.where(
          collection.filter.byProperty('timestamp').greaterThan(cutoffTime)
        );
      }

      const response = await queryBuilder;

      const results: HybridSearchResult[] = response.objects?.map((item: any) => ({
        id: item.uuid || 'unknown',
        content: item.properties.content,
        title: item.properties.title,
        url: item.properties.url,
        source: item.properties.source,
        relevance_score: item.properties.relevance_score,
        timestamp: item.properties.timestamp,
        query_context: item.properties.query_context,
        metadata: item.properties.metadata || {},
        similarity_score: item.metadata?.score || 0,
        search_type: 'keyword' as const,
      })) || [];

      return results;
    } catch (error) {
      console.error('Keyword search failed:', error);
      return [];
    }
  }

  /**
   * Perform hybrid search combining semantic and keyword search
   */
  async hybridSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const {
      limit = 10,
      includeKeyword = true,
    } = options;

    try {
      // Perform both searches in parallel
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(query, { ...options, limit: Math.ceil(limit * 0.7) }),
        includeKeyword 
          ? this.keywordSearch(query, { ...options, limit: Math.ceil(limit * 0.5) })
          : Promise.resolve([]),
      ]);

      // Combine and deduplicate results
      const combinedResults = new Map<string, HybridSearchResult>();

      // Add semantic results
      semanticResults.forEach(result => {
        combinedResults.set(result.id, {
          ...result,
          search_type: 'hybrid' as const,
        });
      });

      // Add keyword results (merge if already exists)
      keywordResults.forEach(result => {
        const existing = combinedResults.get(result.id);
        if (existing) {
          // Boost score for items found in both searches
          existing.similarity_score = Math.max(existing.similarity_score, result.similarity_score) * 1.2;
        } else {
          combinedResults.set(result.id, {
            ...result,
            search_type: 'hybrid' as const,
          });
        }
      });

      // Sort by similarity score and limit results
      return Array.from(combinedResults.values())
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);
    } catch (error) {
      console.error('Hybrid search failed:', error);
      return [];
    }
  }

  /**
   * Clean up old memory entries
   */
  async cleanup(maxAgeHours: number = 24): Promise<number> {
    await this.initialize();

    try {
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

      const collection = this.client.collections.get(this.className);
      const response = await collection.data.deleteMany(
        collection.filter.byProperty('timestamp').lessThan(cutoffTime)
      );

      const deletedCount = response.successful || 0;
      console.log(`Cleaned up ${deletedCount} old memory entries`);
      return deletedCount;
    } catch (error) {
      console.error('Memory cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    entriesLast24h: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    await this.initialize();

    try {
      const collection = this.client.collections.get(this.className);
      
      // Get total count
      const totalResponse = await collection.aggregate.overAll();
      const totalEntries = totalResponse.totalCount || 0;

      // Get entries from last 24 hours
      const last24h = Date.now() - (24 * 60 * 60 * 1000);
      const recentResponse = await collection.aggregate.overAll({
        where: collection.filter.byProperty('timestamp').greaterThan(last24h),
      });
      const entriesLast24h = recentResponse.totalCount || 0;

      // For timestamp range, we'll use a simple approach
      // In a production system, you might want to implement this differently
      const timestampData = { minimum: null, maximum: null };

              return {
          totalEntries,
          entriesLast24h,
          oldestEntry: timestampData.minimum,
          newestEntry: timestampData.maximum,
        };
    } catch (error) {
      console.error('Failed to get memory stats:', error);
      return {
        totalEntries: 0,
        entriesLast24h: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }
}

// Singleton instance
export const memoryService = new WeaviateMemoryService();
