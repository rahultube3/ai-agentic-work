export interface Skill {
  name: string;
  description: string;
  tags: string[];
  path: string;
  body: string;
}

export interface SearchHit {
  skill: Skill;
  score: number;
  matched_fields: string[];
}
