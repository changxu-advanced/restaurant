from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, model_validator

SkillLevel = Literal["UNLEARNED", "LEARNING", "ASSIST", "INDEPENDENT", "TRAINER"]
Preference = Literal["UNAVAILABLE", "AVAILABLE", "PREFERRED"]


class AvailabilitySlot(BaseModel):
    slot: int = Field(ge=0)
    preference: Preference


class Worker(BaseModel):
    id: str
    name: str
    skill_levels: dict[str, SkillLevel]
    availability: list[AvailabilitySlot]
    target_minutes: int = Field(ge=0)
    maximum_minutes: int = Field(gt=0)
    already_worked_minutes: int = Field(ge=0, default=0)
    commute_minutes: int = Field(ge=0, default=0)
    requires_trainer: bool = False


class Demand(BaseModel):
    slot: int = Field(ge=0)
    position: str
    required: int = Field(ge=0)


class LockedAssignment(BaseModel):
    worker_id: str
    slot: int = Field(ge=0)
    position: str


class SchedulingRequest(BaseModel):
    job_id: str
    period_start: date
    slot_minutes: int = Field(default=30, ge=15, le=60)
    minimum_shift_minutes: int = Field(default=180, ge=30)
    workers: list[Worker]
    demand: list[Demand]
    locked: list[LockedAssignment] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_references(self):
        worker_ids = {worker.id for worker in self.workers}
        unknown = [item.worker_id for item in self.locked if item.worker_id not in worker_ids]
        if unknown:
            raise ValueError(f"locked assignments reference unknown workers: {unknown}")
        return self


class Assignment(BaseModel):
    worker_id: str
    slot: int
    position: str


class UnmetDemand(BaseModel):
    slot: int
    position: str
    missing: int
    reason: str


class ScoreBreakdown(BaseModel):
    preference: int = 0
    target_hours: int = 0
    short_shift: int = 0
    fairness: int = 0


class SchedulingResult(BaseModel):
    job_id: str
    status: Literal["SUCCEEDED", "INFEASIBLE"]
    assignments: list[Assignment] = Field(default_factory=list)
    unmet_demand: list[UnmetDemand] = Field(default_factory=list)
    score_percent: int | None = None
    scores: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    explanations: list[str] = Field(default_factory=list)

