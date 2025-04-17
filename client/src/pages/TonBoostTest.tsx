import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/queryClient';

interface TonBoostPackage {
  id: number;
  name: string;
  priceTon: string;
  bonusUni: string;
  rateTon: string;
  rateUni: string;
}

interface TonFarmingInfo {
  isActive: boolean;
  totalTonDepositAmount: string;
  depositCount: number;
  totalTonRatePerSecond: string;
  totalUniRatePerSecond: string;
  dailyIncomeTon: string;
  dailyIncomeUni: string;
  deposits: any[];
}

export default function TonBoostTest() {
  const [packages, setPackages] = useState<TonBoostPackage[]>([]);
  const [activeBoosts, setActiveBoosts] = useState<any[]>([]);
  const [farmingInfo, setFarmingInfo] = useState<TonFarmingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(1);
  const [selectedBoost, setSelectedBoost] = useState<number | null>(null);

  // Загрузка списка TON Boost-пакетов
  useEffect(() => {
    const fetchBoosts = async () => {
      try {
        const response = await apiRequest('/api/ton-boosts');
        if (response.success) {
          setPackages(response.data);
        } else {
          setError(response.message || 'Ошибка при загрузке TON Boost-пакетов');
        }
      } catch (err) {
        setError('Произошла ошибка при запросе к API');
        console.error(err);
      }
    };

    fetchBoosts();
  }, []);

  // Загрузка активных TON Boost-депозитов пользователя
  const fetchActiveBoosts = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/ton-boosts/active?user_id=${userId}`);
      if (response.success) {
        setActiveBoosts(response.data);
      } else {
        setError(response.message || 'Ошибка при загрузке активных TON Boost-депозитов');
      }
    } catch (err) {
      setError('Произошла ошибка при запросе к API');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка информации о TON фарминге
  const fetchFarmingInfo = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/ton-farming/info?user_id=${userId}`);
      if (response.success) {
        setFarmingInfo(response.data);
      } else {
        setError(response.message || 'Ошибка при загрузке информации о TON фарминге');
      }
    } catch (err) {
      setError('Произошла ошибка при запросе к API');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Обновление баланса TON фарминга
  const updateFarmingBalance = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/ton-farming/update-balance?user_id=${userId}`);
      if (response.success) {
        alert(`Баланс обновлен: Заработано TON: ${response.data.earnedTonThisUpdate}, Заработано UNI: ${response.data.earnedUniThisUpdate}`);
        fetchFarmingInfo();
      } else {
        setError(response.message || 'Ошибка при обновлении баланса TON фарминга');
      }
    } catch (err) {
      setError('Произошла ошибка при запросе к API');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Покупка TON Boost-пакета
  const purchaseBoost = async () => {
    if (!selectedBoost) {
      alert('Выберите буст-пакет');
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest(
        '/api/ton-boosts/purchase',
        {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            boost_id: selectedBoost
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.success) {
        alert(`Буст-пакет успешно приобретен! Депозит ID: ${response.data.depositId}`);
        fetchActiveBoosts();
        fetchFarmingInfo();
      } else {
        setError(response.message || 'Ошибка при покупке TON Boost-пакета');
      }
    } catch (err) {
      setError('Произошла ошибка при запросе к API');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">TON Boost API Тестирование</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Ошибка:</strong> {error}
          <button className="ml-2 text-red-700" onClick={() => setError('')}>✕</button>
        </div>
      )}
      
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">ID пользователя:</label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(Number(e.target.value))}
            className="border rounded p-2 min-w-16"
          />
        </div>
        
        <div className="flex gap-2 items-end">
          <button
            onClick={fetchActiveBoosts}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={loading}
          >
            Загрузить активные бусты
          </button>
          
          <button
            onClick={fetchFarmingInfo}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            disabled={loading}
          >
            Получить инфо о фарминге
          </button>
          
          <button
            onClick={updateFarmingBalance}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            disabled={loading}
          >
            Обновить баланс
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Список TON Boost-пакетов */}
        <div className="bg-white shadow-md rounded p-4">
          <h2 className="text-xl font-semibold mb-2">TON Boost-пакеты</h2>
          {packages.length === 0 ? (
            <p>Нет доступных пакетов</p>
          ) : (
            <div className="space-y-2">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`border p-3 rounded ${selectedBoost === pkg.id ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setSelectedBoost(pkg.id)}
                >
                  <h3 className="font-medium">{pkg.name}</h3>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div>Цена TON:</div>
                    <div className="text-blue-500 font-medium">{pkg.priceTon}</div>
                    
                    <div>Бонус UNI:</div>
                    <div className="text-purple-500 font-medium">{pkg.bonusUni}</div>
                    
                    <div>TON Ставка (% в день):</div>
                    <div className="text-blue-500 font-medium">{pkg.rateTon}%</div>
                    
                    <div>UNI Ставка (% в день):</div>
                    <div className="text-purple-500 font-medium">{pkg.rateUni}%</div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={purchaseBoost}
                className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={loading || selectedBoost === null}
              >
                Купить выбранный пакет
              </button>
            </div>
          )}
        </div>
        
        {/* Информация о фарминге */}
        <div className="bg-white shadow-md rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Информация о TON фарминге</h2>
          {farmingInfo ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1">
                <div>Активен:</div>
                <div>{farmingInfo.isActive ? 'Да' : 'Нет'}</div>
                
                <div>Всего TON в депозитах:</div>
                <div className="text-blue-500 font-medium">{farmingInfo.totalTonDepositAmount}</div>
                
                <div>Количество депозитов:</div>
                <div>{farmingInfo.depositCount}</div>
                
                <div>TON в секунду:</div>
                <div className="text-blue-500 font-medium">{farmingInfo.totalTonRatePerSecond}</div>
                
                <div>UNI в секунду:</div>
                <div className="text-purple-500 font-medium">{farmingInfo.totalUniRatePerSecond}</div>
                
                <div>TON в день:</div>
                <div className="text-blue-500 font-medium">{farmingInfo.dailyIncomeTon}</div>
                
                <div>UNI в день:</div>
                <div className="text-purple-500 font-medium">{farmingInfo.dailyIncomeUni}</div>
              </div>
              
              {/* Список депозитов */}
              {farmingInfo.deposits.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Активные депозиты:</h3>
                  <div className="space-y-2">
                    {farmingInfo.deposits.map((deposit) => (
                      <div key={deposit.id} className="border p-2 rounded">
                        <div className="grid grid-cols-2 gap-1 text-sm">
                          <div>ID:</div>
                          <div>{deposit.id}</div>
                          
                          <div>Сумма TON:</div>
                          <div className="text-blue-500 font-medium">{deposit.ton_amount}</div>
                          
                          <div>Бонус UNI:</div>
                          <div className="text-purple-500 font-medium">{deposit.bonus_uni}</div>
                          
                          <div>Создан:</div>
                          <div>{new Date(deposit.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>Информация о фарминге не загружена</p>
          )}
        </div>
        
        {/* Активные буст-депозиты */}
        <div className="bg-white shadow-md rounded p-4 md:col-span-2">
          <h2 className="text-xl font-semibold mb-2">Активные TON Boost-депозиты</h2>
          {activeBoosts.length === 0 ? (
            <p>Нет активных буст-депозитов</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBoosts.map((boost) => (
                <div key={boost.id} className="border p-3 rounded">
                  <h3 className="font-medium">Депозит #{boost.id}</h3>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div>Сумма TON:</div>
                    <div className="text-blue-500 font-medium">{boost.ton_amount}</div>
                    
                    <div>TON в секунду:</div>
                    <div className="text-blue-500 font-medium">{boost.rate_ton_per_second}</div>
                    
                    <div>UNI в секунду:</div>
                    <div className="text-purple-500 font-medium">{boost.rate_uni_per_second}</div>
                    
                    <div>Создан:</div>
                    <div>{new Date(boost.created_at).toLocaleString()}</div>
                    
                    <div>Последнее обновление:</div>
                    <div>{new Date(boost.last_updated_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}