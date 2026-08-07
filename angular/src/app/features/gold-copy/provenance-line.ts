import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Provenance } from '../../core/models/session.models';

// The provenance trail rendered under every clip — the finished product stays
// traceable to the originating message without officer bookkeeping.
@Component({
  selector: 'app-provenance-line',
  imports: [MatIconModule],
  template: `
    <div class="prov">
      <mat-icon class="prov-icon">fingerprint</mat-icon>
      <span class="prov-text">{{ line() }}</span>
    </div>
  `,
  styles: `
    .prov {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }

    .prov-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
      color: var(--text-dim);
    }

    .prov-text {
      color: var(--text-dim);
      font-size: 10px;
    }
  `,
})
export class ProvenanceLine {
  readonly p = input.required<Provenance>();

  protected readonly line = computed(() => {
    const p = this.p();
    return [
      p.threadId && `thread ${p.threadId}`,
      p.messageId && `msg ${p.messageId}`,
      p.sender && `@${p.sender}`,
      p.attachmentId && `att ${p.attachmentId}`,
      p.service && `via ${p.service}`,
      p.ts && p.ts.slice(0, 19).replace('T', ' ') + 'Z',
    ]
      .filter(Boolean)
      .join(' · ');
  });
}
