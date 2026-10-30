export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = (process.env.NEBIUS_API_KEY || '').trim();
  const isConfigured = Boolean(apiKey);
  const model = process.env.NEBIUS_MODEL || 'nvidia/Nemotron-3_5-Lightning';

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'healthy',
    ai_configured: isConfigured,
    ai_mode: isConfigured ? 'nebius' : 'demo',
    ai_provider: isConfigured ? 'nebius' : 'demo',
    model: isConfigured ? model : 'offline-demo-engine',
    secure_runner_available: false,
  });
}
