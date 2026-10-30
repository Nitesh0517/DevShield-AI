function extractJson(rawText) {
  let cleaned = (rawText || '').trim();
  // Strip thinking/reasoning tags if present (<think>...</think>)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 1. Try direct JSON parse
  try {
    const d = JSON.parse(cleaned);
    if (d && typeof d === 'object') return d;
  } catch (e) {}

  // 2. Look for fenced markdown json blocks: ```json { ... } ``` (from last to first)
  const codeBlocks = [...cleaned.matchAll(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/g)];
  for (let i = codeBlocks.length - 1; i >= 0; i--) {
    try {
      const d = JSON.parse(codeBlocks[i][1].trim());
      if (d && typeof d === 'object' && (d.summary || d.suggested_code)) return d;
    } catch (e) {}
  }

  // 3. Extract any valid JSON object containing required keys
  const starts = [];
  const ends = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') starts.push(i);
    if (cleaned[i] === '}') ends.push(i);
  }

  for (const s of starts) {
    for (let j = ends.length - 1; j >= 0; j--) {
      const e = ends[j];
      if (e > s) {
        const candidate = cleaned.slice(s, e + 1);
        if (candidate.includes('"summary"') || candidate.includes('"suggested_code"')) {
          try {
            const d = JSON.parse(candidate);
            if (d && typeof d === 'object' && (d.summary || d.suggested_code)) return d;
          } catch (err) {}
        }
      }
    }
  }

  throw new Error('AI model output could not be parsed into the required structured schema.');
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const apiKey = (process.env.NEBIUS_API_KEY || '').trim();
  const model = process.env.NEBIUS_MODEL || 'nvidia/Nemotron-3_5-Lightning';

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const code = body.code || '';
  const bugDescription = body.bug_description || 'Analyze code for runtime defects, logic flaws, and boundary violations.';

  // If no Nebius key is configured, return a clear error or demo indicator
  if (!apiKey) {
    return res.status(200).json({
      mode: 'demo',
      summary: 'Nebius API key is not configured in Vercel environment variables.',
      root_cause: 'Please add NEBIUS_API_KEY in your Vercel Project Settings > Environment Variables, then redeploy.',
      severity: 'medium',
      relevant_code_location: 'Vercel Deployment Environment',
      suggested_code: code,
      explanation: 'Operating in fallback mode until NEBIUS_API_KEY is configured in Vercel.',
      tests: [],
      warnings: ['DEMO MODE: Nebius Token Factory API key is not configured.'],
      limitations_and_uncertainty: ['Please add NEBIUS_API_KEY to Vercel environment settings.'],
    });
  }

  const systemPrompt = `You are DevShield AI, a world-class Python security engineer, bug fixer, and automated test author.
CRITICAL INSTRUCTION:
Do NOT output any thinking, reasoning steps, or markdown explanation.
You MUST output ONLY a valid, parseable JSON object starting immediately with { and ending with }.

JSON SCHEMA REQUIREMENT:
{
  "summary": "Concise 1-2 sentence description of the bug",
  "root_cause": "Detailed technical explanation of why the failure occurs",
  "severity": "low | medium | high | critical",
  "relevant_code_location": "Function name, line range, or syntax construct",
  "suggested_code": "Complete, runnable Python code with the fix applied",
  "explanation": "Clear explanation of how the patch solves the defect",
  "tests": [
    {
      "name": "test_case_name",
      "code": "Self-contained Python executable test assertions",
      "expected_outcome": "pass"
    }
  ],
  "warnings": ["Security caveats, performance notes, or side effects"],
  "limitations_and_uncertainty": ["Assumptions made, unknown caller context, or boundary constraints"]
}

RULES:
1. Output ONLY the raw JSON object starting with { and ending with }.
2. Ensure suggested_code is complete and runnable.
3. Generate at least 2 distinct unit tests.`;

  const userContent = `### UNTRUSTED USER CODE DATA:\n\`\`\`python\n${code}\n\`\`\`\n\n### REPORTED BUG / USER INTENT:\n${bugDescription}\n`;

  try {
    const nebiusRes = await fetch('https://api.tokenfactory.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!nebiusRes.ok) {
      const errText = await nebiusRes.text();
      return res.status(nebiusRes.status).json({
        detail: `Nebius Token Factory returned HTTP ${nebiusRes.status}: ${errText.slice(0, 300)}`,
      });
    }

    const data = await nebiusRes.json();
    const rawChoice = data?.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = extractJson(rawChoice);
    } catch (parseErr) {
      return res.status(502).json({
        detail: `Nebius output could not be parsed into structured JSON: ${rawChoice.slice(0, 200)}`,
      });
    }

    parsed.mode = 'ai';
    if (!Array.isArray(parsed.warnings)) {
      parsed.warnings = parsed.warnings ? [String(parsed.warnings)] : [];
    }
    if (!Array.isArray(parsed.limitations_and_uncertainty)) {
      parsed.limitations_and_uncertainty = parsed.limitations_and_uncertainty
        ? [String(parsed.limitations_and_uncertainty)]
        : [];
    }
    if (!Array.isArray(parsed.tests)) {
      parsed.tests = parsed.tests ? [parsed.tests] : [];
    }

    return res.status(200).json(parsed);
  } catch (networkErr) {
    return res.status(502).json({
      detail: `Cannot connect to Nebius Token Factory: ${networkErr.message}`,
    });
  }
}
