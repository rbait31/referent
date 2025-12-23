'use client'

import { useState } from 'react'

type ActionType = 'summary' | 'thesis' | 'telegram' | 'parse' | 'translate'

interface ParseResult {
  date: string | null
  title: string | null
  content: string | null
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const [parsedArticle, setParsedArticle] = useState<ParseResult | null>(null)

  const handleParse = async () => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActiveAction('parse')
    setResult('')

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при парсинге статьи')
      }

      const data: ParseResult = await response.json()
      setParsedArticle(data)
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setLoading(false)
    }
  }

  // Вспомогательная функция для парсинга статьи
  const parseArticle = async (): Promise<ParseResult> => {
    const parseResponse = await fetch('/api/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url.trim() }),
    })

    if (!parseResponse.ok) {
      const error = await parseResponse.json()
      throw new Error(error.error || 'Ошибка при парсинге статьи')
    }

    const parseData: ParseResult = await parseResponse.json()
    setParsedArticle(parseData)

    if (!parseData.content) {
      throw new Error('Не удалось извлечь контент статьи')
    }

    return parseData
  }

  const handleAction = async (action: ActionType) => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    // Для всех действий нужен распарсенный контент
    let articleContent = parsedArticle?.content
    let articleData = parsedArticle

    // Если статья еще не распарсена, парсим её
    if (!articleContent) {
      setLoading(true)
      try {
        articleData = await parseArticle()
        articleContent = articleData.content
      } catch (error) {
        setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
        setLoading(false)
        return
      }
    }

    // Теперь выполняем нужное действие
    setLoading(true)
    setActiveAction(action)
    setResult('')

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

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Ошибка при выполнении действия "${action}"`)
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
    } catch (error) {
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
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
            }}
            onInput={(e) => {
              const newUrl = (e.target as HTMLInputElement).value
              setUrl(newUrl)
            }}
            placeholder="https://example.com/article"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            disabled={loading}
          />
        </div>

        {/* Кнопки действий */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <button
              onClick={(e) => {
                e.preventDefault()
                handleParse()
              }}
              disabled={loading || !url.trim()}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                loading || !url.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : activeAction === 'parse'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
              }`}
              type="button"
            >
              Парсить статью
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleAction('translate')}
              disabled={loading || !url.trim()}
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
