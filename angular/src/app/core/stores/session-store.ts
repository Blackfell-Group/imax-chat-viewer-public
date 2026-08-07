import { Injectable, computed, signal } from '@angular/core';
import { Entity } from '../models/api.models';
import { TranslationReview } from '../models/session.models';

export interface DocTagRecord {
  threadId: string;
  tags: string[];
}

interface CachedTranslation {
  text: string;
  service: string;
}

// Officer work-state for the session: cached machine translations, translation
// review verdicts, analyst notes on messages, and notes/tags on document
// attachments. In-memory only — no persistence — matching the evaluated
// demo's performance claim. Translations are cached here (not per-bubble) so
// thread-level operations (translate-thread, gold-ready) can see them. The
// officer-tag index (attachmentId → {threadId, tags}, folded to
// tag → {threads, docs}) feeds the triage panel's officer-tag facet.
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly _translations = signal<Record<string, CachedTranslation>>({});
  private readonly _entities = signal<Record<string, Entity[]>>({});
  private readonly _reviews = signal<Record<string, TranslationReview>>({});
  private readonly _notes = signal<Record<string, string>>({});
  private readonly _docNotes = signal<Record<string, string>>({});
  private readonly _docTags = signal<Record<string, DocTagRecord>>({});
  // A document's English gloss gets the same treatment as a message
  // translation: it can be confirmed, corrected, and taken back. An officer
  // citing a document is asserting the translation is right, and that
  // assertion needs an owner.
  private readonly _docReviews = signal<Record<string, TranslationReview>>({});

  readonly translations = this._translations.asReadonly();
  readonly entities = this._entities.asReadonly();
  readonly reviews = this._reviews.asReadonly();
  readonly notes = this._notes.asReadonly();
  readonly docNotes = this._docNotes.asReadonly();
  readonly docTags = this._docTags.asReadonly();
  readonly docReviews = this._docReviews.asReadonly();

  // Every custom tag the officer has coined this session, in the order they
  // coined them. Without this the vocabulary was derived per-document, so a
  // tag invented on one scan was invisible on the next and could not be
  // applied again — which defeats the point of a tag, since its value is
  // being able to gather documents under it.
  readonly customVocabulary = computed(() => {
    const seen: string[] = [];
    for (const rec of Object.values(this._docTags())) {
      for (const tag of rec.tags) if (!seen.includes(tag)) seen.push(tag);
    }
    return seen;
  });

  /** tag → { threads, docs } — the officer-tag facet's data source. */
  readonly tagIndex = computed(() => {
    const index: Record<string, { threads: Set<string>; docs: number }> = {};
    for (const rec of Object.values(this._docTags())) {
      for (const tag of rec.tags) {
        index[tag] ??= { threads: new Set<string>(), docs: 0 };
        index[tag].threads.add(rec.threadId);
        index[tag].docs++;
      }
    }
    return index;
  });

  setTranslation(messageId: string, text: string, service: string): void {
    this._translations.update((all) => ({ ...all, [messageId]: { text, service } }));
  }

  setEntities(messageId: string, entities: Entity[]): void {
    this._entities.update((all) => ({ ...all, [messageId]: entities }));
  }

  setReview(messageId: string, review: TranslationReview | null): void {
    this._reviews.update((all) => {
      const next = { ...all };
      if (review) next[messageId] = review;
      else delete next[messageId];
      return next;
    });
  }

  setNote(messageId: string, note: string | null): void {
    this._notes.update((all) => {
      const next = { ...all };
      if (note) next[messageId] = note;
      else delete next[messageId];
      return next;
    });
  }

  setDocNote(attachmentId: string, note: string | null): void {
    this._docNotes.update((all) => {
      const next = { ...all };
      if (note) next[attachmentId] = note;
      else delete next[attachmentId];
      return next;
    });
  }

  setDocReview(attachmentId: string, review: TranslationReview | null): void {
    this._docReviews.update((all) => {
      const next = { ...all };
      if (review) next[attachmentId] = review;
      else delete next[attachmentId];
      return next;
    });
  }

  toggleDocTag(attachmentId: string, threadId: string, tag: string): void {
    this._docTags.update((all) => {
      const current = all[attachmentId] ?? { threadId, tags: [] };
      const tags = current.tags.includes(tag)
        ? current.tags.filter((t) => t !== tag)
        : [...current.tags, tag];
      return { ...all, [attachmentId]: { threadId, tags } };
    });
  }
}
