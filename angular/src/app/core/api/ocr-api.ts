import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OcrResponse } from '../models/api.models';

// Wraps the OCR mock (routes/ocr.js).
@Injectable({ providedIn: 'root' })
export class OcrApi {
  private readonly http = inject(HttpClient);

  recognize(attachmentId: string): Observable<OcrResponse> {
    return this.http.post<OcrResponse>('/api/ocr', { attachmentId });
  }
}
