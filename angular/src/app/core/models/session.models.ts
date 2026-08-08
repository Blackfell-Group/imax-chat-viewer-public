// Client-side session state contracts. These mirror the shapes the React
// reference app keeps in App-level state — in-memory only, no persistence,
// per the Phase 2 performance claim.

export interface Provenance {
  threadId?: string;
  messageId?: string;
  sender?: string;
  network?: string;
  attachmentId?: string;
  service?: string;
  ts?: string;
}

export type ReviewVerdict = 'confirmed' | 'edited';

export interface TranslationReview {
  verdict: ReviewVerdict;
  /** Linguist's corrected text; present when verdict is 'edited'. */
  text?: string;
}

// [31 Jul amendment] Thread-level gold copy: the linguist's real unit of
// output — the whole translated, reviewed thread with provenance.
export interface ThreadGold {
  threadId: string;
  title: string;
  /** Full transcript: original + linguist-approved English per message. */
  content: string;
  translatedCount: number;
  reviewedCount: number;
  foreignCount: number;
  provenance: Provenance;
}
