const OpenAI = require('openai');

function degradedFallback(session, eligibleProfiles) {
  const targetLevel = session.preferences?.level ?? 4;
  return eligibleProfiles
    .map((p) => ({
      user_id:     p.user_id,
      score:       Math.max(0, 100 - Math.abs((p.level ?? 4) - targetLevel) * 15),
      explanation: 'Compatibilité estimée par proximité de niveau.',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * Ask GPT-4o-mini to rank the top 5 eligible players for a session.
 * Falls back to level-proximity sort if the API call fails or key is missing.
 */
async function findMatches({ session, eligibleProfiles }) {
  if (!eligibleProfiles.length) return [];
  if (!process.env.OPENAI_API_KEY) return degradedFallback(session, eligibleProfiles);

  // Cap candidates to keep prompt size manageable
  const candidates = eligibleProfiles.slice(0, 50).map((p) => ({
    user_id:     p.user_id,
    level:       p.level,
    style:       p.style,
    strengths:   p.strengths,
    weaknesses:  p.weaknesses,
    description: p.description,
  }));

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: "Tu es un expert padel. Analyse les profils de joueurs et sélectionne les 5 meilleurs candidats pour rejoindre une session. Réponds uniquement avec du JSON valide, sans texte supplémentaire ni balises markdown.",
        },
        {
          role: 'user',
          content:
            `Session de padel:\n${JSON.stringify({
              date:            session.date,
              time:            session.time,
              preferences:     session.preferences,
              current_players: session.current_players,
              max_players:     session.max_players,
            })}\n\n` +
            `Candidats disponibles (${candidates.length}):\n${JSON.stringify(candidates)}\n\n` +
            `Sélectionne les 5 meilleurs candidats. Réponds avec exactement ce format JSON:\n` +
            `{\n  "matches": [\n    { "user_id": "<uuid>", "score": <0-100>, "explanation": "<1-2 phrases>" }\n  ]\n}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0].message.content.trim();
    const json = JSON.parse(text);

    if (!Array.isArray(json.matches)) throw new Error('format invalide');

    return json.matches
      .filter((m) => m.user_id && Number.isFinite(Number(m.score)))
      .slice(0, 5)
      .map((m) => ({
        user_id:     String(m.user_id),
        score:       Math.min(100, Math.max(0, Math.round(Number(m.score)))),
        explanation: String(m.explanation || '').trim(),
      }));
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({ level: 'error', msg: 'find-matches AI failure', error: err.message }));
    }
    return degradedFallback(session, eligibleProfiles);
  }
}

module.exports = { findMatches };
