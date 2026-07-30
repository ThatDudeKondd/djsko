import { DiscordAPIError } from "discord.js";
import type { Command } from "./registry";

const sayCommand: Command = {
  name: "say",
  summary: "Says the given message.",
  async handler(ctx) {
    console.log("say handler", ctx.message?.id);
    const args = ctx.args;
    const message = args.join(" ");

    try {
      await ctx.message?.delete();
    } catch (err: any) {
      console.log({
        constructor: err?.constructor?.name,
        name: err?.name,
        code: err?.code,
      });

      if (err?.code === 10008) {
        throw err;
      }
    }
    await ctx.channel.send(message);
  },
};

export const sayCommands: Command[] = [sayCommand];
