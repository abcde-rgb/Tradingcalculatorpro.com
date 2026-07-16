/** Legal content — ENGLISH (courtesy translation; Spanish version prevails). */
const en = {
  meta: {
    updated: 'July 2026',
    updatedLabel: 'Last updated',
    courtesy: 'This is a courtesy translation. In the event of any discrepancy, the Spanish version prevails.',
  },

  privacy: {
    title: 'Privacy Policy',
    sections: [
      { t: 'Data Controller', b: [
        { p: 'The controller of your personal data is **TradingCalculator.pro**, operated by a limited liability company (LLC) registered in the United States. For any privacy inquiry, contact us at {email}.' },
      ]},
      { t: 'Data We Collect', b: [
        { p: 'We collect only the data needed to provide the service:' },
        { list: [
          'Identification data: name and email address, provided during registration or via Google authentication (OAuth).',
          'Usage data: pages visited, features used (options calculator, simulations, price tracking), theme and language preferences.',
          'Payment data: processed by external payment providers (Stripe, PayPal, Revolut, and OxaPay for cryptocurrencies). We never store card numbers or bank details on our servers; we only keep customer/transaction identifiers and the subscription status.',
          'Technical logs: IP address, browser type and operating system, for security and diagnostics.',
          'Price-alert data: asset pairs and thresholds you configure, only if you enable this feature.',
          'Trading journal and AI Trade Coach data: the trades you voluntarily log and, if you use the AI Trade Coach, the parameters of the analysed strategy.',
        ]},
      ]},
      { t: 'Purposes of Processing', b: [
        { p: 'We process your data for the following purposes:' },
        { list: [
          'Service delivery: managing your account, access to the platform tools (options calculator, real-time prices, simulations) and personalising the experience.',
          'Billing and subscription management: processing recurring payments, managing plans (€17/month, €45/quarter, €200/year, €500 lifetime) and issuing invoices.',
          'Transactional communications: payment confirmations, renewal notices and price-alert notifications you configure, sent via SendGrid.',
          'Security and fraud prevention: detecting unauthorised access and protecting the integrity of the service.',
          'Service usage analytics (with your consent): via Google Analytics 4 with IP anonymisation, to improve the platform.',
        ]},
      ]},
      { t: 'Legal Basis for Processing (GDPR)', b: [
        { p: 'For users in the European Economic Area, processing relies on the following legal bases under the General Data Protection Regulation (GDPR):' },
        { list: [
          'Art. 6(1)(b) GDPR — Performance of a contract: processing is necessary to provide the contracted service, manage your subscription and process payments.',
          'Art. 6(1)(a) GDPR — Consent: for analytics cookies (Google Analytics 4) and optional marketing communications. You may withdraw consent at any time.',
          'Art. 6(1)(c) GDPR — Legal obligation: retention of billing data under applicable tax law.',
          'Art. 6(1)(f) GDPR — Legitimate interest: service security and fraud prevention.',
        ]},
      ]},
      { t: 'Third Parties Receiving Your Data', b: [
        { p: 'We share data with the following service providers, only to the extent necessary to provide the service:' },
        { list: [
          'Stripe, Inc. (card and SEPA payments): processes subscription payments. Acts as an independent controller for payment data. Policy: stripe.com/privacy.',
          'PayPal, Inc. (payments): processes payments made with PayPal under its own privacy policy.',
          'Revolut (Revolut Pay, includes Apple Pay/Google Pay in its checkout): processes payments made with Revolut Pay.',
          'OxaPay (cryptocurrency payments): processes crypto payments. Receives the amount, an order identifier and, where applicable, your email for the receipt.',
          'Google LLC (OAuth and Analytics): Google OAuth sign-in transfers your name and email. Google Analytics 4 is used with IP anonymisation and only with your consent. Policy: policies.google.com/privacy.',
          'Twilio SendGrid (transactional email): sends confirmations, invoices and alerts. Only receives your email address.',
          'Anthropic (AI Trade Coach): when you request an AI analysis, the parameters of the analysed strategy (asset, trade legs, prices) are sent to Anthropic. Your name and email are not sent with the query.',
        ]},
        { p: 'Providers are bound by data-processing agreements or rely on valid international transfer mechanisms (standard contractual clauses or other recognised mechanisms).' },
      ]},
      { t: 'Your Rights as a Data Subject (GDPR)', b: [
        { p: 'If you are in the EU/EEA, you have the following rights:' },
        { list: [
          'Right of access (Art. 15 GDPR): request a copy of the personal data we process about you.',
          'Right to rectification (Art. 16 GDPR): correct inaccurate or incomplete data at any time from your account settings.',
          'Right to erasure (Art. 17 GDPR): request deletion of your account and personal data, unless a legal retention obligation applies.',
          'Right to data portability (Art. 20 GDPR): request an export of your data in a structured, machine-readable format.',
          'Right to object (Art. 21 GDPR): object at any time to processing based on legitimate interest.',
          'Right to withdraw consent: without affecting the lawfulness of prior processing.',
          'Right to lodge a complaint with the supervisory authority of your EU country of residence (in Spain, the AEPD).',
        ]},
        { p: 'To exercise any of these rights, email {email} stating the right you wish to exercise. We respond within 30 days.' },
      ]},
      { t: 'Retention Periods', b: [
        { list: [
          'Account data (name, email, preferences): kept while the account is active. Deleted within 30 days of a deletion request.',
          'Technical logs: 90 days, for security and diagnostics.',
          'Payment and billing data: kept for as long as required by applicable tax and accounting obligations (up to 10 years depending on jurisdiction).',
          'Analytics data (Google Analytics 4): maximum 14 months, with anonymised IP.',
        ]},
      ]},
      { t: 'Data Security', b: [
        { p: 'We apply appropriate technical and organisational measures to protect your personal data against unauthorised access, loss or disclosure: encryption in transit (TLS/HTTPS), role-based access control and periodic security reviews. Payments are protected by the payment providers’ PCI DSS infrastructure.' },
      ]},
      { t: 'International Transfers', b: [
        { p: 'The Company is established in the United States, and some providers (Google, Stripe, SendGrid, Anthropic) process data outside the European Economic Area. In such cases we ensure appropriate safeguards, such as standard contractual clauses approved by the European Commission or other valid transfer mechanisms.' },
      ]},
      { t: 'Cookies', b: [
        { p: 'We use cookies and similar technologies. For details, see our Cookie Policy in the corresponding tab on this page.' },
      ]},
    ],
  },

  terms: {
    title: 'Terms of Use',
    sections: [
      { t: 'Acceptance of the Terms', b: [
        { p: 'By accessing and using TradingCalculator.pro (the “Service”), you agree to be bound by these Terms of Use. If you disagree with any condition set out here, you must refrain from using the Service. These terms form a legally binding agreement between you and the limited liability company (LLC) registered in the United States that operates TradingCalculator.pro (the “Company”).' },
      ]},
      { t: 'Nature of the Service — Not Financial Advice', b: [
        { p: 'TradingCalculator.pro is a financial-information tools platform including options calculators (Black-Scholes, Greeks), real-time asset prices and strategy simulations. The Service is strictly informational and educational.' },
        { p: '**IMPORTANT NOTICE: TradingCalculator.pro does NOT provide financial, investment, tax or legal advice. Nothing on the platform should be construed as a recommendation to buy, sell or hold any financial instrument.**' },
        { p: 'Past results neither guarantee nor predict future results. Investing in financial instruments, including options, carries a significant risk of loss; you may lose your entire invested capital. You are solely responsible for your investment decisions. Consult a professional financial adviser before trading.' },
      ]},
      { t: 'Registration and User Account', b: [
        { p: 'An account is required to access the platform features. You are responsible for keeping your credentials confidential and for all activity under your account. Notify us immediately of any unauthorised use at {email}. You must be at least 18 years old to register and use the Service.' },
      ]},
      { t: 'Subscription Plans, Free Trial and Payments', b: [
        { p: 'The available plans are:' },
        { list: [
          'Monthly plan: €17/month, automatically renewing every month.',
          'Quarterly plan: €45/quarter, automatically renewing every 3 months.',
          'Annual plan: €200/year, automatically renewing every 12 months.',
          'Lifetime plan: €500, one-time payment, permanent access with no renewals.',
        ]},
        { p: '**7-day free trial** (recurring plans only, new subscribers only): a valid payment method is required to start it. If you do not cancel before the trial ends, the first charge for the chosen plan is made automatically. You can cancel during the trial at no cost from “My Subscription”.' },
        { p: 'Payments are processed securely via **Stripe** (card, SEPA, Klarna and wallets such as Apple Pay/Google Pay), **PayPal**, **Revolut Pay** and **OxaPay** (cryptocurrencies). Prices are shown in euros (EUR) and include applicable taxes where relevant. By subscribing to an auto-renewing plan you authorise recurring charges to your payment method until you cancel. You can cancel at any time from “My Subscription”; access continues until the end of the current billing period.' },
      ]},
      { t: 'Refund Policy', b: [
        { list: [
          'Monthly plan (€17/month): full refund within the first 14 calendar days after activation, provided you have not made significant use of the premium features.',
          'Quarterly plan (€45/quarter): full refund within the first 14 calendar days after activation, under the same conditions.',
          'Annual plan (€200/year): full refund within the first 14 calendar days after activation, under the same conditions.',
          'Lifetime plan (€500): non-refundable once paid, without prejudice to any non-waivable consumer rights under the law of your country of residence.',
        ]},
        { p: 'To request a refund, contact us at {email} within the applicable period. Refunds are issued to the original payment method within 5–10 business days. **Cryptocurrency payments:** as these transactions are irreversible, approved refunds are paid in euros through an equivalent alternative means. This policy does not limit your consumer rights under the law of your EU country of residence.' },
      ]},
      { t: 'Intellectual Property', b: [
        { p: 'All Service content — including source code, algorithms, interface design, texts, graphics, logos and databases — is the exclusive property of the Company and is protected by applicable intellectual-property laws. You are granted a limited, non-exclusive, non-transferable, revocable licence to use the Service solely for personal, non-commercial purposes.' },
      ]},
      { t: 'Prohibited Uses', b: [
        { p: 'The following is expressly prohibited:' },
        { list: [
          'Reverse engineering, decompiling or disassembling any part of the Service.',
          'Using scrapers, bots, crawlers or other automated tools to extract data from the platform.',
          'Reselling, sublicensing or redistributing the Service or its contents to third parties.',
          'Attempting to access Service systems or data without authorisation.',
          'Using the Service for illegal or fraudulent activities or activities that infringe third-party rights.',
          'Sharing access credentials or allowing simultaneous use of your account by multiple people.',
          'Intentionally overloading the Service infrastructure through mass requests or denial-of-service attacks.',
        ]},
        { p: 'Breach may lead to immediate suspension or termination of your account, without refund, and to any applicable legal action.' },
      ]},
      { t: 'Availability and Limitation of Liability', b: [
        { p: 'We strive to keep the Service continuously available but do not guarantee 100% availability. Interruptions may occur due to scheduled maintenance, technical failures or force majeure.' },
        { p: 'To the maximum extent permitted by applicable law, the Company shall not be liable for any indirect, incidental, special, consequential or punitive damages arising from use of the Service, including financial losses from investment decisions. The Company’s maximum liability is limited to the total amount you paid during the 12 months preceding the event giving rise to the claim.' },
      ]},
      { t: 'Changes', b: [
        { p: 'We reserve the right to modify these Terms at any time. We will notify material changes by email or platform notice at least 15 days in advance. Continued use of the Service after the new terms take effect constitutes acceptance.' },
      ]},
      { t: 'Governing Law and Jurisdiction', b: [
        { p: 'These Terms are governed by the laws of the United States and, where applicable, of the Company’s state of incorporation, without prejudice to the mandatory consumer-protection rules of your country of residence (in particular within the European Union). Any dispute that cannot be resolved amicably shall be submitted to the competent courts under the applicable rules.' },
      ]},
    ],
  },

  cookies: {
    title: 'Cookie Policy',
    sections: [
      { t: 'What Are Cookies?', b: [
        { p: 'Cookies are small text files stored on your device when you visit a website. They let the site remember your actions and preferences for a period of time, so you don’t have to re-enter certain information as you browse or when you return.' },
      ]},
      { t: 'Technical and Essential Cookies (No Consent Required)', b: [
        { p: 'These cookies are strictly necessary for the basic operation of the Service (secure authentication). They are httpOnly cookies: no browser script can read them.' },
        { table: {
          head: ['Cookie', 'Purpose', 'Duration'],
          rows: [
            ['access_token', 'Keep your session authenticated (access token, httpOnly)', '1 hour'],
            ['refresh_token', 'Renew the session without logging in again (httpOnly)', '7 days'],
          ],
        }},
        { p: 'We also use **browser local storage (localStorage — not cookies)** to remember preferences on your own device: selected language, visual theme, your cookie-consent choice and your account UI state. This data is not transmitted to third parties.' },
      ]},
      { t: 'Analytics Cookies (Consent Required)', b: [
        { p: 'We use Google Analytics 4 to understand how users interact with the Service and improve it. These cookies are only set if you have given consent via the cookie banner (Google Consent Mode v2, denied by default).' },
        { table: {
          head: ['Cookie', 'Provider', 'Purpose', 'Duration'],
          rows: [
            ['_ga', 'Google Analytics', 'Distinguish unique users (anonymised ID)', '12 months'],
            ['_ga_*', 'Google Analytics', 'Maintain the analytics session state', '12 months'],
          ],
        }},
        { p: 'Google Analytics 4 is configured with IP anonymisation: the IP address is truncated before storage. No personally identifiable information is transmitted to Google through these cookies.' },
      ]},
      { t: 'Embedded Third-Party Content', b: [
        { p: 'Some pages embed the **TradingView** chart via an iframe from tradingview.com. That content is served by TradingView and may set its own technical cookies under its own privacy and cookie policy. We do not control those cookies.' },
      ]},
      { t: 'Advertising and Third-Party Tracking Cookies', b: [
        { p: '**TradingCalculator.pro does not use advertising, retargeting or third-party behavioural-tracking cookies.** We do not show third-party ads on the platform or share behavioural data with ad networks.' },
      ]},
      { t: 'How to Manage and Disable Cookies', b: [
        { p: 'Most browsers let you control cookies from their settings:' },
        { list: [
          'Google Chrome: Settings → Privacy and security → Cookies and other site data.',
          'Mozilla Firefox: Settings → Privacy & Security → Cookies and Site Data.',
          'Safari: Preferences → Privacy → Manage Website Data.',
          'Microsoft Edge: Settings → Privacy, search, and services → Cookies and site permissions.',
        ]},
        { p: 'Blocking essential cookies may prevent you from logging in. To opt out of Google Analytics specifically, you can install the [Google Analytics opt-out add-on](https://tools.google.com/dlpage/gaoptout).' },
      ]},
      { t: 'Consent and Preference Management', b: [
        { p: 'On your first visit, a banner lets you accept or reject non-essential cookies; your choice is remembered on your device. You can change your preferences at any time by clearing the site data in your browser or contacting {email}. Withdrawing consent does not affect the lawfulness of prior processing.' },
      ]},
      { t: 'Updates to this Policy', b: [
        { p: 'We may update this Cookie Policy when we introduce new technologies or when applicable rules change. We will notify significant changes via a platform notice or email. The “Last updated” date indicates the latest revision.' },
      ]},
    ],
  },

  risk: {
    title: 'Risk Warning',
    sections: [
      { t: 'The Data Is Clear', b: [
        { p: '**Trading financial markets carries a high risk of loss. The large majority of retail traders lose money.** Before trading real money, you should know these verified, independent figures. They are not our opinion: they come from regulators and academic studies.' },
        { stat: { fig: '74–89%', text: 'of **retail CFD accounts lose money**, according to the European regulator (ESMA). The average loss per client ranges from €1,600 to €29,000. That is why the law requires every broker to display this percentage in its advertising.' } },
        { stat: { fig: '97%', text: 'of those who **day traded for more than 300 days** lost money (study of the Brazilian futures market, 2013–2015). Only 1.1% earned more than the minimum wage and only 0.5% more than a bank teller’s starting salary. The authors conclude it is “virtually impossible to make a living from day trading”.' } },
        { stat: { fig: '<1%', text: 'of day traders are **consistently and predictably** profitable, according to classic studies of the Taiwan market (Barber & Odean); around 80% lose money.' } },
      ]},
      { t: 'What This Means for You', b: [
        { list: [
          'Sustained profitability in retail trading is rare: fewer than 1–3% achieve it long-term.',
          'Past results neither guarantee nor predict future results.',
          'You can lose all invested capital. With leveraged products (CFDs, futures, options) losses can occur very quickly and even exceed the initial deposit.',
          'Costs (commissions, spreads, slippage and taxes) work against you cumulatively.',
          'Psychological factors and behavioural biases (overconfidence, revenge trading, overtrading) worsen most people’s results.',
        ]},
      ]},
      { t: 'Our Position', b: [
        { p: '**TradingCalculator.pro provides informational and educational tools — not financial advice, not signals, and no profitability promises.** We show these figures because we want you to decide with truthful information. Trade only with money you can afford to lose and, if needed, consult a duly authorised financial adviser. See also our {terms}.' },
      ]},
      { t: 'Sources', b: [
        { list: [
          'ESMA (European Securities and Markets Authority) — CFD product-intervention measures: [esma.europa.eu](https://www.esma.europa.eu/press-news/esma-news/esma-adopts-final-product-intervention-measures-cfds-and-binary-options).',
          'Chague, De-Losso & Giovannetti (2020), “Day Trading for a Living?” — FGV/USP: [papers.ssrn.com](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101).',
          'Barber, Lee, Liu & Odean — research on day-trader performance in the Taiwan market.',
        ]},
      ]},
    ],
  },
};

export default en;
