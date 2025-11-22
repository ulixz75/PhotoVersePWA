import { PoemStyle, PoemMood, Poem, Language } from '../types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-20250514'; // Claude Haiku más reciente
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;

export const generatePoemWithClaude = async (
  base64Image: string,
  mimeType: string,
  style: PoemStyle,
  mood: PoemMood,
  language: Language
): Promise<Poem> => {
  if (!CLAUDE_API_KEY) {
    throw new Error('Claude API key not configured');
  }

  const langInstruction = language === 'es' ? 'español' : 'inglés';
  
  const prompt = `Analiza esta imagen y crea un poema original en ${langInstruction} con un título.
- Estilo poético: ${style}.
- Tono emocional: ${mood}.
- Estructura: El poema debe tener entre 2 y 4 estrofas. Cada estrofa debe tener entre 4 y 6 versos.
- RIMA: Es FUNDAMENTAL que el poema tenga una rima consistente y armoniosa. Usa uno de estos esquemas de rima:
  * ABAB (riman el 1º con 3º y 2º con 4º verso)
  * AABB (riman versos consecutivos: 1º-2º, 3º-4º)
  * ABBA (rima abrazada)
  * ABCB (riman solo los versos pares)
- MÉTRICA: Intenta mantener un número similar de sílabas en cada verso (entre 8-11 sílabas) para dar ritmo al poema.
- Las rimas deben ser naturales, no forzadas. Prioriza la calidad de la rima consonante (coinciden vocal y consonante desde la última vocal acentuada).
- Responde únicamente en formato JSON con una clave "title" para el título y una clave "poem" para el poema (el poema debe usar '\\n' para los saltos de línea y '\\n\\n' para separar estrofas).`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Claude');
    }

    // Extraer el JSON de la respuesta de Claude
    let responseText = data.content[0].text.trim();
    
    // Claude a veces envuelve el JSON en bloques de código, así que los limpiamos
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```\n?/g, '').trim();
    }

    const result: Poem = JSON.parse(responseText);
    
    if (!result.title || !result.poem) {
      throw new Error('Invalid poem structure from Claude');
    }

    console.log('✅ Poem generated successfully with Claude Haiku');
    return result;

  } catch (error: any) {
    console.error('Error calling Claude API:', error);
    
    if (error?.message?.includes('401') || error?.message?.includes('403')) {
      throw new Error(language === 'es'
        ? 'Error de autenticación con Claude. Verifica tu clave de API.'
        : 'Authentication error with Claude. Check your API key.');
    }
    
    if (error?.message?.includes('429') || error?.message?.includes('rate_limit')) {
      throw new Error(language === 'es'
        ? 'Límite de solicitudes de Claude alcanzado. Por favor intenta más tarde.'
        : 'Claude rate limit reached. Please try again later.');
    }
    
    if (error instanceof SyntaxError) {
      throw new Error(language === 'es'
        ? 'La respuesta de Claude no es un JSON válido.'
        : 'Claude response is not valid JSON.');
    }
    
    throw error;
  }
};
