import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EntitiesResponse } from '../models/api.models';

// Wraps the entity-extraction mock (routes/entities.js).
@Injectable({ providedIn: 'root' })
export class EntitiesApi {
  private readonly http = inject(HttpClient);

  extract(messageId: string): Observable<EntitiesResponse> {
    return this.http.post<EntitiesResponse>('/api/entities', { messageId });
  }
}
