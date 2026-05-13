import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './system-prompt.js';
import { fsToolDefinitions, dispatchFsTool } from './tools/fs.js';
import { shellToolDefinitions, dispatchShellTool } from './tools/shell.js';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const ALL_TOOLS: Anthropic.Tool[] = [
  ...fsToolDefinitions,
  ...shellToolDefinitions,
];

// The context array is the agent's entire memory.
// It persists for the lifetime of the process.
const messages: Anthropic.MessageParam[] = [];

async function dispatchTool(name: string, input: Record<string, any>): Promise<string> {
  const result =
    (await dispatchFsTool(name, input)) ??
    (await dispatchShellTool(name, input));

  if (result === null) {
    return `Unknown tool: "${name}"`;
  }
  return result;
}

export async function runTurn(userInput: string): Promise<string> {
  messages.push({ role: 'user', content: userInput });

  // The agent loop: keep calling Claude until it stops requesting tools.
  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: SYSTEM_PROMPT,
      tools: ALL_TOOLS,
      messages,
    });

    // Append the full assistant turn (may contain text + tool_use blocks).
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      // No more tool calls — extract the final text response.
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
    }

    if (response.stop_reason === 'tool_use') {
      // Collect results for every tool_use block in this response.
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        console.log(`  [tool] ${block.name}(${JSON.stringify(block.input)})`);
        const result = await dispatchTool(block.name, block.input as Record<string, any>);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      // Feed all results back as a single user turn, then loop.
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unexpected stop reason — surface it rather than loop forever.
    return `Stopped unexpectedly (reason: ${response.stop_reason}).`;
  }
}
