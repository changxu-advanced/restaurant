from fastapi import FastAPI
from .models import SchedulingRequest, SchedulingResult
from .solver import solve

app = FastAPI(title="Restaurant Operations Scheduling Service", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/solve", response_model=SchedulingResult)
def solve_schedule(request: SchedulingRequest):
    return solve(request)

