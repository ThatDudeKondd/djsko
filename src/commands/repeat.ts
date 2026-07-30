import { COMMANDS, type Command } from './registry'

const repeatCommand: Command = {
  name: 'repeat',
  summary: 'Repeats the given command a set amount of times.',
  async handler(ctx) {
    const args = ctx.args
    const count = Number(args[0])
    const _command = args[1]
    const targetArgs = args.slice(2)

    const matched = COMMANDS.find((command) => command.name === _command)

    if (!matched) {
      ctx.reply(`Unknown command: ${_command}`)
      return
    }

    const originalRawArgs = ctx.rawArgs
    ;(ctx as { rawArgs: string }).rawArgs = targetArgs.join(' ')

    try {
      for (let i = 0; i < count; i++) {
        await matched.handler(ctx)
      }
    } finally {
      ;(ctx as { rawArgs: string }).rawArgs = originalRawArgs
    }
  },
}

export const repeatCommands: Command[] = [repeatCommand]
