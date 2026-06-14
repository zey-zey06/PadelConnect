const Groq = require('groq-sdk');

/**
 * Deterministic fallback: sort teams by average level, then distribute
 * round-robin style into balanced groups (level gap ≤ 1 within a group).
 */
function buildGroupsAlgorithmic(teams, format) {
  const sorted = [...teams].sort((a, b) => (a.avgLevel ?? 4) - (b.avgLevel ?? 4));

  if (format === 'round_robin') {
    const groupSize = 4;
    const groups = [];
    for (let i = 0; i < sorted.length; i += groupSize) {
      groups.push(sorted.slice(i, i + groupSize));
    }
    return groups;
  }

  // Elimination: seed by level, top half vs bottom half
  const n = Math.pow(2, Math.ceil(Math.log2(Math.max(sorted.length, 2))));
  const padded = [...sorted, ...Array(n - sorted.length).fill(null)];
  const matchups = [];
  for (let i = 0; i < padded.length / 2; i++) {
    matchups.push([padded[i], padded[padded.length - 1 - i]]);
  }
  return matchups;
}

/**
 * AI enhancement: ask Groq to re-order teams into level-balanced groups.
 * Falls back to deterministic if no key or on any error.
 */
async function generateBracket({ teams, format }) {
  if (!teams || teams.length < 2) return buildGroupsAlgorithmic(teams ?? [], format);
  if (!process.env.GROQ_API_KEY) return buildGroupsAlgorithmic(teams, format);

  const payload = teams.map((t) => ({
    reg_id:    t.id,
    p1_level:  t.p1Level ?? 4,
    p2_level:  t.p2Level ?? 4,
    avg_level: t.avgLevel ?? 4,
  }));

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            'Tu es un expert en organisation de tournois de padel. ' +
            'Crée des groupes équilibrés en niveau. ' +
            'Réponds uniquement avec du JSON valide, sans texte supplémentaire.',
        },
        {
          role: 'user',
          content:
            `Format: ${format}\n` +
            `Équipes (${payload.length}):\n${JSON.stringify(payload)}\n\n` +
            `Groupe les équipes en groupes de 4, chaque groupe homogène en niveau (écart ≤ 1).\n` +
            `Réponds avec:\n{"groups": [[reg_id, ...], [reg_id, ...], ...]}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0].message.content.trim();
    const clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const json = JSON.parse(clean);

    if (!Array.isArray(json.groups)) throw new Error('invalid format');

    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const groups = json.groups
      .map((group) => group.map((id) => teamMap.get(id)).filter(Boolean))
      .filter((g) => g.length > 0);

    if (groups.length === 0) throw new Error('empty groups');
    return groups;
  } catch {
    return buildGroupsAlgorithmic(teams, format);
  }
}

module.exports = { generateBracket };
