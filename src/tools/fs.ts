import fs from 'fs/promises';
import path from 'path';
import type Anthropic from '@anthropic-ai/sdk';

// All file operations are sandboxed to this directory.
const WORKSPACE = path.resolve('workspace');

function safePath(relativePath: string): string {
  const resolved = path.resolve(WORKSPACE, relativePath);
  if (!resolved.startsWith(WORKSPACE)) {
    throw new Error(`Path "${relativePath}" escapes the workspace directory.`);
  }
  return resolved;
}

async function readFile(args: { path: string }): Promise<string> {
  const fullPath = safePath(args.path);
  try {
    return await fs.readFile(fullPath, 'utf-8');
  } catch (e: any) {
    return `Error reading file: ${e.message}`;
  }
}

async function writeFile(args: { path: string; content: string }): Promise<string> {
  const fullPath = safePath(args.path);
  try {
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, args.content, 'utf-8');
    return `Successfully wrote ${args.path}`;
  } catch (e: any) {
    return `Error writing file: ${e.message}`;
  }
}

async function listDirectory(args: { path?: string }): Promise<string> {
  const fullPath = safePath(args.path ?? '.');
  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const lines = entries.map(
      (e) => `${e.isDirectory() ? '[dir] ' : '      '}${e.name}`
    );
    return lines.join('\n') || '(empty directory)';
  } catch (e: any) {
    return `Error listing directory: ${e.message}`;
  }
}

// --- Tool definitions (sent to Claude on every API call) ---

export const fsToolDefinitions: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file in the workspace directory.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to workspace/ (e.g. "src/index.ts")',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description:
      'Write content to a file in the workspace directory. Creates parent directories as needed.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to workspace/ (e.g. "src/commands/ping.ts")',
        },
        content: {
          type: 'string',
          description: 'Full file content to write.',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_directory',
    description: 'List the files and subdirectories inside a workspace directory.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path relative to workspace/. Defaults to the workspace root.',
        },
      },
      required: [],
    },
  },
];

// --- Dispatcher ---

export async function dispatchFsTool(
  name: string,
  input: Record<string, any>
): Promise<string | null> {
  switch (name) {
    case 'read_file':
      return readFile(input as { path: string });
    case 'write_file':
      return writeFile(input as { path: string; content: string });
    case 'list_directory':
      return listDirectory(input as { path?: string });
    default:
      return null; // not an fs tool
  }
}
