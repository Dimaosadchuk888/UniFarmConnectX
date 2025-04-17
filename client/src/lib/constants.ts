// UniFarm application constants

// Navigation items
export const NAV_ITEMS = [
  { id: "dashboard", label: "Главная", icon: "home" },
  { id: "farming", label: "Фарминг", icon: "seedling" },
  { id: "missions", label: "Задания", icon: "clipboard-check" },
  { id: "friends", label: "Партнёрка", icon: "users" },
  { id: "wallet", label: "Кошелёк", icon: "wallet" },
  { id: "ton-boost-test", label: "TON Test", icon: "flask" }
];

// Farming boost packages
export const BOOST_PACKAGES = [
  { 
    id: 1, 
    name: "UNI + TON Boost", 
    description: "Базовый ускоритель фарминга на 7 дней",
    type: "UNI",
    isPrimary: true,
    hashrate: 12, // H/s (Хешрейт)
    days: 7,
    price: "100 UNI",
    uniYield: "1% Daily",
    tonYield: "0.5% Daily",
    bonus: "+10,000 UNI",
    isActive: false
  },
  { 
    id: 2, 
    name: "UNI + TON Boost", 
    description: "Премиум ускоритель фарминга на 10 дней",
    type: "TON",
    isPrimary: false,
    hashrate: 25, // H/s
    days: 10,
    price: "200 UNI + 1 TON",
    uniYield: "2% Daily",
    tonYield: "1% Daily",
    bonus: "+25,000 UNI",
    isActive: false
  },
  { 
    id: 3, 
    name: "UNI + TON Boost", 
    description: "Премиум ускоритель фарминга на 20 дней",
    type: "TON",
    isPrimary: false,
    hashrate: 40, // H/s
    days: 20,
    price: "350 UNI + 5 TON",
    uniYield: "2.5% Daily",
    tonYield: "1.3% Daily",
    bonus: "+50,000 UNI",
    isActive: false
  },
  { 
    id: 4, 
    name: "UNI + TON Boost", 
    description: "Премиум ускоритель фарминга на 30 дней",
    type: "TON",
    isPrimary: false,
    hashrate: 65, // H/s
    days: 30,
    price: "500 UNI + 15 TON",
    uniYield: "3% Daily",
    tonYield: "1.5% Daily",
    bonus: "+65,000 UNI",
    isActive: false
  },
  { 
    id: 5, 
    name: "UNI + TON Boost", 
    description: "Премиум ускоритель фарминга на 60 дней",
    type: "TON",
    isPrimary: true,
    hashrate: 100, // H/s
    days: 60,
    price: "800 UNI + 25 TON",
    uniYield: "3% Daily",
    tonYield: "1.8% Daily",
    bonus: "+75,000 UNI",
    isActive: false
  }
];

// Mission items
export const MISSIONS = [
  {
    id: 1,
    title: "Подписаться на Telegram канал",
    reward: "500 UNI",
    icon: "bullhorn",
    category: "Соцсети",
    description: "Подпишитесь на наш официальный Telegram канал"
  },
  {
    id: 2,
    title: "Пригласить 1 друга",
    reward: "1000 UNI",
    icon: "user-plus",
    category: "Приглашение",
    description: "Пригласите друга по вашей реферальной ссылке"
  },
  {
    id: 3,
    title: "Подписка на YouTube",
    reward: "800 UNI",
    icon: "youtube",
    category: "Соцсети",
    description: "Подпишитесь на наш YouTube канал"
  },
  {
    id: 4,
    title: "Check-in дня",
    reward: "200 UNI",
    icon: "calendar-check",
    category: "Check-in дня",
    description: "Ежедневное посещение приложения"
  },
  {
    id: 5,
    title: "Поставить лайк в Twitter",
    reward: "300 UNI",
    icon: "twitter",
    category: "Соцсети",
    description: "Поставьте лайк нашему последнему посту в Twitter"
  },
  {
    id: 6,
    title: "Присоединиться к Discord",
    reward: "400 UNI",
    icon: "discord",
    category: "Соцсети",
    description: "Присоединитесь к нашему сообществу в Discord"
  },
  {
    id: 7,
    title: "Бонус первого месяца",
    reward: "5000 UNI",
    icon: "gift",
    category: "Бонусные",
    description: "Бонус за первый месяц использования UniFarm"
  }
];

// Mock chart data points (for income chart)
export const CHART_DATA_POINTS = [
  3, 5, 8, 12, 10, 15, 20, 25, 22, 30, 32, 28, 
  35, 40, 38, 45, 50, 48, 55, 58, 52, 60, 65, 62
];
