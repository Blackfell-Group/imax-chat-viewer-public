import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OcrApi } from '../../core/api/ocr-api';
import { SessionStore } from '../../core/stores/session-store';
import { Attachment, OcrResponse } from '../../core/models/api.models';
import { Provenance } from '../../core/models/session.models';

export interface OpenAttachment {
  attachment: Attachment;
  provenance: Provenance;
}

// Officer's quick-tag vocabulary for triaging a document. Free-text tags are
// also allowed; both flow into Search & Triage as a filterable facet.
const QUICK_TAGS = ['priority', 'identity-doc', 'matches-open-case', 'follow-up'];

// OCR Image Viewer: split pane — raw graphic left, extracted text right.
// Extracted text clips into gold copy; clips close the viewer so the officer
// sees the clip land in the tray. Below the read pane, the officer annotates
// the document itself: a free-text note and triage tags that make the
// document findable back in Search & Triage.
@Component({
  selector: 'app-ocr-dialog',
  imports: [MatIconModule, MatProgressSpinnerModule, NgStyle],
  templateUrl: './ocr-dialog.html',
  styleUrl: './ocr-dialog.scss',
})
export class OcrDialog {
  readonly open = input.required<OpenAttachment>();
  readonly closed = output<void>();

  private readonly ocrApi = inject(OcrApi);
  private readonly session = inject(SessionStore);

  protected readonly quickTags = QUICK_TAGS;
  protected readonly ocr = signal<OcrResponse | null>(null);
  protected readonly noteEditing = signal(false);
  protected readonly noteDraft = signal('');
  protected readonly tagInput = signal('');
  protected readonly pageIndex = signal(0);

  // Viewer geometry. These scans are the thing being read — a 900px box with
  // the image capped at 420px made a 760px document unreadable, which is
  // exactly what the review reported. All in-memory: no persistence anywhere
  // in this application (TDD Task 3), so geometry resets with the session.
  protected readonly maximized = signal(false);
  protected readonly widthPx = signal(Math.min(1180, Math.round(window.innerWidth * 0.92)));
  protected readonly heightPx = signal(Math.round(window.innerHeight * 0.94));
  /** 'fit' scales to the pane; a number is an explicit zoom factor. */
  // Opens showing the WHOLE page: the officer orients on the document, then
  // reads the extracted text below it. Fit-width is one click away and is the
  // reading posture — on a portrait page it fills the pane and scrolls.
  protected readonly zoom = signal<'fit' | 'width' | number>('fit');
  /** Scan's share of the vertical stack, 0.25–0.85. */
  protected readonly splitRatio = signal(0.55);

  protected readonly imageStyle = computed(() => {
    const z = this.zoom();
    // 'width' is the default because these are portrait pages in a landscape
    // pane: fitting to the pane HEIGHT leaves most of the width empty and the
    // document unreadably small, which is what the review reported.
    if (z === 'width') {
      return { width: '100%', 'max-width': '100%', 'max-height': 'none', height: 'auto' };
    }
    return z === 'fit'
      ? { 'max-width': '100%', 'max-height': '100%', width: 'auto', height: 'auto' }
      : { width: `${z * 100}%`, 'max-width': 'none', 'max-height': 'none', height: 'auto' };
  });

  protected toggleMaximize(): void {
    this.maximized.update((v) => !v);
  }

  protected setZoom(z: 'fit' | 'width' | number): void {
    this.zoom.set(z);
  }

  /** Drag the modal's bottom-right corner. */
  protected startResize(event: PointerEvent): void {
    event.preventDefault();
    if (this.maximized()) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startW = this.widthPx();
    const startH = this.heightPx();
    // The modal is centred with translate(-50%,-50%), so the corner travels at
    // half the pointer's rate relative to the box — hence the doubling.
    const move = (e: PointerEvent) => {
      this.widthPx.set(
        Math.min(Math.max(startW + (e.clientX - startX) * 2, 480), window.innerWidth - 24),
      );
      this.heightPx.set(
        Math.min(Math.max(startH + (e.clientY - startY) * 2, 360), window.innerHeight - 24),
      );
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /** Drag the divider between the scan and the text beneath it. */
  protected startSplit(event: PointerEvent): void {
    event.preventDefault();
    const split = (e: PointerEvent) => {
      const host = (event.target as HTMLElement).closest('.ocr-body');
      if (!host) return;
      const box = host.getBoundingClientRect();
      // Vertical now that the panes stack: measure Y, not X.
      this.splitRatio.set(Math.min(Math.max((e.clientY - box.top) / box.height, 0.25), 0.85));
    };
    const up = () => {
      window.removeEventListener('pointermove', split);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', split);
    window.addEventListener('pointerup', up);
  }

  // Multi-page documents: the image pane and the block pane page together.
  protected readonly pages = computed(() => this.ocr()?.pages ?? null);
  protected readonly pageCount = computed(() => this.pages()?.length ?? 1);
  protected readonly imageUri = computed(
    () => this.pages()?.[this.pageIndex()]?.uri ?? this.open().attachment.uri,
  );
  /**
   * Whether to pair each line with its own English. All-or-nothing per page: a
   * half-paired list would leave gaps that read as "no translation for this
   * line" when the truth is the service did not supply one, so the page falls
   * back to the whole-document gloss instead.
   */
  protected readonly hasLineEnglish = computed(() => {
    const blocks = this.visibleBlocks();
    return blocks.length > 0 && blocks.every((b) => !!b.en?.trim());
  });

  /** Source-script direction — decides which side the original column sits on. */
  protected readonly isRtl = computed(() => {
    const lang = this.ocr()?.srcLang;
    return lang === 'ar' || lang === 'fa' || lang === 'he' || lang === 'ur';
  });

  protected readonly visibleBlocks = computed(
    () => this.pages()?.[this.pageIndex()]?.blocks ?? this.ocr()?.blocks ?? [],
  );

  protected turnPage(delta: number): void {
    this.pageIndex.update((i) => Math.min(Math.max(i + delta, 0), this.pageCount() - 1));
  }

  // Review state for the document's English gloss — the same three moves a
  // message translation gets, because certifying a document translation is the
  // same kind of assertion.
  protected readonly glossEditing = signal(false);
  protected readonly glossDraft = signal('');
  protected readonly retranslating = signal(false);

  protected readonly attId = computed(() => this.open().attachment.attachmentId);
  protected readonly docReview = computed(() => this.session.docReviews()[this.attId()]);
  /** The linguist's version if they have one, otherwise the machine gloss. */
  protected readonly glossText = computed(
    () => this.docReview()?.text ?? this.ocr()?.englishGloss ?? '',
  );
  protected readonly glossBadge = computed(() => {
    const r = this.docReview();
    if (r) return r.verdict === 'edited' ? 'linguist-edited' : 'linguist-confirmed';
    return this.ocr()?.service ?? 'mock-translate';
  });

  /** Toggles, like the message verdict. A mis-click is not a decision. */
  protected confirmGloss(): void {
    const id = this.attId();
    const current = this.docReview();
    if (current?.verdict === 'confirmed') return this.session.setDocReview(id, null);
    if (current?.verdict === 'edited') {
      if (!confirm('Clear this verdict? The linguist correction will be discarded.')) return;
      return this.session.setDocReview(id, null);
    }
    const text = this.ocr()?.englishGloss;
    if (!text) return;
    this.session.setDocReview(id, { verdict: 'confirmed', text });
  }

  protected startGlossEdit(): void {
    this.glossDraft.set(this.glossText());
    this.glossEditing.set(true);
  }

  protected saveGlossEdit(): void {
    this.session.setDocReview(this.attId(), { verdict: 'edited', text: this.glossDraft() });
    this.glossEditing.set(false);
  }

  // Send the document back through the enrichment service. Where a model
  // gateway is configured the service answers from it — the premium tier in
  // hcd/bilingual_display_model.md — and reports which engine did the work.
  // Without one it re-reads the fixture, which is honest rather than a lie
  // about having called something.
  protected retranslate(): void {
    if (this.retranslating()) return;
    this.retranslating.set(true);
    this.ocrApi.recognize(this.attId()).subscribe({
      next: (d) => {
        this.ocr.set(d);
        // A fresh machine translation supersedes an unedited verdict: the
        // officer confirmed the OLD text, and silently keeping that verdict on
        // new text would attribute words to them they never read.
        if (this.docReview()?.verdict === 'confirmed') {
          this.session.setDocReview(this.attId(), null);
        }
        this.retranslating.set(false);
      },
      error: () => this.retranslating.set(false),
    });
  }
  protected readonly note = computed(() => this.session.docNotes()[this.attId()]);
  protected readonly tags = computed(() => this.session.docTags()[this.attId()]?.tags ?? []);

  // Custom tags coined anywhere in the session, not just on this document.
  // Deriving them from this attachment alone meant a tag could never be
  // applied to a second document, which is the only thing a tag is for.
  protected readonly customTags = computed(() =>
    this.session.customVocabulary().filter((t) => !QUICK_TAGS.includes(t)),
  );

  constructor() {
    effect(() => {
      const attachmentId = this.open().attachment.attachmentId;
      untracked(() => {
        this.ocr.set(null);
        this.noteEditing.set(false);
        this.tagInput.set('');
        this.pageIndex.set(0);
        this.ocrApi.recognize(attachmentId).subscribe({
          next: (d) => this.ocr.set(d),
          error: () => this.ocr.set(null),
        });
      });
    });
  }

  protected toggleTag(tag: string): void {
    const threadId = this.open().provenance.threadId ?? '';
    this.session.toggleDocTag(this.attId(), threadId, tag);
  }

  // Reachable three ways — Enter, the Add button, and leaving the field —
  // because requiring Enter meant a typed tag silently vanished when the
  // officer clicked away, and nothing on screen said Enter was the way.
  protected addCustomTag(event?: Event): void {
    event?.preventDefault();
    const v = this.tagInput().trim().toLowerCase();
    if (v && !this.tags().includes(v)) this.toggleTag(v);
    this.tagInput.set('');
  }

  protected saveNote(): void {
    this.session.setDocNote(this.attId(), this.noteDraft());
    this.noteEditing.set(false);
  }

  protected deleteNote(): void {
    this.session.setDocNote(this.attId(), null);
    this.noteEditing.set(false);
  }

  protected startNote(existing: string): void {
    this.noteDraft.set(existing);
    this.noteEditing.set(true);
  }

}
