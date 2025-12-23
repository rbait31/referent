import { NextRequest, NextResponse } from 'next/server'

// Список моделей для попыток в порядке приоритета
const MODELS = [
  'deepseek/deepseek-r1:free',
  'deepseek/deepseek-chat:free',
  'Xiaomi/MiMo-V2-Flash:free',
]

async function tryTelegramPost(
  apiKey: string,
  content: string,
  title: string | null,
  date: string | null,
  url: string | null,
  model: string,
  retryDelay = 1000
): Promise<{ success: boolean; post?: string; error?: string }> {
  try {
    let prompt = 'Создай пост для Telegram на русском языке на основе этой статьи. Пост должен быть кратким, информативным и привлекательным. Используй эмодзи для оформления. Включи основные идеи и призыв к действию. В конце поста обязательно добавь ссылку на источник статьи.\n\n'
    
    if (title) {
      prompt += `Заголовок статьи: ${title}\n\n`
    }
    
    if (date) {
      prompt += `Дата публикации: ${date}\n\n`
    }
    
    prompt += `Содержание статьи:\n${content}`
    
    if (url) {
      prompt += `\n\nСсылка на источник: ${url}`
    }

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
            content: prompt
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
    const post = data.choices?.[0]?.message?.content

    if (!post) {
      return {
        success: false,
        error: 'Пост не получен от API'
      }
    }

    return { success: true, post }
  } catch (error) {
    console.error(`Telegram post error (${model}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка при создании поста для Telegram'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, title, date, url } = await request.json()

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
      const result = await tryTelegramPost(apiKey, content, title || null, date || null, url || null, model)
      
      if (result.success && result.post) {
        return NextResponse.json({ post: result.post })
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
      { error: 'Не удалось создать пост для Telegram. Все модели недоступны. Попробуйте позже.' },
      { status: 503 }
    )
  } catch (error) {
    console.error('Telegram post error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create telegram post' },
      { status: 500 }
    )
  }
}

