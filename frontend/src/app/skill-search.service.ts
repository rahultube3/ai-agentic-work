import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SearchHit } from './skill.model';

const API_BASE = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class SkillSearchService {
  private readonly http = inject(HttpClient);

  search(query: string, limit = 10): Observable<SearchHit[]> {
    const params = new HttpParams().set('q', query).set('limit', String(limit));
    return this.http
      .get<SearchHit[]>(`${API_BASE}/search`, { params })
      .pipe(catchError(() => of([])));
  }
}
