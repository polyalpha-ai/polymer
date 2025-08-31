import { Polar } from '@polar-sh/sdk';

export class PolarEventTracker {
  private polar: Polar;
  
  constructor() {
    if (!process.env.POLAR_ACCESS_TOKEN) {
      throw new Error('POLAR_ACCESS_TOKEN is required for event tracking');
    }
    
    this.polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN
    });
  }
  
  async trackValyuAPIUsage(
    userId: string,
    customerId: string,
    searchType: string,
    costDollars: number,
    metadata: Record<string, any> = {}
  ) {
    try {
      const markedUpCost = costDollars * 1.2; // 20% markup
      
      // Use Polar SDK events.ingest API
      await this.polar.events.ingest({
        events: [{
          name: 'valyu_api_usage',
          customerId: customerId,
          metadata: {
            billable_amount: Math.ceil(markedUpCost * 100), // Convert to cents with 20% markup
            user_id: userId,
            search_type: searchType,
            original_cost: costDollars,
            markup: 0.2,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        }]
      });
      
      console.log(`[PolarEventTracker] Tracked Valyu usage: $${markedUpCost} for customer ${customerId}`);
    } catch (error) {
      console.error('[PolarEventTracker] Failed to track Valyu usage:', error);
      throw error;
    }
  }
}