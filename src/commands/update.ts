import type { Command } from "./registry";

import { spawn } from "node:child_process";

const update: Command = {
  name: "update",
  summary: "Updates the bot.",

  async handler(ctx) {
    await ctx.reply("Updating the bot...");

    const updateProcess = spawn(
      "/opt/sarp-project/SARP-Utilities/deploy-sarp.sh",
      [],
      {
        env: {
          ...process.env,
          XDG_RUNTIME_DIR: `/run/user/${process.getuid!()}`,
        },
      },
    );

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
      const relevantLines = output
        .split("\n")
        .filter(
          (line) =>
            line.includes("Changes found in") ||
            line.includes("No changes in either repo") ||
            line.includes("Deploy complete") ||
            line.includes("Another deploy is already running"),
        );

      const summary = relevantLines.join("\n").trim();

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
