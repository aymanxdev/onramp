/**
 * Shared default model id for the two Workers AI adapters (the binding adapter in
 * workers-ai.ts and the REST adapter in workers-ai-rest.ts). `@cf/meta/llama-3.1-8b-instruct-fp8`
 * was retired by Cloudflare on 2026-11-20 (requests now fail with HTTP 410, error code 5028);
 * see https://developers.cloudflare.com/changelog/post/2026-11-05-planned-model-deprecations/.
 * This is Cloudflare's recommended smaller replacement. `LLM_MODEL` overrides this at runtime,
 * so a future retirement needs only a config change, not a deploy; still, verify this id is
 * current in the Workers AI model catalogue before launch: https://developers.cloudflare.com/workers-ai/models/
 */
export const DEFAULT_WORKERS_AI_MODEL = '@cf/google/gemma-4-26b-a4b-it'
