export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#2c3e50] text-white px-4 py-6">
      {/* Top Section with Connect Wallet */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">W</span>
          </div>
          <span className="text-blue-400 text-sm">Connect Wallet</span>
        </div>
        
        <div className="mb-6">
          <p className="text-orange-400 text-xs mb-2">Ошибка соединения с сервером</p>
          <p className="text-gray-300 text-sm">Добро пожаловать,</p>
          <h1 className="text-white text-xl font-normal">Пользователь</h1>
        </div>
      </div>

      {/* Income Forecast Section */}
      <div className="mb-8">
        <h2 className="text-white text-lg font-normal mb-6">Прогноз дохода</h2>
        
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <p className="text-gray-400 text-sm mb-2">За 1 час</p>
            <p className="text-white text-base">+0.0000UNI</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">За 24 часа</p>
            <p className="text-white text-base">+0.000UNI</p>
          </div>
        </div>
        
        <p className="text-gray-400 text-xs text-center leading-relaxed">
          Расчет основан на текущих ставках и активных бустах
        </p>
      </div>

      {/* Daily Income Section */}
      <div className="mb-8">
        <h2 className="text-white text-lg font-normal mb-4">Доход за день (UNI + TON)</h2>
        <div className="bg-gradient-to-r from-purple-700/30 to-blue-700/30 p-6 rounded-lg relative">
          <div className="absolute top-4 right-4">
            <span className="text-white text-sm">UNITON</span>
          </div>
        </div>
      </div>
    </div>
  );
}