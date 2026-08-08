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
  /**
   * True when this verdict came from accepting a run in bulk rather than from
   * reading that message on its own.
   *
   * A confirmation is an assertion that the English is right, and the gold copy
   * is where that assertion is recorded. Letting a bulk accept write the same
   * `linguist-confirmed` label as a line-by-line read would put words in an
   * officer's mouth about messages they did not open — the same failure
   * hcd/one_output_model.md removed the queue-side "mark reviewed" for. So the
   * provenance travels with the verdict and is rendered distinctly.
   */
  bulk?: boolean;
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
