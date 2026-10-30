export default function handler(req, res) {
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

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const tests = Array.isArray(body.tests) ? body.tests : [];

  return res.status(200).json({
    status: 'unavailable',
    secure_mode: false,
    passed_count: 0,
    total_count: tests.length,
    results: tests.map((t, idx) => ({
      name: t.name || `test_case_${idx + 1}`,
      status: 'skipped',
      output: 'Isolated Docker sandbox execution requires running the local containerized backend (docker compose up). Code execution is blocked in the serverless cloud preview to prevent arbitrary remote execution without container isolation.',
      error: null,
      duration_ms: 0,
    })),
    captured_output: '[SECURITY NOTICE] Live Python execution is strictly disabled in the static serverless web deployment. Untrusted code execution requires the local containerized backend (Docker non-root sandbox).',
    error_message: 'Docker execution sandbox is offline in this serverless preview. Arbitrary code execution is blocked for security.',
    execution_time_ms: 0,
  });
}
