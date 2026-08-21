import type { Command } from "./registry";

const dmCommand: Command = {
  name: "dm",
  summary: "Sends a direct message to a user.",
  async handler(ctx) {
    const args = ctx.args;
    const userId = args[0];
    const message = args.slice(1).join(" ");

    try {
      const user = await ctx.client.users.fetch(userId);
      await user.send(`${message}\n\n*Sent by ${ctx.author.tag}*`);
      await ctx.reply(`Sent DM to <@${userId}>: ${message}`);
    } catch (err) {
      await ctx.reply(`Failed to send DM to <@${userId}>: ${err}`);
    }
  },
};

export const dmCommands: Command[] = [dmCommand];
