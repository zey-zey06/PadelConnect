const Groq = require('groq-sdk');

const DEGRADED = { score: 50, explication: 'Compatibilité neutre' };

function parseJson(text) {
  const clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

async function matchScore({ candidateProfile, acceptedProfiles, sessionPreferences }) {
  if (!process.env.GROQ_API_KEY) return { ...DEGRADED };

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: "Tu es un expert padel. Calcule un score de compatibilité entre un candidat et un groupe existant. Réponds uniquement avec du JSON valide, sans texte supplémentaire ni balises markdown.",
        },
        {
          role: 'user',
          content: `Profil candidat: ${JSON.stringify(candidateProfile ?? {})}\nProfils du groupe actuel: ${JSON.stringify(acceptedProfiles ?? [])}\nPréférences de la session: ${JSON.stringify(sessionPreferences ?? {})}\n\nGénère un score JSON avec exactement ce format:\n{\n  "score": <entier entre 0 et 100>,\n  "explication": "<1-2 phrases expliquant la compatibilité>"\n}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0].message.content.trim();
    const json = parseJson(text);

    const score = Number(json.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error('score invalide');
    }

    return {
      score:       Math.round(score),
      explication: String(json.explication || '').trim(),
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({ level: 'error', msg: 'match-score AI failure', error: err.message }));
    }
    return { ...DEGRADED };
  }
}

module.exports = { matchScore };
