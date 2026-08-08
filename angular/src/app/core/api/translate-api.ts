import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TranslateResponse } from '../models/api.models';

// Wraps the translation mock (routes/translation.js).
@Injectable({ providedIn: 'root' })
export class TranslateApi {
  private readonly http = inject(HttpClient);

  translate(messageId: string, srcLang?: string): Observable<TranslateResponse> {
    return this.http.post<TranslateResponse>('/api/translate', { messageId, srcLang });
  }
}
