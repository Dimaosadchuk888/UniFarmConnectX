/**
 * Скрипт для принудительного обновления баланса в localStorage
 */

// Принудительно устанавливаем данные пользователя в localStorage
const userData = {
  id: 1,
  balance_uni: "1000.000",
  balance_ton: "100.000",
  guest_id: "72d916a5-f9e4-4af0-b396-deebc280f712"
};

// Сохраняем в localStorage для отображения в интерфейсе
localStorage.setItem('unifarm_user_balance', JSON.stringify({
  uni: 1000,
  ton: 100,
  updated: Date.now()
}));

localStorage.setItem('unifarm_last_session', JSON.stringify({
  user_id: 1,
  guest_id: "72d916a5-f9e4-4af0-b396-deebc280f712",
  timestamp: Date.now()
}));

console.log('💰 Баланс принудительно обновлен:', userData);
console.log('🔄 Обновите страницу для отображения баланса');