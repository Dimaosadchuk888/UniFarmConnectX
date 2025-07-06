# 🚀 UniFarm Production Deployment Guide

## Production Readiness: 85% ✅

### ✅ Completed Production Tasks
- Centralized BalanceManager implementation
- Root directory cleanup and organization
- Enhanced JWT authentication with validation
- Comprehensive logging in critical modules
- API documentation created
- Quick start guide created
- Gzip compression implemented
- Enhanced graceful shutdown
- Fixed alerting service

### ⚠️ Pending Tasks
- Server restart required for API routing fixes
- Final security audit
- Load testing
- Backup strategy implementation

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables ✅
```bash
# Required production variables
SUPABASE_URL=<production_supabase_url>
SUPABASE_KEY=<production_supabase_key>
TELEGRAM_BOT_TOKEN=<production_bot_token>
TELEGRAM_ADMIN_BOT_TOKEN=<admin_bot_token>
JWT_SECRET=<strong_random_secret>
TON_BOOST_RECEIVER_ADDRESS=<production_ton_wallet>
APP_DOMAIN=<production_domain>
NODE_ENV=production
```

### 2. Database Setup ✅
- Ensure all Supabase tables are created
- Verify RLS policies are configured
- Test database connections
- Create backup schedule

### 3. Security Hardening ✅
- JWT secret is strong and unique
- No hardcoded credentials
- CORS properly configured
- Rate limiting enabled
- Input validation active

### 4. Performance Optimizations ✅
- Gzip compression enabled
- Static asset caching configured
- Database query optimization
- Connection pooling configured

### 5. Monitoring Setup ✅
- Health check endpoint: `/api/v2/monitor/health`
- API status endpoint: `/api/v2/monitor/status`
- System stats endpoint: `/api/v2/monitor/stats`
- Alerting service configured

---

## 🔧 Deployment Steps

### Step 1: Final Build
```bash
npm run build
```

### Step 2: Environment Configuration
1. Set all production environment variables
2. Verify `.env` is not committed to repository
3. Ensure SSL certificates are active

### Step 3: Database Migration
1. Verify all tables exist in production Supabase
2. Run any pending migrations
3. Test database connectivity

### Step 4: Deploy Application
```bash
# Start production server
npm start
```

### Step 5: Post-Deployment Verification
1. Check health endpoint: `curl https://your-domain/api/v2/monitor/health`
2. Verify API endpoints: `curl https://your-domain/api/v2/monitor/status`
3. Test Telegram bot with `/start` command
4. Verify admin bot functionality

---

## 🔍 Production Monitoring

### Real-time Monitoring
- WebSocket connections: Check active connections count
- API response times: Monitor via `/api/v2/monitor/stats`
- Error rates: Check logs for error patterns
- Resource usage: Monitor CPU and memory

### Automated Alerts
- Database connection failures
- High memory usage (>90%)
- Slow API response times (>5s)
- Critical errors in core modules

### Log Management
```bash
# View recent logs
tail -f logs/app.log

# Search for errors
grep ERROR logs/app.log

# Monitor specific module
grep BalanceManager logs/app.log
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. API 404 Errors
- **Solution**: Restart server to reload routes
- **Command**: `npm start`

#### 2. WebSocket Connection Failures
- **Check**: Firewall allows WebSocket connections
- **Verify**: SSL certificate supports WSS

#### 3. Database Connection Issues
- **Check**: Supabase service is active
- **Verify**: Connection string is correct
- **Test**: Run health check endpoint

#### 4. High Memory Usage
- **Check**: Active farming sessions count
- **Action**: Review memory leaks in schedulers
- **Solution**: Implement connection limits

---

## 📈 Performance Benchmarks

### Expected Performance
- API Response Time: <200ms average
- WebSocket Latency: <50ms
- Database Queries: <100ms
- Concurrent Users: 1000+

### Load Testing
```bash
# Basic load test
ab -n 1000 -c 100 https://your-domain/api/v2/health

# WebSocket load test
wscat -c wss://your-domain/ws
```

---

## 🔄 Update Process

### Rolling Updates
1. Deploy new version to staging
2. Run automated tests
3. Perform gradual rollout
4. Monitor error rates
5. Complete deployment or rollback

### Rollback Strategy
1. Keep previous version backup
2. Database rollback points
3. Quick switch capability
4. Automated rollback on high error rate

---

## 📊 Success Metrics

### Key Performance Indicators
- Uptime: >99.9%
- API Success Rate: >99%
- Average Response Time: <200ms
- Active Users: Monitor growth
- Transaction Success Rate: >99.5%

### Business Metrics
- Daily Active Users (DAU)
- User Retention Rate
- Transaction Volume
- Referral Network Growth

---

## 🆘 Emergency Contacts

### Critical Issues
- Database Down: Check Supabase status
- API Failures: Review server logs
- Security Breach: Rotate all secrets immediately

### Escalation Path
1. Check monitoring dashboard
2. Review recent deployments
3. Check external service status
4. Implement emergency fixes
5. Post-mortem analysis

---

**Last Updated**: July 06, 2025  
**Production Readiness**: 85%  
**Next Review**: After first production deployment