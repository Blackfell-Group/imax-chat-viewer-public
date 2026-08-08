import { Injectable, computed, signal } from '@angular/core';
import { ThreadGold } from '../models/session.models';

// Gold copy [31 Jul amendment, sharpened 1 Aug]: ONE output, promoted in one
// place — the whole reviewed thread. Snippet "evidence" clipping was removed
// from the linguist workspace (hcd/one_output_model.md); fragment-level
// evidence assembly is an analyst-mode concern at the production seam.
@Injectable({ providedIn: 'root' })
export class GoldCopyStore {
  private readonly _threadGold = signal<Record<string, ThreadGold>>({});
  // Order is explicit rather than incidental. Object.values() gave whatever
  // order the keys happened to land in, which meant the export order was not
  // something the linguist could decide — and in a product assembled from
  // several threads, the order IS an editorial judgement.
  private readonly _order = signal<string[]>([]);

  readonly threadGold = this._threadGold.asReadonly();
  readonly order = this._order.asReadonly();
  readonly threadGoldList = computed(() => {
    const all = this._threadGold();
    return this._order()
      .map((id) => all[id])
      .filter((g): g is ThreadGold => !!g);
  });
  readonly count = computed(() => this.threadGoldList().length);

  promoteThread(gold: ThreadGold): void {
    this._threadGold.update((all) => ({ ...all, [gold.threadId]: gold }));
    this._order.update((ids) => (ids.includes(gold.threadId) ? ids : [...ids, gold.threadId]));
  }

  removeThreadGold(threadId: string): void {
    this._threadGold.update((all) => {
      const next = { ...all };
      delete next[threadId];
      return next;
    });
    this._order.update((ids) => ids.filter((id) => id !== threadId));
  }

  /** Drag-and-drop reorder; the export follows this order. */
  moveThreadGold(from: number, to: number): void {
    this._order.update((ids) => {
      if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids;
      const next = [...ids];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  }
}
