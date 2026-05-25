import { type Branching, classifyDestructiveSql } from '@qwery/domain';

export interface GuardedWriteDeps {
  branching: Branching;
}

export interface GuardedWriteInput {
  sql: string;
  /** Whether the target datasource is GFS-branchable (postgres/mysql). */
  branchable: boolean;
  /** Set after the user has explicitly confirmed an unprotected destructive op. */
  confirmed?: boolean;
}

export type GuardedWriteDecision =
  | { status: 'allowed'; reasons: string[]; recoveryRef?: string }
  | { status: 'confirmation_required'; reasons: string[] };

/**
 * The GFS safety net (ADR #11, roadmap #9). Decides whether a write may proceed
 * and, when possible, snapshots the datasource first so it can be rolled back.
 * It deliberately does **not** execute the SQL — the caller runs it through the
 * datasource driver only after a decision of `allowed`. The invariant: a
 * destructive statement is never allowed without either a GFS snapshot or an
 * explicit user confirmation.
 */
export async function guardedWrite(
  deps: GuardedWriteDeps,
  input: GuardedWriteInput,
): Promise<GuardedWriteDecision> {
  const report = classifyDestructiveSql(input.sql);
  if (!report.destructive) {
    return { status: 'allowed', reasons: [] };
  }

  // Branchable target: try to snapshot via GFS — that is the recovery path, so
  // no confirmation is needed. If GFS is unavailable or the snapshot fails we
  // fall back to confirmation rather than allow an unprotected mutation.
  if (input.branchable && (await deps.branching.isAvailable())) {
    try {
      const recoveryRef = await deps.branching.commit(`auto: before ${report.reasons.join('; ')}`);
      return { status: 'allowed', reasons: report.reasons, recoveryRef };
    } catch {
      return { status: 'confirmation_required', reasons: [...report.reasons, 'GFS snapshot failed'] };
    }
  }

  // Non-branchable (external direct connection, CSV, SQLite, …) or GFS missing:
  // the only safety is explicit confirmation.
  if (input.confirmed) {
    return { status: 'allowed', reasons: report.reasons };
  }
  return { status: 'confirmation_required', reasons: report.reasons };
}
