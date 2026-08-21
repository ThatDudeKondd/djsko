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

    restartProcess.on("close", (code) => {
      if (code === 0) {
        console.log("Bot restarted successfully.");
        ctx.send("Bot restarted successfully.");
      } else {
        console.error(`Bot restart failed with exit code ${code}.`);
        ctx.send(`Bot restart failed with exit code ${code}.`);
      }
    });
  },
};

export const restartCommands: Command[] = [restart];
