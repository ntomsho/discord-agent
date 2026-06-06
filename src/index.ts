import readline from 'readline';
import { runTurn, clearMessages } from './agent.js';

// Validate required environment variable at startup.
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(): void {
  rl.question('\nyou > ', async (input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      prompt();
      return;
    }

    if (trimmed === '/exit' || trimmed === '/quit') {
      console.log('Bye!');
      rl.close();
      return;
    }

    if (trimmed === '/clear') {
      clearMessages();
      console.log('Context cleared.');
      prompt();
      return;
    }

    try {
      console.log(''); // breathing room before tool logs
      const response = await runTurn(trimmed);
      console.log(`\nagent > ${response}`);
    } catch (e: any) {
      console.error(`\n[error] ${e.message}`);
    }

    prompt();
  });
}

console.log('Discord Agent ready. Describe what you want to build.');
console.log('Commands: /exit to quit, /clear to restart context.\n');
prompt();
