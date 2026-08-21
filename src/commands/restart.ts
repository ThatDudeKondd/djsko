import type { Command } from "./registry";
import { spawn } from "node:child_process";

const restart: Command = {
  name: "restart",
  summary: "Restarts the bot.",
  async handler(ctx) {
    await ctx.reply("Restarting the bot...");

    const restartProcess = spawn(
      "systemctl",
      ["--user", "restart", "sarp-utilities.service"],
      {
        stdio: "inherit",
      },
    );

    await ctx.send(`Restart command executed with PID: ${restartProcess.pid}`);
  },
};

export const restartCommands: Command[] = [restart];
