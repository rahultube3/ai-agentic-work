import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SearchHit, Skill } from './skill.model';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000/api`;

@Injectable({ providedIn: 'root' })
export class SkillSearchService {
  private readonly http = inject(HttpClient);

  all(): Observable<Skill[]> {
    return this.http
      .get<Skill[]>(`${API_BASE}/skills`)
      .pipe(catchError(() => of([])));
  }

  search(query: string, limit = 50): Observable<SearchHit[]> {
    const params = new HttpParams().set('q', query).set('limit', String(limit));
    return this.http
      .get<SearchHit[]>(`${API_BASE}/search`, { params })
      .pipe(catchError((err) => { console.error('search failed', err); return of([]); }));
  }
}
