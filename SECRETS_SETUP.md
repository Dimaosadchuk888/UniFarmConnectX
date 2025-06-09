# UniFarm Security Configuration

## Required Replit Secrets

To run UniFarm securely, set these secrets in your Replit environment:

### Database Configuration
```
DATABASE_URL=postgresql://username:password@host:port/database
NEON_API_KEY=your_neon_api_key
NEON_PROJECT_ID=your_neon_project_id
```

### Authentication & Security
```
SESSION_SECRET=your_secure_session_secret_32_chars_min
JWT_SECRET=your_secure_jwt_secret_32_chars_min
```

### Telegram Bot Integration
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### Admin Access
```
ADMIN_USERNAMES=admin1,admin2
ADMIN_SECRET=your_admin_panel_secret
```

## Setting Secrets in Replit

1. Go to your Replit project
2. Click on "Secrets" tab in the left panel
3. Add each secret with the key-value pairs above
4. Restart your application

## Environment Variables Hierarchy

The application uses this priority order:
1. Replit Secrets (highest priority)
2. .env file values
3. Default fallback values (lowest priority)

## Security Notes

- Never commit actual secret values to git
- Use strong, unique values for SESSION_SECRET and JWT_SECRET
- Rotate secrets regularly in production
- Admin credentials should be changed from defaults before deployment