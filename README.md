# UniFarm Connect

Advanced blockchain learning through gamified wallet interactions

## 🚀 Features

- **Telegram Web App** - Seamless integration with Telegram
- **TON Wallet Integration** - Real blockchain interactions
- **Gamified Learning** - Earn rewards while learning
- **Real-time Updates** - Live blockchain data
- **User Dashboard** - Comprehensive user management
- **Admin Panel** - Advanced administration tools

## 🛠 Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, Vite, TailwindCSS
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: TON Network
- **Authentication**: JWT
- **Real-time**: WebSocket
- **Deployment**: Replit

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Telegram Bot Token
- TON API Key

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/UniFarmConnect.git
   cd UniFarmConnect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   npm run build:prod
   ```

5. **Start the server**
   ```bash
   npm run start:prod
   ```

## 🌐 Environment Variables

Create a `.env` file with the following variables:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ADMIN_BOT_TOKEN=your_admin_bot_token
TON_BOOST_RECEIVER_ADDRESS=your_ton_address
TONAPI_API_KEY=your_tonapi_key
```

## 🚀 Deployment

### Replit Deployment

1. Fork this repository to your GitHub account
2. Go to [replit.com](https://replit.com)
3. Click "Create Repl" → "Import from GitHub"
4. Select your forked repository
5. Add environment variables in Replit Secrets
6. Deploy!

### Manual Deployment

1. Build the project: `npm run build:prod`
2. Start the server: `npm run start:prod`
3. Configure your domain and SSL

## 📱 Telegram Setup

1. Create a bot with @BotFather
2. Set up Web App: `/newapp`
3. Configure Menu Button with your app URL
4. Test the integration

## 🔗 API Endpoints

- `GET /api/v2/monitor/health` - Health check
- `GET /api/v2/monitor/status` - System status
- `POST /api/v2/auth/refresh` - Refresh JWT token
- `GET /api/v2/users/profile` - User profile

## 📊 Monitoring

- Health checks: `/api/v2/monitor/health`
- System status: `/api/v2/monitor/status`
- Real-time metrics available

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact:
- Telegram: @UniFarming_Bot
- Email: support@unifarm.com

## 🔐 Security

- JWT authentication
- Rate limiting
- Input validation
- CORS protection
- Environment variable protection

---

**Made with ❤️ for the TON community** 