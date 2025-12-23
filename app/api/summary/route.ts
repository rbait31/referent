import { NextRequest, NextResponse } from 'next/server'

// Список моделей для попыток в порядке приоритета
const MODELS = [
  'deepseek/deepseek-r1:free',
  'deepseek/deepseek-chat:free',
  'Xiaomi/MiMo-V2-Flash:free',
]

async function trySummary(
  apiKey: string,
  content: string,
  model: string,
  retryDelay = 1000
): Promise<{ success: boolean; summary?: string; error?: string }> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: `Опиши кратко, о чем эта статья на русском языке. Ответ должен быть кратким и информативным:\n\n${content}`
          }
        ],
      }),
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay
      return {
        success: false,
        error: `Превышен лимит запросов. Попробуйте позже через ${Math.ceil(waitTime / 1000)} секунд.`
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`OpenRouter API error (${model}):`, errorData)
      return {
        success: false,
        error: errorData.error?.message || `Ошибка API: ${response.statusText}`
      }
    }

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content

    if (!summary) {
      return {
        success: false,
        error: 'Краткое описание не получено от API'
      }
    }

    return { success: true, summary }
  } catch (error) {
    console.error(`Summary error (${model}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка при создании краткого описания'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured' },
        { status: 500 }
      )
    }

    // Пробуем модели по очереди
    for (const model of MODELS) {
      const result = await trySummary(apiKey, content, model)
      
      if (result.success && result.summary) {
        return NextResponse.json({ summary: result.summary })
      }

      // Если это ошибка 429 (Too Many Requests), не пробуем другие модели
      if (result.error?.includes('лимит запросов')) {
        return NextResponse.json(
          { error: result.error },
          { status: 429 }
        )
      }
    }

    // Если все модели не сработали
    return NextResponse.json(
      { error: 'Не удалось создать краткое описание. Все модели недоступны. Попробуйте позже.' },
      { status: 503 }
    )
  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create summary' },
      { status: 500 }
    )
  }
}

