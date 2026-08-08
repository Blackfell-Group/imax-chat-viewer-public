import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SummarizeResponse } from '../models/api.models';

// Wraps the summarization mock (routes/summarize.js).
@Injectable({ providedIn: 'root' })
export class SummarizeApi {
  private readonly http = inject(HttpClient);

  summarize(threadId: string): Observable<SummarizeResponse> {
    return this.http.post<SummarizeResponse>('/api/summarize', { threadId });
  }
}
