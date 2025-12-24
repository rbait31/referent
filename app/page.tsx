'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

type ActionType = 'summary' | 'thesis' | 'telegram' | 'translate'

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
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const [parsedArticle, setParsedArticle] = useState<ParseResult | null>(null)
  const [error, setError] = useState<{ type: ErrorType; message: string } | null>(null)

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

    // Очищаем предыдущие ошибки
    setError(null)
    setResult('')

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
          const errorMessage = getActionErrorMessage(action, null, response)
          throw new Error(errorMessage)
        }

        const data = await response.json()

        // Извлекаем результат в зависимости от типа ответа
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
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
          Referent
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Анализ англоязычных статей с помощью AI
        </p>

        {/* Поле ввода URL */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            URL англоязычной статьи
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => {
              const newUrl = e.target.value
              setUrl(newUrl)
              // Очищаем ошибки при изменении URL
              if (error) {
                setError(null)
              }
            }}
            onInput={(e) => {
              const newUrl = (e.target as HTMLInputElement).value
              setUrl(newUrl)
              // Очищаем ошибки при изменении URL
              if (error) {
                setError(null)
              }
            }}
            placeholder="Введите URL статьи, например: https://example.com/article"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            disabled={loading}
          />
          <p className="mt-2 text-xs text-gray-500">
            Укажите ссылку на англоязычную статью
          </p>
        </div>

        {/* Кнопки действий */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleAction('translate')}
              disabled={loading || !url.trim()}
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
              disabled={loading || !url.trim()}
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
              disabled={loading || !url.trim()}
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
              disabled={loading || !url.trim()}
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
          </div>
        </div>

        {/* Блок ошибок */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {/* Блок статуса процесса */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-md p-4 mb-6">
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
                  : 'Обрабатываю…'}
              </span>
            </div>
          </div>
        )}

        {/* Блок результата */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Результат
          </h2>
          <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg border border-gray-200">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span className="ml-4 text-gray-600">Генерация результата...</span>
              </div>
            ) : result ? (
              <div className="text-gray-800 whitespace-pre-wrap font-mono text-sm overflow-auto max-h-[500px]">{result}</div>
            ) : (
              <div className="text-gray-400 text-center py-8">
                Введите URL статьи и выберите действие
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
