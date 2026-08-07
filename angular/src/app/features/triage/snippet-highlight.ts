import { Component, computed, input } from '@angular/core';

interface SnippetPart {
  s: string;
  hit?: boolean;
}

// Port of the reference Snippet function: split-and-mark with rendered text
// nodes and <mark> spans — never innerHTML (untrusted corpus text). RTL via
// the dir input.
@Component({
  selector: 'app-snippet-highlight',
  template: `
    <span class="snippet" [attr.dir]="dir()" [class.rtl]="dir() === 'rtl'">
      @for (p of parts(); track $index) {
        @if (p.hit) {
          <mark>{{ p.s }}</mark>
        } @else {
          {{ p.s }}
        }
      }
    </span>
  `,
  styles: `
    .snippet {
      display: block;
      font-size: 12px;
      line-height: 1.5;

      &.rtl {
        text-align: right;
      }

      mark {
        background: #3d5a80;
        color: #eaf2ff;
        border-radius: 2px;
        padding: 0 2px;
      }
    }
  `,
})
export class SnippetHighlight {
  readonly text = input.required<string>();
  readonly q = input<string>('');
  readonly dir = input<string>('ltr');

  protected readonly parts = computed<SnippetPart[]>(() => {
    const text = this.text();
    const q = this.q();
    if (!q) return [{ s: text }];
    const out: SnippetPart[] = [];
    const lower = text.toLowerCase();
    const needle = q.toLowerCase();
    let i = 0;
    for (;;) {
      const at = lower.indexOf(needle, i);
      if (at < 0) break;
      if (at > i) out.push({ s: text.slice(i, at) });
      out.push({ s: text.slice(at, at + needle.length), hit: true });
      i = at + needle.length;
    }
    out.push({ s: text.slice(i) });
    return out;
  });
}
