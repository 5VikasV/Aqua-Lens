import { Router, Request, Response } from 'express';
import { generateChangePlan } from '../analyzer/planGenerator.js';
import { WorkspaceNotFoundError, InvalidQuestionError } from '../analyzer/aiInvestigator.js';
import { ChangePlanRequest } from '../types/index.js';

const router = Router();

router.post('/plan/generate', async (req: Request<{}, {}, ChangePlanRequest>, res: Response) => {
  try {
    const { workspaceId, changeRequest } = req.body;

    if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
      res.status(404).json({
        success: false,
        error: "Workspace not found or expired. Please analyze the repository first."
      });
      return;
    }

    if (!changeRequest || typeof changeRequest !== 'string' || changeRequest.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: changeRequest'
      });
      return;
    }

    const plan = await generateChangePlan(workspaceId, changeRequest);
    res.status(200).json(plan);

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
        error: err.message || 'Internal server error during change plan generation'
      });
    }
  }
});

export default router;
