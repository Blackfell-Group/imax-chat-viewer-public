import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SearchApi } from './search-api';
import { TranslateApi } from './translate-api';
import { EntitiesApi } from './entities-api';
import { SummarizeApi } from './summarize-api';
import { OcrApi } from './ocr-api';

// Wire-format tests: each service must emit exactly the URL, query string, and
// body the frozen mock contracts (routes/*.js headers) specify.
describe('API services', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('SearchApi.getThreads omits empty params', () => {
    TestBed.inject(SearchApi).getThreads({ lang: 'ar', q: '' }).subscribe();
    const req = httpMock.expectOne('/api/search/threads?lang=ar');
    expect(req.request.method).toBe('GET');
    req.flush({ schemaVersion: '1.0', service: 'mock-search', typeCounts: {}, threads: [] });
  });

  it('SearchApi.getThreadMessages targets the thread resource', () => {
    TestBed.inject(SearchApi).getThreadMessages('t-1001').subscribe();
    const req = httpMock.expectOne('/api/search/threads/t-1001/messages');
    expect(req.request.method).toBe('GET');
    req.flush({ schemaVersion: '1.0', service: 'mock-search', threadId: 't-1001', messages: [] });
  });

  it('SearchApi.searchMessages composes triage filters', () => {
    TestBed.inject(SearchApi)
      .searchMessages({ q: 'warehouse', mode: 'content', facet: 'has-geo', from: '2026-06-01' })
      .subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/search/messages' && r.params.get('q') === 'warehouse',
    );
    expect(req.request.params.get('mode')).toBe('content');
    expect(req.request.params.get('facet')).toBe('has-geo');
    expect(req.request.params.get('from')).toBe('2026-06-01');
    expect(req.request.params.has('group')).toBe(false);
    req.flush({});
  });

  it('SearchApi.getGroups hits the groups route', () => {
    TestBed.inject(SearchApi).getGroups().subscribe();
    httpMock.expectOne('/api/search/groups').flush({ schemaVersion: '1.0', service: 'mock-search', groups: [] });
  });

  it('TranslateApi posts messageId and srcLang', () => {
    TestBed.inject(TranslateApi).translate('m-1', 'ar').subscribe();
    const req = httpMock.expectOne('/api/translate');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ messageId: 'm-1', srcLang: 'ar' });
    req.flush({});
  });

  it('EntitiesApi posts messageId', () => {
    TestBed.inject(EntitiesApi).extract('m-3').subscribe();
    const req = httpMock.expectOne('/api/entities');
    expect(req.request.body).toEqual({ messageId: 'm-3' });
    req.flush({});
  });

  it('SummarizeApi posts threadId', () => {
    TestBed.inject(SummarizeApi).summarize('t-1001').subscribe();
    const req = httpMock.expectOne('/api/summarize');
    expect(req.request.body).toEqual({ threadId: 't-1001' });
    req.flush({});
  });

  it('OcrApi posts attachmentId', () => {
    TestBed.inject(OcrApi).recognize('a-7001').subscribe();
    const req = httpMock.expectOne('/api/ocr');
    expect(req.request.body).toEqual({ attachmentId: 'a-7001' });
    req.flush({});
  });
});
