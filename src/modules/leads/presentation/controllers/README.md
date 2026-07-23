# presentation/controllers

Thin controller functions called directly by this module's route handlers under `src/app/api`.

**Never put here**: business logic — controllers only parse/validate the request, call an `application/use-cases` function, and shape the response.
