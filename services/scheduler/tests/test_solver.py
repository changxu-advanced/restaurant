from datetime import date
from app.models import SchedulingRequest
from app.solver import solve


def test_assigns_qualified_worker_without_violating_limit():
    request = SchedulingRequest.model_validate({
        "job_id": "job-1", "period_start": str(date.today()), "slot_minutes": 30,
        "workers": [
            {"id": "cook", "name": "田中", "skill_levels": {"WOK": "INDEPENDENT"},
             "availability": [{"slot": 1, "preference": "PREFERRED"}], "target_minutes": 480, "maximum_minutes": 2400},
            {"id": "new", "name": "新人", "skill_levels": {"WOK": "LEARNING"},
             "availability": [{"slot": 1, "preference": "AVAILABLE"}], "target_minutes": 480, "maximum_minutes": 1680}
        ],
        "demand": [{"slot": 1, "position": "WOK", "required": 1}]
    })
    result = solve(request)
    assert result.status == "SUCCEEDED"
    assert result.assignments[0].worker_id == "cook"


def test_explains_missing_critical_position():
    request = SchedulingRequest.model_validate({
        "job_id": "job-2", "period_start": str(date.today()),
        "workers": [{"id": "floor", "name": "佐藤", "skill_levels": {"FLOOR": "INDEPENDENT"},
                     "availability": [{"slot": 3, "preference": "AVAILABLE"}], "target_minutes": 480, "maximum_minutes": 2400}],
        "demand": [{"slot": 3, "position": "WOK", "required": 1}]
    })
    result = solve(request)
    assert result.status == "INFEASIBLE"
    assert result.unmet_demand[0].position == "WOK"
    assert "技能不足" in result.unmet_demand[0].reason

