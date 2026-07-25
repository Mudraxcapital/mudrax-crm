// Public API of the `auth` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { BcryptPasswordHasher } from "./infrastructure/adapters/BcryptPasswordHasher";
import { makeAuthenticateUser } from "./application/use-cases/authenticateUser";

export type { AuthenticatedUser } from "./application/dto/AuthenticatedUser";
export type { AuthenticateUserInput } from "./application/use-cases/authenticateUser";
export type { PasswordHasher } from "./application/ports/PasswordHasher";
export {
  InvalidCredentialsError,
  AccountLockedError,
  AccountNotActiveError,
} from "./domain/errors/AuthErrors";

export const passwordHasher = new BcryptPasswordHasher();
export const authenticateUser = makeAuthenticateUser(passwordHasher);
