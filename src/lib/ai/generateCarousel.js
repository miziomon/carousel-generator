import { getAiConfig } from './config.js'
import { buildSystemPrompt } from './buildSystemPrompt.js'
import { ApiError, mapHttpErrorToApiError } from './errors.js'

export async function generateCarousel({ postText, slideCount, extraInstructions, currentCarousel, userId }) {
  const { url, token } = getAiConfig()

  if (!url || !token) {
    throw new ApiError('Configurazione API mancante', 'CONFIG_MISSING', null)
  }

  const systemPrompt = buildSystemPrompt(currentCarousel)
  const message = buildUserMessage(postText, slideCount, extraInstructions)
  const generationId = crypto.randomUUID()

  const body = {
    message,
    system_prompt: systemPrompt,
    force_json_response: true,
    ...(userId ? { user_id: userId } : {}),
    metadata: {
      source: 'carosello-builder',
      slide_count_requested: slideCount === 'auto' ? null : slideCount,
      has_extra_instructions: Boolean(extraInstructions?.trim()),
      input_chars: postText.length,
      generation_id: generationId,
    },
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new ApiError('Errore di rete. Verifica la connessione.', 'NETWORK_ERROR', null, err)
  }

  const responseBody = await response.json().catch(() => null)

  if (!response.ok) {
    throw mapHttpErrorToApiError(response.status, responseBody)
  }

  let carousel
  try {
    carousel = JSON.parse(responseBody.response)
  } catch (err) {
    throw new ApiError(
      'La risposta non è JSON valido',
      'INVALID_JSON_RESPONSE',
      responseBody?.response,
      err
    )
  }

  return {
    carousel,
    model: responseBody.model,
    usage: responseBody.usage,
    jsonRepaired: responseBody.json_repaired,
    generationId,
  }
}

function buildUserMessage(postText, slideCount, extraInstructions) {
  const parts = [postText.trim()]

  if (slideCount !== 'auto') {
    parts.push(`\n[Numero target di slide: ${slideCount}]`)
  }

  if (extraInstructions?.trim()) {
    parts.push(`\n[Istruzioni extra dell'utente: ${extraInstructions.trim()}]`)
  }

  return parts.join('\n')
}
