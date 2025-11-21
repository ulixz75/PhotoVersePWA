import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { PoemStyle, PoemMood, Poem, Language } from '../types';

const MODEL_NAME = "gemini-2.5-flash";

// La clave de API se gestiona de forma segura a través de las variables de entorno.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Rate limiting simple en memoria
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_DELAY = 2000; // 2 segundos entre llamadas

const checkRateLimit = (userId: string = 'default'): boolean => {
  const lastCall = rateLimitMap.get(userId);
  const now = Date.now();
  
  if (lastCall && (now - lastCall) < RATE_LIMIT_DELAY) {
    return false; // Demasiado rápido
  }
  
  rateLimitMap.set(userId, now);
  return true;
};

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

  try {
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

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    
    // Manejo específico de errores 429
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error(language === 'es'
        ? 'Cuota de API agotada. Por favor intenta más tarde o verifica tu plan de Google AI.'
        : 'API quota exhausted. Please try again later or check your Google AI plan.');
    }
    
    // Manejo específico de errores 401/403
    if (error?.message?.includes('401') || error?.message?.includes('403') || error?.message?.includes('API key')) {
      throw new Error(language === 'es'
        ? 'Error de autenticación con la API. Verifica tu clave de API.'
        : 'Authentication error with API. Check your API key.');
    }
    
    if (error instanceof SyntaxError) {
      throw new Error("La respuesta de la API no es un JSON válido.");
    }
    
    if (error instanceof Error) {
      throw new Error(`Error de la API: ${error.message}`);
    }
    
    throw new Error("No se pudo generar el poema. Inténtalo de nuevo más tarde.");
  }
};

// Función auxiliar para limpiar el rate limit (útil para testing)
export const clearRateLimit = () => {
  rateLimitMap.clear();
};
