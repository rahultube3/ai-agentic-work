import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { SearchHit } from './skill.model';
import { SkillSearchService } from './skill-search.service';

@Component({
  selector: 'app-skill-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="search-shell">
      <h1>Skills Search</h1>
      <input
        type="text"
        class="search-input"
        placeholder="Type to search skills... (e.g. pdf, sql, mcp)"
        [formControl]="query"
        autocomplete="off"
        spellcheck="false"
      />

      @if (loading()) {
        <p class="hint">Searching…</p>
      } @else if (query.value && hits().length === 0) {
        <p class="hint">No skills match "{{ query.value }}".</p>
      }

      <ul class="results">
        @for (hit of hits(); track hit.skill.name) {
          <li class="result" (click)="select(hit)" [class.selected]="selected()?.skill?.name === hit.skill.name">
            <div class="result-header">
              <span class="name">{{ hit.skill.name }}</span>
              <span class="score">score {{ hit.score | number: '1.0-1' }}</span>
            </div>
            <p class="description">{{ hit.skill.description }}</p>
            <div class="tags">
              @for (tag of hit.skill.tags; track tag) {
                <span class="tag">{{ tag }}</span>
              }
            </div>
          </li>
        }
      </ul>

      @if (selected(); as sel) {
        <section class="detail">
          <h2>{{ sel.skill.name }}</h2>
          <p class="muted">{{ sel.skill.path }}</p>
          <pre>{{ sel.skill.body }}</pre>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .search-shell {
        max-width: 720px;
        margin: 0 auto;
        padding: 2.5rem 1.5rem;
      }
      h1 {
        margin: 0 0 1.25rem 0;
        font-weight: 600;
        font-size: 1.5rem;
      }
      .search-input {
        width: 100%;
        padding: 0.85rem 1rem;
        font-size: 1rem;
        color: var(--text);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        outline: none;
        transition: border-color 0.15s;
      }
      .search-input:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .hint {
        color: var(--text-muted);
        margin: 1rem 0 0;
      }
      .results {
        list-style: none;
        padding: 0;
        margin: 1rem 0 0;
      }
      .result {
        padding: 0.85rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface);
        margin-bottom: 0.5rem;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
      }
      .result:hover {
        background: var(--surface-hover);
      }
      .result.selected {
        border-color: var(--accent);
      }
      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.5rem;
      }
      .name {
        font-weight: 600;
      }
      .score {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
      .description {
        margin: 0.35rem 0 0.5rem;
        font-size: 0.9rem;
        color: var(--text-muted);
      }
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .tag {
        font-size: 0.7rem;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
      }
      .detail {
        margin-top: 2rem;
        padding: 1.25rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
      }
      .detail h2 {
        margin: 0 0 0.25rem;
      }
      .muted {
        color: var(--text-muted);
        font-size: 0.8rem;
        margin: 0 0 1rem;
      }
      pre {
        white-space: pre-wrap;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.85rem;
        color: var(--text);
      }
    `,
  ],
})
export class SkillSearchComponent {
  private readonly service = inject(SkillSearchService);
  private readonly destroy$ = new Subject<void>();

  readonly query = new FormControl('', { nonNullable: true });
  readonly hits = signal<SearchHit[]>([]);
  readonly loading = signal(false);
  readonly selected = signal<SearchHit | null>(null);

  constructor() {
    this.query.valueChanges
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        tap(() => this.loading.set(true)),
        switchMap((q) => (q.trim().length === 0 ? of<SearchHit[]>([]) : this.service.search(q))),
        takeUntil(this.destroy$),
      )
      .subscribe((results) => {
        this.hits.set(results);
        this.loading.set(false);
        if (!results.find((r) => r.skill.name === this.selected()?.skill.name)) {
          this.selected.set(null);
        }
      });
  }

  select(hit: SearchHit): void {
    this.selected.set(hit);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
