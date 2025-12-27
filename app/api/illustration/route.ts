import { NextRequest, NextResponse } from 'next/server'

// Список моделей для попыток в порядке приоритета
const MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b:free',
]

// Модели Hugging Face для генерации изображений (в порядке приоритета)
const IMAGE_MODELS = [
  'stabilityai/sdxl',
  'stabilityai/stable-diffusion-xl-base-1.0',
  'stabilityai/stable-diffusion-2-1',
  'runwayml/stable-diffusion-v1-5',
  'CompVis/stable-diffusion-v1-4',
]

async function tryGeneratePrompt(
  apiKey: string,
  content: string,
  model: string
): Promise<{ success: boolean; prompt?: string; error?: string }> {
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
            content: `Создай детальный промпт на английском языке для генерации изображения, которое иллюстрирует эту статью. Промпт должен быть конкретным, описательным и подходящим для генерации изображения через Stable Diffusion. Ответ должен содержать только промпт, без дополнительных объяснений:\n\n${content}`
          }
        ],
      }),
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000
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
    const prompt = data.choices?.[0]?.message?.content?.trim()

    if (!prompt) {
      return {
        success: false,
        error: 'Промпт не получен от API'
      }
    }

    return { success: true, prompt }
  } catch (error) {
    console.error(`Prompt generation error (${model}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка при создании промпта'
    }
  }
}

async function generateImage(
  apiKey: string,
  prompt: string,
  model: string
): Promise<{ success: boolean; image?: string; error?: string }> {
  try {
    // Пробуем несколько вариантов URL
    const apiUrls = [
      `https://api-inference.huggingface.co/models/${model}`, // Старый API (может еще работать)
      `https://router.huggingface.co/models/${model}`, // Новый API
      `https://hf-inference.huggingface.co/models/${model}`, // Альтернативный формат
    ]
    
    let response: Response | null = null
    let lastError: string = ''
    
    // Пробуем каждый URL по очереди
    for (const apiUrl of apiUrls) {
      try {
        console.log(`Trying API URL: ${apiUrl}`)
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            inputs: prompt,
          }),
        })
        
        console.log(`Response status from ${apiUrl}: ${response.status}`)
        
        // Если получили успешный ответ или ошибку загрузки модели (503), используем его
        if (response.status === 200 || response.status === 503) {
          break
        }
        
        // Если получили сообщение о том, что API больше не поддерживается (410 Gone) или 404, пробуем следующий
        if (response.status === 404 || response.status === 410 || response.status >= 500) {
          const errorText = await response.text().catch(() => '')
          if (errorText.includes('no longer supported') || errorText.includes('Not Found') || response.status === 410) {
            lastError = `URL ${apiUrl} не поддерживается или не найден (${response.status})`
            continue
          }
        }
        
        // Для других ошибок тоже пробуем следующий URL
        lastError = `URL ${apiUrl} вернул статус ${response.status}`
      } catch (err) {
        lastError = `Ошибка при запросе к ${apiUrl}: ${err instanceof Error ? err.message : 'Unknown error'}`
        console.error(lastError)
        continue
      }
    }
    
    if (!response) {
      return {
        success: false,
        error: `Не удалось подключиться к API. ${lastError}`
      }
    }

    // Проверяем Content-Type ответа
    const contentType = response.headers.get('content-type') || ''

    if (response.status === 503) {
      // Модель загружается, нужно подождать
      let errorData: any = {}
      if (contentType.includes('application/json')) {
        errorData = await response.json().catch(() => ({}))
      }
      const estimatedTime = errorData.estimated_time || 20
      return {
        success: false,
        error: `Модель загружается. Подождите примерно ${Math.ceil(estimatedTime)} секунд и попробуйте снова.`
      }
    }

    if (!response.ok) {
      let errorData: any = {}
      if (contentType.includes('application/json')) {
        errorData = await response.json().catch(() => ({}))
      } else {
        const text = await response.text().catch(() => '')
        console.error('Hugging Face API error (text):', text)
        return {
          success: false,
          error: text || `Ошибка API: ${response.statusText} (${response.status})`
        }
      }
      console.error('Hugging Face API error:', errorData)
      const errorMessage = errorData.error || errorData.message || `Ошибка API: ${response.statusText} (${response.status})`
      return {
        success: false,
        error: errorMessage
      }
    }

    // Проверяем, что ответ действительно изображение
    if (!contentType.includes('image')) {
      const text = await response.text().catch(() => '')
      console.error('Hugging Face returned non-image:', text)
      return {
        success: false,
        error: 'API вернул не изображение. Возможно, модель недоступна.'
      }
    }

    // Получаем изображение как blob
    const imageBlob = await response.blob()
    
    // Проверяем размер blob
    if (imageBlob.size === 0) {
      return {
        success: false,
        error: 'Получено пустое изображение'
      }
    }
    
    // Конвертируем blob в base64
    const arrayBuffer = await imageBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    const mimeType = imageBlob.type || 'image/png'
    const dataUrl = `data:${mimeType};base64,${base64Image}`

    return { success: true, image: dataUrl }
  } catch (error) {
    console.error('Image generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка при генерации изображения'
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

    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    const huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY

    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured' },
        { status: 500 }
      )
    }

    if (!huggingFaceApiKey) {
      return NextResponse.json(
        { error: 'HUGGINGFACE_API_KEY is not configured' },
        { status: 500 }
      )
    }

    // Шаг 1: Генерируем промпт через OpenRouter
    let prompt: string | undefined
    for (const model of MODELS) {
      const result = await tryGeneratePrompt(openRouterApiKey, content, model)
      
      if (result.success && result.prompt) {
        prompt = result.prompt
        break
      }

      // Если это ошибка 429 (Too Many Requests), не пробуем другие модели
      if (result.error?.includes('лимит запросов')) {
        return NextResponse.json(
          { error: result.error },
          { status: 429 }
        )
      }
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Не удалось создать промпт. Все модели недоступны. Попробуйте позже.' },
        { status: 503 }
      )
    }

    // Шаг 2: Генерируем изображение через Hugging Face
    console.log('Generating image with prompt:', prompt.substring(0, 100) + '...')
    
    let imageResult: { success: boolean; image?: string; error?: string } | null = null
    
    // Пробуем модели по очереди
    for (const imageModel of IMAGE_MODELS) {
      imageResult = await generateImage(huggingFaceApiKey, prompt, imageModel)
      
      if (imageResult.success && imageResult.image) {
        break
      }
      
      // Если это ошибка 503 (модель загружается), пробуем следующую модель
      if (imageResult.error?.includes('загружается')) {
        console.log(`Model ${imageModel} is loading, trying next model...`)
        continue
      }
      
      // Если это другая ошибка, пробуем следующую модель
      console.log(`Model ${imageModel} failed:`, imageResult.error)
    }

    if (!imageResult || !imageResult.success || !imageResult.image) {
      console.error('Image generation failed for all models:', imageResult?.error)
      return NextResponse.json(
        { error: imageResult?.error || 'Не удалось сгенерировать изображение. Все модели недоступны.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      image: imageResult.image,
      prompt: prompt,
    })
  } catch (error) {
    console.error('Illustration error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate illustration' },
      { status: 500 }
    )
  }
}

