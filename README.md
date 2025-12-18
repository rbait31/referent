# referent

Краткая аннотация веб страницы с переводом на русский язык

## Требования

Для работы проекта необходим **Node.js** версии 18 или выше.

### Установка Node.js

Если Node.js не установлен, выполните следующие шаги:

1. Скачайте установщик Node.js с официального сайта: [https://nodejs.org/](https://nodejs.org/)
   - Рекомендуется использовать LTS версию (Long Term Support)

2. Запустите установщик и следуйте инструкциям

3. После установки **перезапустите терминал** (закройте и откройте PowerShell заново)

4. Проверьте установку:
```powershell
node --version
npm --version
```

Обе команды должны вывести версии Node.js и npm соответственно.

## Установка pnpm (если не установлен)

Если вы хотите использовать pnpm, но он не установлен, выполните одну из следующих команд:

**Через npm:**
```powershell
npm install -g pnpm
```

**Через PowerShell (рекомендуется для Windows):**
```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

После установки **перезапустите терминал** (закройте и откройте PowerShell заново), чтобы команда `pnpm` стала доступна.

## Установка зависимостей

**Важно:** Убедитесь, что вы находитесь в директории проекта. Перейдите в директорию проекта:

```powershell
cd C:\Work\referent
```

Затем установите зависимости:

**С помощью pnpm:**
```powershell
pnpm install
```

**Или с помощью npm:**
```powershell
npm install
```

## Запуск

Запустите сервер разработки:

**С помощью pnpm:**
```powershell
pnpm dev
```

**Или с помощью npm:**
```powershell
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Сборка

Для создания production сборки:

**С помощью pnpm:**
```powershell
pnpm build
pnpm start
```

**Или с помощью npm:**
```powershell
npm run build
npm start
```
