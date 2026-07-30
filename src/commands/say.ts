import type { Command } from "./registry";

const sayCommand: Command = {
  name: "say",
  summary: "Says the given message.",
  async handler(ctx) {
    const args = ctx.args;
    const message = args.join(" ");

    try {
      await ctx.message?.delete();
    } catch (err) {
      const code = (err as { code?: unknown })?.code;
      if (code !== 10008) {
        throw err;
      }
    }
    await ctx.channel.send(message);
  },
};

export const sayCommands: Command[] = [sayCommand];
