// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createWorkersAiAdapter } from '../../../../functions/llm/workers-ai'
import { createTestEnv } from './helpers'

function fakeAi(run: (...args: unknown[]) => unknown) {
  return { run: vi.fn(run) } as unknown as Ai
}

describe('createWorkersAiAdapter', () => {
  it('parses the plain { response } shape', async () => {
    const env = createTestEnv({ AI: fakeAi(() => ({ response: '{"role":"designer"}' })) }).env
    const result = await createWorkersAiAdapter(env).extractIntent('I design things')
    expect(result).toEqual({ role: 'designer' })
  })

  it('parses the OpenAI-style choices[0].message.content shape', async () => {
    const env = createTestEnv({
      AI: fakeAi(() => ({ choices: [{ message: { content: '{"role":"designer"}' } }] })),
    }).env
    const result = await createWorkersAiAdapter(env).extractIntent('I design things')
    expect(result).toEqual({ role: 'designer' })
  })

  it('accepts an already parsed object in response', async () => {
    const env = createTestEnv({ AI: fakeAi(() => ({ response: { role: 'designer' } })) }).env
    const result = await createWorkersAiAdapter(env).extractIntent('I design things')
    expect(result).toEqual({ role: 'designer' })
  })

  it('returns null and does not call the AI binding without one configured', async () => {
    const env = createTestEnv({ AI: undefined }).env
    expect(await createWorkersAiAdapter(env).extractIntent('I design things')).toBeNull()
  })

  it('logs only the error name and a numeric code on failure, never the input text', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const retired = Object.assign(new Error('model retired'), { name: 'AiError', code: 5028 })
    const env = createTestEnv({
      AI: fakeAi(() => {
        throw retired
      }),
    }).env
    const result = await createWorkersAiAdapter(env).extractIntent('a secret prompt about my taxes')
    expect(result).toBeNull()
    expect(consoleError).toHaveBeenCalledTimes(1)
    const logged = consoleError.mock.calls[0]
    expect(logged.join(' ')).not.toContain('secret prompt')
    expect(logged.join(' ')).not.toContain('model retired')
    expect(logged).toEqual(['workers-ai adapter error', { name: 'AiError', code: 5028 }])
    consoleError.mockRestore()
  })
})
