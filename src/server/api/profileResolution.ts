import { resolveAgeBand } from "../../domain/reference/ageBand";
import type { UserProfile } from "../../domain/reference/types";
import type { StoredProfile } from "../store/profileStore";

/**
 * Stored profile → the demographic actually compared against on a given
 * date. Handlers must call this per evaluated date rather than reading
 * profile.ageBand: with a birth date the band moves on the user's
 * birthday, and past days keep the band that applied then.
 */

export type ResolvedProfile =
  | { ok: true; profile: UserProfile }
  | { ok: false; reason: "unsupported_age" };

export function resolveProfileForDate(
  stored: StoredProfile,
  date: string,
): ResolvedProfile {
  if (stored.birthDate) {
    const resolution = resolveAgeBand(stored.birthDate, date);
    if (!resolution.ok) {
      return { ok: false, reason: "unsupported_age" };
    }
    return { ok: true, profile: { sex: stored.sex, ageBand: resolution.ageBand } };
  }
  if (stored.ageBand) {
    return { ok: true, profile: { sex: stored.sex, ageBand: stored.ageBand } };
  }
  return { ok: false, reason: "unsupported_age" };
}
