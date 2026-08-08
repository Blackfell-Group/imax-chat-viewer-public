import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, of, switchMap } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { SearchApi } from '../../core/api/search-api';
import { TriageStore } from '../../core/stores/triage-store';
import { SessionStore } from '../../core/stores/session-store';
import {
  ContentType,
  FacetKey,
  Group,
  MessageSearchParams,
  MessageSearchResponse,
  SearchMode,
  ThreadCard,
} from '../../core/models/api.models';
import { SnippetHighlight } from './snippet-highlight';
import { PanelResize } from '../../core/directives/panel-resize';

export const LANG_LABEL: Record<string, string> = {
  ar: 'Arabic',
  fa: 'Farsi',
  zh: 'Chinese',
  ru: 'Russian',
  en: 'English',
};
export const SCOPE_LANGS = ['ar', 'fa', 'zh', 'ru', 'en'];

// A queue is worked in arrival order: oldest first is the default. The
// untranslated-first sort died with auto-translation (1 Aug) — everything
// arrives translated.
const SORTS = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'recency', label: 'Most recent' },
  { value: 'volume', label: 'Message count' },
  { value: 'flagged', label: 'Flagged first' },
] as const;

const TYPES: { key: ContentType; label: string; icon: string }[] = [
  { key: 'message', label: 'Message', icon: 'chat_bubble_outline' },
  { key: 'transcript', label: 'Transcript', icon: 'graphic_eq' },
  { key: 'document', label: 'Document', icon: 'description' },
];

const FACETS: { key: FacetKey; label: string; cssVar: string }[] = [
  { key: 'has-selector', label: 'Selector', cssVar: 'var(--entity-phone)' },
  { key: 'has-passport', label: 'Passport', cssVar: 'var(--entity-passport)' },
  { key: 'has-person', label: 'Person', cssVar: 'var(--entity-person)' },
  { key: 'has-geo', label: 'Geo', cssVar: 'var(--entity-geo)' },
  { key: 'has-image', label: 'Image', cssVar: 'var(--entity-handle)' },
  { key: 'unenriched', label: 'Unenriched', cssVar: '#6b7686' },
];

// Chat Search & Triage panel (left). Browse mode is a linguist's incoming
// queue: unworked-first, with per-item disposition held in memory. Any query
// (≥2 chars), facet, or group switches to triage-search across the whole
// corpus. Filters compose: content type, the sticky My-languages scope, date
// range, facet, and group — mirroring the reference NavPanel exactly.
@Component({
  selector: 'app-triage-panel',
  imports: [PanelResize, 
    MatIconModule,
    MatButtonToggleModule,
    SnippetHighlight,
  ],
  templateUrl: './triage-panel.html',
  styleUrl: './triage-panel.scss',
})
export class TriagePanel {
  private readonly searchApi = inject(SearchApi);
  protected readonly triage = inject(TriageStore);
  protected readonly session = inject(SessionStore);

  protected readonly langLabel = LANG_LABEL;
  protected readonly scopeLangs = SCOPE_LANGS;
  protected readonly sorts = SORTS;
  protected readonly types = TYPES;
  protected readonly facets = FACETS;
  protected readonly typeIcon: Record<string, string> = {
    message: 'chat_bubble_outline',
    transcript: 'graphic_eq',
    document: 'description',
  };

  protected readonly collapsed = signal(false);
  protected readonly threads = signal<ThreadCard[]>([]);
  protected readonly typeCounts = signal<Partial<Record<ContentType, number>>>({});
  protected readonly myLangs = signal<string[]>([...SCOPE_LANGS]);
  protected readonly sort = signal<(typeof SORTS)[number]['value']>('oldest');
  protected readonly type = signal<ContentType | null>(null);
  protected readonly queueMode = signal(true);
  protected readonly dispo = this.triage.dispo;
  /** Officer tag currently filtering the queue (a saved-view over tagged docs). */
  protected readonly tagFilter = signal<string | null>(null);
  // Flagging hands a thread to a targeting officer, and until now nothing
  // could find the flagged ones again: the disposition existed and the queue
  // kept them visible, but there was no way to isolate or prioritise them.
  protected readonly flaggedOnly = signal(false);
  protected readonly flaggedCount = computed(
    () => Object.values(this.triage.dispo()).filter((d) => d === 'flagged').length,
  );
  protected readonly officerTags = computed(() => Object.keys(this.session.tagIndex()).sort());

  // Search state.
  protected readonly q = signal('');
  protected readonly mode = signal<SearchMode>('content');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly facet = signal<FacetKey | null>(null);
  protected readonly group = signal<string | null>(null);
  protected readonly showFilters = signal(false);
  // Find tools (search, modes, lanes, dates, facets, groups, tags) collapse
  // to leave the queue-only bench view (hcd/one_output_model.md §6). Stack
  // controls — My languages and sort — belong to the queue and stay.
  protected readonly showFind = signal(true);
  protected readonly groups = signal<Group[]>([]);
  protected readonly results = signal<MessageSearchResponse | null>(null);

  protected readonly active = computed(
    () => this.q().trim().length >= 2 || !!this.facet() || !!this.group(),
  );

  // Triage-search request, debounced 250 ms; null while browsing.
  private readonly searchParams = computed<MessageSearchParams | null>(() => {
    if (!this.active()) return null;
    const params: MessageSearchParams = { mode: this.group() ? 'entity' : this.mode() };
    const q = this.q().trim();
    if (q.length >= 2) params.q = q;
    if (this.type()) params.type = this.type()!;
    if (this.from()) params.from = this.from();
    if (this.to()) params.to = this.to();
    if (this.facet()) params.facet = this.facet()!;
    if (this.group()) params.group = this.group()!;
    return params;
  });

  constructor() {
    this.searchApi.getGroups().subscribe({
      next: (d) => this.groups.set(d.groups ?? []),
      error: () => this.groups.set([]),
    });

    // Browse fetch: on load, on type change, and on returning from search.
    effect(() => {
      const active = this.active();
      const type = this.type();
      untracked(() => {
        if (!active) this.loadThreads(type);
      });
    });

    // Leaving search clears results immediately (no debounce on the way out).
    effect(() => {
      if (!this.active()) this.results.set(null);
    });

    // A tag that gets fully removed shouldn't leave a stale active filter.
    effect(() => {
      const tag = this.tagFilter();
      if (tag && !this.session.tagIndex()[tag]) this.tagFilter.set(null);
    });

    toObservable(this.searchParams)
      .pipe(
        debounceTime(250),
        switchMap((params) => (params ? this.searchApi.searchMessages(params) : of(null))),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (d) => {
          if (!d) return;
          this.results.set(d);
          if (d.typeCounts) this.typeCounts.set(d.typeCounts);
        },
      });
  }

  private loadThreads(type: ContentType | null): void {
    this.searchApi.getThreads({ type: type ?? undefined }).subscribe({
      next: (d) => {
        this.threads.set(d.threads ?? []);
        if (d.typeCounts) this.typeCounts.set(d.typeCounts);
      },
      error: () => this.threads.set([]),
    });
  }

  // Browse list: My-languages scope, disposition filter (queue hides worked
  // except flagged), and sort — untranslated-first pushes target-language
  // traffic up. Mirrors the reference implementation exactly.
  protected readonly visibleThreads = computed(() => {
    const scope = this.myLangs().length ? this.myLangs() : null;
    const dispo = this.dispo();
    let copy = this.threads().filter((t) => !scope || t.languages.some((l) => scope.includes(l)));
    // An officer-tag filter is a saved-view over tagged docs — it supersedes
    // the queue's unworked-only filter so tagged items stay visible once worked.
    const tagFilter = this.tagFilter();
    if (tagFilter) {
      const tagged = this.session.tagIndex()[tagFilter]?.threads;
      copy = copy.filter((t) => tagged?.has(t.threadId));
    } else if (this.queueMode()) {
      copy = copy.filter((t) => !dispo[t.threadId] || dispo[t.threadId] === 'flagged');
    }
    if (this.flaggedOnly()) copy = copy.filter((t) => dispo[t.threadId] === 'flagged');
    const sort = this.sort();
    copy = [...copy];
    if (sort === 'volume') copy.sort((a, b) => b.messageCount - a.messageCount);
    else if (sort === 'recency') copy.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
    else if (sort === 'flagged') {
      // Flagged first, then the chosen default within each group, so turning
      // this on never loses the ordering underneath it.
      copy.sort((a, b) => {
        const fa = dispo[a.threadId] === 'flagged' ? 0 : 1;
        const fb = dispo[b.threadId] === 'flagged' ? 0 : 1;
        return fa - fb || a.lastActivity.localeCompare(b.lastActivity);
      });
    } else copy.sort((a, b) => a.lastActivity.localeCompare(b.lastActivity));
    return copy;
  });

  // Search hits scoped by My-languages (source language of the hit), then by
  // an active officer-tag filter (thread carries a doc with that tag).
  protected readonly visibleHits = computed(() => {
    let hits = this.results()?.matches ?? [];
    const langs = this.myLangs();
    if (langs.length) hits = hits.filter((h) => langs.includes(h.lang));
    const tagFilter = this.tagFilter();
    if (tagFilter) {
      const tagged = this.session.tagIndex()[tagFilter]?.threads;
      hits = hits.filter((h) => tagged?.has(h.threadId));
    }
    return hits;
  });

  protected readonly newCount = computed(
    () => this.threads().filter((t) => !this.dispo()[t.threadId]).length,
  );
  protected readonly workedCount = computed(
    () => Object.values(this.dispo()).filter(Boolean).length,
  );

  protected readonly statsLine = computed(() => {
    const r = this.results();
    if (!r) return 'searching…';
    const hits = this.visibleHits().length;
    return `${hits}${r.stats.truncated ? '+' : ''} hits · scanned ${r.stats.scanned.toLocaleString()} of ${r.stats.corpusMessages.toLocaleString()} messages · ${r.stats.threadsHit} threads · ${r.stats.tookMs} ms`;
  });

  protected toggleMyLang(lang: string): void {
    this.myLangs.update((s) => (s.includes(lang) ? s.filter((x) => x !== lang) : [...s, lang]));
  }

  protected setType(type: ContentType): void {
    this.type.update((current) => (current === type ? null : type));
  }

  protected setFacet(facet: FacetKey): void {
    this.facet.update((current) => (current === facet ? null : facet));
  }

  protected setGroup(id: string): void {
    this.group.update((current) => (current === id ? null : id));
  }

  protected clearAll(): void {
    this.q.set('');
    this.facet.set(null);
    this.group.set(null);
    this.from.set('');
    this.to.set('');
    this.mode.set('content');
    this.type.set(null);
    this.tagFilter.set(null);
    this.flaggedOnly.set(false);
  }

  // Hiding the find tools always returns the linguist to their own stack:
  // any active query, facet, group, or tag filter clears with them.
  protected toggleFind(): void {
    if (this.showFind()) this.clearAll();
    this.showFind.update((v) => !v);
  }

  protected toggleFlaggedOnly(): void {
    this.flaggedOnly.update((v) => !v);
  }

  protected setTagFilter(tag: string): void {
    this.tagFilter.update((current) => (current === tag ? null : tag));
  }

  protected select(thread: ThreadCard, messageId?: string): void {
    this.triage.selectThread(thread, messageId);
  }
}
