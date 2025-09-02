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
      const markedUpCost = costDollars * 1.2;
      
      // Use Polar SDK events.ingest API
      await this.polar.events.ingest({
        events: [{
          name: 'valyu_api_usage',
          customerId: customerId,
          metadata: {
            billable_amount: Math.ceil(markedUpCost * 100),
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

  async trackDarkModeSwitch(
    userId: string,
    customerId: string,
    sessionId: string,
    fromTheme: string,
    toTheme: string,
    metadata: Record<string, any> = {}
  ) {
    try {
      // Skip tracking in development environment
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PolarEventTracker] Development mode - would track dark mode switch: ${fromTheme} -> ${toTheme}`);
        return;
      }

      if (!customerId) {
        throw new Error(`No Polar customer ID provided for user ${userId}`);
      }

      // Fixed pricing: $0.01 per theme switch (1 unit = 1 cent)
      const billableAmount = 1; // 1 cent
      
      // Use Polar SDK events.ingest API
      await this.polar.events.ingest({
        events: [{
          name: 'dark_mode_switcher',
          customerId: customerId,
          metadata: {
            billable_amount: billableAmount,
            from_theme: fromTheme,
            to_theme: toTheme,
            session_id: sessionId,
            component: 'theme_switcher',
            user_id: userId,
            cost_usd: 0.01,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        }]
      });
      
      console.log(`[PolarEventTracker] Tracked dark mode switch: ${fromTheme} -> ${toTheme} ($0.01) for customer ${customerId}`);
    } catch (error) {
      console.error('[PolarEventTracker] Failed to track dark mode switch:', error);
      throw error;
    }
  }

}