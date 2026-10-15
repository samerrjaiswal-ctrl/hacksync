import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import dotenv from 'dotenv';
import { analyzeProjectWithGroq, validateAnalysisInput } from './groqAnalyzer.ts';

// Load local environment files into process.env
dotenv.config({ path: '.env.local' });
dotenv.config();

function parseJsonBody(req: IncomingMessage, maxBytes = 1048576): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        req.destroy();
        reject(new Error('Payload too large. Maximum size is 64KB.'));
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err: any) {
        reject(new Error(`Invalid JSON in request body: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function createGroqMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url?.split('?')[0];

    // Status endpoint: Exposes configuration state and model without exposing secret key
    if (url === '/api/groq-status' && req.method === 'GET') {
      const isConfigured = Boolean(process.env.GROQ_API_KEY);
      const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
      sendJson(res, 200, {
        success: true,
        isConfigured,
        activeModel: model,
        provider: 'groq'
      });
      return;
    }

    // PPT Analysis endpoint: Server-side proxy to Groq API
    if (url === '/api/groq-analyze' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const validation = validateAnalysisInput(body);
        if (!validation.valid) {
          sendJson(res, 400, {
            success: false,
            error: validation.error,
            code: 'VALIDATION_ERROR'
          });
          return;
        }

        const analysis = await analyzeProjectWithGroq(validation.data);
        sendJson(res, 200, {
          success: true,
          analysis,
          modelUsed: analysis.modelUsed
        });
      } catch (err: any) {
        const statusCode = err.statusCode || (err.code === 'GROQ_API_KEY_MISSING' ? 503 : 500);
        sendJson(res, statusCode, {
          success: false,
          error: err.message || 'An error occurred during Groq analysis',
          code: err.code || 'SERVER_ERROR'
        });
      }
      return;
    }

    next();
  };
}

/**
 * Vite Plugin that provides the secure server-side Groq analysis API
 */
export function groqApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-groq-analyzer',
    configureServer(server) {
      server.middlewares.use(createGroqMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createGroqMiddleware());
    }
  };
}
