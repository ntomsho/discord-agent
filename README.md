# discord-agent

A CLI AI agent that helps you write Discord integrations using discord.js v14 and TypeScript.

You describe a feature; the agent writes the code, checks it compiles, and iterates until it's right.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and add your ANTHROPIC_API_KEY
```

## Run

```bash
npm start
```

## Usage

Just describe what you want:

```
you > create a /ping slash command that responds with the bot's latency
you > add a /help command that lists all available commands  
you > set up a webhook notifier that posts a message when called
```

The agent will:
- Write files into `workspace/`
- Run `tsc --noEmit` to verify the code compiles
- Fix any errors it finds
- Tell you what it created and how to run it

## Workspace

Everything the agent generates lives in `workspace/`. The agent has no access
to files outside that directory.

## Adding Phase 2: Live Discord Tools

When you're ready to let the agent call the Discord API directly (register
commands, send messages, etc.), add a `src/tools/discord.ts` module following
the same pattern as `fs.ts` and `shell.ts`, then import its definitions into
`agent.ts`.
