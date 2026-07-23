# Shared

Cross-cutting, generic, reusable code with no business rules.

Rule of thumb: if removing this code would only affect one module, it does not belong here - it belongs in that module.

**Never put here**: anything that encodes a business rule, or a feature-specific component. This folder is the most likely to become a junk drawer - treat every addition with scrutiny.
