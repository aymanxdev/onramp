/**
 * Bounds an LLM call to a fixed wall-clock budget (DEVELOPER_BRIEF section 8: "Timeout 8
 * seconds, then fall back."). Resolves to null on timeout rather than rejecting, so
 * callers can treat a timeout exactly like any other "no answer" outcome.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}
