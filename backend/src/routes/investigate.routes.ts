import { Router, Request, Response } from 'express';
import { investigateWorkspace, WorkspaceNotFoundError, InvalidQuestionError } from '../analyzer/aiInvestigator.js';
import { InvestigateRequest } from '../types/index.js';

const router = Router();

router.post('/investigate', async (req: Request<{}, {}, InvestigateRequest>, res: Response) => {
  try {
    const { workspaceId, question } = req.body;

    if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
      res.status(404).json({
        success: false,
        error: "Workspace not found or expired. Please analyze the repository first."
      });
      return;
    }

    if (!question || typeof question !== 'string' || question.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: question'
      });
      return;
    }

    const result = await investigateWorkspace(workspaceId, question);
    res.status(200).json(result);

  } catch (err: any) {
    if (err instanceof WorkspaceNotFoundError) {
      res.status(404).json({
        success: false,
        error: err.message
      });
    } else if (err instanceof InvalidQuestionError) {
      res.status(400).json({
        success: false,
        error: err.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error during AI investigation'
      });
    }
  }
});

export default router;
