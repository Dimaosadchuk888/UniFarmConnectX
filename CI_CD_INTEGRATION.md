# Интеграция проверки стиля кода в CI/CD

Этот документ описывает, как интегрировать автоматическую проверку соглашений об именовании файлов в процессы непрерывной интеграции и непрерывной поставки (CI/CD).

## Настройка GitHub Actions

Файл конфигурации GitHub Actions уже настроен в `.github/workflows/naming-check.yml`. Он выполняет следующие шаги:

1. Запускается на каждый push и pull request в основные ветки (main, master, develop)
2. Устанавливает Node.js и необходимые зависимости
3. Запускает скрипт проверки именования файлов (`lint.js`)

## Настройка других CI/CD систем

### Jenkins

Для Jenkins добавьте следующий шаг в ваш Jenkinsfile:

```groovy
pipeline {
    agent {
        docker {
            image 'node:18'
        }
    }
    stages {
        stage('Check Naming Conventions') {
            steps {
                sh 'npm ci'
                sh 'npm install eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-import eslint-plugin-filename-rules'
                sh 'node lint.js'
            }
        }
    }
}
```

### GitLab CI

Для GitLab CI добавьте следующую конфигурацию в ваш `.gitlab-ci.yml`:

```yaml
check-naming:
  image: node:18
  stage: test
  script:
    - npm ci
    - npm install eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-import eslint-plugin-filename-rules
    - node lint.js
```

### Azure DevOps

Для Azure DevOps добавьте следующий шаг в ваш `azure-pipelines.yml`:

```yaml
steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
  displayName: 'Install Node.js'

- script: |
    npm ci
    npm install eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-import eslint-plugin-filename-rules
    node lint.js
  displayName: 'Check Naming Conventions'
```

## Интеграция с Pre-commit хуками

Вы также можете настроить проверку соглашений об именовании как Git pre-commit хук, чтобы предотвратить коммиты с неправильно названными файлами.

1. Создайте файл `.git/hooks/pre-commit`:

```bash
#!/bin/sh

# Запуск проверки именования файлов
node lint.js

# Если проверка не прошла, отменяем коммит
if [ $? -ne 0 ]; then
  echo "Коммит отменен. Исправьте именование файлов согласно соглашению."
  exit 1
fi
```

2. Сделайте скрипт исполняемым:

```bash
chmod +x .git/hooks/pre-commit
```

## Автоматизация исправлений

Для автоматического исправления проблем с именованием файлов выполните следующую команду:

```bash
node rename-files.js
```

Этот скрипт автоматически переименует файлы в соответствии с соглашением об именовании и обновит все импорты.