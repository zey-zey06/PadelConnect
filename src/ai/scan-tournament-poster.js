const Groq = require('groq-sdk');

const DEGRADED = {
  tournament_name:   null,
  date:              null,
  venue:             null,
  level:             null,
  registration_fee:  null,
  format:            null,
  notes:             null,
};

function parseJson(text) {
  const clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

async function scanTournamentPoster(imageUrl) {
  if (!process.env.GROQ_API_KEY) return { ...DEGRADED };

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
            {
              type: 'text',
              text: "Analyse cette affiche de tournoi de padel et extrais les informations suivantes en JSON. Si une information n'est pas visible, utilise null. Réponds UNIQUEMENT avec du JSON valide, sans texte supplémentaire.\nFormat requis:\n{\"tournament_name\":\"...\",\"date\":\"...\",\"venue\":\"...\",\"level\":\"...\",\"registration_fee\":\"...\",\"format\":\"...\",\"notes\":\"...\"}",
            },
          ],
        },
      ],
      max_tokens: 512,
    });

    const text = completion.choices[0].message.content.trim();
    const json = parseJson(text);

    return {
      tournament_name:  json.tournament_name  || null,
      date:             json.date             || null,
      venue:            json.venue            || null,
      level:            json.level            || null,
      registration_fee: json.registration_fee || null,
      format:           json.format           || null,
      notes:            json.notes            || null,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({ level: 'error', msg: 'scan-tournament-poster failure', error: err.message }));
    }
    return { ...DEGRADED };
  }
}

module.exports = { scanTournamentPoster };
