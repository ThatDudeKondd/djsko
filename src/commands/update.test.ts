import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '../context'
import { Jishaku } from '../jishaku'
import { updateCommands } from './update'

const update = updateCommands.find((c) => c.name === 'update')!
const promote = updateCommands.find((c) => c.name === 'promote')!

function makeContext(config: Record<string, unknown> = {}) {
  const jsk = new Jishaku(
    // biome-ignore lint/suspicious/noExplicitAny: minimal fake client for tests.
    { token: 't0ken-fake' } as any,
    { consoleLog: false, catchProcessErrors: false, owners: ['owner-1'], ...config },
  )
  const send = vi.fn(async (_payload: unknown) => ({}))
  // biome-ignore lint/suspicious/noExplicitAny: minimal fake message for tests.
  const message = { channel: { send }, author: { id: 'owner-1' }, reply: send } as any
  const ctx = new Context(jsk, { kind: 'message', message }, 'update', '')
  return { ctx, send }
}

/** Text of every message the command sent, in order. */
const texts = (send: ReturnType<typeof vi.fn>) =>
  send.mock.calls.map(([p]) => (typeof p === 'string' ? p : (p as { content: string }).content))

afterEach(() => vi.restoreAllMocks())

describe('jsk update / jsk promote', () => {
  it('explain how to configure them when no command is set', async () => {
    for (const [cmd, key] of [
      [update, 'updateCommand'],
      [promote, 'promoteCommand'],
    ] as const) {
      const { ctx, send } = makeContext()
      await cmd.handler(ctx)
      expect(texts(send)[0]).toContain(key)
    }
  })

  it('promote runs its command and reports the output tail on success', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const { ctx, send } = makeContext({ promoteCommand: "echo 'main abc -> def'; echo Pushed." })
    await promote.handler(ctx)
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    const [start, result] = texts(send)
    expect(start).toMatch(/Promoting testing to main/)
    expect(result).toMatch(/✅ \*\*Promote completed\*\*/)
    expect(result).toContain('main abc -> def')
  })

  it("a failure shows the script's stdout AND stderr, not just 'check the console'", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const { ctx, send } = makeContext({
      promoteCommand: "echo 'Invalid signature'; echo oops >&2; exit 1",
    })
    await promote.handler(ctx)
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    const result = texts(send)[1]
    expect(result).toMatch(/❌ \*\*Promote failed\*\* with exit code `1`/)
    expect(result).toContain('Invalid signature')
    expect(result).toContain('oops')
  })

  it('update uses its own label', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const { ctx, send } = makeContext({ updateCommand: 'echo done' })
    await update.handler(ctx)
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    expect(texts(send)[1]).toMatch(/Update completed/)
  })

  it('only shows the last 15 lines', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const { ctx, send } = makeContext({
      promoteCommand: 'for i in $(seq 1 40); do echo line$i; done',
    })
    await promote.handler(ctx)
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    const result = texts(send)[1]
    expect(result).toContain('line40')
    expect(result).toContain('line26')
    expect(result).not.toContain('line25\n')
  })
})
