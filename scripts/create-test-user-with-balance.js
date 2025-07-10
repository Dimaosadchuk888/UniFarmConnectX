import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют необходимые переменные окружения SUPABASE_URL или SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  try {
    console.log('🚀 Создание тестового пользователя с балансом 1000 TON / 1000 UNI...');

    // Генерируем уникальные данные для тестового пользователя
    const timestamp = Date.now();
    const testUserId = 999000 + Math.floor(Math.random() * 1000); // ID в диапазоне 999000-999999
    const telegramId = `${testUserId}`;
    const username = `test_user_${timestamp}`;
    const firstName = 'Test';
    const lastName = 'User';
    const refCode = `TEST_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;

    // Создаем пользователя с начальным балансом
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        username: username,
        first_name: firstName,
        ref_code: refCode,
        balance_uni: '1000.000000000', // 1000 UNI
        balance_ton: '1000.000000000', // 1000 TON
        uni_farming_balance: '0',
        uni_farming_active: false,
        ton_boost_package: null,
        is_admin: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Ошибка создания пользователя:', createError);
      return;
    }

    console.log('✅ Пользователь создан успешно:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Telegram ID: ${newUser.telegram_id}`);
    console.log(`   Username: @${newUser.username}`);
    console.log(`   Ref Code: ${newUser.ref_code}`);
    console.log(`   Balance UNI: ${newUser.balance_uni}`);
    console.log(`   Balance TON: ${newUser.balance_ton}`);

    // Создаем JWT токен для авторизации
    const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
    const token = jwt.sign(
      {
        userId: newUser.id,
        telegram_id: newUser.telegram_id,
        username: newUser.username,
        ref_code: newUser.ref_code
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    console.log('\n🔐 JWT токен для авторизации:');
    console.log(token);

    // Создаем приветственную транзакцию
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: newUser.id,
        type: 'INITIAL_DEPOSIT',
        amount_uni: '1000.000000000',
        amount_ton: '1000.000000000',
        amount: '2000.000000000',
        currency: 'BOTH',
        description: 'Initial test balance deposit',
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('⚠️  Предупреждение: не удалось создать транзакцию:', transactionError.message);
    } else {
      console.log('✅ Создана приветственная транзакция');
    }

    // Создаем HTML файл для быстрого доступа
    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test User Login - UniFarm</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #1a1a1a;
            color: #fff;
        }
        .container {
            background: #2a2a2a;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        h1 {
            color: #8b5cf6;
            margin-bottom: 20px;
        }
        .info {
            background: #3a3a3a;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .info p {
            margin: 5px 0;
            font-family: monospace;
        }
        button {
            background: #8b5cf6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin-right: 10px;
            margin-top: 10px;
        }
        button:hover {
            background: #7c3aed;
        }
        .success {
            background: #10b981;
            color: white;
            padding: 10px;
            border-radius: 5px;
            margin-top: 20px;
            display: none;
        }
        .token-display {
            background: #1a1a1a;
            padding: 10px;
            border-radius: 5px;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Test User Login - UniFarm</h1>
        
        <div class="info">
            <h3>Информация о тестовом пользователе:</h3>
            <p><strong>User ID:</strong> ${newUser.id}</p>
            <p><strong>Telegram ID:</strong> ${newUser.telegram_id}</p>
            <p><strong>Username:</strong> @${newUser.username}</p>
            <p><strong>Ref Code:</strong> ${newUser.ref_code}</p>
            <p><strong>Balance UNI:</strong> ${newUser.balance_uni}</p>
            <p><strong>Balance TON:</strong> ${newUser.balance_ton}</p>
        </div>

        <div class="info">
            <h3>JWT Token:</h3>
            <div class="token-display">${token}</div>
        </div>

        <button onclick="loginUser()">🚀 Войти в систему</button>
        <button onclick="copyToken()">📋 Скопировать токен</button>
        <button onclick="openPreview()">🌐 Открыть UniFarm</button>
        
        <div id="success" class="success"></div>
    </div>

    <script>
        const token = '${token}';
        
        function loginUser() {
            localStorage.setItem('unifarm_jwt_token', token);
            document.getElementById('success').style.display = 'block';
            document.getElementById('success').innerHTML = '✅ Авторизация успешна! Токен сохранен в localStorage.';
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        }
        
        function copyToken() {
            navigator.clipboard.writeText(token).then(() => {
                document.getElementById('success').style.display = 'block';
                document.getElementById('success').innerHTML = '📋 Токен скопирован в буфер обмена!';
                setTimeout(() => {
                    document.getElementById('success').style.display = 'none';
                }, 3000);
            });
        }
        
        function openPreview() {
            localStorage.setItem('unifarm_jwt_token', token);
            window.open('/', '_blank');
        }
    </script>
</body>
</html>`;

    // Сохраняем HTML файл
    const fs = await import('fs');
    const filename = `test-user-${newUser.id}-login.html`;
    fs.writeFileSync(filename, htmlContent);

    console.log(`\n📄 HTML файл для входа создан: ${filename}`);
    console.log('\n✨ Готово! Откройте HTML файл в браузере для быстрого входа.');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Запускаем создание пользователя
createTestUser();