import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
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
  imports: [MatIconModule, NgStyle],
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
  protected readonly widthPx = signal(900);
  protected readonly heightPx = signal(Math.round(window.innerHeight * 0.88));
  /** 'fit' scales to the pane; a number is an explicit zoom factor. */
  protected readonly zoom = signal<'fit' | number>('fit');
  /** Image pane's share of the split, 0.25–0.85. */
  protected readonly splitRatio = signal(0.5);

  protected readonly imageStyle = computed(() => {
    const z = this.zoom();
    return z === 'fit'
      ? { 'max-width': '100%', 'max-height': '100%', width: 'auto', height: 'auto' }
      : { width: `${z * 100}%`, 'max-width': 'none', 'max-height': 'none', height: 'auto' };
  });

  protected toggleMaximize(): void {
    this.maximized.update((v) => !v);
  }

  protected setZoom(z: 'fit' | number): void {
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

  /** Drag the divider between the scan and the extracted text. */
  protected startSplit(event: PointerEvent): void {
    event.preventDefault();
    const split = (e: PointerEvent) => {
      const host = (event.target as HTMLElement).closest('.ocr-split');
      if (!host) return;
      const box = host.getBoundingClientRect();
      this.splitRatio.set(Math.min(Math.max((e.clientX - box.left) / box.width, 0.25), 0.85));
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
  protected readonly visibleBlocks = computed(
    () => this.pages()?.[this.pageIndex()]?.blocks ?? this.ocr()?.blocks ?? [],
  );

  protected turnPage(delta: number): void {
    this.pageIndex.update((i) => Math.min(Math.max(i + delta, 0), this.pageCount() - 1));
  }

  protected readonly attId = computed(() => this.open().attachment.attachmentId);
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
