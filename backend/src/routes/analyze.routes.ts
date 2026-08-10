import { Router, Request, Response } from 'express';
import { analyzeRepository } from '../analyzer/index.js';
import { AnalyzeRequest } from '../types/index.js';

const router = Router();

router.post('/analyze', async (req: Request<{}, {}, AnalyzeRequest>, res: Response) => {
  try {
    const { repositoryUrl } = req.body;

    if (!repositoryUrl) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: repositoryUrl'
      });
      return;
    }

    const result = await analyzeRepository(repositoryUrl);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during analysis'
    });
  }
});

export default router;
