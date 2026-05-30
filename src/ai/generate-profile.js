const Groq = require('groq-sdk');

const DEGRADED = {
  niveau: 4,
  style: 'unknown',
  points_forts: [],
  points_faibles: [],
  description_courte: 'Profil à compléter',
};

function parseJson(text) {
  const clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

async function generateProfile(description) {
  if (!process.env.GROQ_API_KEY) return { ...DEGRADED };

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: "Tu es un expert padel. À partir de la description d'un joueur, génère un profil JSON structuré. Réponds uniquement avec du JSON valide, sans texte supplémentaire ni balises markdown.",
        },
        {
          role: 'user',
          content: `Description du joueur: ${description}\n\nGénère un profil JSON avec exactement ce format:\n{\n  "niveau": <entier entre 1 et 7>,\n  "style": "<style de jeu en quelques mots>",\n  "points_forts": ["<point1>", "<point2>"],\n  "points_faibles": ["<point1>"],\n  "description_courte": "<résumé en 1-2 phrases>"\n}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0].message.content.trim();
    const json = parseJson(text);

    const niveau = Number(json.niveau);
    if (!Number.isInteger(niveau) || niveau < 1 || niveau > 7) {
      throw new Error('niveau invalide');
    }

    return {
      niveau,
      style:              String(json.style || '').trim(),
      points_forts:       Array.isArray(json.points_forts)  ? json.points_forts.map(String)  : [],
      points_faibles:     Array.isArray(json.points_faibles) ? json.points_faibles.map(String) : [],
      description_courte: String(json.description_courte || '').trim(),
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({ level: 'error', msg: 'generate-profile AI failure', error: err.message }));
    }
    return { ...DEGRADED };
  }
}

module.exports = { generateProfile };
