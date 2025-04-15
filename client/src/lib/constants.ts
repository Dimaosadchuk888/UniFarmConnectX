// UniFarm application constants

// Navigation items
export const NAV_ITEMS = [
  { id: "dashboard", label: "Главная", icon: "home" },
  { id: "farming", label: "Фарминг", icon: "chart-line" },
  { id: "missions", label: "Задания", icon: "tasks" },
  { id: "friends", label: "Партнёрка", icon: "user-friends" },
  { id: "wallet", label: "Кошелёк", icon: "wallet" }
];

// Farming boost packages
export const BOOST_PACKAGES = [
  { 
    id: 1, 
    name: "Основной пакет UNI", 
    description: "Базовый ускоритель фарминга на 7 дней",
    type: "UNI",
    isPrimary: true,
    hashrate: 12, // H/s (Хешрейт)
    days: 7,
    price: "100 UNI"
  },
  { 
    id: 2, 
    name: "Пакет UNI + 1 TON", 
    description: "Премиум ускоритель фарминга на 10 дней",
    type: "TON",
    isPrimary: false,
    hashrate: 25, // H/s
    days: 10,
    price: "200 UNI + 1 TON"
  },
  { 
    id: 3, 
    name: "Пакет UNI + 5 TON", 
    description: "Премиум ускоритель фарминга на 20 дней",
    type: "TON",
    isPrimary: false,
    hashrate: 40, // H/s
    days: 20,
    price: "350 UNI + 5 TON"
  },
  { 
    id: 4, 
    name: "Пакет UNI + 15 TON", 
    description: "Премиум ускоритель фарминга на 30 дней",
    type: "TON",
    isPrimary: false,
    hashrate: 65, // H/s
    days: 30,
    price: "500 UNI + 15 TON"
  },
  { 
    id: 5, 
    name: "Пакет UNI + 25 TON", 
    description: "Премиум ускоритель фарминга на 60 дней",
    type: "TON",
    isPrimary: false,
    hashrate: 100, // H/s
    days: 60,
    price: "800 UNI + 25 TON"
  }
];

// Mission items
export const MISSIONS = [
  {
    id: 1,
    title: "Подписаться на канал",
    reward: "5 UNI",
    icon: "bullhorn"
  },
  {
    id: 2,
    title: "Пригласить 1 друга",
    reward: "10 UNI",
    icon: "user-plus"
  },
  {
    id: 3,
    title: "Подписка на YouTube",
    reward: "8 UNI",
    icon: "youtube"
  },
  {
    id: 4,
    title: "Check-in дня",
    reward: "2 UNI",
    icon: "calendar-check"
  }
];

// Mock chart data points (for income chart)
export const CHART_DATA_POINTS = [
  3, 5, 8, 12, 10, 15, 20, 25, 22, 30, 32, 28, 
  35, 40, 38, 45, 50, 48, 55, 58, 52, 60, 65, 62
];
