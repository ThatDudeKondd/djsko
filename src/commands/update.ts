import type { Command } from "./registry";

import { spawn } from "node:child_process";

const update: Command = {
  name: "update",
  summary: "Runs your project's configured update/deploy command.",

  async handler(ctx) {
    const updateCommand = ctx.jsk.config.updateCommand;

    if (!updateCommand) {
      await ctx.reply(
        "No update command configured. Set `updateCommand` in djsk's config to your project's deploy/update script.",
      );
      return;
    }

    await ctx.reply("Updating the bot...");

    const updateProcess = spawn(updateCommand, [], {
      env: {
        ...process.env,
        XDG_RUNTIME_DIR: `/run/user/${process.getuid!()}`,
      },
    });

    let output = "";
    let errorOutput = "";

    updateProcess.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    updateProcess.stderr?.on("data", (data: Buffer) => {
      errorOutput += data.toString();

      // Keep errors visible in the bot's console.
      process.stderr.write(data);
    });

    updateProcess.on("error", async (error) => {
      console.error("Failed to start update:", error);

      await ctx.send(`❌ Update failed to start: \`${error.message}\``);
    });

    updateProcess.on("close", async (code) => {
      // Generic tail rather than matching specific log phrases -- those
      // were tied to one project's deploy script wording and would show
      // nothing for any other project's output.
      const lines = output.trim().split("\n").filter(Boolean);
      const summary = lines.slice(-15).join("\n");

      if (code === 0) {
        console.log(`[UPDATE]\n${summary}`);

        await ctx.send(
          `✅ **Update completed**\n\`\`\`text\n${summary || "Update completed successfully."}\n\`\`\``,
        );
      } else {
        console.error(`[UPDATE] Failed with exit code ${code}\n${errorOutput}`);

        await ctx.send(
          `❌ **Update failed** with exit code \`${code}\`.\nCheck the bot console for details.`,
        );
      }
    });

    console.log(`Update process started with PID: ${updateProcess.pid}`);
  },
};

export const updateCommands: Command[] = [update];
