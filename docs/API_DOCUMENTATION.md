# 📚 UniFarm API Documentation

## Base URL
```
https://your-domain.replit.app/api/v2
```

## Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints

### Register/Login via Telegram
```http
POST /auth/telegram
Content-Type: application/json

{
  "initData": "telegram_init_data_string"
}

Response 200:
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": 48,
      "telegram_id": "88888888",
      "username": "user123",
      "balance_uni": "1000.000000",
      "balance_ton": "100.000000"
    }
  }
}
```

---

## 👤 User Endpoints

### Get User Profile
```http
GET /users/profile
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "id": 48,
    "telegram_id": "88888888",
    "username": "user123",
    "first_name": "John",
    "balance_uni": "1000.000000",
    "balance_ton": "100.000000",
    "ref_code": "ABC123",
    "referred_by": null,
    "is_active": true,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## 💰 Wallet Endpoints

### Get Balance
```http
GET /wallet/balance
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "balance_uni": 1000.0,
    "balance_ton": 100.0,
    "pending_uni": 0,
    "pending_ton": 0
  }
}
```

### Get Transactions
```http
GET /wallet/transactions?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "type": "FARMING_REWARD",
        "amount": "10.5",
        "currency": "UNI",
        "status": "completed",
        "created_at": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "totalPages": 5
  }
}
```

---

## 🌾 Farming Endpoints

### Get Farming Status
```http
GET /farming/status
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "isActive": true,
    "depositedAmount": "1000.0",
    "totalEarned": "150.5",
    "dailyRate": "0.5",
    "lastClaim": "2025-01-01T00:00:00.000Z"
  }
}
```

### Start Farming
```http
POST /farming/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": "100"
}

Response 200:
{
  "success": true,
  "message": "Farming started successfully"
}
```

### Claim Rewards
```http
POST /farming/claim
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "claimed": "5.5",
    "newBalance": "1005.5"
  }
}
```

---

## 🚀 Boost Endpoints

### Get Boost Packages
```http
GET /boost/packages

Response 200:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Basic Boost",
      "daily_rate": "1.0",
      "duration_days": 30,
      "min_amount": "100",
      "max_amount": "1000",
      "uni_bonus": "50"
    }
  ]
}
```

### Get Farming Status (TON Boost)
```http
GET /boost/farming-status?user_id=48
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "isActive": true,
    "tonBalance": 100.0,
    "dailyIncome": 1.0,
    "totalDeposits": 1,
    "totalEarned": 30.0,
    "activeBoost": {
      "package_id": 1,
      "daily_rate": 1.0,
      "start_date": "2025-01-01",
      "end_date": "2025-01-31"
    }
  }
}
```

---

## 👥 Referral Endpoints

### Get Referral Stats
```http
GET /referrals/stats
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "referralCode": "ABC123",
    "totalReferrals": 10,
    "activeReferrals": 8,
    "totalEarnings": {
      "uni": "500.0",
      "ton": "50.0"
    },
    "levels": [
      {
        "level": 1,
        "count": 5,
        "earnings_uni": "250.0",
        "earnings_ton": "25.0"
      }
    ]
  }
}
```

---

## 🎁 Daily Bonus Endpoints

### Get Daily Bonus Status
```http
GET /daily-bonus/status
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "canClaim": true,
    "streakDays": 5,
    "nextBonus": "2.5",
    "lastClaim": "2025-01-01T00:00:00.000Z",
    "nextClaimTime": "2025-01-02T00:00:00.000Z"
  }
}
```

### Claim Daily Bonus
```http
POST /daily-bonus/claim
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "amount": "2.5",
    "newStreak": 6,
    "nextClaimTime": "2025-01-03T00:00:00.000Z"
  }
}
```

---

## 🎯 Mission Endpoints

### Get Active Missions
```http
GET /missions/active
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Daily Login",
      "description": "Login for 7 days",
      "reward_uni": "10",
      "progress": 5,
      "target": 7,
      "is_completed": false
    }
  ]
}
```

---

## 📊 Monitor Endpoints

### Health Check
```http
GET /monitor/health

Response 200:
{
  "overall": "healthy",
  "database": "connected",
  "api": "operational",
  "criticalErrors": 0,
  "lastCheck": "2025-01-01T00:00:00.000Z"
}
```

### API Status Check
```http
GET /monitor/status

Response 200:
{
  "boostPackages": "OK",
  "walletBalance": "OK",
  "farmingStatus": "OK",
  "userProfile": "OK",
  "dailyBonusStatus": "OK",
  "referralStats": "OK"
}
```

### System Stats
```http
GET /monitor/stats

Response 200:
{
  "users": {
    "total": 1000,
    "active24h": 250,
    "new24h": 50
  },
  "transactions": {
    "total": 50000,
    "last24h": 1500
  },
  "farming": {
    "activeSessions": 500,
    "totalDeposited": "1000000.0"
  }
}
```

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request data"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## 🔒 Rate Limiting

- **Default limit**: 100 requests per minute per IP
- **Auth endpoints**: 10 requests per minute per IP
- **Wallet operations**: 30 requests per minute per user
- **Headers returned**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## 📝 Notes

1. All timestamps are in ISO 8601 format
2. All amounts are returned as strings to preserve precision
3. Pagination uses `page` and `limit` query parameters
4. JWT tokens expire after 7 days
5. WebSocket connections available at `wss://your-domain.replit.app`

---

**Last Updated**: July 06, 2025