import fetch from 'node-fetch';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmX2NvZGUiOiJ0ZXN0X3VzZXJfMTc1MjEyOTg0MDkwNS1yZWYiLCJpYXQiOjE3NTIxMjk4NDAsImV4cCI6MTc1MjczNDY0MH0.FTkNRDBzgdcnOjLBwGP0RTHOHMGo3HCCd5lhgdpnOwE';

async function getUserInfo() {
  try {
    console.log('=== ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ 74 ===\n');
    
    // Получаем профиль пользователя
    const profileRes = await fetch('http://localhost:8080/api/v2/user/profile?user_id=74', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      if (profileData.success && profileData.data) {
        const user = profileData.data;
        console.log('👤 Профиль:');
        console.log(`- ID: ${user.id}`);
        console.log(`- Telegram ID: ${user.telegram_id}`);
        console.log(`- Username: ${user.username}`);
        console.log(`- Реферальный код: ${user.ref_code}`);
        console.log(`- Баланс UNI: ${user.balance_uni}`);
        console.log(`- Баланс TON: ${user.balance_ton}`);
        console.log(`- Депозит UNI: ${user.uni_deposit_amount}`);
        console.log(`- TON Boost пакет: ${user.ton_boost_package || 'Нет'}`);
        console.log(`- Дата регистрации: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
      }
    }
    
    console.log('\n=== СТАТИСТИКА РЕФЕРАЛОВ ===\n');
    
    // Получаем статистику рефералов
    const statsRes = await fetch('http://localhost:8080/api/v2/referral/74/stats', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      if (statsData.success && statsData.data) {
        const stats = statsData.data;
        console.log('📊 Статистика:');
        console.log(`- Всего рефералов: ${stats.totalReferrals || 0}`);
        console.log(`- Активных рефералов: ${stats.activeReferrals || 0}`);
        console.log(`- Общий доход от рефералов: ${stats.totalReferralIncome || 0} UNI`);
        console.log(`- Уровни рефералов:`);
        
        if (stats.levelBreakdown) {
          Object.entries(stats.levelBreakdown).forEach(([level, count]) => {
            console.log(`  Уровень ${level}: ${count} человек`);
          });
        }
      }
    }
    
    // Получаем список рефералов
    const listRes = await fetch('http://localhost:8080/api/v2/referral/74/list', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (listRes.ok) {
      const listData = await listRes.json();
      if (listData.success && listData.data) {
        const referrals = listData.data;
        console.log(`\n📋 Список рефералов (всего: ${referrals.length}):`);
        
        // Показываем топ 5 по балансу
        const topReferrals = referrals
          .sort((a, b) => (b.balance_uni || 0) - (a.balance_uni || 0))
          .slice(0, 5);
          
        topReferrals.forEach((ref, index) => {
          console.log(`\n${index + 1}. ${ref.username || 'Без имени'}`);
          console.log(`   - ID: ${ref.id}`);
          console.log(`   - Баланс UNI: ${ref.balance_uni || 0}`);
          console.log(`   - Баланс TON: ${ref.balance_ton || 0}`);
          console.log(`   - Активен: ${ref.is_active ? 'Да' : 'Нет'}`);
          console.log(`   - Зарегистрирован: ${new Date(ref.created_at).toLocaleDateString('ru-RU')}`);
        });
        
        if (referrals.length > 5) {
          console.log(`\n... и еще ${referrals.length - 5} рефералов`);
        }
      }
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

getUserInfo();