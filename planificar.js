exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  try {
    const { nivel, asig, grado, tiempo, destreza, indicador, tema, metod, comps, ins } = JSON.parse(event.body);

    const compStr = comps && comps.length ? comps.join(", ") : "ninguna específica";
    const insStr  = ins  && ins.length   ? ins.join(", ")   : "ninguna específica";

    const prompt = `Eres un experto en planificación curricular ecuatoriana con dominio en metodología ERCA, Diseño Universal para el Aprendizaje (DUA) y taxonomía de Kendall y Marzano.

Crea una planificación de clase completa con los siguientes datos:
- Nivel: ${nivel}
- Asignatura: ${asig}
- Grado/Curso: ${grado}
- Tiempo: ${tiempo} minutos
- Destreza con criterio de desempeño: ${destreza}
- Indicador de logro: ${indicador}
- Tema: ${tema}
- Metodología de la Experiencia: ${metod}
- Énfasis en competencias: ${compStr}
- Inserciones curriculares: ${insStr}

REGLAS OBLIGATORIAS:
1. Todas las actividades DEBEN iniciar con verbo en infinitivo (Observar, Participar, Construir, Resolver...)
2. Cada etapa ERCA tiene sus tres principios DUA bien detallados y específicos al tema
3. La Experiencia usa OBLIGATORIAMENTE la metodología indicada: ${metod}
4. Actividades colaborativas, kinestésicas, sin tecnología salvo indicación
5. Integra las inserciones curriculares dentro de cada etapa de forma natural y concreta
6. Redacción humanizada, detallada, progresión cognitiva: Experiencia→Recuperación, Reflexión→Comprensión, Conceptualización→Análisis, Aplicación→Utilización
7. Los recursos deben ser materiales concretos y accesibles en el aula ecuatoriana

Responde ÚNICAMENTE con este JSON (sin markdown, sin texto adicional antes o después):
{
  "experiencia": {
    "nombre": "nombre descriptivo de la actividad usando ${metod}",
    "actividad": "descripción muy detallada iniciando con verbo en infinitivo, mínimo 5 oraciones específicas al tema ${tema}",
    "representacion": "cómo se presenta la información visualmente, auditivamente y kinestésicamente, mínimo 2 oraciones",
    "accion": "cómo expresan y actúan los estudiantes con múltiples formas, mínimo 2 oraciones",
    "implicacion": "cómo se motiva y conecta con la vida real del estudiante, mínimo 2 oraciones",
    "insercion": "cómo se integra ${insStr} en esta etapa de forma concreta, 2 oraciones"
  },
  "reflexion": {
    "nombre": "nombre descriptivo de la actividad de reflexión",
    "actividad": "descripción muy detallada iniciando con verbo en infinitivo, mínimo 5 oraciones",
    "representacion": "descripción detallada, mínimo 2 oraciones",
    "accion": "descripción detallada, mínimo 2 oraciones",
    "implicacion": "descripción detallada, mínimo 2 oraciones",
    "insercion": "cómo se integra la inserción curricular en la reflexión, 2 oraciones"
  },
  "conceptualizacion": {
    "nombre": "nombre descriptivo de la actividad de conceptualización",
    "actividad": "descripción muy detallada iniciando con verbo en infinitivo, mínimo 5 oraciones",
    "representacion": "descripción detallada, mínimo 2 oraciones",
    "accion": "descripción detallada, mínimo 2 oraciones",
    "implicacion": "descripción detallada, mínimo 2 oraciones",
    "insercion": "cómo se integra la inserción curricular en la conceptualización, 2 oraciones"
  },
  "aplicacion": {
    "nombre": "nombre descriptivo de la actividad de aplicación",
    "actividad": "descripción muy detallada iniciando con verbo en infinitivo, mínimo 5 oraciones",
    "representacion": "descripción detallada, mínimo 2 oraciones",
    "accion": "descripción detallada, mínimo 2 oraciones",
    "implicacion": "descripción detallada, mínimo 2 oraciones",
    "insercion": "cómo se integra la inserción curricular en la aplicación, 2 oraciones"
  },
  "recursos": "lista de recursos concretos separados por coma",
  "tecnica": "técnica de evaluación apropiada para el nivel",
  "instrumento": "instrumento de evaluación apropiado para el nivel"
}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "API key de OpenAI no configurada en el servidor." }) };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 3000,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "Eres un experto en currículo ecuatoriano, metodología ERCA y DUA. Respondes ÚNICAMENTE con JSON válido, sin markdown ni texto adicional."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices[0].message.content.trim();

    let plan;
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      plan = JSON.parse(clean);
    } catch {
      throw new Error("ChatGPT no devolvió un JSON válido. Intenta de nuevo.");
    }

    return { statusCode: 200, headers, body: JSON.stringify({ plan }) };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Error interno del servidor." }),
    };
  }
};
