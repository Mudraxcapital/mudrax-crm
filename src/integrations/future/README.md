# integrations/future

Template/placeholder documenting the pattern for the next integration:

1. Define (or reuse) a port interface in the consuming module's `application/ports`.
2. Create a new folder here named after the provider.
3. Implement an `adapter.ts` that satisfies the port interface.
4. Wire the concrete adapter at the composition root - never import the integration directly from `domain/` or `application/`.
