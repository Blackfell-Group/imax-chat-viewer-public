import { Injectable, computed, signal } from '@angular/core';

/** What GET /api/whoami returns — see deploy/identity.js. */
export interface Identity {
  mode: 'proxy-header' | 'disabled';
  authenticated: boolean;
  id: string | null;
  name: string | null;
  org: string | null;
  groups: string[];
  label: string | null;
  headers: { id: string; name: string; groups: string; org: string };
  requiredGroups: string[];
}

/**
 * Who the officer is, per the authenticating front.
 *
 * The SPA never authenticates anyone — the enclave front does that and forwards
 * identity as headers, which the SPA pod's edge resolves and republishes here.
 * The app only reads it, for two purposes: showing the linguist who they are
 * signed in as, and attributing their notes in the gold copy.
 */
@Injectable({ providedIn: 'root' })
export class IdentityService {
  private readonly _identity = signal<Identity | null>(null);

  readonly identity = this._identity.asReadonly();

  /** Display name, falling back to the id, then to a neutral label. */
  readonly label = computed(() => this._identity()?.label ?? 'analyst');

  /** True once an authenticated caller is known. */
  readonly known = computed(() => !!this._identity()?.authenticated);

  readonly org = computed(() => this._identity()?.org ?? null);

  constructor() {
    void this.load();
  }

  /**
   * Identity is advisory in the UI: a failed lookup leaves the officer
   * anonymous and the bench fully usable, because the front — not this call —
   * is what actually gates access.
   */
  async load(): Promise<void> {
    try {
      const res = await fetch('/api/whoami');
      if (!res.ok) return;
      this._identity.set((await res.json()) as Identity);
    } catch {
      // Dev server without the edge in front; stay anonymous.
    }
  }
}
