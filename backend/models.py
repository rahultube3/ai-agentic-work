from pydantic import BaseModel, Field


class Skill(BaseModel):
    name: str
    description: str
    tags: list[str] = Field(default_factory=list)
    path: str
    body: str = ""


class SearchHit(BaseModel):
    skill: Skill
    score: float
    matched_fields: list[str]
