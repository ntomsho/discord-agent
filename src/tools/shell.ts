import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type Anthropic from '@anthropic-ai/sdk';

const execFileAsync = promisify(execFile);

const WORKSPACE = path.resolve('workspace');

// Only these executable names are allowed. Arguments are passed through
// but the binary itself is locked down.
const ALLOWED_COMMANDS = new Set(['npm', 'npx', 'tsc', 'node', 'tsx']);

async function runCommand(args: { command: string }): Promise<string> {
  const parts = args.command.trim().split(/\s+/);
  const bin = parts[0];
  const cmdArgs = parts.slice(1);

  if (!ALLOWED_COMMANDS.has(bin)) {
    return (
      `Command "${bin}" is not allowed. ` +
      `Permitted commands: ${[...ALLOWED_COMMANDS].join(', ')}.`
    );
  }

  try {
    const { stdout, stderr } = await execFileAsync(bin, cmdArgs, {
      cwd: WORKSPACE,       // always run inside workspace/
      timeout: 30_000,      // 30 s hard limit
      maxBuffer: 1024 * 512 // 512 KB output cap
    });
    const out = [stdout, stderr].filter(Boolean).join('\n');
    return out || '(command produced no output)';
  } catch (e: any) {
    // execFile rejects on non-zero exit; stdout/stderr are still useful
    const out = [e.stdout, e.stderr].filter(Boolean).join('\n');
    return out || `Error: ${e.message}`;
  }
}

// --- Tool definition ---

export const shellToolDefinitions: Anthropic.Tool[] = [
  {
    name: 'run_command',
    description:
      'Run a shell command inside the workspace directory. ' +
      'Allowed binaries: npm, npx, tsc, node, tsx. ' +
      'Use this to install packages (npm install), type-check (tsc --noEmit), or run scripts.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The full command to run, e.g. "tsc --noEmit" or "npm install discord.js"',
        },
      },
      required: ['command'],
    },
  },
];

// --- Dispatcher ---

export async function dispatchShellTool(
  name: string,
  input: Record<string, any>
): Promise<string | null> {
  if (name === 'run_command') {
    return runCommand(input as { command: string });
  }
  return null;
}
