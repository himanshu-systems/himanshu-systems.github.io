/**
 * Turns a silently-rejected write into a real error.
 *
 * A Postgres UPDATE or DELETE that row-level security filters out is not an
 * error -- the policy removes the row from the statement's scope, so the write
 * matches zero rows and succeeds at having done nothing. PostgREST reports that
 * as HTTP 200, and supabase-js hands back `{ error: null }`. Every admin editor
 * then shows "Saved." while the database is unchanged, which is the single most
 * confusing failure this app can produce: the UI and the data disagree and
 * nothing anywhere says so.
 *
 * Asking for the affected rows back (`.select(...)` on the write) is what makes
 * the difference observable: zero rows returned means the policy rejected it.
 *
 * INSERT does not need this. An insert that violates RLS raises 42501 and
 * arrives as a genuine error, because there is no existing row for a policy to
 * filter -- the check simply fails.
 */

interface WriteResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

const REJECTED =
  'the database accepted the request but changed nothing. You are signed in, ' +
  'but this table\'s row-level security policy does not accept your account, ' +
  'so the row was filtered out before the write could match it. The policy ' +
  'names a specific email address -- see supabase/README.md.';

/**
 * Pass the awaited result of a write that ends in `.select(...)`.
 * Returns an Error to report, or null when rows really were written.
 */
export function wrote<T>(result: WriteResult<T>, action: string): Error | null {
  if (result.error) return new Error(`${action}: ${result.error.message}`);
  if (!result.data || result.data.length === 0) {
    return new Error(`${action}: ${REJECTED}`);
  }
  return null;
}
