import { Injectable, signal } from '@angular/core';
import { ThreadCard } from '../models/api.models';

export interface FocusMessage {
  messageId: string;
  /** Retrigger counter: re-focusing the same message must re-flash it. */
  seq: number;
}

export type Disposition = 'reviewed' | 'flagged' | 'discarded';

// Selection + disposition state shared across panels: which thread is open,
// which message (from a search hit) to scroll-and-flash, and the per-thread
// dispositions that define the linguist's stack. Dispositions live here (not
// in the triage panel) because promoting a thread to gold [31 Jul amendment]
// marks it worked from the viewer side.
@Injectable({ providedIn: 'root' })
export class TriageStore {
  private readonly _selectedThread = signal<ThreadCard | null>(null);
  private readonly _focusMessage = signal<FocusMessage | null>(null);
  private readonly _dispo = signal<Record<string, Disposition | undefined>>({});

  readonly selectedThread = this._selectedThread.asReadonly();
  readonly focusMessage = this._focusMessage.asReadonly();
  readonly dispo = this._dispo.asReadonly();

  selectThread(thread: ThreadCard, messageId?: string): void {
    this._selectedThread.set(thread);
    this._focusMessage.update((prev) =>
      messageId ? { messageId, seq: (prev?.seq ?? 0) + 1 } : null,
    );
  }

  /** Toggle a disposition: marking the same state again clears it. */
  mark(threadId: string, state: Disposition): void {
    this._dispo.update((d) => ({
      ...d,
      [threadId]: d[threadId] === state ? undefined : state,
    }));
  }

  /** Promotion path: set reviewed unless the officer already worked it. */
  markWorked(threadId: string): void {
    this._dispo.update((d) => (d[threadId] ? d : { ...d, [threadId]: 'reviewed' }));
  }
}
