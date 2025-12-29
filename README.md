# referent
Референт - Краткая аннотация веб страницы с переводом на русский язык с ИИ-обработкой
PROJECT.md - описание проекта

## Развертывание на Vercel

### Быстрый деплой

1. Установите Vercel CLI (если еще не установлен):
```powershell
npm i -g vercel
```

2. Войдите в Vercel:
```powershell
vercel login
```

3. Деплой проекта:
```powershell
vercel
```

4. Для продакшн деплоя:
```powershell
vercel --prod
```

### Деплой через GitHub

1. Загрузите проект в GitHub репозиторий
2. Перейдите на [vercel.com](https://vercel.com)
3. Импортируйте ваш репозиторий
4. Настройте переменные окружения (см. ниже)
5. Нажмите "Deploy"

### Переменные окружения

В настройках проекта на Vercel добавьте следующие переменные окружения:

- `OPENROUTER_API_KEY` - API ключ от OpenRouter (получите на https://openrouter.ai/)
- `HUGGINGFACE_API_KEY` - API ключ от Hugging Face (получите на https://huggingface.co/settings/tokens)

### Локальная разработка

1. Установите зависимости:
```powershell
pnpm install
```

2. Создайте файл `.env.local` с переменными окружения:
```
OPENROUTER_API_KEY=your_key_here
HUGGINGFACE_API_KEY=your_key_here
```

3. Запустите dev сервер:
```powershell
pnpm dev
```

### Скрипты

- `pnpm dev` - запуск dev сервера
- `pnpm build` - сборка для продакшн
- `pnpm start` - запуск продакшн сервера
- `pnpm lint` - проверка кода линтером

