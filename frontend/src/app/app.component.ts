import { Component } from '@angular/core';
import { SkillSearchComponent } from './skill-search.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SkillSearchComponent],
  template: `
    <header class="site-header">
      <div class="header-left">
        <span class="logo-mark">▲</span>
        <span class="header-sep">/</span>
        <span class="logo-text">Dev Assists Tools</span>
      </div>
      <nav>
        <a href="#">Topics</a>
        <a href="#">Official</a>
        <a href="#">Audits</a>
        <a href="http://localhost:8000/docs" target="_blank">Docs</a>
      </nav>
    </header>
    <app-skill-search />
  `,
  styles: [`
    .site-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      height: 52px;
      background: var(--header-bg);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .logo-mark {
      color: #ffffff;
      font-size: 1rem;
    }
    .header-sep {
      color: rgba(255,255,255,0.4);
      font-size: 0.85rem;
    }
    .logo-text {
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    nav {
      display: flex;
      align-items: center;
      gap: 1.75rem;
    }
    nav a {
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      font-size: 0.8rem;
      letter-spacing: 0.04em;
      transition: color 0.15s;
    }
    nav a:hover { color: #ffffff; }
  `],
})
export class AppComponent {}
