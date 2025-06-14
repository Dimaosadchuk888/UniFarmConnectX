# SUPABASE DEPLOYMENT INSTRUCTIONS
**For Client Implementation**  
**Status:** Ready for Production Deployment

## OVERVIEW
The UniFarm system has been completely migrated to Supabase API. All database operations now use the unified Supabase client instead of direct PostgreSQL connections. The system is ready for production deployment once you complete the manual setup steps below.

## REQUIRED SETUP STEPS

### 1. CREATE SUPABASE PROJECT
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login to your account
3. Click "New Project"
4. Choose organization and enter project details:
   - **Name:** UniFarm-Production
   - **Database Password:** [Use strong password]
   - **Region:** [Choose closest to your users]
5. Wait for project creation (2-3 minutes)

### 2. GET PROJECT CREDENTIALS
After project creation, you'll need two values:
1. **Project URL:** Found in Settings > API
   - Format: `https://xxxxxxxxxxxxx.supabase.co`
2. **Anonymous Key:** Found in Settings > API  
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. EXECUTE DATABASE SCHEMA
1. In your Supabase project, go to **SQL Editor**
2. Create new query and copy the complete contents of `create-supabase-schema-complete.sql`
3. Click **Run** to create all tables and indexes
4. Verify tables created: users, user_sessions, transactions, referrals, farming_sessions

### 4. CONFIGURE ENVIRONMENT VARIABLES
Set these environment variables in your deployment platform:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anonymous-key

# Telegram Bot Configuration  
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your-bot-username

# Server Configuration
NODE_ENV=production
PORT=3000
```

### 5. REMOVE OLD DATABASE VARIABLES
Delete these old environment variables if they exist:
```bash
# Remove these - no longer needed
DATABASE_URL
PGHOST
PGUSER  
PGDATABASE
PGPASSWORD
PGPORT
DATABASE_PROVIDER
USE_NEON_DB
FORCE_NEON_DB
```

## VERIFICATION STEPS

### 1. Test Database Connection
After deployment, check server logs for:
```
[SUPABASE] Connected successfully to project: your-project-id
[SUPABASE] Database connection established
```

### 2. Test API Endpoints
Verify these endpoints work:
- `GET /api/v2/health` - System health check
- `POST /api/v2/auth/telegram` - User authentication
- `GET /api/v2/users/profile` - User profile (requires auth)

### 3. Test Telegram Integration
1. Open your Telegram bot
2. Send `/start` command
3. Verify user registration and authentication works
4. Check Supabase database for new user records

## PRODUCTION DEPLOYMENT COMMANDS

### Using Replit Deployment
1. Ensure environment variables are set in Replit Secrets
2. Click "Deploy" button in Replit
3. System will automatically build and deploy

### Using Manual Server
```bash
# Install dependencies
npm install

# Build production assets
npm run build

# Start production server
npm start
```

## DATABASE SCHEMA OVERVIEW
The system uses 5 core tables:

1. **users** - User profiles and balances
2. **user_sessions** - Authentication sessions  
3. **transactions** - Financial transaction history
4. **referrals** - Multi-level referral tracking
5. **farming_sessions** - UNI/TON farming operations

## MONITORING AND MAINTENANCE

### Database Monitoring
- Monitor Supabase dashboard for connection health
- Check table sizes and query performance
- Review API usage in Supabase Analytics

### Application Monitoring  
- Check server logs for Supabase connection errors
- Monitor API response times
- Verify Telegram webhook connectivity

## TROUBLESHOOTING

### Common Issues
1. **Supabase Connection Failed**
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
   - Check Supabase project is active and accessible

2. **Tables Not Found**  
   - Ensure you ran the complete SQL schema from `create-supabase-schema-complete.sql`
   - Check all 5 tables exist in Supabase Table Editor

3. **Authentication Errors**
   - Verify Telegram bot token is valid
   - Check TELEGRAM_BOT_USERNAME matches your bot

### Support
- Review `SUPABASE_MIGRATION_COMPLETION_REPORT.md` for technical details
- Check server logs for specific error messages
- Verify all environment variables are properly configured

## COMPLETION CHECKLIST
- [ ] Supabase project created
- [ ] Database schema executed successfully  
- [ ] Environment variables configured
- [ ] Old database variables removed
- [ ] Application deployed and running
- [ ] Telegram bot authentication tested
- [ ] Database operations verified working

Once all steps are completed, your UniFarm system will be fully operational with Supabase as the database backend.