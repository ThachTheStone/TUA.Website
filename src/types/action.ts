/** Return shape for every server action. `error` is a Vietnamese message for the UI. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
