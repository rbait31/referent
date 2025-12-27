'use client'

import { useState, useRef, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, X, Copy, Check } from 'lucide-react'

type ActionType = 'summary' | 'thesis' | 'telegram' | 'translate' | 'illustration'

interface ParseResult {
  date: string | null
  title: string | null
  content: string | null
}

type ErrorType = 'parse' | 'action' | null

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const [parsedArticle, setParsedArticle] = useState<ParseResult | null>(null)
  const [error, setError] = useState<{ type: ErrorType; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  // Функция для валидации URL
  const validateUrl = (urlString: string): boolean => {
    if (!urlString.trim()) {
      setUrlError(null)
      return false
    }

    try {
      const url = new URL(urlString.trim())
      // Проверяем, что протокол http или https
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        setUrlError('URL должен начинаться с http:// или https://')
        return false
      }
      setUrlError(null)
      return true
    } catch (e) {
      setUrlError('Введите корректный URL (например: https://example.com/article)')
      return false
    }
  }

  // Функция для сброса всех состояний
  const handleClear = () => {
    setUrl('')
    setResult('')
    setResultImage(null)
    setError(null)
    setActiveAction(null)
    setParsedArticle(null)
    setCopied(false)
    setUrlError(null)
  }

  // Функция для копирования результата в буфер обмена
  const handleCopy = async () => {
    if (!result) return

    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea')
      textArea.value = result
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackErr) {
        console.error('Не удалось скопировать текст', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  // Автоматическая прокрутка к результатам после успешной генерации
  useEffect(() => {
    if (result && !loading && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [result, loading])

  // Функция для получения дружественного сообщения об ошибке
  const getErrorMessage = (error: unknown, response?: Response): string => {
    // Ошибки сети (таймаут, нет соединения и т.п.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return 'Не удалось загрузить статью по этой ссылке.'
    }

    // Ошибки HTTP
    if (response) {
      if (response.status === 404) {
        return 'Не удалось загрузить статью по этой ссылке.'
      }
      if (response.status === 500 || response.status >= 500) {
        return 'Не удалось загрузить статью по этой ссылке.'
      }
      if (response.status === 408 || response.status === 504) {
        return 'Не удалось загрузить статью по этой ссылке.'
      }
    }

    // Ошибки парсинга контента
    if (error instanceof Error) {
      if (error.message.includes('извлечь контент') || error.message.includes('content')) {
        return 'Не удалось извлечь содержимое статьи. Проверьте корректность ссылки.'
      }
    }

    // Общая ошибка парсинга
    return 'Не удалось загрузить статью по этой ссылке.'
  }

  // Функция для получения дружественного сообщения об ошибке действия
  const getActionErrorMessage = (action: ActionType, error: unknown, response?: Response): string => {
    // Ошибки сети
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const actionNames: Record<ActionType, string> = {
        translate: 'перевода',
        summary: 'создания резюме',
        thesis: 'формирования тезисов',
        telegram: 'создания поста для Telegram',
        illustration: 'генерации иллюстрации',
      }
      return `Произошла ошибка при ${actionNames[action]}. Попробуйте еще раз.`
    }

    // Ошибки HTTP
    if (response) {
      if (response.status >= 500) {
        const actionNames: Record<ActionType, string> = {
          translate: 'перевода',
          summary: 'создания резюме',
          thesis: 'формирования тезисов',
          telegram: 'создания поста для Telegram',
          illustration: 'генерации иллюстрации',
        }
        return `Произошла ошибка при ${actionNames[action]}. Попробуйте еще раз.`
      }
    }

    // Общая ошибка
    const actionNames: Record<ActionType, string> = {
      translate: 'перевода',
      summary: 'создания резюме',
      thesis: 'формирования тезисов',
      telegram: 'создания поста для Telegram',
      illustration: 'генерации иллюстрации',
    }
    return `Произошла ошибка при ${actionNames[action]}. Попробуйте еще раз.`
  }

  // Вспомогательная функция для парсинга статьи
  const parseArticle = async (): Promise<ParseResult> => {
    let parseResponse: Response | null = null
    
    try {
      parseResponse = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      })

      if (!parseResponse.ok) {
        const errorMessage = getErrorMessage(null, parseResponse)
        throw new Error(errorMessage)
      }

      const parseData: ParseResult = await parseResponse.json()
      setParsedArticle(parseData)

      if (!parseData.content) {
        throw new Error('Не удалось извлечь содержимое статьи. Проверьте корректность ссылки.')
      }

      return parseData
    } catch (error) {
      // Если это уже наша ошибка с дружественным сообщением, пробрасываем её
      if (error instanceof Error && error.message.includes('Не удалось')) {
        throw error
      }
      // Для других ошибок создаем дружественное сообщение
      throw new Error(getErrorMessage(error, parseResponse || undefined))
    }
  }

  const handleAction = async (action: ActionType) => {
    if (!url.trim()) {
      setError({ type: null, message: 'Пожалуйста, введите URL статьи' })
      return
    }

    // Проверяем валидность URL перед выполнением действия
    if (!validateUrl(url)) {
      setError({ type: null, message: urlError || 'Введите корректный URL' })
      return
    }

    // Очищаем предыдущие ошибки
    setError(null)
    setResult('')
    setResultImage(null)

    // Для всех действий нужен распарсенный контент
    let articleContent = parsedArticle?.content
    let articleData = parsedArticle

    // Если статья еще не распарсена, парсим её
    if (!articleContent) {
      setLoading(true)
      setActiveAction(null)
      try {
        articleData = await parseArticle()
        articleContent = articleData.content
        setError(null) // Очищаем ошибки при успешном парсинге
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : getErrorMessage(error)
        setError({ type: 'parse', message: errorMessage })
        setLoading(false)
        return
      }
    }

    // Теперь выполняем нужное действие
    setLoading(true)
    setActiveAction(action)
    setError(null)

    try {
      let apiEndpoint = ''
      let requestBody: any = { content: articleContent }

      // Определяем эндпоинт и тело запроса в зависимости от действия
      switch (action) {
        case 'translate':
          apiEndpoint = '/api/translate'
          break
        case 'summary':
          apiEndpoint = '/api/summary'
          break
        case 'thesis':
          apiEndpoint = '/api/thesis'
          break
        case 'telegram':
          apiEndpoint = '/api/telegram'
          // Для telegram передаем также title, date и url
          requestBody = {
            content: articleContent,
            title: articleData?.title || null,
            date: articleData?.date || null,
            url: url.trim(),
          }
          break
        case 'illustration':
          apiEndpoint = '/api/illustration'
          break
        default:
          throw new Error('Неизвестное действие')
      }

      let response: Response | null = null
      try {
        response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          // Пытаемся получить детальное сообщение об ошибке от API
          let errorMessage = getActionErrorMessage(action, null, response)
          try {
            const errorData = await response.json()
            if (errorData.error && typeof errorData.error === 'string') {
              errorMessage = errorData.error
            }
          } catch (e) {
            // Если не удалось распарсить JSON, используем стандартное сообщение
          }
          throw new Error(errorMessage)
        }

        const data = await response.json()

        // Извлекаем результат в зависимости от типа ответа
        if (action === 'illustration') {
          // Для иллюстрации сохраняем изображение
          if (data.image) {
            setResultImage(data.image)
            setResult(data.prompt || '')
          } else {
            throw new Error('Изображение не получено')
          }
        } else {
          let resultText = ''
          if (data.translation) {
            resultText = data.translation
          } else if (data.summary) {
            resultText = data.summary
          } else if (data.thesis) {
            resultText = data.thesis
          } else if (data.post) {
            resultText = data.post
          } else {
            resultText = 'Результат не получен'
          }
          setResult(resultText)
          setResultImage(null)
        }

        setError(null) // Очищаем ошибки при успехе
      } catch (fetchError) {
        // Если это уже наша ошибка с дружественным сообщением, пробрасываем её
        if (fetchError instanceof Error && fetchError.message.includes('Произошла ошибка')) {
          throw fetchError
        }
        // Для других ошибок создаем дружественное сообщение
        throw new Error(getActionErrorMessage(action, fetchError, response || undefined))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : getActionErrorMessage(action, error)
      setError({ type: 'action', message: errorMessage })
      setResult('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-4 sm:mb-6 lg:mb-8">
          Referent
        </h1>
        <p className="text-center text-gray-600 text-sm sm:text-base mb-6 sm:mb-8 px-2">
          Анализ англоязычных статей с помощью AI
        </p>

        {/* Поле ввода URL */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              URL англоязычной статьи
            </label>
            <button
              onClick={handleClear}
              disabled={loading}
              title="Очистить все поля и результаты"
              className={`flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg font-medium transition-all w-full sm:w-auto ${
                loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <X className="h-4 w-4" />
              <span>Очистить</span>
            </button>
          </div>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => {
              const newUrl = e.target.value
              setUrl(newUrl)
              // Валидируем URL при изменении
              validateUrl(newUrl)
              // Очищаем ошибки при изменении URL
              if (error) {
                setError(null)
              }
            }}
            onBlur={(e) => {
              // Валидируем URL при потере фокуса
              validateUrl(e.target.value)
            }}
            placeholder="Введите URL статьи, например: https://example.com/article"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none transition ${
              urlError
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
            disabled={loading}
          />
          {urlError ? (
            <p className="mt-2 text-xs text-red-600">
              {urlError}
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Укажите ссылку на англоязычную статью
            </p>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <button
              onClick={() => handleAction('translate')}
              disabled={loading || !url.trim() || !!urlError}
              title="Перевести статью на русский язык"
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                loading || !url.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : activeAction === 'translate'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-purple-500 text-white hover:bg-purple-600 hover:shadow-md'
              }`}
            >
              Перевести
            </button>
            <button
              onClick={() => handleAction('summary')}
              disabled={loading || !url.trim() || !!urlError}
              title="Получить краткое резюме статьи"
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                loading || !url.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : activeAction === 'summary'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md'
              }`}
            >
              О чем статья?
            </button>
            <button
              onClick={() => handleAction('thesis')}
              disabled={loading || !url.trim() || !!urlError}
              title="Сформировать тезисы статьи"
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                loading || !url.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : activeAction === 'thesis'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md'
              }`}
            >
              Тезисы
            </button>
            <button
              onClick={() => handleAction('telegram')}
              disabled={loading || !url.trim() || !!urlError}
              title="Создать пост для Telegram на основе статьи"
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                loading || !url.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : activeAction === 'telegram'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md'
              }`}
            >
              Пост для Telegram
            </button>
            <button
              onClick={() => handleAction('illustration')}
              disabled={loading || !url.trim() || !!urlError}
              title="Сгенерировать иллюстрацию на основе статьи"
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                loading || !url.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : activeAction === 'illustration'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
              }`}
            >
              Иллюстрация
            </button>
          </div>
        </div>

        {/* Блок ошибок */}
        {error && (
          <Alert variant="destructive" className="mb-4 sm:mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription className="break-words">{error.message}</AlertDescription>
          </Alert>
        )}

        {/* Блок статуса процесса */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-md p-4 mb-4 sm:mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
              <span className="text-sm text-blue-700">
                {activeAction === null
                  ? 'Загружаю статью…'
                  : activeAction === 'translate'
                  ? 'Перевожу статью…'
                  : activeAction === 'summary'
                  ? 'Создаю резюме…'
                  : activeAction === 'thesis'
                  ? 'Формирую тезисы…'
                  : activeAction === 'telegram'
                  ? 'Создаю пост для Telegram…'
                  : activeAction === 'illustration'
                  ? 'Генерирую иллюстрацию…'
                  : 'Обрабатываю…'}
              </span>
            </div>
          </div>
        )}

        {/* Блок результата */}
        <div ref={resultRef} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Результат
            </h2>
            {result && !loading && activeAction !== 'illustration' && (
              <button
                onClick={handleCopy}
                title="Копировать результат"
                className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg font-medium transition-all bg-gray-100 text-gray-700 hover:bg-gray-200 w-full sm:w-auto"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Копировать</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="min-h-[200px] p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            {loading ? (
              <div className="flex flex-col sm:flex-row items-center justify-center h-full gap-3 sm:gap-4">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
                <span className="text-sm sm:text-base text-gray-600">Генерация результата...</span>
              </div>
            ) : activeAction === 'illustration' && resultImage ? (
              <div className="flex flex-col gap-4">
                <img 
                  src={resultImage} 
                  alt="Сгенерированная иллюстрация" 
                  className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                />
                {result && (
                  <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    <strong>Промпт:</strong> {result}
                  </div>
                )}
              </div>
            ) : result ? (
              <div className="text-gray-800 whitespace-pre-wrap font-mono text-xs sm:text-sm overflow-x-auto break-words max-h-[500px]">{result}</div>
            ) : (
              <div className="text-gray-400 text-center py-8 text-sm sm:text-base px-2">
                Введите URL статьи и выберите действие
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
