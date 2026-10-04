import type { Command } from "./registry";

import { spawn } from "node:child_process";

type Ctx = Parameters<Command["handler"]>[0];

/** Runs a configured script and reports its exit status and output tail. `label` is "Update" / "Promote". */
async function runScript(
  ctx: Ctx,
  label: string,
  command: string,
): Promise<void> {
  const updateProcess = spawn(command, [], {
    shell: true,
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
    console.error(`Failed to start ${label.toLowerCase()}:`, error);

    await ctx.send(`❌ ${label} failed to start: \`${error.message}\``);
  });

  updateProcess.on("close", async (code) => {
    // Generic tail rather than matching specific log phrases -- those
    // were tied to one project's deploy script wording and would show
    // nothing for any other project's output.
    const lines = output.trim().split("\n").filter(Boolean);
    const summary = lines.slice(-15).join("\n");

    if (code === 0) {
      console.log(`[${label.toUpperCase()}]\n${summary}`);

      await ctx.send(
        `✅ **${label} completed**\n\`\`\`text\n${summary || `${label} completed successfully.`}\n\`\`\``,
      );
    } else {
      // Scripts often report their failure reason on stdout, so show both.
      const failTail = `${output}\n${errorOutput}`
        .trim()
        .split("\n")
        .filter(Boolean)
        .slice(-15)
        .join("\n");

      console.error(
        `[${label.toUpperCase()}] Failed with exit code ${code}\n${failTail}`,
      );

      await ctx.send(
        `❌ **${label} failed** with exit code \`${code}\`.\n\`\`\`text\n${failTail || "No output."}\n\`\`\``,
      );
    }
  });

  console.log(`${label} process started with PID: ${updateProcess.pid}`);
}

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
    await runScript(ctx, "Update", updateCommand);
  },
};

const promote: Command = {
  name: "promote",
  summary:
    "Runs your project's configured promote command (e.g. merge testing into main, then deploy).",

  async handler(ctx) {
    const promoteCommand = ctx.jsk.config.promoteCommand;

    if (!promoteCommand) {
      await ctx.reply(
        "No promote command configured. Set `promoteCommand` in djsk's config to your project's promote script.",
      );
      return;
    }

    await ctx.reply("Promoting testing to main...");
    await runScript(ctx, "Promote", promoteCommand);
  },
};

export const updateCommands: Command[] = [update, promote];
