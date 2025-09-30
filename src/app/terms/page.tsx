"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function TermsOfService() {
  const lastUpdated = "January 2025";

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 pt-24 pb-16">
      <div className="container max-w-4xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-neutral-100">
              Terms of Service
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Content */}
          <div className="space-y-12 text-neutral-900 dark:text-neutral-100">
            
            {/* Important Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-200 mb-4">
                ⚠️ Important Notice - Not Financial Advice
              </h2>
              <p className="text-amber-800 dark:text-amber-200 leading-relaxed">
                <strong>Polyseer provides analysis for research and entertainment purposes only.</strong> 
                Nothing on this platform constitutes professional financial, investment, trading, or legal advice. 
                All predictions, probabilities, and analyses are educational tools only. 
                <strong> Always conduct your own research and consult with qualified professionals before making any financial decisions.</strong>
              </p>
            </div>

            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                1. Acceptance of Terms
              </h2>
              <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                By accessing or using Polyseer (&ldquo;Service,&rdquo; &ldquo;Platform,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) 
                agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, 
                do not use our Service.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                2. Description of Service
              </h2>
              
              <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                Polyseer is an AI-powered research platform that provides deep analysis reports and probabilistic assessments
                for prediction markets, including Polymarket and Kalshi. Our Service uses artificial
                intelligence, machine learning algorithms, and various data sources to generate comprehensive research analysis.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                  <strong>Important:</strong> Polyseer does not facilitate any betting, wagering, or financial transactions.
                  We only provide research analysis and may include links to third-party platforms (such as Polymarket and Kalshi)
                  for informational purposes. Any transactions or bets are conducted entirely on third-party platforms
                  and are subject to their own terms and regulations.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  2.1 Service Features
                </h3>
                <ul className="space-y-2 pl-6 text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-2">•</span>
                    <span>AI-generated research analysis of prediction market events</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-2">•</span>
                    <span>Probabilistic assessments and confidence ratings for educational purposes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-2">•</span>
                    <span>Research synthesis from multiple data sources</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-2">•</span>
                    <span>Historical analysis and trend identification</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-2">•</span>
                    <span>Links to third-party platforms for reference only</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-2">•</span>
                    <span>Subscription-based and pay-per-use access to research reports</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  2.2 Third-Party Platform Links
                </h3>
                <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                  Our Service may include links to third-party prediction market platforms such as Polymarket and Kalshi.
                  We are not affiliated with, endorsed by, or responsible for these third-party platforms.
                  Any use of third-party platforms is subject to their own terms of service, privacy policies,
                  and applicable regulations. We do not facilitate, process, or have any involvement in any
                  transactions conducted on third-party platforms.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                3. Educational and Research Purposes Only
              </h2>
              
              <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                <strong className="text-neutral-900 dark:text-neutral-100">THE SERVICE IS PROVIDED FOR EDUCATIONAL AND RESEARCH PURPOSES ONLY.</strong> 
                All content, analyses, predictions, probabilities, and recommendations provided through 
                our Service are:
              </p>
              
              <ul className="space-y-2 pl-6 text-neutral-700 dark:text-neutral-300">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-2">•</span>
                  <span>NOT financial, investment, trading, or legal advice</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-2">•</span>
                  <span>NOT recommendations to buy, sell, or hold any securities or assets</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-2">•</span>
                  <span>NOT guarantees of future performance or outcomes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-2">•</span>
                  <span>Based on algorithms and data that may contain errors or biases</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-2">•</span>
                  <span>Subject to rapid change and may become outdated</span>
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                4. AI and Data Limitations
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    4.1 AI-Generated Content
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300 mb-4">
                    Our Service uses artificial intelligence to generate content. AI-generated content may:
                  </p>
                  <ul className="space-y-2 pl-6 text-neutral-700 dark:text-neutral-300">
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2 mt-2">•</span>
                      <span>Contain inaccuracies, errors, or &ldquo;hallucinations&rdquo;</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2 mt-2">•</span>
                      <span>Be based on incomplete or outdated information</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2 mt-2">•</span>
                      <span>Reflect biases present in training data</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2 mt-2">•</span>
                      <span>Produce inconsistent results for similar queries</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2 mt-2">•</span>
                      <span>Fail to account for rapidly changing circumstances</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    4.2 Data Sources and Accuracy
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300 mb-4">
                    While we strive to use reliable data sources, we do not guarantee the accuracy, 
                    completeness, or timeliness of any information. Users acknowledge that:
                  </p>
                  <ul className="space-y-2 pl-6 text-neutral-700 dark:text-neutral-300">
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2 mt-2">•</span>
                      <span>Data may be delayed, incorrect, or incomplete</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2 mt-2">•</span>
                      <span>Third-party data sources may have their own limitations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2 mt-2">•</span>
                      <span>Market conditions change rapidly and may not be reflected in our analysis</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2 mt-2">•</span>
                      <span>Historical data does not predict future results</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                5. User Responsibilities
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    5.1 Due Diligence
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300 mb-4">Users are solely responsible for:</p>
                  <ul className="space-y-2 pl-6 text-neutral-700 dark:text-neutral-300">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-2">•</span>
                      <span>Conducting their own independent research and due diligence</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-2">•</span>
                      <span>Consulting with qualified financial, legal, and tax advisors</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-2">•</span>
                      <span>Evaluating the risks associated with any decisions</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-2">•</span>
                      <span>Compliance with all applicable laws and regulations</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    5.2 Prohibited Uses
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300 mb-4">Users may not:</p>
                  <ul className="space-y-2 pl-6 text-neutral-700 dark:text-neutral-300">
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-2">•</span>
                      <span>Use the Service for illegal activities</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-2">•</span>
                      <span>Attempt to manipulate or reverse-engineer our algorithms</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-2">•</span>
                      <span>Share account credentials or access with unauthorized parties</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-2">•</span>
                      <span>Use automated systems to scrape or harvest data</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-2">•</span>
                      <span>Violate any applicable laws or regulations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-2">•</span>
                      <span>Misrepresent our research reports as facilitating transactions or betting</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-2">•</span>
                      <span>Use our analysis as the sole basis for financial decisions</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    5.3 Third-Party Platform Interactions
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300 mb-4">
                    When following links to third-party platforms (such as Polymarket), users acknowledge that:
                  </p>
                  <ul className="space-y-2 pl-6 text-neutral-700 dark:text-neutral-300">
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2 mt-2">•</span>
                      <span>They are leaving our platform and entering a separate service</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2 mt-2">•</span>
                      <span>All activities on third-party platforms are governed by those platforms&rsquo; terms</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2 mt-2">•</span>
                      <span>We have no control over or responsibility for third-party platform operations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2 mt-2">•</span>
                      <span>Any transactions are conducted entirely between the user and the third-party platform</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2 mt-2">•</span>
                      <span>Users must comply with all applicable laws regarding prediction markets in their jurisdiction</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                6. Subscription and Billing
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    6.1 Subscription Plans
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                    We offer various subscription plans and pay-per-use options. Billing terms, 
                    pricing, and features are subject to change with reasonable notice.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    6.2 Cancellation and Refunds
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                    Users may cancel their subscription at any time. Refund policies are detailed 
                    in our billing terms and may vary by jurisdiction and payment method.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                7. Limitation of Liability
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    7.1 Disclaimer of Warranties
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                    THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, 
                    EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, 
                    FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    7.2 Limitation of Damages
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300 mb-4">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL POLYSEER, ITS AFFILIATES, 
                    OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                    SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                  </p>
                  <ul className="space-y-2 pl-6 text-neutral-700 dark:text-neutral-300">
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-2">•</span>
                      <span>Financial losses from investment or betting decisions made on third-party platforms</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-2">•</span>
                      <span>Losses resulting from reliance on our research analysis</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-2">•</span>
                      <span>Issues arising from third-party platform usage</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-2">•</span>
                      <span>Loss of profits, revenue, or business opportunities</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-2">•</span>
                      <span>Loss of data or information</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-2">•</span>
                      <span>Business interruption or personal injury</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    7.3 Third-Party Platform Disclaimer
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300 mb-4">
                    We expressly disclaim any liability for actions taken on third-party platforms linked 
                    from our Service. This includes but is not limited to:
                  </p>
                  <ul className="space-y-2 pl-6 text-neutral-700 dark:text-neutral-300">
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-2">•</span>
                      <span>Losses from betting or trading on Polymarket or similar platforms</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-2">•</span>
                      <span>Technical issues with third-party platforms</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-2">•</span>
                      <span>Disputes with third-party platform operators</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-2">•</span>
                      <span>Regulatory issues arising from third-party platform usage</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    7.4 Liability Cap
                  </h3>
                  <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                    Our total aggregate liability for any claims arising from or relating to the Service 
                    shall not exceed the greater of (a) the amount you paid us in the 12 months preceding 
                    the claim, or (b) $100 USD.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 8-15 */}
            <section className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-4">
                  8. Additional Terms
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Indemnification
                    </h3>
                    <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      You agree to indemnify and hold harmless Polyseer from any claims arising from your 
                      use of the Service or violation of these Terms.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Intellectual Property
                    </h3>
                    <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      All content and technology remain the property of Polyseer. Users receive a limited 
                      license to use the Service in accordance with these Terms.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Privacy and Data
                    </h3>
                    <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      Our Privacy Policy governs data collection and use. By using the Service, you consent 
                      to our data practices as described in our Privacy Policy.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Service Termination
                    </h3>
                    <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      We may suspend or terminate access at any time. Upon termination, your right to use 
                      the Service ceases immediately.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Governing Law
                    </h3>
                    <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      These Terms are governed by the laws of England and Wales. Disputes shall be resolved 
                      through binding arbitration where permitted by law.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Changes to Terms
                    </h3>
                    <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      We may update these Terms with reasonable notice. Continued use after changes 
                      constitutes acceptance of updated Terms.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                Contact Information
              </h2>
              <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-6">
                <p className="leading-relaxed text-neutral-700 dark:text-neutral-300 mb-4">
                  For questions about these Terms or our Service, please contact us:
                </p>
                <ul className="space-y-2 text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-3">📧</span>
                    <span>Email: contact@valyu.network</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-3">🌐</span>
                    <span>Website: <Link href="/" className="text-blue-600 hover:text-blue-700 underline">polyseer.xyz</Link></span>
                  </li>
                </ul>
              </div>
            </section>
            
            {/* Final Risk Warning */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-4">
                ⚠️ Final Risk Warning
              </h3>
              <p className="text-red-800 dark:text-red-200 leading-relaxed">
                <strong>Trading and investing involve substantial risk of loss.</strong> Past performance 
                does not guarantee future results. Predictions and probabilities are not guarantees. 
                You may lose some or all of your invested capital. Only invest what you can afford to lose. 
                Always seek advice from qualified financial professionals before making investment decisions.
              </p>
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center pt-8">
            <Link 
              href="/" 
              className="inline-flex items-center px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              ← Back to Polyseer
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}