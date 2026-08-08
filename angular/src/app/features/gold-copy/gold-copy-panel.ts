import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { GoldCopyStore } from '../../core/stores/gold-copy-store';
import { ProvenanceLine } from './provenance-line';
import { PanelResize } from '../../core/directives/panel-resize';

// Gold Copy panel (right): the linguist's finished output — whole reviewed
// threads promoted from the viewer strip, nothing else
// (hcd/one_output_model.md). Export renders the full verdicted transcripts.
@Component({
  selector: 'app-gold-copy-panel',
  imports: [PanelResize, MatIconModule, ProvenanceLine, CdkDropList, CdkDrag],
  templateUrl: './gold-copy-panel.html',
  styleUrl: './gold-copy-panel.scss',
})
export class GoldCopyPanel {
  protected readonly store = inject(GoldCopyStore);
  private readonly snack = inject(MatSnackBar);
  protected readonly collapsed = signal(false);
  protected readonly exportOpen = signal(false);
  protected readonly exportText = signal('');

  // The export preview was a 600px box holding whole verdicted transcripts —
  // the one place in the application where the officer reads the finished
  // product end to end before it leaves.
  protected readonly exportMaximized = signal(false);

  protected startExportResize(event: PointerEvent): void {
    event.preventDefault();
    const modal = (event.target as HTMLElement).closest<HTMLElement>('.export-modal');
    if (!modal || this.exportMaximized()) return;
    const box = modal.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    // Centred with translate(-50%,-50%), so the corner moves at half rate.
    const move = (e: PointerEvent) => {
      modal.style.width = `${Math.min(Math.max(box.width + (e.clientX - startX) * 2, 420), window.innerWidth - 24)}px`;
      modal.style.height = `${Math.min(Math.max(box.height + (e.clientY - startY) * 2, 300), window.innerHeight - 24)}px`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  protected openExport(): void {
    const sections = this.store.threadGoldList().map((g) => {
      return `== THREAD GOLD: ${g.title} (${g.threadId}) ==\n${g.content}\n   SOURCE: thread ${g.threadId} / thread-gold @ ${g.provenance.ts || ''}`;
    });
    const lines = [
      'GOLD COPY — FULL TRANSLATIONS (DRAFT) — UNCLASSIFIED DEMONSTRATION',
      `Generated: ${new Date().toISOString()}`,
      '',
      ...sections,
    ];
    this.exportText.set(lines.join('\n'));
    this.exportOpen.set(true);
  }

  // Copying said nothing, so the officer had no way to know whether the
  // product had reached the clipboard. Worse, `navigator.clipboard?.` silently
  // no-ops wherever the Clipboard API is missing or the page is not a secure
  // context — a live possibility behind the enclave's TLS termination — so
  // silence covered both success and total failure. Both now announce
  // themselves, and failure leaves the text selected so the officer can copy
  // it by hand rather than losing the work.
  protected copyExport(): void {
    const text = this.exportText();
    const announce = (message: string, ok: boolean) =>
      this.snack.open(message, ok ? '' : 'Select all', {
        duration: ok ? 2500 : 8000,
        panelClass: ok ? 'snack-ok' : 'snack-warn',
      });

    if (!navigator.clipboard?.writeText) {
      announce('Clipboard unavailable here — select the text and copy manually.', false)
        .onAction()
        .subscribe(() => this.selectExportText());
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => announce(`Copied ${this.store.count()} gold thread(s) to the clipboard.`, true),
      () =>
        announce('Copy was blocked by the browser — select the text and copy manually.', false)
          .onAction()
          .subscribe(() => this.selectExportText()),
    );
  }

  private selectExportText(): void {
    const field = document.querySelector<HTMLTextAreaElement>('[data-testid="export-text"]');
    field?.focus();
    field?.select();
  }

  protected dropThread(event: CdkDragDrop<unknown>): void {
    this.store.moveThreadGold(event.previousIndex, event.currentIndex);
  }
}
