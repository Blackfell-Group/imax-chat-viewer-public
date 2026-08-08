import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { forkJoin } from 'rxjs';
import { SearchApi } from '../../core/api/search-api';
import { SummarizeApi } from '../../core/api/summarize-api';
import { TranslateApi } from '../../core/api/translate-api';
import { EntitiesApi } from '../../core/api/entities-api';
import { TriageStore } from '../../core/stores/triage-store';
import { GoldCopyStore } from '../../core/stores/gold-copy-store';
import { SessionStore } from '../../core/stores/session-store';
import { IdentityService } from '../../core/services/identity-service';
import { Message, SummarizeResponse } from '../../core/models/api.models';
import { MessageBubble } from './message-bubble';
import { OcrDialog, OpenAttachment } from './ocr-dialog';

// Chat Log Viewer (center panel): renders the message stream with timestamps
// and attribution; mixed-script and RTL text render correctly in a single
// stream. Thread summarization is on-demand. The thread-gold workflow
// [31 Jul amendment] lives in the header: translate-thread, the gold-ready
// meter, and promote-to-gold — the linguist's whole-thread unit of output.
@Component({
  selector: 'app-chat-viewer',
  imports: [MatIconModule, MatProgressSpinnerModule, ScrollingModule, MessageBubble, OcrDialog],
  templateUrl: './chat-viewer.html',
  styleUrl: './chat-viewer.scss',
})
export class ChatViewer {
  private readonly searchApi = inject(SearchApi);
  private readonly summarizeApi = inject(SummarizeApi);
  private readonly translateApi = inject(TranslateApi);
  private readonly entitiesApi = inject(EntitiesApi);
  protected readonly triage = inject(TriageStore);
  protected readonly goldCopy = inject(GoldCopyStore);
  protected readonly session = inject(SessionStore);
  // protected, not private: the conversation-note banner attributes the
  // assessment on screen, the same way the gold copy attributes it on paper.
  protected readonly identity = inject(IdentityService);

  protected readonly messages = signal<Message[]>([]);
  protected readonly summary = signal<SummarizeResponse | null>(null);
  protected readonly showSummary = signal(false);

  // Conversation-level note: the linguist's read on the whole exchange.
  protected readonly threadNoteEditing = signal(false);
  protected readonly threadNoteDraft = signal('');
  protected readonly threadNote = computed(() => {
    const id = this.triage.selectedThread()?.threadId;
    return id ? (this.session.threadNotes()[id] ?? '') : '';
  });

  protected toggleThreadNote(): void {
    if (this.threadNoteEditing()) {
      this.threadNoteEditing.set(false);
      return;
    }
    this.threadNoteDraft.set(this.threadNote());
    this.threadNoteEditing.set(true);
  }

  protected saveThreadNote(): void {
    const id = this.triage.selectedThread()?.threadId;
    if (!id) return;
    // Saving an emptied field clears the note rather than storing a blank one,
    // so a note can be withdrawn the same way a verdict can.
    this.session.setThreadNote(id, this.threadNoteDraft());
    this.threadNoteEditing.set(false);
  }
  protected readonly flashId = signal<string | null>(null);
  protected readonly attachment = signal<OpenAttachment | null>(null);
  protected readonly translating = signal(false);
  protected readonly extracting = signal(false);
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');

  private readonly viewport = viewChild(CdkVirtualScrollViewport);

  // Measured against the delivered corpus rather than guessed: the median
  // rendered bubble in a bilingual thread (original + English + provenance
  // caption + action strip) is ~150px. Under-estimating is the safer error —
  // it renders more items than strictly needed rather than leaving a gap at
  // the bottom of a fast scroll.
  /**
   * Row height the virtual viewport reserves per message — MEASURED AT RUNTIME.
   *
   * The fixed-size strategy positions every item as though it occupies exactly
   * this many pixels. Get it wrong and the rendered block does not fill the slot
   * it was given: at 150px against bubbles that render at ~81px, the stream went
   * blank for half the window and read as the end of the conversation.
   *
   * The value cannot be a constant, which is the second thing that defect taught.
   * 81 was measured on macOS; CI runs Linux, the enclave workstations run Linux,
   * and bubble height follows the font stack the machine actually resolves. A
   * number correct on the developer's laptop is not correct where it is used —
   * and the failure is silent, because nothing about it looks broken until
   * someone scrolls a long thread.
   *
   * So the seed below is only a starting point: `measureRowHeight()` replaces it
   * with the height a bubble really renders at on this machine, once messages
   * are on screen.
   */
  protected readonly itemSizePx = signal(81);

  /**
   * Reserve the trimmed mean of the rendered bubble heights.
   *
   * Not the median. Heights here are BIMODAL — an English message is one line
   * shorter than a foreign one, which carries its translation — so in a mixed
   * thread the median lands on whichever cluster is larger and is wrong by the
   * gap between them. Reserving the taller cluster is the original defect's
   * direction: every short row then under-fills its slot, the shortfall
   * accumulates down the thread, and the window goes blank.
   *
   * The mean tracks a bimodal set correctly. Trimming the top and bottom tenth
   * keeps the outlier resistance that made the median tempting — one bubble
   * carrying an attachment and three entity chips should not move the
   * reservation for the two thousand that do not.
   */
  /** Heights seen so far in this thread, across every measurement. */
  private observedHeights: number[] = [];
  /**
   * How many times the reservation has actually been changed.
   *
   * Termination is bounded by THIS, not by how many bubbles have been measured.
   *
   * Counting samples was the obvious rule and it was wrong: a hundred and fifty
   * heights can all come from the same cluster. This thread opens on a run of
   * short English messages, so on a slower machine the sample filled and froze
   * at 67px before a single 94px foreign row had rendered — locking in the
   * wrong number and never looking again. CI caught it; a laptop did not.
   *
   * Measuring is cheap and harmless. Re-SETTING is what re-renders the viewport
   * and fires the scroll event that measures again, so an oscillation between
   * the two clusters is the real hazard — it spins the CPU and would degrade an
   * enclave workstation the longer an officer scrolls. Bounding the number of
   * changes stops that without ever freezing on a bad estimate: the value keeps
   * converging while the officer reads, and cannot thrash.
   */
  private rowHeightUpdates = 0;
  private static readonly MAX_ROW_HEIGHT_UPDATES = 8;

  /** Scrolling brings different rows into view, which is more of the sample. */
  protected onScrolled(): void {
    requestAnimationFrame(() => this.measureRowHeight());
  }

  private measureRowHeight(): void {
    if (this.rowHeightUpdates >= ChatViewer.MAX_ROW_HEIGHT_UPDATES) return;
    const host = this.viewport()?.elementRef.nativeElement;
    if (!host) return;
    const seen = [...host.querySelectorAll('app-message-bubble')]
      .map((el) => (el as HTMLElement).getBoundingClientRect().height)
      .filter((h) => h > 0);
    if (!seen.length) return;

    // ACCUMULATE rather than sample. The first screenful of a thread is not a
    // representative sample of it: t-3000 opens on a run of short English
    // messages, so measuring once locked the reservation to the 67px cluster
    // and never saw the 94px foreign rows — under-reserving instead of
    // over-reserving, but wrong in the same way and for the same reason.
    // Every render adds to the picture, so the estimate converges as the
    // officer scrolls rather than betting on the first frame.
    this.observedHeights.push(...seen);
    if (this.observedHeights.length > 600) {
      this.observedHeights = this.observedHeights.slice(-600);
    }
    const heights = [...this.observedHeights].sort((a, b) => a - b);
    if (heights.length < 3) return;

    const cut = Math.floor(heights.length / 10);
    const kept = heights.length > 4 ? heights.slice(cut, heights.length - cut) : heights;
    const trimmedMean = Math.round(kept.reduce((a, b) => a + b, 0) / kept.length);

    // Only react to a real difference; re-setting the input churns the viewport
    // for nothing, and sub-pixel noise is absorbed by the buffer either way.
    if (Math.abs(trimmedMean - this.itemSizePx()) / this.itemSizePx() > 0.05) {
      this.itemSizePx.set(trimmedMean);
      this.rowHeightUpdates++;
    }
  }

  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  // Render order is decided here, not upstream. Collection feeds do not
  // guarantee chronological delivery — the audio-cut fixtures arrive with
  // late messages appended out of sequence — and a linguist reading a thread
  // out of order draws the wrong conclusion from it. Sorting in the view means
  // the guarantee holds whatever the source does.
  protected readonly orderedMessages = computed(() => {
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...this.messages()].sort(
      (a, b) => (Date.parse(a.ts) - Date.parse(b.ts)) * dir || a.messageId.localeCompare(b.messageId),
    );
  });

  protected trackMessage(_index: number, m: Message): string {
    return m.messageId;
  }

  protected toggleSort(): void {
    this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
  }

  // Thread-gold meter [31 Jul amendment]: counts over foreign messages —
  // English needs no translation. Reviewed implies translated.
  protected readonly foreignMsgs = computed(() => this.messages().filter((m) => m.lang !== 'en'));
  protected readonly translatedCount = computed(() => {
    const translations = this.session.translations();
    const reviews = this.session.reviews();
    return this.foreignMsgs().filter((m) => translations[m.messageId] || reviews[m.messageId])
      .length;
  });
  protected readonly reviewedCount = computed(() => {
    const reviews = this.session.reviews();
    return this.foreignMsgs().filter((m) => reviews[m.messageId]).length;
  });
  // Threads auto-translate on open, so the batch action is only meaningful
  // when something is genuinely missing a translation (a failed call, or a
  // message that arrived after the batch). Hidden otherwise — a button that
  // does nothing is worse than no button.
  protected readonly pendingTranslation = computed(() => {
    const translations = this.session.translations();
    const reviews = this.session.reviews();
    return this.foreignMsgs().filter((m) => !translations[m.messageId] && !reviews[m.messageId])
      .length;
  });
  protected readonly pendingEntities = computed(() => {
    const cached = this.session.entities();
    return this.messages().filter((m) => !cached[m.messageId]).length;
  });

  /** Foreign messages still carrying no verdict. */
  protected readonly unreviewed = computed(() => {
    const reviews = this.session.reviews();
    return this.foreignMsgs().filter((m) => !reviews[m.messageId]);
  });

  /**
   * Accept the remaining machine translations in one action.
   *
   * A standing channel runs to thousands of messages and is worked whole, so
   * clearing the tail one click at a time is not a workflow — but a bulk accept
   * is still an assertion about text nobody opened. Two things keep it honest:
   * it states the count before it does anything, and every verdict it writes is
   * marked `bulk` so the gold copy never reports it as a line-by-line read.
   */
  protected bulkConfirm(): void {
    const pending = this.unreviewed();
    if (!pending.length) return;
    const ok = this.confirmBulk(pending.length);
    if (!ok) return;
    for (const m of pending) {
      this.session.setReview(m.messageId, { verdict: 'confirmed', bulk: true });
    }
  }

  /** Split out so a test can drive the accept without stubbing window. */
  protected confirmBulk(count: number): boolean {
    return confirm(
      `Accept the machine translation for ${count} message${count === 1 ? '' : 's'} without reading each one?\n\n` +
        'These will be recorded in the gold copy as bulk-accepted, not as line-by-line confirmations.',
    );
  }

  protected readonly goldReady = computed(
    () => this.foreignMsgs().length > 0 && this.reviewedCount() === this.foreignMsgs().length,
  );
  protected readonly alreadyGold = computed(() => {
    const thread = this.triage.selectedThread();
    return !!thread && !!this.goldCopy.threadGold()[thread.threadId];
  });

  constructor() {
    // Thread change: reset summary + dialog, load the stream.
    // Re-measure whenever the rendered set changes. The reservation has to match
    // what THIS machine renders — font stacks differ between a developer laptop,
    // the CI runner and an enclave workstation, and a stale reservation shows up
    // as blank space in the middle of a long thread rather than as an error.
    effect(() => {
      const count = this.orderedMessages().length;
      if (!count) return;
      untracked(() => {
        // After the frame that paints them, or there is nothing to measure.
        requestAnimationFrame(() => requestAnimationFrame(() => this.measureRowHeight()));
      });
    });

    effect(() => {
      const thread = this.triage.selectedThread();
      untracked(() => {
        this.observedHeights = [];
        this.rowHeightUpdates = 0;
        this.summary.set(null);
        this.showSummary.set(false);
        this.attachment.set(null);
        if (!thread) {
          this.messages.set([]);
          return;
        }
        this.searchApi.getThreadMessages(thread.threadId).subscribe({
          next: (d) => {
            this.messages.set(d.messages ?? []);
            // Translations render by default (1 Aug design decision): the
            // baseline MT is cheap, so the bilingual view opens ready to
            // read and judge — always bilingual, no per-message toggle. A
            // premium frontier-LLM retranslation is a production seam
            // (see hcd/bilingual_display_model.md).
            this.translateThread();
          },
          error: () => this.messages.set([]),
        });
      });
    });

    // Arriving from a search hit: scroll the target message into view and
    // flash it so the analyst lands on the evidence, not the top of a long
    // thread. The seq counter retriggers the flash for repeated hits.
    //
    // Since the stream became virtualized the target is often NOT in the DOM,
    // so a bare querySelector finds nothing and the jump silently does
    // nothing. Ask the viewport to render that index first, then refine with
    // scrollIntoView once the bubble exists.
    effect(() => {
      const focus = this.triage.focusMessage();
      const msgs = this.messages();
      if (!focus || msgs.length === 0) return;
      untracked(() => {
        this.flashId.set(focus.messageId);
        clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(() => this.flashId.set(null), 1800);

        const index = this.orderedMessages().findIndex(
          (m) => m.messageId === focus.messageId,
        );
        if (index >= 0) this.viewport()?.scrollToIndex(index);
        setTimeout(() => {
          document
            .querySelector(`[data-testid="msg-${focus.messageId}"]`)
            ?.scrollIntoView({ block: 'center' });
        });
      });
    });
  }

  protected summarize(): void {
    if (this.summary()) {
      this.showSummary.update((v) => !v);
      return;
    }
    const thread = this.triage.selectedThread();
    if (!thread) return;
    this.summarizeApi.summarize(thread.threadId).subscribe({
      next: (d) => {
        this.summary.set(d);
        this.showSummary.set(true);
      },
    });
  }

  // Entity extraction runs ONCE for the whole thread (1 Aug: enrichment is
  // thread-level, same context principle as translate-thread). Chips render
  // on each message as spotting aids.
  protected extractThreadEntities(): void {
    const cached = this.session.entities();
    const pending = this.messages().filter((m) => !cached[m.messageId]);
    if (pending.length === 0) return;
    this.extracting.set(true);
    forkJoin(pending.map((m) => this.entitiesApi.extract(m.messageId))).subscribe({
      next: (results) => {
        for (const d of results) this.session.setEntities(d.messageId, d.entities ?? []);
        this.extracting.set(false);
      },
      error: () => this.extracting.set(false),
    });
  }

  // [31 Jul amendment] Batch translate across the thread. The prototype
  // iterates the per-message mock; the production seam passes full-thread
  // context to the translation service (the whole point of the model).
  protected translateThread(): void {
    const translations = this.session.translations();
    const pending = this.foreignMsgs().filter((m) => !translations[m.messageId]);
    if (pending.length === 0) return;
    this.translating.set(true);
    forkJoin(pending.map((m) => this.translateApi.translate(m.messageId, m.lang))).subscribe({
      next: (results) => {
        for (const d of results) this.session.setTranslation(d.messageId, d.text, d.service);
        this.translating.set(false);
      },
      error: () => this.translating.set(false),
    });
  }

  // [31 Jul amendment] Promote the whole thread to gold: full transcript,
  // original + linguist-approved English, verdicts inline. Promotion marks
  // the thread worked — the stack ticks down.
  protected promoteThreadGold(): void {
    const thread = this.triage.selectedThread();
    if (!thread || !this.goldReady()) return;
    const reviews = this.session.reviews();
    const translations = this.session.translations();
    const notes = this.session.notes();
    // Attribute the note to whoever the front says is signed in; falls back to
    // the generic label where no front is in place (local dev, fixtures).
    const author = this.identity.label();
    // The promoted transcript is always chronological, whichever way the
    // linguist happens to be reading. Descending is a reading aid; a gold copy
    // is a record, and a record read backwards misleads whoever receives it.
    const chronological = [...this.messages()].sort(
      (a, b) => Date.parse(a.ts) - Date.parse(b.ts) || a.messageId.localeCompare(b.messageId),
    );
    const lines = chronological.map((m) => {
      const head = `[${m.ts.slice(0, 19).replace('T', ' ')}Z] @${m.sender.handle} (${m.lang.toUpperCase()})`;
      const note = notes[m.messageId] ? `\n  NOTE [${author}]: ${notes[m.messageId]}` : '';
      if (m.lang === 'en') return `${head}\n  ${m.text}${note}`;
      const review = reviews[m.messageId];
      const en = review?.text ?? translations[m.messageId]?.text ?? '';
      // A bulk accept must not read as a line-by-line confirmation. Whoever
      // receives this transcript is entitled to know which of the two it was.
      const verdict = review
        ? review.verdict === 'edited'
          ? 'linguist-edited'
          : review.bulk
            ? 'bulk-accepted'
            : 'linguist-confirmed'
        : 'machine-translation';
      return `${head}\n  ORIG: ${m.text}\n  EN [${verdict}]: ${en}${note}`;
    });
    // The conversation note is a conclusion about everything below it, so it
    // goes at the top. Buried at the end it reads as an afterthought, and
    // attached to a message it would be attributed to that message.
    const convNote = this.session.threadNotes()[thread.threadId];
    const header = convNote ? `CONVERSATION NOTE [${author}]: ${convNote}\n\n` : '';
    this.goldCopy.promoteThread({
      threadId: thread.threadId,
      title: thread.title,
      content: header + lines.join('\n'),
      translatedCount: this.translatedCount(),
      reviewedCount: this.reviewedCount(),
      foreignCount: this.foreignMsgs().length,
      provenance: {
        threadId: thread.threadId,
        network: thread.network,
        service: 'thread-gold',
        ts: new Date().toISOString(),
      },
    });
    this.triage.markWorked(thread.threadId);
  }
}
