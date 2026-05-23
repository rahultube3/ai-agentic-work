import { Component } from '@angular/core';
import { SkillSearchComponent } from './skill-search.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SkillSearchComponent],
  template: `<app-skill-search />`,
})
export class AppComponent {}
