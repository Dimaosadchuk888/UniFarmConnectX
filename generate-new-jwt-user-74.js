import jwt from 'jsonwebtoken';
import fs from 'fs';

// Используем тот же секрет что и сервер
const JWT_SECRET = 'your-super-secret-jwt-key-minimum-32-characters';

// Данные пользователя 74 из базы
const payload = {
  userId: 74,
  user_id: 74, // дублируем для совместимости
  username: 'test_user_1752129840905',
  telegram_id: 999489,
  ref_code: 'TEST_1752129840905_dokxv0'
};

// Генерируем токен с 7-дневным сроком действия
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

console.log('Новый JWT токен для пользователя 74:');
console.log(token);
console.log('\nДекодированный payload:');
console.log(jwt.decode(token));

// Создаем HTML файл для обновления токена
const html = `<!DOCTYPE html>
<html>
<head>
    <title>Обновление JWT токена для пользователя 74</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f0f0f0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        button {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
        }
        button:hover {
            background: #45a049;
        }
        .token {
            background: #f5f5f5;
            padding: 10px;
            word-break: break-all;
            border-radius: 5px;
            margin: 10px 0;
        }
        .success {
            color: green;
            font-weight: bold;
        }
        .error {
            color: red;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Обновление JWT токена для пользователя 74</h1>
        
        <h2>Новый токен:</h2>
        <div class="token">${token}</div>
        
        <h2>Информация о токене:</h2>
        <pre>${JSON.stringify(jwt.decode(token), null, 2)}</pre>
        
        <button onclick="updateToken()">Обновить токен в браузере</button>
        <button onclick="clearAndUpdate()">Очистить всё и обновить</button>
        <button onclick="testBalance()">Тестировать API баланса</button>
        
        <div id="status"></div>
    </div>

    <script>
        const newToken = '${token}';
        
        function updateToken() {
            localStorage.setItem('unifarm_jwt_token', newToken);
            document.getElementById('status').innerHTML = '<p class="success">✓ Токен обновлен!</p>';
            setTimeout(() => location.reload(), 1000);
        }
        
        function clearAndUpdate() {
            // Очищаем все данные
            localStorage.clear();
            sessionStorage.clear();
            
            // Устанавливаем только новый токен
            localStorage.setItem('unifarm_jwt_token', newToken);
            
            document.getElementById('status').innerHTML = '<p class="success">✓ Все данные очищены и токен обновлен!</p>';
            setTimeout(() => location.reload(), 1500);
        }
        
        async function testBalance() {
            try {
                const response = await fetch('/api/v2/wallet/balance?user_id=74', {
                    headers: {
                        'Authorization': 'Bearer ' + newToken
                    }
                });
                
                const data = await response.json();
                document.getElementById('status').innerHTML = '<h3>Результат теста баланса:</h3><pre>' + 
                    JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
                document.getElementById('status').innerHTML = '<p class="error">Ошибка: ' + error.message + '</p>';
            }
        }
    </script>
</body>
</html>`;

fs.writeFileSync('update-jwt-user-74.html', html);
console.log('\nСоздан файл update-jwt-user-74.html для обновления токена в браузере');