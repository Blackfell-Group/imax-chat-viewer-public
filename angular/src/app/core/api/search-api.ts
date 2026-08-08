import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GroupsResponse,
  MessageSearchParams,
  MessageSearchResponse,
  ThreadListParams,
  ThreadMessagesResponse,
  ThreadsResponse,
} from '../models/api.models';

// Wraps the enterprise-search mock (routes/search.js). Empty/undefined params
// are omitted from the query string so the wire format matches what the React
// reference app sends.
function toParams(source: Record<string, string | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== '') {
      params = params.set(key, value);
    }
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class SearchApi {
  private readonly http = inject(HttpClient);

  getThreads(query: ThreadListParams = {}): Observable<ThreadsResponse> {
    return this.http.get<ThreadsResponse>('/api/search/threads', {
      params: toParams(query as Record<string, string | undefined>),
    });
  }

  getThreadMessages(threadId: string): Observable<ThreadMessagesResponse> {
    return this.http.get<ThreadMessagesResponse>(
      `/api/search/threads/${encodeURIComponent(threadId)}/messages`,
    );
  }

  searchMessages(query: MessageSearchParams): Observable<MessageSearchResponse> {
    return this.http.get<MessageSearchResponse>('/api/search/messages', {
      params: toParams(query as Record<string, string | undefined>),
    });
  }

  getGroups(): Observable<GroupsResponse> {
    return this.http.get<GroupsResponse>('/api/search/groups');
  }
}
