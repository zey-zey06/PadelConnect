const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const DEGRADED = { score: 50, explication: 'Compatibilité neutre' };

async function matchScore({ candidateProfile, acceptedProfiles, sessionPreferences }) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: "Tu es un expert padel. Calcule un score de compatibilité entre un candidat et un groupe existant. Réponds uniquement avec du JSON valide, sans texte supplémentaire ni balises markdown.",
    });

    const prompt = `Profil candidat: ${JSON.stringify(candidateProfile ?? {})}\nProfils du groupe actuel: ${JSON.stringify(acceptedProfiles ?? [])}\nPréférences de la session: ${JSON.stringify(sessionPreferences ?? {})}\n\nGénère un score JSON avec exactement ce format:\n{\n  "score": <entier entre 0 et 100>,\n  "explication": "<1-2 phrases expliquant la compatibilité>"\n}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const text = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
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
