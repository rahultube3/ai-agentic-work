import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Skill } from './skill.model';
import { SkillSearchService } from './skill-search.service';

type Tab = 'all' | 'trending' | 'hot';

@Component({
  selector: 'app-skill-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Hero -->
    <section class="hero">
      <p class="ecosystem-label">THE OPEN AGENT SKILLS ECOSYSTEM</p>

      <div class="hero-cols">
        <div class="hero-left">
          <p class="try-label">INSTALLATION</p>
          <div class="cli-box">
            <span class="cli-prompt">$</span>
            <span class="cli-cmd">{{ installCmd() }}</span>
            <button type="button" class="cli-copy" title="Copy" (click)="copyCmd()">
              {{ copied() ? '✓' : '⧉' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Leaderboard -->
    <section class="leaderboard">
      <p class="lb-title">SKILLS LEADERBOARD</p>

      <div class="search-row">
        <span class="search-icon">&#128269;</span>
        <input
          type="text"
          class="search-input"
          placeholder="Search skills."
          [formControl]="query"
          autocomplete="off"
          spellcheck="false"
        />
        <span class="kbd">/</span>
      </div>

      <div class="tabs">
        <button type="button" class="tab" [class.active]="tab() === 'all'" (click)="setTab('all')">
          All Time <span class="tab-count">({{ allSkills().length }})</span>
        </button>
        <button type="button" class="tab" [class.active]="tab() === 'trending'" (click)="setTab('trending')">
          Trending (24h)
        </button>
        <button type="button" class="tab" [class.active]="tab() === 'hot'" (click)="setTab('hot')">
          Hot
        </button>
      </div>

      <table class="lb-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-skill">SKILL</th>
            <th class="col-trend">8W TREND</th>
            <th class="col-installs">INSTALLS</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr><td colspan="4" class="empty-row">Loading…</td></tr>
          } @else if (displayed().length === 0) {
            <tr><td colspan="4" class="empty-row">No skills match "{{ queryValue() }}".</td></tr>
          } @else {
            @for (skill of displayed(); track skill.name; let i = $index) {
              <tr class="lb-row" (click)="select(skill)" [class.active]="selected()?.name === skill.name">
                <td class="col-rank">{{ i + 1 }}</td>
                <td class="col-skill">
                  <span class="skill-name">{{ skill.name }}</span>
                  <span class="skill-repo">{{ repoLabel(skill) }}</span>
                </td>
                <td class="col-trend">
                  <svg class="sparkline" viewBox="0 0 64 22" preserveAspectRatio="none">
                    <polyline
                      [attr.points]="sparkPoints(skill.trend)"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                    />
                  </svg>
                </td>
                <td class="col-installs">
                  <span class="install-icon">⊙</span>
                  {{ fmtInstalls(skill.installs) }}
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </section>

    <!-- Drawer -->
    @if (selected(); as sel) {
      <div class="drawer-backdrop" (click)="selected.set(null)"></div>
      <aside class="drawer">
        <div class="drawer-header">
          <div class="drawer-title-row">
            <span class="drawer-name">{{ sel.name }}</span>
            <button type="button" class="drawer-close" (click)="selected.set(null)">&#x2715;</button>
          </div>
          <p class="drawer-repo">{{ repoLabel(sel) }}</p>
          <div class="drawer-meta">
            <span><span class="install-icon">⊙</span> {{ fmtInstalls(sel.installs) }} installs</span>
            <svg class="drawer-spark" viewBox="0 0 120 30" preserveAspectRatio="none">
              <polyline
                [attr.points]="sparkPoints(sel.trend, 120, 30)"
                fill="none"
                stroke="var(--accent-bright)"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <div class="drawer-tags">
            @for (tag of sel.tags; track tag) {
              <span class="tag">{{ tag }}</span>
            }
          </div>
        </div>
        <div class="drawer-install">
          <p class="install-label">INSTALLATION</p>
          <div class="install-box">
            <span class="cli-prompt">$</span>
            <span class="install-text">{{ installCmd() }}</span>
            <button type="button" class="cli-copy" title="Copy" (click)="copyCmd()">
              {{ copied() ? '✓' : '⧉' }}
            </button>
          </div>
        </div>
        <div class="drawer-actions">
          @if (githubUrl(sel); as urls) {
            <a class="btn-gh" [href]="urls.folder" target="_blank" rel="noopener">View on GitHub</a>
            <a class="btn-dl" [href]="urls.raw" target="_blank" rel="noopener" download>Download SKILL.md</a>
          } @else {
            <span class="local-path">{{ sel.path }}</span>
          }
        </div>
        <div class="drawer-desc">{{ sel.description }}</div>
        <pre class="drawer-body">{{ sel.body }}</pre>
      </aside>
    }
  `,
  styles: [`
    /* ── Hero ───────────────────────────────── */
    .hero {
      max-width: 900px;
      margin: 0 auto;
      padding: 3.5rem 2rem 2.5rem;
      border-bottom: 1px solid var(--border);
    }
    .ecosystem-label {
      font-family: ui-monospace, Menlo, monospace;
      font-size: 1.1rem;
      letter-spacing: 0.08em;
      color: var(--text);
      margin: 0 0 2.5rem;
    }
    .hero-cols {
      display: flex;
      gap: 4rem;
      flex-wrap: wrap;
    }
    .try-label, .agents-label {
      font-family: ui-monospace, Menlo, monospace;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      margin: 0 0 0.75rem;
    }
    .cli-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--surface);
      border: 1px solid var(--border2);
      border-radius: 4px;
      padding: 0.6rem 1rem;
      font-family: ui-monospace, Menlo, monospace;
      font-size: 0.9rem;
      min-width: 280px;
    }
    .cli-prompt { color: var(--text-muted); }
    .cli-cmd { color: var(--text); }
    .cli-arg { color: var(--text-muted); }
    .cli-copy {
      margin-left: auto;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1rem;
      padding: 0;
      transition: color 0.15s;
    }
    .cli-copy:hover { color: var(--text); }

    /* ── Leaderboard ─────────────────────────── */
    .leaderboard {
      max-width: 900px;
      margin: 0 auto;
      padding: 2.5rem 2rem 4rem;
    }
    .lb-title {
      font-family: ui-monospace, Menlo, monospace;
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      color: var(--text-muted);
      margin: 0 0 1.5rem;
    }
    .search-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.85rem;
      margin-bottom: 1.25rem;
    }
    .search-icon { color: var(--text-dim); font-size: 1rem; }
    .search-input {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      color: var(--text);
      font-size: 0.95rem;
      font-family: inherit;
    }
    .search-input::placeholder { color: var(--text-dim); }
    .kbd {
      font-family: ui-monospace, monospace;
      font-size: 0.7rem;
      color: var(--text-muted);
      border: 1px solid var(--border2);
      border-radius: 3px;
      padding: 0.1rem 0.4rem;
    }
    .tabs {
      display: flex;
      gap: 0;
      margin-bottom: 0;
      border-bottom: 1px solid var(--border);
    }
    .tab {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      color: var(--text-muted);
      font-size: 0.82rem;
      padding: 0.5rem 0;
      margin-right: 1.5rem;
      cursor: pointer;
      transition: color 0.15s;
    }
    .tab:hover { color: var(--text); }
    .tab.active {
      color: var(--text);
      border-bottom-color: var(--text);
    }
    .tab-count { color: var(--text-dim); }

    /* ── Table ───────────────────────────────── */
    .lb-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
    }
    .lb-table thead th {
      font-family: ui-monospace, Menlo, monospace;
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      color: var(--text-dim);
      font-weight: 400;
      text-align: left;
      padding: 0.85rem 0.5rem 0.6rem;
      border-bottom: 1px solid var(--border);
    }
    .col-rank { width: 36px; padding-left: 0 !important; }
    .col-skill { width: auto; }
    .col-trend { width: 100px; text-align: right; }
    .col-installs { width: 110px; text-align: right; padding-right: 0 !important; }
    .lb-row {
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background 0.1s;
    }
    .lb-row:hover { background: var(--surface); }
    .lb-row.active { background: var(--surface2); }
    .lb-row td {
      padding: 0.9rem 0.5rem;
      font-size: 0.88rem;
    }
    .lb-row td.col-rank {
      color: var(--text-dim);
      font-family: ui-monospace, monospace;
      padding-left: 0;
    }
    .skill-name {
      font-weight: 600;
      color: var(--text);
      margin-right: 0.5rem;
    }
    .skill-repo {
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .col-trend { color: var(--text-muted); }
    .sparkline {
      width: 64px;
      height: 22px;
      display: block;
      margin-left: auto;
    }
    .col-installs {
      font-family: ui-monospace, Menlo, monospace;
      font-size: 0.82rem;
      color: var(--text-muted);
      text-align: right;
    }
    .install-icon { color: var(--text-dim); }
    .empty-row {
      padding: 2rem 0;
      color: var(--text-muted);
      font-size: 0.88rem;
    }

    /* ── Drawer ──────────────────────────────── */
    .drawer-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 100;
    }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: min(520px, 92vw);
      background: var(--surface);
      border-left: 1px solid var(--border2);
      z-index: 101;
      display: flex; flex-direction: column;
      overflow: hidden;
      animation: slide-in 0.18s ease;
    }
    @keyframes slide-in {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }
    .drawer-header {
      padding: 1.5rem 1.5rem 1rem;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .drawer-title-row {
      display: flex; align-items: flex-start;
      justify-content: space-between; gap: 1rem;
      margin-bottom: 0.25rem;
    }
    .drawer-name {
      font-size: 1.2rem; font-weight: 700; color: var(--text);
    }
    .drawer-close {
      background: none; border: none;
      color: var(--text-muted); font-size: 1rem;
      cursor: pointer; padding: 0; flex-shrink: 0;
      margin-top: 0.15rem;
    }
    .drawer-close:hover { color: var(--text); }
    .drawer-repo {
      font-size: 0.75rem; color: var(--text-muted);
      margin: 0 0 0.75rem;
    }
    .drawer-meta {
      display: flex; align-items: center;
      gap: 1.5rem; margin-bottom: 0.75rem;
      font-size: 0.8rem; color: var(--text-muted);
      font-family: ui-monospace, monospace;
    }
    .drawer-spark {
      width: 120px; height: 30px; display: block;
    }
    .drawer-tags {
      display: flex; flex-wrap: wrap; gap: 0.35rem;
    }
    .tag {
      font-size: 0.7rem; padding: 0.15rem 0.55rem;
      border-radius: 999px;
      background: var(--tag-bg); color: var(--tag-color);
      font-weight: 500;
    }
    .drawer-install {
      padding: 1rem 1.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .install-label {
      font-family: ui-monospace, Menlo, monospace;
      font-size: 0.68rem; letter-spacing: 0.1em;
      color: var(--text-muted); margin: 0 0 0.5rem;
    }
    .install-box {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: var(--surface);
      border: 1px solid var(--border2);
      border-radius: 4px;
      padding: 0.55rem 0.85rem;
      font-family: ui-monospace, Menlo, monospace;
      font-size: 0.78rem;
    }
    .install-text {
      flex: 1; color: var(--text);
      word-break: break-all; line-height: 1.5;
    }
    .drawer-actions {
      padding: 0.75rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;
      flex-shrink: 0;
    }
    .btn-gh {
      padding: 0.45rem 1rem;
      background: var(--btn-bg); color: #fff;
      border-radius: 4px; font-size: 0.8rem; font-weight: 600;
      text-decoration: none; transition: background 0.15s;
    }
    .btn-gh:hover { background: var(--btn-hover); }
    .btn-dl {
      padding: 0.45rem 1rem;
      background: transparent; color: var(--accent-bright);
      border: 1px solid var(--border2);
      border-radius: 4px; font-size: 0.8rem; font-weight: 500;
      text-decoration: none; transition: border-color 0.15s;
    }
    .btn-dl:hover { border-color: var(--accent-bright); }
    .local-path {
      font-family: ui-monospace, monospace;
      font-size: 0.72rem; color: var(--text-muted);
      word-break: break-all;
    }
    .drawer-desc {
      padding: 1rem 1.5rem;
      font-size: 0.88rem; color: var(--text-muted);
      line-height: 1.6;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .drawer-body {
      flex: 1; overflow-y: auto;
      padding: 1.25rem 1.5rem;
      white-space: pre-wrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.82rem; color: var(--text); margin: 0;
      line-height: 1.65;
    }
  `],
})
export class SkillSearchComponent implements OnInit, OnDestroy {
  private readonly service = inject(SkillSearchService);
  private readonly destroy$ = new Subject<void>();

  readonly query = new FormControl('', { nonNullable: true });
  readonly queryValue = signal('');
  readonly tab = signal<Tab>('all');
  readonly allSkills = signal<Skill[]>([]);
  readonly filteredSkills = signal<Skill[]>([]);
  readonly loading = signal(true);
  readonly selected = signal<Skill | null>(null);
  readonly copied = signal(false);

  readonly installCmd = computed<string>(() => {
    const sel = this.selected();
    const skill = sel ?? this.allSkills()[0] ?? null;
    if (!skill) return 'curl -O <raw_url>';
    const m = skill.path.match(/^github:\/\/([^/]+)\/([^@]+)@([^/]+)\/(.+)$/);
    if (!m) return `# ${skill.path}`;
    const [, owner, repo, branch, filePath] = m;
    return `curl -O https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  });

  readonly displayed = computed<Skill[]>(() => {
    const base = this.queryValue().trim() ? this.filteredSkills() : this.allSkills();
    const t = this.tab();
    if (t === 'trending') {
      return [...base].sort((a, b) => this._lastTrend(b) - this._lastTrend(a));
    }
    if (t === 'hot') {
      return [...base].sort((a, b) => this._trendDelta(b) - this._trendDelta(a));
    }
    return [...base].sort((a, b) => b.installs - a.installs);
  });

  ngOnInit(): void {
    this.service.all().subscribe((skills) => {
      this.allSkills.set(skills);
      this.loading.set(false);
    });

    this.query.valueChanges
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        tap((q) => {
          this.queryValue.set(q);
          this.loading.set(true);
        }),
        switchMap((q) => {
          if (q.trim().length === 0) {
            this.filteredSkills.set([]);
            return of(null);
          }
          return this.service.search(q).pipe(
            tap((hits) => this.filteredSkills.set(hits.map((h) => h.skill))),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.loading.set(false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  select(skill: Skill): void {
    this.selected.set(this.selected()?.name === skill.name ? null : skill);
  }

  githubUrl(skill: Skill): { folder: string; raw: string } | null {
    const p = skill.path;
    const m = p.match(/^github:\/\/([^/]+)\/([^@]+)@([^/]+)\/(.+)$/);
    if (!m) return null;
    const [, owner, repo, branch, filePath] = m;
    const dir = filePath.replace(/\/[^/]+$/, '');
    return {
      folder: `https://github.com/${owner}/${repo}/tree/${branch}/${dir}`,
      raw: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`,
    };
  }

  repoLabel(skill: Skill): string {
    const p = skill.path;
    if (p.startsWith('github://')) {
      const m = p.match(/^github:\/\/([^@]+)/);
      return m ? m[1] : p;
    }
    const parts = p.replace(/\\/g, '/').split('/');
    const idx = parts.indexOf('skills');
    return idx >= 0 ? parts.slice(idx - 1).join('/') : parts.slice(-3).join('/');
  }

  sparkPoints(trend: number[], w = 64, h = 22): string {
    if (!trend?.length) return '';
    const min = Math.min(...trend);
    const max = Math.max(...trend);
    const range = max - min || 1;
    const pad = 2;
    return trend
      .map((v, i) => {
        const x = (i / (trend.length - 1)) * w;
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  fmtInstalls(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  copyCmd(): void {
    navigator.clipboard.writeText(this.installCmd()).catch(() => {});
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  private _lastTrend(s: Skill): number {
    return s.trend.at(-1) ?? 0;
  }

  private _trendDelta(s: Skill): number {
    if (!s.trend.length) return 0;
    return (s.trend.at(-1) ?? 0) - (s.trend[0] ?? 0);
  }
}
