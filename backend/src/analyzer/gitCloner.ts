import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface CloneResult {
  targetPath: string;
  cleanup: () => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = parseInt(process.env.CLONE_TIMEOUT_MS || '60000', 10);

export async function cloneRepository(
  repoUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CloneResult> {
  const baseTmpDir = path.resolve(process.env.TEMP_DIR || path.join(os.tmpdir(), 'aqua-lens-tmp'));

  // Ensure base temporary directory exists
  await fs.mkdir(baseTmpDir, { recursive: true });

  // Create isolated temp directory for this repository clone
  const uniqueId = `repo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const targetPath = path.join(baseTmpDir, uniqueId);

  await fs.mkdir(targetPath, { recursive: true });

  const git: SimpleGit = simpleGit({
    baseDir: targetPath,
    binary: 'git',
    maxConcurrentProcesses: 1,
    trimmed: true
  });

  const cleanup = async () => {
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch (err) {
      console.error(`Failed to cleanup temp directory ${targetPath}:`, err);
    }
  };

  try {
    // Timeout promise to prevent hanging indefinitely
    const clonePromise = git.clone(repoUrl, targetPath, [
      '--depth', '1',
      '--single-branch',
      '--no-tags'
    ]);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Git clone timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });

    await Promise.race([clonePromise, timeoutPromise]);

    return {
      targetPath,
      cleanup
    };
  } catch (error: any) {
    // Guaranteed cleanup if clone fails
    await cleanup();
    throw new Error(`Failed to clone repository (${repoUrl}): ${error.message || error}`);
  }
}
