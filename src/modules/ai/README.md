# AI Module - AI Platform

Renamed from `ai-assistant` to `ai` to reflect that this is a platform, not a single feature: agents, chat, prompt management, retrieval-augmented generation, embeddings, summaries, and AI-driven analytics.

Every capability is built behind swappable `ILlmProvider` / `IVectorStore` / `ISpeechToText` ports so new agents, RAG sources, or a better model can be adopted without redesigning any consuming module.

**Never put here**: a hard dependency on one specific model/vendor outside of `infrastructure/providers` - always go through the ports in `application/ports`.
