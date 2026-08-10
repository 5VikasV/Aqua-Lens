import { Router, Request, Response } from 'express';
import { calculateBlastRadius } from '../analyzer/impactAnalyzer.js';
import { analyzeRepository } from '../analyzer/index.js';
import { ImpactAnalysisRequest } from '../types/index.js';

const router = Router();

router.post('/analyze/impact', async (req: Request<{}, {}, ImpactAnalysisRequest>, res: Response) => {
  try {
    const { repositoryUrl, graph, files, targetPath } = req.body;

    if (!targetPath) {
      res.status(400).json({
        success: false,
        directDependents: [],
        indirectDependents: [],
        affectedFiles: [],
        riskLevel: 'LOW',
        statistics: { directCount: 0, indirectCount: 0, totalAffected: 0, maxDepth: 0 },
        error: 'Missing required parameter: targetPath'
      });
      return;
    }

    let activeGraph = graph;
    let activeFiles = files;

    // If graph and files are not provided, analyze repositoryUrl first
    if (!activeGraph || !activeFiles) {
      if (!repositoryUrl) {
        res.status(400).json({
          success: false,
          directDependents: [],
          indirectDependents: [],
          affectedFiles: [],
          riskLevel: 'LOW',
          statistics: { directCount: 0, indirectCount: 0, totalAffected: 0, maxDepth: 0 },
          error: 'Must provide either (repositoryUrl) or (graph and files).'
        });
        return;
      }

      const analysis = await analyzeRepository(repositoryUrl);
      if (!analysis.success) {
        res.status(400).json({
          success: false,
          directDependents: [],
          indirectDependents: [],
          affectedFiles: [],
          riskLevel: 'LOW',
          statistics: { directCount: 0, indirectCount: 0, totalAffected: 0, maxDepth: 0 },
          error: analysis.error || 'Failed to analyze repository for blast radius calculation'
        });
        return;
      }

      activeGraph = analysis.dependencyGraph;
      activeFiles = analysis.files;
    }

    const result = calculateBlastRadius(activeGraph, activeFiles, targetPath);

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      directDependents: [],
      indirectDependents: [],
      affectedFiles: [],
      riskLevel: 'LOW',
      statistics: { directCount: 0, indirectCount: 0, totalAffected: 0, maxDepth: 0 },
      error: error.message || 'Internal server error during impact analysis'
    });
  }
});

export default router;
