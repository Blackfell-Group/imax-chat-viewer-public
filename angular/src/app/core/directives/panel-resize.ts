import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

// Drag-to-resize for the two side panels.
//
// Both were fixed widths (312px and 280px) that could only collapse to a rail,
// so a linguist working a long thread or a wide manifest had no way to give
// that pane more room — the review's first item. Collapse and resize are
// different needs and both are kept.
//
// The handle sits inside the panel and finds its own target, the same shape the
// OCR viewer's split handle uses. Width is applied to the element rather than
// stored anywhere: this application holds no client-side state across reloads
// (TDD Task 3), so geometry resets with the session, deliberately.
@Directive({
  selector: '[appPanelResize]',
  host: { class: 'panel-resize-handle', role: 'separator', 'aria-orientation': 'vertical' },
})
export class PanelResize {
  /** Which edge of the panel the handle sits on. */
  readonly edge = input<'left' | 'right'>('right', { alias: 'appPanelResize' });
  readonly min = input(220);
  readonly max = input(720);
  /** Restored on double-click. */
  readonly defaultWidth = input(312);

  private readonly host = inject(ElementRef<HTMLElement>);

  private target(): HTMLElement | null {
    return this.host.nativeElement.closest('.panel-body');
  }

  @HostListener('pointerdown', ['$event'])
  protected onPointerDown(event: PointerEvent): void {
    const panel = this.target();
    if (!panel) return;
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = panel.getBoundingClientRect().width;
    // A handle on the panel's left edge grows the panel as the pointer moves
    // left, so the delta inverts.
    const sign = this.edge() === 'left' ? -1 : 1;

    const move = (e: PointerEvent) => {
      const next = startWidth + (e.clientX - startX) * sign;
      panel.style.width = `${Math.min(Math.max(next, this.min()), this.max())}px`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    // Without these the drag selects text across the app the moment the
    // pointer leaves the 6px handle.
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  @HostListener('dblclick')
  protected onDoubleClick(): void {
    const panel = this.target();
    if (panel) panel.style.width = `${this.defaultWidth()}px`;
  }

  // Keyboard parity: a mouse-only resize is unreachable for anyone driving the
  // bench from the keyboard.
  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const panel = this.target();
    if (!panel) return;
    event.preventDefault();
    const sign = this.edge() === 'left' ? -1 : 1;
    const step = (event.key === 'ArrowRight' ? 24 : -24) * sign;
    const next = panel.getBoundingClientRect().width + step;
    panel.style.width = `${Math.min(Math.max(next, this.min()), this.max())}px`;
  }
}
