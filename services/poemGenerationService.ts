import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { PoemStyle, PoemMood, Poem, Language } from '../types';
import { generatePoemWithClaude } from './claudeService';

const MODEL_NAME = "gemini-2.5-flash";
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Rate limiting simple en memoria
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_DELAY = 2000; // 2 segundos entre llamadas

const checkRateLimit = (userId: string = 'default'): boolean => {
  const lastCall = rateLimitMap.get(userId);
  const now = Date.now();
  
  if (lastCall && (now - lastCall) < RATE_LIMIT_DELAY) {
    return false;
  }
  
  rateLimitMap.set(userId, now);
  return true;
};

/**
 * Intenta generar un poema usando Gemini primero.
 * Si falla, automáticamente hace fallback a Claude Haiku.
 */
export const generatePoemFromImage = async (
  base64Image: string,
  mimeType: string,
  style: PoemStyle,
  mood: PoemMood,
  language: Language
): Promise<Poem> => {
  // Verificar rate limit
  if (!checkRateLimit()) {
    throw new Error(language === 'es' 
      ? 'Por favor espera un momento antes de generar otro poema.'
      : 'Please wait a moment before generating another poem.');
  }

  // INTENTAR PRIMERO CON GEMINI
  try {
    console.log('🔷 Attempting poem generation with Gemini...');
    const poem = await generateWithGemini(base64Image, mimeType, style, mood, language);
    console.log('✅ Poem generated successfully with Gemini');
    return poem;
  } catch (geminiError: any) {
    console.warn('⚠️ Gemini failed:', geminiError.message);
    
    // Detectar errores que justifican usar el fallback
    const shouldFallback = 
      geminiError?.message?.includes('429') ||
      geminiError?.message?.includes('RESOURCE_EXHAUSTED') ||
      geminiError?.message?.includes('quota') ||
      geminiError?.message?.includes('401') ||
      geminiError?.message?.includes('403') ||
      geminiError?.message?.includes('API key');
    
    if (shouldFallback) {
      console.log('🔄 Switching to Claude Haiku fallback...');
      
      try {
        const poem = await generatePoemWithClaude(base64Image, mimeType, style, mood, language);
        return poem;
      } catch (claudeError: any) {
        console.error('❌ Claude fallback also failed:', claudeError.message);
        
        // Si ambos fallan, lanzar un error más informativo
        throw new Error(language === 'es'
          ? 'No se pudo generar el poema con ninguno de los servicios disponibles. Por favor intenta más tarde.'
          : 'Could not generate poem with any available service. Please try again later.');
      }
    }
    
    // Si no es un error de cuota/auth, lanzar el error original
    throw geminiError;
  }
};

/**
 * Función interna para generar con Gemini
 */
const generateWithGemini = async (
  base64Image: string,
  mimeType: string,
  style: PoemStyle,
  mood: PoemMood,
  language: Language
): Promise<Poem> => {
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

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: prompt,
  };

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          poem: { type: Type.STRING },
        },
        required: ["title", "poem"],
      },
    },
  });

  const responseJson = response.text.trim();
  if (!responseJson) {
    throw new Error("La API no devolvió contenido.");
  }
  
  const result: Poem = JSON.parse(responseJson);
  return result;
};

// Función auxiliar para limpiar el rate limit (útil para testing)
export const clearRateLimit = () => {
  rateLimitMap.clear();
};
