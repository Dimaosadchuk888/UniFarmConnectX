// Тестовый endpoint для проверки реферальной логики
const express = require('express');

// Импортируем ReferralService
const { ReferralService } = require('./modules/referral/service');

const app = express();
app.use(express.json());

// Тестовый endpoint для processReferral
app.post('/test-process-referral', async (req, res) => {
  try {
    console.log('🔍 Тест processReferral:', req.body);
    
    const { refCode, newUserId } = req.body;
    
    if (!refCode || !newUserId) {
      return res.status(400).json({
        success: false,
        error: 'Необходимы refCode и newUserId'
      });
    }
    
    const referralService = new ReferralService();
    const result = await referralService.processReferral(refCode, newUserId);
    
    console.log('🔍 Результат processReferral:', result);
    
    res.json(result);
    
  } catch (error) {
    console.error('🔍 Ошибка processReferral:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🔍 Тестовый сервер запущен на порту ${PORT}`);
});