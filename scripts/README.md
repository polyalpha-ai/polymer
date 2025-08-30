# 🤖 Multi-Agent Forecasting Scripts

This directory contains test and demo scripts for the multi-agent forecasting system.

## 📋 Prerequisites

1. **Environment Setup:**
   ```bash
   cp .env.example .env
   # Add your OPENAI_API_KEY to .env
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Build the Project:**
   ```bash
   npm run build
   ```

## 🚀 Available Scripts

### `npm run demo:simple`
**Quick demo with a single Polymarket forecast**

- Tests the complete pipeline with auto-generated drivers
- Uses a popular market (AI/AGI prediction)
- Shows forecast results and top evidence
- Perfect for first-time testing

**Example output:**
```
🤖 Multi-Agent Forecasting Demo
📊 Question: Will AI achieve AGI by 2030?
📈 Forecast Probability: 23.4%
🎯 Key Drivers: Research breakthroughs, Compute scaling, Regulatory framework
```

### `npm run test:forecast`
**Comprehensive test suite**

- Tests multiple market types (AI, politics, crypto)
- Tests both Polymarket and general forecasting
- Includes system health checks
- Shows performance metrics and error handling

**Test categories:**
- System Health Check
- Polymarket Integration Tests
- General Forecasting Tests
- Error Handling Validation

## 🎯 Customizing Tests

### Change the Market in Simple Demo

Edit `scripts/demo-simple.ts`:
```typescript
const result = await runPolymarketForecastPipeline({
  polymarketSlug: 'your-market-slug-here', // Change this
  searchFn: valyuWebSearchAdapter,
});
```

### Popular Market Slugs to Try (2025)

- `will-ai-achieve-agi-by-2030` - AI/Technology
- `bitcoin-200k-by-2030` - Cryptocurrency
- `fusion-power-commercial-by-2035` - Energy/Technology
- `will-spacex-land-on-mars-by-2030` - Space/Technology

### Add Custom Drivers

```typescript
const result = await runPolymarketForecastPipeline({
  polymarketSlug: 'your-market',
  drivers: ['Custom factor 1', 'Custom factor 2'], // Override auto-generation
  historyInterval: '4h', // Override auto-optimization
  searchFn: valyuWebSearchAdapter,
});
```

## 🔧 Troubleshooting

### Common Issues

**"OPENAI_API_KEY not found"**
- Make sure `.env` file exists with valid API key
- Ensure your key has GPT-5 access

**"Network error"**
- Check internet connection
- Verify Valyu search service is accessible

**"Invalid Polymarket slug"**
- Use a valid, active market slug
- Check the market exists on polymarket.com

**TypeScript errors**
- Run `npm run build` to check for compilation issues
- Ensure all dependencies are installed

### Debug Mode

Add more logging by setting environment variable:
```bash
DEBUG=1 npm run demo:simple
```

## 📊 Understanding Results

### Forecast Probability
- **p_neutral**: Evidence-based probability (ignoring market)
- **p_aware**: Market-blended probability (small α blend)

### Evidence Influence
- **deltaPP**: How much each piece of evidence moved the forecast
- **logLR**: Log-likelihood ratio of the evidence

### Drivers
- **Auto-generated**: System analyzes market and creates relevant factors
- **Custom**: User-provided key factors to focus analysis on

### Evidence Types
- **Type A (2.0 cap)**: Primary data, official documents
- **Type B (1.6 cap)**: Secondary sources, expert analysis
- **Type C (0.8 cap)**: Tertiary sources citing primary/secondary
- **Type D (0.3 cap)**: Weak sources, speculation

## 🎯 Next Steps

1. **Start with simple demo**: `npm run demo:simple`
2. **Run full test suite**: `npm run test:forecast`
3. **Try different markets**: Edit the slug in demo-simple.ts
4. **Build your own integration**: Use the API at `/api/forecast`

## 📚 Related Documentation

- [Multi-Agent System Architecture](../src/lib/agents/README.md)
- [Forecasting Mathematics](../src/lib/forecasting/README.md)
- [API Documentation](../src/app/api/forecast/README.md)
