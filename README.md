# Polyseer - See the Future.

> *Everyone wishes they could go back and buy Bitcoin at $1. Polyseer brings the future to you, so you never have to wonder "what if?" again.*

**⚠️ NOT FINANCIAL ADVICE** | Polyseer provides analysis for entertainment and research purposes only. Always DYOR.

## 🌟 The Story

We've all been there. December 2017 - Bitcoin hits $20K and you think "If only I had bought it years ago." The signs were there, the technology was revolutionary, but the noise drowned out the signal.

**What if you could see through the noise?**

Polyseer is your crystal ball into Polymarket's prediction markets. Using advanced AI agents and real-time data from Valyu's search network, it cuts through speculation and gives you analyst-grade verdicts on future events.

- 🎯 **Precise Predictions**: Multi-agent AI system that researches both sides
- 🔍 **Deep Research**: Powered by Valyu's search network across academic, web, and proprietary datasets
- 📊 **Mathematical Rigor**: Bayesian probability aggregation with evidence weighting
- ⚡ **Real-time Analysis**: Fresh data from multiple sources, not stale information
- 🎪 **Beautiful UX**: Stunning interface that makes complex analysis digestible

**Ready to stop missing opportunities?** Paste any Polymarket URL and get your verdict.

---

## 🏗️ Architecture Overview

Polyseer is built on a **multi-agent AI architecture** that orchestrates specialized agents to conduct deep analysis. Here's how the magic happens:

```mermaid
graph TD
    A[User Input: Polymarket URL] --> B[Data Fetcher]
    B --> C[Orchestrator]
    C --> D[Planner Agent]
    D --> E[Research Agents]
    E --> F[Valyu Search Network]
    F --> G[Evidence Collection]
    G --> H[Critic Agent]
    H --> I[Analyst Agent]
    I --> J[Reporter Agent]
    J --> K[Final Verdict]
    
    style A fill:#e1f5fe
    style K fill:#c8e6c9
    style F fill:#fff3e0
    style C fill:#f3e5f5
```

### 🧠 Agent System Deep Dive

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Orch as 🎭 Orchestrator
    participant Plan as 🗺️ Planner
    participant Res as 🔍 Researcher
    participant Valyu as 🌐 Valyu Network
    participant Critic as 🧪 Critic
    participant Analyst as 📊 Analyst
    participant Reporter as 📝 Reporter
    
    User->>Orch: Polymarket URL
    Orch->>Plan: Generate research strategy
    Plan->>Orch: Subclaims + search seeds
    
    par Research Cycle 1
        Orch->>Res: Research PRO evidence
        Res->>Valyu: Deep + Web searches
        Valyu-->>Res: Academic papers, news, data
        and
        Orch->>Res: Research CON evidence  
        Res->>Valyu: Targeted counter-searches
        Valyu-->>Res: Contradicting evidence
    end
    
    Orch->>Critic: Analyze evidence gaps
    Critic->>Orch: Follow-up search recommendations
    
    par Research Cycle 2 (if gaps found)
        Orch->>Res: Targeted follow-up searches
        Res->>Valyu: Fill identified gaps
        Valyu-->>Res: Missing evidence
    end
    
    Orch->>Analyst: Bayesian probability aggregation
    Analyst->>Orch: pNeutral, pAware, evidence weights
    
    Orch->>Reporter: Generate final report
    Reporter->>User: 📋 Analyst-grade verdict
```

## 🔬 Deep Research System

### Valyu Integration

Polyseer leverages [Valyu's search network](https://valyu.network) to access:

- **🎓 Academic Papers**: Real-time research publications
- **🌐 Web Intelligence**: Fresh news and analysis  
- **📈 Market Data**: Financial and trading information
- **🏛️ Proprietary Datasets**: Exclusive Valyu intelligence

```mermaid
graph LR
    A[Research Query] --> B[Valyu Deep Search]
    B --> C[Academic Sources]
    B --> D[Web Sources]
    B --> E[Market Data]
    B --> F[Proprietary Intel]
    
    C --> G[Evidence Classification]
    D --> G
    E --> G  
    F --> G
    
    G --> H[Type A: Primary Sources]
    G --> I[Type B: High-Quality Secondary]
    G --> J[Type C: Standard Secondary]
    G --> K[Type D: Weak/Speculative]
    
    style B fill:#fff3e0
    style H fill:#c8e6c9
    style I fill:#dcedc8
    style J fill:#f0f4c3
    style K fill:#ffcdd2
```

### Evidence Quality System

Each piece of evidence is rigorously classified:

| Type | Description | Cap | Examples |
|------|-------------|-----|----------|
| **A** | Primary Sources | 2.0 | Official documents, press releases, regulatory filings |
| **B** | High-Quality Secondary | 1.6 | Reuters, Bloomberg, WSJ, expert analysis |
| **C** | Standard Secondary | 0.8 | Reputable news with citations, industry publications |
| **D** | Weak/Speculative | 0.3 | Social media, unverified claims, rumors |

## 📊 Mathematical Foundation

### Bayesian Probability Aggregation

Polyseer uses sophisticated mathematical models to combine evidence:

```mermaid
graph TD
    A[Prior Probability p0] --> B[Evidence Weights]
    B --> C[Log Likelihood Ratios]
    C --> D[Correlation Adjustments]
    D --> E[Cluster Analysis]
    E --> F[Final Probabilities]
    
    F --> G[pNeutral: Objective Assessment]
    F --> H[pAware: Market-Informed]
    
    style A fill:#e3f2fd
    style F fill:#c8e6c9
    style G fill:#dcedc8
    style H fill:#f0f4c3
```

**Key Formulas:**
- **Log Likelihood Ratio**: `LLR = log(P(evidence|YES) / P(evidence|NO))`
- **Probability Update**: `p_new = p_old × exp(LLR)`
- **Correlation Adjustment**: Accounts for evidence clustering and dependencies

### Evidence Influence Calculation

Each piece of evidence receives an influence score based on:
- **Verifiability**: Can the claim be independently verified?
- **Consistency**: Internal logical coherence
- **Independence**: Number of independent corroborations
- **Recency**: How fresh is the information?

## 🛠️ Technology Stack

### Frontend
- **⚡ Next.js 15.5** - React framework with Turbopack
- **🎨 Tailwind CSS 4** - Utility-first styling
- **🎭 Framer Motion** - Smooth animations
- **🌈 Radix UI** - Accessible components
- **⚛️ React 19** - Latest React features

### Backend & APIs
- **🤖 AI SDK** - LLM orchestration
- **🧠 GPT-5** - Advanced reasoning model
- **🔍 Valyu JS SDK** - Search network integration
- **📊 Polymarket API** - Market data fetching
- **💾 Supabase** - Database and authentication
- **💳 Polar** - Subscription and billing

### State Management
- **🐻 Zustand** - Simple state management
- **🔄 TanStack Query** - Server state synchronization
- **🍪 Supabase SSR** - Server-side authentication

### Infrastructure
- **🔐 TypeScript** - Type safety throughout
- **🎯 Zod** - Runtime type validation  
- **📝 ESLint** - Code quality
- **🏗️ Vercel** - Deployment platform

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- **npm/pnpm/yarn**
- **Supabase account**
- **Polar account** (for billing)
- **Valyu API key**
- **OpenAI API key**

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/polyseer.git
cd polyseer
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Environment Setup

Create `.env.local` and configure the following variables:

#### 🔐 Core API Keys
```env
# OpenAI (GPT-5 access required)
OPENAI_API_KEY=sk-...

# Valyu Search Network
VALYU_API_KEY=vl_...

# Polymarket (optional, for enhanced data)
POLYMARKET_API_KEY=pm_...
```

#### 🏛️ Database & Auth (Supabase)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

#### 💳 Billing & Subscriptions (Polar)
```env
POLAR_ACCESS_TOKEN=polar_...
POLAR_SUBSCRIPTION_PRODUCT_ID=prod_...
POLAR_PAY_PER_USE_PRODUCT_ID=prod_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 🧠 Memory System (Optional)
```env
MEMORY_ENABLED=true
WEAVIATE_URL=https://your-weaviate.weaviate.network
WEAVIATE_API_KEY=wv_...
```

#### 🌍 App Configuration
```env
NEXT_PUBLIC_APP_MODE=development
NODE_ENV=development
```

### 4. Database Setup

Set up your Supabase database with the following tables:

```sql
-- Users table with subscription info
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'inactive',
  analyses_remaining INTEGER DEFAULT 0,
  total_analyses_run INTEGER DEFAULT 0,
  polar_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis sessions
CREATE TABLE analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  polymarket_slug TEXT NOT NULL,
  market_question TEXT,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  valyu_cost DECIMAL(10,6),
  analysis_steps JSONB,
  forecast_card JSONB,
  markdown_report TEXT,
  current_step TEXT,
  progress_events JSONB,
  p0 DECIMAL(5,4),
  p_neutral DECIMAL(5,4),
  p_aware DECIMAL(5,4),
  drivers TEXT[],
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start analyzing markets!

---

## 🎮 Usage Examples

### Basic Analysis
```typescript
import { runPolymarketForecastPipeline } from '@/lib/agents/orchestrator';

const forecast = await runPolymarketForecastPipeline({
  polymarketSlug: 'will-bitcoin-reach-100k-by-2025',
  onProgress: (step, details) => {
    console.log(`${step}: ${details.message}`);
  }
});

console.log(`Verdict: ${forecast.pNeutral > 0.5 ? 'YES' : 'NO'}`);
console.log(`Confidence: ${(Math.abs(forecast.pNeutral - 0.5) * 200).toFixed(1)}%`);
```

### Custom Research Parameters
```typescript
const forecast = await runPolymarketForecastPipeline({
  polymarketSlug: 'election-outcome-2025',
  drivers: ['polling data', 'economic indicators', 'campaign funding'],
  historyInterval: '1h',
  withBooks: true,
  rhoByCluster: { 'polling': 0.8, 'economic': 0.6 }
});
```

---

## 🧪 Testing & Scripts

```bash
# Test the complete forecast pipeline
npm run test:forecast

# Test Valyu search integration  
npm run test:valyu

# Debug driver generation
npm run debug:drivers

# Simple forecasting demo
npm run demo:simple
```

---

## 📊 Agent System Details

### 🗺️ Planner Agent
**Purpose**: Break down complex questions into research pathways
**Input**: Market question
**Output**: Subclaims, search seeds, key variables, decision criteria

```typescript
interface Plan {
  subclaims: string[];      // Causal pathways to outcome
  keyVariables: string[];   // Leading indicators to monitor
  searchSeeds: string[];    // Targeted search queries
  decisionCriteria: string[]; // Evidence evaluation criteria
}
```

### 🔍 Researcher Agent  
**Purpose**: Gather evidence from multiple sources
**Tools**: Valyu Deep Search, Valyu Web Search
**Process**: 
1. Initial bilateral research (PRO/CON)
2. Evidence classification (A/B/C/D)
3. Follow-up targeted searches

### 🧪 Critic Agent
**Purpose**: Identify gaps and provide quality feedback
**Analysis**:
- Missing evidence areas
- Duplication detection  
- Data quality concerns
- Correlation adjustments
- Follow-up search recommendations

### 📊 Analyst Agent
**Purpose**: Mathematical probability aggregation
**Methods**:
- Bayesian updating
- Evidence clustering
- Correlation adjustments
- Log-likelihood calculations

### 📝 Reporter Agent
**Purpose**: Generate human-readable analysis
**Output**: Markdown report with:
- Executive summary
- Evidence synthesis
- Risk factors
- Confidence assessment

---

## 💰 Pricing & Billing

Polyseer uses Polar for transparent usage-based billing:

### Plans
- **🆓 Free**: Browse and explore (no analysis)
- **⚡ Pay-per-use**: $5-$10 per analysis (depends on research depth)
- **🎯 Unlimited**: $100/month for 20 analyses

### Cost Breakdown
- **Valyu Searches**: $0.01-$2 per search (variable)
- **GPT-5 Usage**: $0.01-$1 per analysis
- **Data Processing**: Minimal overhead

---

## 🔒 Security & Privacy

### Data Protection
- **🔐 End-to-end encryption** for sensitive data
- **🍪 Secure session management** via Supabase
- **🛡️ Input sanitization** for all user data
- **🚫 No personal data** stored in search queries

### API Security
- **🔑 Rate limiting** on all endpoints
- **🛡️ CORS policies** for secure cross-origin requests
- **🔍 Request validation** using Zod schemas
- **📋 Audit logging** for all API calls

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests: `npm run test`
5. Submit a pull request

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Follow the configuration
- **Prettier**: Auto-formatting on save
- **Conventional Commits**: Use semantic commit messages

### Architecture Principles
- **🧩 Modular agents**: Each agent has a single responsibility
- **🔄 Async-first**: All operations are non-blocking
- **🛡️ Type safety**: Full TypeScript coverage
- **🧪 Testable**: Pure functions where possible

---

## 📈 Performance & Scalability

### Optimization Strategies
- **⚡ Turbopack**: Fast development builds
- **🚀 Edge runtime**: Serverless function optimization
- **📦 Code splitting**: Minimal bundle sizes
- **🎯 Smart caching**: Redis for repeated queries

### Monitoring
- **📊 Real-time metrics** via Polar
- **🐛 Error tracking** with detailed logging
- **⏱️ Performance monitoring** for all agents
- **💰 Cost tracking** for API usage

---

## 🗺️ Roadmap

### Q1 2025
- [ ] **🔮 Advanced Models**: GPT-5 integration for deeper reasoning
- [ ] **📱 Mobile App**: React Native companion app  
- [ ] **🤖 API Access**: Public API for developers
- [ ] **📊 Analytics Dashboard**: User insights and trends

### Q2 2025  
- [ ] **🌐 Multi-chain Support**: Expand beyond Polymarket
- [ ] **🧠 Memory System**: Long-term knowledge retention
- [ ] **🔄 Real-time Updates**: Live analysis updates
- [ ] **👥 Team Features**: Collaboration tools

### Q3 2025
- [ ] **🎯 Custom Models**: Fine-tuned prediction models
- [ ] **📈 Portfolio Tracking**: Multi-market analysis
- [ ] **🔌 Integrations**: Discord, Telegram, Slack bots
- [ ] **🏆 Leaderboards**: Track prediction accuracy

---

## 💬 Community & Support

### Get Help
- **📖 Documentation**: [docs.polyseer.xyz](https://docs.polyseer.xyz)
- **💬 Discord**: [discord.gg/polyseer](https://discord.gg/polyseer)
- **🐦 Twitter**: [@polyseer_ai](https://twitter.com/polyseer_ai)
- **📧 Email**: support@polyseer.xyz

### Stay Updated
- **📝 Blog**: [blog.polyseer.xyz](https://blog.polyseer.xyz)
- **📱 Newsletter**: Weekly analysis insights
- **🎥 YouTube**: Deep-dive tutorials

---

## ⚖️ Legal & Disclaimers

### Important Notice
**⚠️ NOT FINANCIAL ADVICE**: Polyseer provides analysis for entertainment and research purposes only. All predictions are probabilistic and should not be used as the sole basis for financial decisions.

### Terms of Service
- **🔒 Privacy Policy**: We respect your privacy
- **📋 Terms of Use**: Fair use and guidelines
- **⚖️ Liability**: Limited liability for predictions
- **🌍 Jurisdiction**: Governed by applicable laws

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Powered By
- **🌐 Valyu Network**: Real-time search intelligence
- **🧠 OpenAI GPT-5**: Advanced reasoning capabilities  
- **📊 Polymarket**: Prediction market data
- **💾 Supabase**: Backend infrastructure
- **💳 Polar**: Billing and subscriptions

### Contributors
- **🏗️ Core Team**: Building the future of prediction
- **🌍 Community**: Feedback and testing
- **🔬 Researchers**: Academic contributions
- **🎨 Designers**: Beautiful user experience

---

**Ready to see the future? Start analyzing markets at [polyseer.xyz](https://polyseer.xyz) 🔮**

*Remember: The future belongs to those who can see it coming. Don't miss out again.*

---

<div align="center">
  <img src="public/polyseer.svg" alt="Polyseer" width="200"/>
  
  **See the Future. Don't Miss Out.**
  
  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpolyseer%2Fpolyseer)
</div>