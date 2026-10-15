import { analyzeProjectWithGroq, validateAnalysisInput } from '../src/server/groqAnalyzer.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    const validation = validateAnalysisInput(body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        code: 'VALIDATION_ERROR'
      });
    }

    const analysis = await analyzeProjectWithGroq(validation.data);
    return res.status(200).json({
      success: true,
      analysis,
      modelUsed: analysis.modelUsed
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'GROQ_API_KEY_MISSING' ? 503 : 500);
    return res.status(statusCode).json({
      success: false,
      error: err.message || 'An error occurred during Groq analysis',
      code: err.code || 'SERVER_ERROR'
    });
  }
}
