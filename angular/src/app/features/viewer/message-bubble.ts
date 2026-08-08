import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SessionStore } from '../../core/stores/session-store';
import { Attachment, Message, ThreadCard } from '../../core/models/api.models';
import { Provenance } from '../../core/models/session.models';
import { OpenAttachment } from './ocr-dialog';

// One message on the linguist's bench (hcd/one_output_model.md). Always
// bilingual once the English exists: the auto-translated thread renders
// English-leads-source-beneath with no per-message toggle — the original is
// never hidden, so there is nothing to "show" (hcd/bilingual_display_model.md,
// 1 Aug). The bubble carries the review workflow only: verdict actions and
// the analyst note. Enrichment is thread-level from the workflow strip.
@Component({
  selector: 'app-message-bubble',
  imports: [MatIconModule],
  templateUrl: './message-bubble.html',
  styleUrl: './message-bubble.scss',
})
export class MessageBubble {
  readonly msg = input.required<Message>();
  readonly thread = input.required<ThreadCard>();
  readonly highlighted = input(false);
  readonly openAttachment = output<OpenAttachment>();

  private readonly session = inject(SessionStore);

  protected readonly translation = computed(
    () => this.session.translations()[this.msg().messageId] ?? null,
  );
  protected readonly entities = computed(
    () => this.session.entities()[this.msg().messageId] ?? null,
  );
  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  protected readonly noteEditing = signal(false);
  protected readonly noteDraft = signal('');

  protected readonly foreign = computed(() => this.msg().lang !== 'en');
  protected readonly review = computed(() => this.session.reviews()[this.msg().messageId]);
  protected readonly note = computed(() => this.session.notes()[this.msg().messageId]);

  // The English shown is the linguist's version if they've reviewed it,
  // otherwise the machine translation. Present ⇒ shown; the source always
  // stays on screen with it.
  protected readonly enText = computed(() => this.review()?.text ?? this.translation()?.text);
  protected readonly hasEn = computed(() => this.foreign() && !!this.enText());
  protected readonly displayText = computed(() =>
    this.hasEn() ? this.enText()! : this.msg().text,
  );
  protected readonly displayDir = computed(() => (this.hasEn() ? 'ltr' : this.msg().dir));

  protected readonly translatedBadge = computed(() => {
    const review = this.review();
    if (review) {
      return review.verdict === 'edited' ? 'EN · linguist-edited' : 'EN · linguist-confirmed';
    }
    return 'EN · mock-translate';
  });

  private provenance(): Provenance {
    const m = this.msg();
    return {
      threadId: this.thread().threadId,
      messageId: m.messageId,
      sender: m.sender.handle,
      network: m.sender.network,
      ts: m.ts,
    };
  }

  protected openOcr(a: Attachment): void {
    this.openAttachment.emit({ attachment: a, provenance: this.provenance() });
  }

  protected timestamp(ts: string): string {
    return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + 'Z';
  }

  // The check toggles. A verdict is a linguist's assertion about the record,
  // and an assertion made by a mis-click has to be retractable — clicking a
  // reviewed message again clears the verdict and returns it to the machine
  // translation. Clearing an *edited* verdict discards the correction, so that
  // one asks first.
  protected confirmTranslation(): void {
    const id = this.msg().messageId;
    const current = this.review();
    if (current?.verdict === 'confirmed') {
      this.session.setReview(id, null);
      return;
    }
    if (current?.verdict === 'edited') {
      if (!confirm('Clear this verdict? The linguist correction will be discarded.')) return;
      this.session.setReview(id, null);
      return;
    }
    const t = this.translation();
    if (!t) return;
    this.session.setReview(id, { verdict: 'confirmed', text: t.text });
  }

  protected startEdit(): void {
    this.draft.set(this.enText() ?? '');
    this.editing.set(true);
  }

  protected saveEdit(): void {
    this.session.setReview(this.msg().messageId, { verdict: 'edited', text: this.draft() });
    this.editing.set(false);
  }

  protected toggleNoteEditor(): void {
    this.noteDraft.set(this.note() ?? '');
    this.noteEditing.update((v) => !v);
  }

  protected saveNote(): void {
    this.session.setNote(this.msg().messageId, this.noteDraft());
    this.noteEditing.set(false);
  }

  protected deleteNote(): void {
    this.session.setNote(this.msg().messageId, null);
    this.noteEditing.set(false);
  }
}
