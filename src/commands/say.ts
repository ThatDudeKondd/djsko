import { DiscordAPIError } from 'discord.js'
import type { Command } from './registry'

const sayCommand: Command = {
  name: 'say',
  summary: 'Says the given message.',
  async handler(ctx) {
    const args = ctx.args
    const message = args.join(' ')

    try {
      await ctx.message?.delete()
    } catch (err) {
      if (!(err instanceof DiscordAPIError) || err.code !== 10008) {
        throw err // rethrow anything that isn't "already deleted"
      }
    }
    await ctx.channel.send(message)
  },
}

export const sayCommands: Command[] = [sayCommand]
