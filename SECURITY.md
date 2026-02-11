# 🛡️ Nexgent Security Policy & Responsible Disclosure

## Security Policy

Nexgent is an open-source Solana AI agent trading automation framework. We take security seriously, especially because this project handles cryptocurrency wallets and executes trades on the Solana blockchain. Any security vulnerability could result in financial loss.

We welcome security researchers and users to report vulnerabilities responsibly. If you discover a security issue, please report it to us immediately so we can address it before it affects users.

### Security Fixes & Releases

- Security fixes are prioritized and may be released as patch versions (e.g., 0.1.0 → 0.1.1) or included in the next minor release
- Critical vulnerabilities (wallet compromise, unauthorized trades) are addressed within 24-48 hours
- All security fixes are documented in release notes and this file

## Reporting a Vulnerability

Found a security issue? We appreciate responsible disclosure and will work with you to fix it quickly.

### How to Report

Use the "Report a vulnerability" button under the "Security" tab of the [Nexgent GitHub repository](https://github.com/Nexgent-ai/nexgent-open-source-trading-engine/security). This creates a private communication channel between you and the maintainers.

**For critical vulnerabilities** (wallet compromise, unauthorized trade execution, authentication bypass), please email contact@nexgent.ai immediately.

### Reporting Guidelines

- Provide clear details to help us reproduce and fix the issue quickly
- Include steps to reproduce, potential impact, and any suggested fixes
- Your report will be kept confidential, and your details will not be shared without your consent
- If the vulnerability affects live trading systems, please include:
  - Whether the issue affects simulation or live trading modes
  - Potential financial impact
  - Whether user funds are at risk

### Response Timeline

- **Critical vulnerabilities** (wallet/funds at risk): Acknowledged within 24 hours, fix within 48 hours
- **High severity** (authentication, authorization): Acknowledged within 3 business days, fix within 1 week
- **Medium/Low severity**: Acknowledged within 5 business days, fix in next release cycle
- We will provide an estimated resolution timeline
- We will keep you updated on our progress

### Disclosure Guidelines

- Please do not publicly disclose vulnerabilities until we've fixed them and notified users
- If you're planning to publish research about a vulnerability, share it with us at least 30 days in advance
- Do not include:
  - User data, wallet addresses, or agent configurations
  - Private key formats or implementation details
  - Personal information about contributors or users

Thank you for helping keep Nexgent and its users safe!

## Known Vulnerabilities

*No known vulnerabilities at this time. This section will be updated as vulnerabilities are discovered and fixed.*

## Security Configuration Guidelines

### 🔐 Wallet Security (CRITICAL)

Wallet private keys are the most sensitive data in this system. If compromised, attackers can drain funds from wallets.

#### Security Measures

1. **Never Commit Private Keys**
   - Private keys should **never** be committed to version control
   - Use environment variables (`WALLET_1`, `WALLET_2`, etc.) or secrets management services
   - The `.gitignore` file excludes `.env*` files by default

2. **Private Key Storage**
   - **For most users**: Environment variables are the simplest and most common approach
   - Store private keys in `.env` files (never commit to git) or use your deployment platform's secrets management
   - **For enterprise/production**: Consider using AWS Secrets Manager, HashiCorp Vault, or similar services for additional security
   - Use separate wallets for development and production environments
   - Rotate keys if you suspect they may have been compromised

3. **Logging Security**
   - Private keys and wallet addresses should **never** be logged
   - Review logs regularly to ensure sensitive data is not exposed
   - Use structured logging with redaction for sensitive fields

#### Wallet Configuration

Private keys are configured via environment variables. The most common approach is using a `.env` file (never commit this to git):

```bash
# Format: Base58 encoded string or JSON array
WALLET_1="<base58-encoded-private-key>"
WALLET_2="<base58-encoded-private-key>"

# Or JSON array format (Solana CLI keypair)
WALLET_1="[123,45,67,...]"  # 64 numbers total
```

**Security tips:**
- Keep your `.env` file secure and never share it
- Use deployment platform secrets management (Railway, Vercel, etc.) for production
- Use separate wallets for testing vs live trading
- Only fund wallets with the minimum amount needed for trading

### 🔑 Authentication & Authorization

#### JWT Secret Security

1. **Strong Secrets Required**
   - JWT secrets must be at least 32 characters long
   - Use cryptographically secure random generation
   - Generate using: `pnpm generate-secret:backend` or `openssl rand -base64 32`

2. **Secret Rotation**
   - Rotate JWT secrets regularly (every 90 days recommended)
   - Use different secrets for each environment (dev/staging/production)
   - When rotating, invalidate all existing tokens

3. **Token Expiration**
   - Access tokens: 15 minutes (hardcoded)
   - Refresh tokens: 24 hours (standard) or 30 days (remember me)
   - Account lockout: 5 failed attempts, 15-minute lockout duration

#### NextAuth.js Secret (Frontend)

- Generate using: `pnpm generate-secret`
- Must be at least 32 characters long
- Use different secrets for frontend and backend
- Never reuse the same secret across environments

### 🗄️ Database Security

1. **Connection Security**
   - Use strong database passwords
   - Restrict database access to application servers only
   - Use SSL/TLS connections in production (`?sslmode=require`)

2. **Credential Management**
   - Store `DATABASE_URL` in secure environment variables
   - Never commit database credentials to version control
   - Use different databases for development, staging, and production

3. **SQL Injection Prevention**
   - Prisma ORM uses parameterized queries (automatic protection)
   - Never use raw SQL queries with string interpolation
   - Validate all user inputs with Zod schemas

### 🌐 API Security

#### CORS Configuration

1. **Restrict Origins**
   - In production, set `CORS_ORIGIN` to your specific frontend domain(s)
   - Never use `*` (wildcard) in production
   - Use comma-separated list for multiple origins:
     ```bash
     CORS_ORIGIN=https://nexgent.ai,https://www.nexgent.ai
     ```

2. **Development vs Production**
   - Development: `http://localhost:3000` is acceptable
   - Production: Use HTTPS-only origins

#### Rate Limiting

- Rate limiting is enabled on all API endpoints
- Configure appropriate limits based on your usage patterns
- Monitor for abuse and adjust limits as needed

#### Input Validation

- All API inputs are validated using Zod schemas
- Invalid inputs are rejected before processing
- Never trust user input without validation

### 🔌 External API Security

#### Jupiter Aggregator API Key

1. **Key Management**
   - Store `JUPITER_API_KEY` in secure environment variables
   - Never commit API keys to version control
   - Rotate keys if compromised or exposed

2. **Key Scope**
   - Use API keys with minimal required permissions
   - Monitor API usage for unauthorized access
   - Revoke and regenerate keys if suspicious activity detected

#### External Service URLs

- Verify URLs for external services (Pyth Network, DexScreener)
- Use HTTPS-only connections
- Monitor for service outages or changes

### 🔒 Environment Variables Security

#### General Guidelines

1. **Never Commit Secrets**
   - `.env` files are excluded via `.gitignore`
   - Use `env.example` files for documentation only
   - Never include real secrets in example files

2. **Production Secrets**
   - Use deployment platform secrets management (Railway, Vercel, AWS, etc.)
   - Rotate secrets regularly
   - Use different secrets per environment

3. **Secret Generation**
   - Use cryptographically secure random generation
   - Frontend: `pnpm generate-secret`
   - Backend: `pnpm generate-secret:backend`
   - Or: `openssl rand -base64 32`

#### Required Production Secrets

```bash
# Authentication
NEXTAUTH_SECRET="<32+ character random string>"
JWT_SECRET="<32+ character random string>"

# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# External APIs (if using live trading)
JUPITER_API_KEY="<your-jupiter-api-key>"

# Wallet Private Keys (if using live trading)
WALLET_1="<base58-encoded-private-key>"
# ... additional wallets as needed
```

### 🚨 Trading Mode Security

#### Simulation vs Live Trading

1. **Simulation Mode (Default)**
   - Uses virtual funds
   - Safe for development and testing
   - No real funds at risk

2. **Live Trading Mode**
   - **CRITICAL**: Only enable with proper security measures
   - Requires production-grade wallet security
   - Requires Jupiter API key for real swaps
   - Monitor all trades and positions closely
   - Implement additional safeguards (daily limits, manual approval, etc.)

#### Trade Execution Security

1. **Validation**
   - All trades are validated before execution
   - Balance checks prevent insufficient funds errors
   - Slippage protection limits price impact

2. **Monitoring**
   - Log all trade executions
   - Monitor for unusual patterns or volumes
   - Set up alerts for large trades or errors

### 📊 Redis Security

1. **Connection Security**
   - Use Redis password authentication in production (`REDIS_PASSWORD`)
   - Restrict Redis access to application servers only
   - Use Redis over TLS when available

2. **Data Sensitivity**
   - Redis caches positions, balances, and agent configs
   - Ensure Redis is not publicly accessible
   - Use separate Redis instances for different environments

### 🔍 Security Best Practices

#### For Users Running Nexgent

1. **Keep Your System Updated**
   - Regularly update Nexgent and its dependencies
   - Run `pnpm audit` to check for known vulnerabilities
   - Monitor the repository for security advisories

2. **Protect Your Wallets**
   - Only fund wallets with the minimum SOL needed
   - Use separate wallets for different agents or strategies
   - Monitor wallet balances and transaction history regularly
   - Start with simulation mode to test strategies before using real funds

3. **Secure Your Environment**
   - Never commit `.env` files or share them publicly
   - Use strong, unique JWT secrets (generate with `pnpm generate-secret`)
   - Restrict database and Redis access to your application only
   - Use HTTPS in production and configure CORS properly

4. **Monitor Your Trading**
   - Review all trade executions and positions regularly
   - Set up alerts for unusual activity or errors
   - Keep logs of trading activity for auditing
   - Test your trading strategies thoroughly in simulation mode first

#### Production Deployment Checklist

- [ ] All environment variables set with strong, unique values
- [ ] JWT secrets generated using secure methods
- [ ] Database uses SSL/TLS connections
- [ ] CORS configured for specific origins only
- [ ] Redis password authentication enabled
- [ ] Wallet private keys configured securely (env vars or secrets management)
- [ ] API keys rotated and secured
- [ ] Rate limiting configured appropriately
- [ ] Logging configured (no sensitive data in logs)
- [ ] Monitoring and alerting set up
- [ ] Backup procedures in place

## Security Contact

For security-related questions or to report vulnerabilities:

- **GitHub Security**: Use the "Report a vulnerability" button on the repository
- **Email**: contact@nexgent.ai (for critical issues)
- **Response Time**: Critical issues within 24 hours, others within 5 business days

Thank you for helping keep Nexgent secure! 🔒

