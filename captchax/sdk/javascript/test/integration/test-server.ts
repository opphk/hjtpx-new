import express, { Express, Request, Response, NextFunction } from 'express';
import {
  SliderCaptchaResult,
  ClickCaptchaResult,
  PuzzleCaptchaResult,
  Scenario,
  Webhook,
} from '../../src/types';

const app: Express = express();
app.use(express.json());

const mockSliderCaptchas: Map<string, SliderCaptchaResult> = new Map();
const mockClickCaptchas: Map<string, ClickCaptchaResult> = new Map();
const mockPuzzleCaptchas: Map<string, PuzzleCaptchaResult> = new Map();
const mockScenarios: Map<string, Scenario> = new Map();
const mockWebhooks: Map<string, Webhook> = new Map();

let requestCount = 0;

app.use((req: Request, res: Response, next: NextFunction) => {
  requestCount++;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'success',
    data: {
      status: 'healthy',
      service: 'captchax-test',
      timestamp: new Date().toISOString(),
      version: '1.0.0-test',
    },
  });
});

app.post('/api/v1/captcha/slider', (req: Request, res: Response) => {
  const { app_id, width, height } = req.body;

  if (!app_id) {
    return res.status(400).json({
      code: 400,
      message: 'app_id is required',
      data: null,
    });
  }

  const captcha: SliderCaptchaResult = {
    id: `slider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    background_b64: Buffer.from(`bg-${width || 300}x${height || 200}`).toString('base64'),
    slider_b64: Buffer.from(`slider-${width || 300}x${height || 200}`).toString('base64'),
    target_x: Math.floor(Math.random() * 200) + 50,
    target_y: Math.floor(Math.random() * 150) + 25,
  };

  mockSliderCaptchas.set(captcha.id, captcha);
  res.json({ code: 200, message: 'success', data: captcha });
});

app.post('/api/v1/captcha/slider/verify', (req: Request, res: Response) => {
  const { captcha_id, target_x, target_y } = req.body;
  const captcha = mockSliderCaptchas.get(captcha_id);

  if (!captcha) {
    return res.status(404).json({
      code: 404,
      message: 'Captcha not found',
      data: null,
    });
  }

  const tolerance = 10;
  const success =
    Math.abs(target_x - captcha.target_x) <= tolerance &&
    (!target_y || !captcha.target_y || Math.abs(target_y - captcha.target_y) <= tolerance);

  res.json({
    code: 200,
    message: 'success',
    data: {
      success,
      message: success ? 'Verification successful' : 'Verification failed',
    },
  });
});

app.post('/api/v1/captcha/click', (req: Request, res: Response) => {
  const { app_id, char_count } = req.body;

  if (!app_id) {
    return res.status(400).json({
      code: 400,
      message: 'app_id is required',
      data: null,
    });
  }

  const chars = char_count || 3;
  const charList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const targetChars: string[] = [];

  for (let i = 0; i < chars; i++) {
    targetChars.push(charList[Math.floor(Math.random() * charList.length)]);
  }

  const captcha: ClickCaptchaResult = {
    id: `click-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    image: Buffer.from(`click-image-${chars}`).toString('base64'),
    target_chars: targetChars,
    char_positions: targetChars.map((char, idx) => ({
      char,
      x: (idx + 1) * 50 + Math.floor(Math.random() * 30),
      y: 50 + Math.floor(Math.random() * 100),
    })),
  };

  mockClickCaptchas.set(captcha.id, captcha);
  res.json({ code: 200, message: 'success', data: captcha });
});

app.post('/api/v1/captcha/click/verify', (req: Request, res: Response) => {
  const { captcha_id, clicks } = req.body;
  const captcha = mockClickCaptchas.get(captcha_id);

  if (!captcha) {
    return res.status(404).json({
      code: 404,
      message: 'Captcha not found',
      data: null,
    });
  }

  if (!clicks || !Array.isArray(clicks)) {
    return res.status(400).json({
      code: 400,
      message: 'clicks is required',
      data: null,
    });
  }

  const tolerance = 15;
  let correctCount = 0;

  for (const expected of captcha.char_positions) {
    for (const actual of clicks) {
      if (
        actual.char === expected.char &&
        Math.abs(actual.x - expected.x) <= tolerance &&
        Math.abs(actual.y - expected.y) <= tolerance
      ) {
        correctCount++;
        break;
      }
    }
  }

  const score = correctCount / captcha.char_positions.length;

  res.json({
    code: 200,
    message: 'success',
    data: {
      success: score >= 0.8,
      score,
      message: score >= 0.8 ? 'Verification successful' : 'Verification failed',
    },
  });
});

app.post('/api/v1/captcha/puzzle', (req: Request, res: Response) => {
  const { app_id, width, height } = req.body;

  if (!app_id) {
    return res.status(400).json({
      code: 400,
      message: 'app_id is required',
      data: null,
    });
  }

  const captcha: PuzzleCaptchaResult = {
    id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    background_b64: Buffer.from(`puzzle-bg-${width || 300}x${height || 200}`).toString('base64'),
    puzzle_b64: Buffer.from(`puzzle-piece-${width || 300}x${height || 200}`).toString('base64'),
    target_x: Math.floor(Math.random() * 200) + 50,
    target_y: Math.floor(Math.random() * 150) + 25,
  };

  mockPuzzleCaptchas.set(captcha.id, captcha);
  res.json({ code: 200, message: 'success', data: captcha });
});

app.post('/api/v1/captcha/puzzle/verify', (req: Request, res: Response) => {
  const { captcha_id, target_x, target_y } = req.body;
  const captcha = mockPuzzleCaptchas.get(captcha_id);

  if (!captcha) {
    return res.status(404).json({
      code: 404,
      message: 'Captcha not found',
      data: null,
    });
  }

  const tolerance = 10;
  const success =
    Math.abs(target_x - captcha.target_x) <= tolerance &&
    (!target_y || !captcha.target_y || Math.abs(target_y - captcha.target_y) <= tolerance);

  res.json({
    code: 200,
    message: 'success',
    data: {
      success,
      message: success ? 'Puzzle verified' : 'Puzzle verification failed',
    },
  });
});

app.post('/api/v1/captcha/batch/verify', (req: Request, res: Response) => {
  const { items } = req.body;

  const results = items.map((item: any) => {
    let success = false;
    let message = 'Unknown type';

    if (item.type === 'slider' && mockSliderCaptchas.has(item.captcha_id)) {
      const captcha = mockSliderCaptchas.get(item.captcha_id)!;
      const tolerance = 10;
      success = Math.abs(item.target_x - captcha.target_x) <= tolerance;
      message = success ? 'ok' : 'failed';
    } else if (item.type === 'click' && mockClickCaptchas.has(item.captcha_id)) {
      success = true;
      message = 'ok';
    } else if (item.type === 'puzzle' && mockPuzzleCaptchas.has(item.captcha_id)) {
      const captcha = mockPuzzleCaptchas.get(item.captcha_id)!;
      const tolerance = 10;
      success = Math.abs(item.target_x - captcha.target_x) <= tolerance;
      message = success ? 'ok' : 'failed';
    }

    return {
      captcha_id: item.captcha_id,
      success,
      message,
    };
  });

  res.json({
    code: 200,
    message: 'success',
    data: {
      results,
      summary: {
        total: results.length,
        success: results.filter((r: any) => r.success).length,
        failed: results.filter((r: any) => !r.success).length,
        skipped: 0,
      },
    },
  });
});

app.get('/api/v1/captcha/scenarios', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'success',
    data: {
      scenarios: Array.from(mockScenarios.values()),
      total: mockScenarios.size,
    },
  });
});

app.post('/api/v1/captcha/scenarios', (req: Request, res: Response) => {
  const scenario: Scenario = {
    id: `scenario-${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockScenarios.set(scenario.id, scenario);
  res.json({ code: 200, message: 'success', data: scenario });
});

app.get('/api/v1/captcha/scenarios/:id', (req: Request, res: Response) => {
  const scenario = mockScenarios.get(req.params.id);

  if (!scenario) {
    return res.status(404).json({
      code: 404,
      message: 'Scenario not found',
      data: null,
    });
  }

  res.json({ code: 200, message: 'success', data: scenario });
});

app.put('/api/v1/captcha/scenarios/:id', (req: Request, res: Response) => {
  const existing = mockScenarios.get(req.params.id);

  if (!existing) {
    return res.status(404).json({
      code: 404,
      message: 'Scenario not found',
      data: null,
    });
  }

  const updated: Scenario = {
    ...existing,
    ...req.body,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };

  mockScenarios.set(req.params.id, updated);
  res.json({ code: 200, message: 'success', data: updated });
});

app.delete('/api/v1/captcha/scenarios/:id', (req: Request, res: Response) => {
  const deleted = mockScenarios.delete(req.params.id);

  if (!deleted) {
    return res.status(404).json({
      code: 404,
      message: 'Scenario not found',
      data: null,
    });
  }

  res.json({ code: 200, message: 'success', data: { deleted: true } });
});

app.post('/api/v1/captcha/webhook/register', (req: Request, res: Response) => {
  const webhook: Webhook = {
    id: `webhook-${Date.now()}`,
    ...req.body,
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockWebhooks.set(webhook.id!, webhook);
  res.json({ code: 200, message: 'success', data: webhook });
});

app.get('/api/v1/captcha/webhook', (req: Request, res: Response) => {
  let webhooks = Array.from(mockWebhooks.values());

  if (req.query.app_id) {
    webhooks = webhooks.filter((w) => w.app_id === req.query.app_id);
  }

  res.json({
    code: 200,
    message: 'success',
    data: {
      webhooks,
      total: webhooks.length,
    },
  });
});

app.put('/api/v1/captcha/webhook/:id', (req: Request, res: Response) => {
  const existing = mockWebhooks.get(req.params.id);

  if (!existing) {
    return res.status(404).json({
      code: 404,
      message: 'Webhook not found',
      data: null,
    });
  }

  const updated: Webhook = {
    ...existing,
    ...req.body,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };

  mockWebhooks.set(req.params.id, updated);
  res.json({ code: 200, message: 'success', data: updated });
});

app.delete('/api/v1/captcha/webhook/:id', (req: Request, res: Response) => {
  const deleted = mockWebhooks.delete(req.params.id);

  if (!deleted) {
    return res.status(404).json({
      code: 404,
      message: 'Webhook not found',
      data: null,
    });
  }

  res.json({ code: 200, message: 'success', data: { deleted: true } });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    code: 500,
    message: 'Internal server error',
    data: null,
  });
});

export const startTestServer = (port: number = 3001): Promise<Express> => {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Test server running on port ${port}`);
      resolve(app);
    });
  });
};

export const getRequestCount = (): number => requestCount;
export const resetRequestCount = (): void => {
  requestCount = 0;
};
export const clearAllMocks = (): void => {
  mockSliderCaptchas.clear();
  mockClickCaptchas.clear();
  mockPuzzleCaptchas.clear();
  mockScenarios.clear();
  mockWebhooks.clear();
};

export default app;
