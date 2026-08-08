// Typed contracts for the mock enrichment services (server.js + routes/*).
// The mock contracts are frozen: these interfaces mirror the route responses
// verbatim, and production cutover swaps base URLs per service, not shapes.

export type ContentType = 'message' | 'transcript' | 'document';
export type TextDirection = 'rtl' | 'ltr';
export type EntityType = 'person' | 'geo' | 'phone' | 'passport' | 'handle';
export type SearchMode = 'content' | 'entity';
export type MatchField = 'text' | 'translation' | 'entity' | 'selector';

export type FacetKey =
  | 'has-geo'
  | 'has-person'
  | 'has-selector'
  | 'has-passport'
  | 'has-image'
  | 'unenriched';

export interface Sender {
  handle: string;
  network: string;
}

export interface Attachment {
  attachmentId: string;
  type: string;
  name: string;
  uri: string;
}

export interface ThreadCard {
  threadId: string;
  title: string;
  network: string;
  contentType: ContentType;
  hasAttachment: boolean;
  languages: string[];
  participants: number;
  lastActivity: string;
  messageCount: number;
}

export interface Message {
  messageId: string;
  ts: string;
  sender: Sender;
  lang: string;
  dir: TextDirection;
  text: string;
  attachments?: Attachment[];
}

export interface Entity {
  type: EntityType;
  text: string;
  confidence?: number;
}

export interface Group {
  id: string;
  kind: 'geofence' | 'watchlist';
  label: string;
  entityType: 'geo' | 'selector';
  members: string[];
}

export interface SearchStats {
  scanned: number;
  threadsHit: number;
  corpusMessages: number;
  corpusThreads: number;
  tookMs: number;
  truncated: boolean;
}

export interface SearchMatch {
  threadId: string;
  thread: ThreadCard;
  messageId: string;
  ts: string;
  sender: string;
  lang: string;
  dir: TextDirection;
  field: MatchField;
  entity: Entity | null;
  contentType: ContentType;
  tags: string[];
  snippet: string;
}

export interface OcrBlock {
  text: string;
  /**
   * This line's own English, carried on the block rather than in a parallel
   * array so a source line and its rendering cannot drift apart. Optional: an
   * English-language document has none, and neither does a gateway still on the
   * older single-gloss prompt — the viewer falls back to `englishGloss` then.
   */
  en?: string;
  bbox: [number, number, number, number];
}

// ---- responses ------------------------------------------------------------

interface ServiceEnvelope {
  schemaVersion: string;
  service: string;
}

export interface ThreadsResponse extends ServiceEnvelope {
  typeCounts: Record<ContentType, number>;
  threads: ThreadCard[];
}

export interface ThreadMessagesResponse extends ServiceEnvelope {
  threadId: string;
  messages: Message[];
}

export interface MessageSearchResponse extends ServiceEnvelope {
  query: string;
  mode: SearchMode;
  group: Pick<Group, 'id' | 'label' | 'kind'> | null;
  stats: SearchStats;
  facetCounts: Record<FacetKey, number>;
  typeCounts: Record<ContentType, number>;
  matches: SearchMatch[];
}

export interface GroupsResponse extends ServiceEnvelope {
  groups: Group[];
}

export interface TranslateResponse extends ServiceEnvelope {
  messageId: string;
  srcLang: string;
  dstLang: string;
  text: string;
  confidence: number;
}

export interface EntitiesResponse extends ServiceEnvelope {
  messageId: string;
  entities: Entity[];
}

export interface SummarizeResponse extends ServiceEnvelope {
  threadId: string;
  summary: string;
}

export interface OcrPage {
  page: number;
  uri: string;
  blocks: OcrBlock[];
}

export interface OcrResponse extends ServiceEnvelope {
  attachmentId: string;
  engine: string;
  fullText: string;
  blocks: OcrBlock[];
  srcLang?: string;
  englishGloss?: string;
  /** Multi-page documents: per-page image + blocks (flat blocks/fullText remain). */
  pages?: OcrPage[];
}

// ---- request params -------------------------------------------------------

export interface ThreadListParams {
  q?: string;
  lang?: string;
  type?: ContentType;
}

export interface MessageSearchParams {
  q?: string;
  mode?: SearchMode;
  lang?: string;
  /** ISO date (YYYY-MM-DD), inclusive start of the range. */
  from?: string;
  /** ISO date (YYYY-MM-DD), inclusive end of the range. */
  to?: string;
  facet?: FacetKey;
  entityType?: EntityType | 'selector';
  group?: string;
  type?: ContentType;
}
