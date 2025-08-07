"use strict";
/**
 * Глубокий анализ проблемы с TON Farming карточкой показывающей нули
 * Техническая диагностика полной цепочки данных
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("../core/supabase.js");
var service_js_1 = require("../modules/boost/service.js");
var TonFarmingRepository_js_1 = require("../modules/boost/TonFarmingRepository.js");
function analyzeTonFarmingCardIssue() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, user74, userError, _b, tonFarmingData, farmingError, boostService, statusUser1, statusUser74, tonFarmingRepo, activeUsers, user74Active, _c, transactions, txError, error_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('\n=== АНАЛИЗ ПРОБЛЕМЫ TON FARMING КАРТОЧКИ ===\n');
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 8, , 9]);
                    // 1. Проверка данных пользователя 74 в таблице users
                    console.log('1. Проверка данных пользователя 74 в таблице users:');
                    return [4 /*yield*/, supabase_js_1.supabase
                            .from('users')
                            .select('*')
                            .eq('id', 74)
                            .single()];
                case 2:
                    _a = _d.sent(), user74 = _a.data, userError = _a.error;
                    if (userError || !user74) {
                        console.log('❌ Ошибка получения пользователя 74:', userError);
                        return [2 /*return*/];
                    }
                    console.log('✅ Пользователь 74 найден:');
                    console.log('   - balance_ton:', user74.balance_ton);
                    console.log('   - ton_boost_package:', user74.ton_boost_package);
                    console.log('   - ton_farming_active:', user74.ton_farming_active);
                    console.log('   - ton_farming_deposit:', user74.ton_farming_deposit);
                    console.log('   - ton_farming_balance:', user74.ton_farming_balance);
                    // 2. Проверка данных в таблице ton_farming_data
                    console.log('\n2. Проверка данных в таблице ton_farming_data:');
                    return [4 /*yield*/, supabase_js_1.supabase
                            .from('ton_farming_data')
                            .select('*')
                            .eq('user_id', 74)
                            .single()];
                case 3:
                    _b = _d.sent(), tonFarmingData = _b.data, farmingError = _b.error;
                    if (farmingError) {
                        console.log('❌ Нет данных в ton_farming_data:', farmingError.message);
                    }
                    else if (tonFarmingData) {
                        console.log('✅ Данные в ton_farming_data:');
                        console.log('   - farming_balance:', tonFarmingData.farming_balance);
                        console.log('   - farming_rate:', tonFarmingData.farming_rate);
                        console.log('   - boost_package_id:', tonFarmingData.boost_package_id);
                        console.log('   - is_active:', tonFarmingData.is_active);
                    }
                    // 3. Тест метода getTonBoostFarmingStatus для user_id=1
                    console.log('\n3. Тест API метода для user_id=1:');
                    boostService = new service_js_1.BoostService();
                    return [4 /*yield*/, boostService.getTonBoostFarmingStatus('1')];
                case 4:
                    statusUser1 = _d.sent();
                    console.log('Результат для user_id=1:', JSON.stringify(statusUser1, null, 2));
                    // 4. Тест метода getTonBoostFarmingStatus для user_id=74
                    console.log('\n4. Тест API метода для user_id=74:');
                    return [4 /*yield*/, boostService.getTonBoostFarmingStatus('74')];
                case 5:
                    statusUser74 = _d.sent();
                    console.log('Результат для user_id=74:', JSON.stringify(statusUser74, null, 2));
                    // 5. Проверка активных TON Boost пользователей
                    console.log('\n5. Проверка активных TON Boost пользователей:');
                    tonFarmingRepo = new TonFarmingRepository_js_1.TonFarmingRepository();
                    return [4 /*yield*/, tonFarmingRepo.getActiveBoostUsers()];
                case 6:
                    activeUsers = _d.sent();
                    console.log("\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439: ".concat(activeUsers.length));
                    user74Active = activeUsers.find(function (u) { return u.user_id === 74; });
                    if (user74Active) {
                        console.log('✅ User 74 в списке активных:', user74Active);
                    }
                    else {
                        console.log('❌ User 74 НЕ в списке активных TON Boost пользователей');
                    }
                    // 6. Анализ архитектурной проблемы
                    console.log('\n6. АРХИТЕКТУРНАЯ ПРОБЛЕМА:');
                    console.log('❌ Frontend: Использует getUserIdFromURL() который возвращает null');
                    console.log('   → Fallback на user_id=1 вместо 74');
                    console.log('❌ Backend: getTonBoostFarmingStatus ищет ton_boost_package в users');
                    console.log('   → Но данные должны быть в ton_farming_data');
                    console.log('❌ Результат: API возвращает нули для всех пользователей');
                    // 7. Проверка транзакций TON Boost
                    console.log('\n7. Последние транзакции TON Boost для user 74:');
                    return [4 /*yield*/, supabase_js_1.supabase
                            .from('transactions')
                            .select('*')
                            .eq('user_id', 74)
                            .eq('type', 'FARMING_REWARD')
                            .contains('metadata', { original_type: 'TON_BOOST_INCOME' })
                            .order('created_at', { ascending: false })
                            .limit(5)];
                case 7:
                    _c = _d.sent(), transactions = _c.data, txError = _c.error;
                    if (!txError && transactions) {
                        console.log("\u041D\u0430\u0439\u0434\u0435\u043D\u043E ".concat(transactions.length, " \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0439 TON Boost"));
                        transactions.forEach(function (tx, i) {
                            console.log("   ".concat(i + 1, ". ").concat(tx.created_at, ": +").concat(tx.amount_ton, " TON"));
                        });
                    }
                    // 8. Рекомендации по исправлению
                    console.log('\n8. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:');
                    console.log('1️⃣ Frontend: Использовать userId из JWT токена вместо getUserIdFromURL()');
                    console.log('2️⃣ Backend: Переписать getTonBoostFarmingStatus для работы с ton_farming_data');
                    console.log('3️⃣ Альтернатива: Создать новый endpoint который корректно работает с новой архитектурой');
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _d.sent();
                    console.error('Ошибка анализа:', error_1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Запуск анализа
analyzeTonFarmingCardIssue()
    .then(function () {
    console.log('\n✅ Анализ завершен');
    process.exit(0);
})
    .catch(function (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});
