import type { ChangePasswordInput } from "@mudrax/api";
import { getApi } from "@/core/api";

export function changePassword(input: ChangePasswordInput) {
  return getApi().caller.changePassword(input);
}
