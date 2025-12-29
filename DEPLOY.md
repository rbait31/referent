# Инструкция по развертыванию на Vercel

## Подготовка

Проект уже настроен для деплоя на Vercel. Убедитесь, что у вас есть:

1. ✅ `vercel.json` - конфигурация Vercel
2. ✅ `package.json` - с правильными скриптами
3. ✅ `pnpm-lock.yaml` - для использования pnpm

## Шаги деплоя

### Вариант 1: Через Vercel CLI

```powershell
# Установка Vercel CLI (если еще не установлен)
npm i -g vercel

# Вход в аккаунт
vercel login

# Деплой (первый раз)
vercel

# Последующие деплои
vercel --prod
```

### Вариант 2: Через веб-интерфейс Vercel

1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите "Add New Project"
3. Импортируйте ваш GitHub/GitLab/Bitbucket репозиторий
4. Vercel автоматически определит Next.js проект
5. Настройте переменные окружения (см. ниже)
6. Нажмите "Deploy"

## Настройка переменных окружения

В настройках проекта на Vercel (Settings → Environment Variables) добавьте:

| Переменная | Описание | Где получить |
|------------|----------|--------------|
| `OPENROUTER_API_KEY` | API ключ для OpenRouter | https://openrouter.ai/ |
| `HUGGINGFACE_API_KEY` | API ключ для Hugging Face | https://huggingface.co/settings/tokens |

**Важно:** После добавления переменных окружения нужно пересобрать проект (Redeploy).

## Проверка деплоя

После успешного деплоя:

1. Проверьте, что все API роуты работают
2. Убедитесь, что переменные окружения установлены правильно
3. Проверьте логи в панели Vercel при возникновении ошибок

## Локальная разработка

Для локальной разработки создайте файл `.env.local`:

```
OPENROUTER_API_KEY=your_key_here
HUGGINGFACE_API_KEY=your_key_here
```

Затем запустите:

```powershell
pnpm install
pnpm dev
```

## Полезные команды

```powershell
# Просмотр логов
vercel logs

# Просмотр информации о проекте
vercel inspect

# Удаление проекта
vercel remove
```

