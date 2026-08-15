/**
 * Cycle-free entry point for upstream modules.
 *
 * The posting engine reaches into Procurement / HR / Projects / CRM, so those
 * modules must not import it statically. They call `fireFinanceEvent`, which
 * loads the engine lazily and never blocks the caller.
 */
import type { FinanceEvent } from "./postings";

export type { FinanceEvent };

export function fireFinanceEvent(event: FinanceEvent) {
  void import("./postings").then((m) => m.emitFinanceEvent(event));
}
