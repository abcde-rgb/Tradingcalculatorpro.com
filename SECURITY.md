# Security Policy

## Reporting a vulnerability

If you find a security issue in TradingCalculator.Pro, please report it **privately**
— do not open a public issue, and do not disclose it publicly until it has been fixed.

- Preferred: GitHub **Private vulnerability reporting**
  (repo → **Security** tab → **Report a vulnerability**).
- Alternatively, contact the repository owner privately.

Please include a description, the affected page or `/api/*` endpoint, and steps to
reproduce (a proof of concept helps). We aim to acknowledge reports within 72 hours.

## Scope

In scope: authentication, payment webhooks, the API on Cloud Run, and isolation of
user data. Out of scope: issues requiring a compromised user device or physical
access, social engineering, and vulnerabilities in third-party platforms themselves
(GitHub Pages, Google Cloud, Stripe, SendGrid).

## Supported version

The production site is deployed continuously from `main`; only the current version
is supported. Secrets are stored exclusively in Google Secret Manager / GitHub
Secrets and never committed to the repository.
