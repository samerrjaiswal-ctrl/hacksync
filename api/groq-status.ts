export default function handler(req: any, res: any) {
  const isConfigured = Boolean(process.env.GROQ_API_KEY);
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
  res.status(200).json({
    success: true,
    isConfigured,
    activeModel: model,
    provider: 'groq'
  });
}
