import type { Command } from "./registry";

const dmCommand: Command = {
  name: "dm",
  summary: "Sends a direct message to a user.",
  async handler(ctx) {
    const args = ctx.args;
    const userId = args[0];
    const message = args.slice(1).join(" ");

    await ctx.send(
      `Attempting to send a DM to <@${userId} with the content of ${message}`,
    );
  },
};

export const dmCommands: Command[] = [dmCommand];
