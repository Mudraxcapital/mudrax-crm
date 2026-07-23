# infrastructure/providers

Concrete LLM/embedding/vector-store implementations. Stays here rather than `src/integrations/` because only the `ai` module consumes it today - promote it if a second module ever needs raw model access directly.
