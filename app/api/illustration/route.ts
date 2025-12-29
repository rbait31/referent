import { NextRequest, NextResponse } from 'next/server'
import { HfInference } from '@huggingface/inference'

// Список моделей для попыток в порядке приоритета
// Используем только рабочие бесплатные модели
const MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemini-flash-1.5:free',
]

// Модели Hugging Face для генерации изображений
const IMAGE_MODELS = [
  'stabilityai/stable-diffusion-xl-base-1.0',
  'stabilityai/sdxl',
  'stabilityai/stable-diffusion-2-1',
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
    // Используем официальный Inference Client от HuggingFace
    // Он автоматически выбирает нужного провайдера (fal, replicate, stability, bfl)
    const hf = new HfInference(apiKey)
    
    console.log(`Generating image with model: ${model}`)
    
    // Используем метод textToImage из Inference SDK
    const imageResult: unknown = await hf.textToImage({
      model: model,
      inputs: prompt,
    })
    
    // Обрабатываем результат в зависимости от типа
    let dataUrl: string
    
    // Проверяем, является ли результат строкой
    if (typeof imageResult === 'string') {
      // Если результат уже строка (base64 или URL)
      if (imageResult.startsWith('data:')) {
        dataUrl = imageResult
      } else if (imageResult.startsWith('http://') || imageResult.startsWith('https://')) {
        // Если это URL, загружаем изображение
        const response = await fetch(imageResult)
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64Image = buffer.toString('base64')
        dataUrl = `data:image/png;base64,${base64Image}`
      } else {
        // Предполагаем, что это base64 без префикса
        dataUrl = `data:image/png;base64,${imageResult}`
      }
    } else {
      // Обрабатываем как Blob или объект с методом arrayBuffer
      try {
        let arrayBuffer: ArrayBuffer
        
        if (imageResult instanceof Blob) {
          arrayBuffer = await imageResult.arrayBuffer()
        } else if (imageResult && typeof imageResult === 'object' && 'arrayBuffer' in imageResult && typeof (imageResult as any).arrayBuffer === 'function') {
          arrayBuffer = await (imageResult as any).arrayBuffer()
        } else {
          return {
            success: false,
            error: 'Неожиданный тип результата генерации изображения'
          }
        }
        
        if (arrayBuffer.byteLength === 0) {
          return {
            success: false,
            error: 'Получено пустое изображение'
          }
        }
        
        const buffer = Buffer.from(arrayBuffer)
        const base64Image = buffer.toString('base64')
        dataUrl = `data:image/png;base64,${base64Image}`
      } catch (e) {
        return {
          success: false,
          error: 'Не удалось обработать результат генерации изображения'
        }
      }
    }

    return { success: true, image: dataUrl }
  } catch (error: any) {
    console.error('Image generation error:', error)
    
    // Обрабатываем специфичные ошибки
    if (error?.status === 401) {
      return {
        success: false,
        error: 'Неверный или отсутствующий API токен. Проверьте HUGGINGFACE_API_KEY в .env.local'
      }
    }
    
    if (error?.status === 403 || error?.message?.includes('billing') || error?.message?.includes('paid')) {
      return {
        success: false,
        error: 'Модель требует платный план Hugging Face (Inference plan) или подключенный billing'
      }
    }
    
    return {
      success: false,
      error: error?.message || 'Ошибка при генерации изображения'
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
      
      // Если это критическая ошибка (401, 403), не пробуем другие модели
      if (imageResult.error?.includes('неверный') || imageResult.error?.includes('платный план')) {
        break
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

