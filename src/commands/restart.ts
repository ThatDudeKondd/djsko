import type { Command } from "./registry";

import { spawn } from "node:child_process";

const restart: Command = {
  name: "restart",
  summary: "Runs your project's configured restart command.",

  async handler(ctx) {
    const restartCommand = ctx.jsk.config.restartCommand;

    if (!restartCommand) {
      await ctx.reply(
        "No restart command configured. Set `restartCommand` in djsk's config to your project's restart command (e.g. `systemctl --user restart my-bot.service`, or `pm2 restart my-bot`).",
      );
      return;
    }

    await ctx.reply("Restarting the bot...");

    // Not awaited on purpose: if restartCommand restarts *this very
    // process* (the common case -- systemctl/pm2 restarting the service
    // this bot is running as), the process may be killed before a "close"
    // event ever fires. Fire-and-forget with a PID confirmation is the
    // most this command can reliably promise.
    const restartProcess = spawn(restartCommand, [], {
      stdio: "inherit",
      env: {
        ...process.env,
        XDG_RUNTIME_DIR: `/run/user/${process.getuid!()}`,
      },
    });

    restartProcess.on("error", async (error) => {
      console.error("Failed to start restart:", error);

      await ctx.send(`❌ Restart failed to start: \`${error.message}\``);
    });

    await ctx.send(`Restart command executed with PID: ${restartProcess.pid}`);
  },
};

export const restartCommands: Command[] = [restart];
