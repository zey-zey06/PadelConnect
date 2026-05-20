const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEGRADED = { score: 50, explication: 'Compatibilité neutre' };

async function matchScore({ candidateProfile, acceptedProfiles, sessionPreferences }) {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: "Tu es un expert padel. Calcule un score de compatibilité entre un candidat et un groupe existant. Réponds uniquement avec du JSON valide, sans texte supplémentaire.",
      messages: [
        {
          role: 'user',
          content: `Profil candidat: ${JSON.stringify(candidateProfile ?? {})}\nProfils du groupe actuel: ${JSON.stringify(acceptedProfiles ?? [])}\nPréférences de la session: ${JSON.stringify(sessionPreferences ?? {})}\n\nGénère un score JSON avec exactement ce format:\n{\n  "score": <entier entre 0 et 100>,\n  "explication": "<1-2 phrases expliquant la compatibilité>"\n}`,
        },
      ],
    });

    const text = message.content[0].text.trim();
    const json = JSON.parse(text);

    const score = Number(json.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error('score invalide');
    }

    return {
      score: Math.round(score),
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
