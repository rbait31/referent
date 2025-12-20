'use client'

import { useState } from 'react'

type ActionType = 'summary' | 'thesis' | 'telegram'

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)

  const handleAction = async (action: ActionType) => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActiveAction(action)
    setResult('')

    // Здесь будет логика вызова API
    // Пока что просто имитация загрузки
    setTimeout(() => {
      setResult(`Результат для действия "${action}" будет здесь...`)
      setLoading(false)
    }, 1000)
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
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            disabled={loading}
          />
        </div>

        {/* Кнопки действий */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div className="text-gray-800 whitespace-pre-wrap">{result}</div>
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
