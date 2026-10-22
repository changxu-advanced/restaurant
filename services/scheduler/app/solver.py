from collections import defaultdict
from ortools.sat.python import cp_model
from .models import Assignment, SchedulingRequest, SchedulingResult, ScoreBreakdown, UnmetDemand


QUALIFIED_LEVELS = {"INDEPENDENT", "TRAINER"}


def solve(request: SchedulingRequest) -> SchedulingResult:
    model = cp_model.CpModel()
    demands = {(d.slot, d.position): d.required for d in request.demand if d.required > 0}
    preference_by_worker = {
        worker.id: {slot.slot: slot.preference for slot in worker.availability}
        for worker in request.workers
    }
    worker_by_id = {worker.id: worker for worker in request.workers}
    variables: dict[tuple[str, int, str], cp_model.IntVar] = {}

    for worker in request.workers:
        availability = preference_by_worker[worker.id]
        for slot, position in demands:
            qualified = worker.skill_levels.get(position) in QUALIFIED_LEVELS
            can_work = availability.get(slot, "UNAVAILABLE") != "UNAVAILABLE"
            if qualified and can_work:
                variables[(worker.id, slot, position)] = model.new_bool_var(f"x_{worker.id}_{slot}_{position}")

    for (slot, position), required in demands.items():
        candidates = [var for (worker_id, candidate_slot, candidate_position), var in variables.items()
                      if candidate_slot == slot and candidate_position == position]
        if len(candidates) < required:
            return _infeasible(request, variables, demands, preference_by_worker)
        model.add(sum(candidates) == required)

    for worker in request.workers:
        slots = {slot for slot, _ in demands}
        for slot in slots:
            simultaneous = [var for (worker_id, candidate_slot, _), var in variables.items()
                            if worker_id == worker.id and candidate_slot == slot]
            if simultaneous:
                model.add(sum(simultaneous) <= 1)
        assigned = [var for (worker_id, _, _), var in variables.items() if worker_id == worker.id]
        if assigned:
            available_minutes = worker.maximum_minutes - worker.already_worked_minutes
            if available_minutes < 0:
                return SchedulingResult(job_id=request.job_id, status="INFEASIBLE", explanations=[f"{worker.name}: 申告済み工時が上限を超えています。"])
            model.add(sum(assigned) * request.slot_minutes <= available_minutes)

    for locked in request.locked:
        key = (locked.worker_id, locked.slot, locked.position)
        if key not in variables:
            worker = worker_by_id[locked.worker_id]
            return SchedulingResult(job_id=request.job_id, status="INFEASIBLE", explanations=[f"{worker.name}: ロック済み配置が技能または希望条件と競合しています。"])
        model.add(variables[key] == 1)

    objective_terms = []
    for (worker_id, slot, _), var in variables.items():
        preference = preference_by_worker[worker_id].get(slot)
        objective_terms.append(var * (8 if preference == "PREFERRED" else 3))

    load_vars = []
    for worker in request.workers:
        assigned = [var for (worker_id, _, _), var in variables.items() if worker_id == worker.id]
        if assigned:
            load = model.new_int_var(0, len(assigned), f"load_{worker.id}")
            model.add(load == sum(assigned))
            load_vars.append(load)
            target_slots = max(0, (worker.target_minutes - worker.already_worked_minutes) // request.slot_minutes)
            deviation = model.new_int_var(0, len(assigned) + target_slots, f"deviation_{worker.id}")
            model.add_abs_equality(deviation, load - target_slots)
            objective_terms.append(-2 * deviation)

    if len(load_vars) > 1:
        max_load = model.new_int_var(0, len(demands), "max_load")
        min_load = model.new_int_var(0, len(demands), "min_load")
        model.add_max_equality(max_load, load_vars)
        model.add_min_equality(min_load, load_vars)
        objective_terms.append(-1 * (max_load - min_load))

    model.maximize(sum(objective_terms))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 8.0
    solver.parameters.num_search_workers = 4
    status = solver.solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return _infeasible(request, variables, demands, preference_by_worker)

    assignments = [Assignment(worker_id=worker_id, slot=slot, position=position)
                   for (worker_id, slot, position), variable in variables.items() if solver.value(variable)]
    preferred_count = sum(1 for item in assignments if preference_by_worker[item.worker_id].get(item.slot) == "PREFERRED")
    score_percent = min(100, round(100 * len(assignments) / max(1, sum(demands.values()))))
    return SchedulingResult(
        job_id=request.job_id,
        status="SUCCEEDED",
        assignments=assignments,
        score_percent=score_percent,
        scores=ScoreBreakdown(preference=preferred_count, target_hours=int(solver.objective_value)),
        explanations=["ハード制約違反0件", "個人希望と目標工時を用いて配置を最適化しました。"],
    )


def _infeasible(request, variables, demands, preference_by_worker):
    unmet = []
    for (slot, position), required in demands.items():
        candidates = [worker for worker in request.workers
                      if (worker.id, slot, position) in variables]
        if len(candidates) < required:
            no_skill = sum(1 for worker in request.workers if worker.skill_levels.get(position) not in QUALIFIED_LEVELS)
            unavailable = sum(1 for worker in request.workers if preference_by_worker[worker.id].get(slot, "UNAVAILABLE") == "UNAVAILABLE")
            reason = f"有資格候補{len(candidates)}名。技能不足{no_skill}名、勤務不可{unavailable}名。"
            unmet.append(UnmetDemand(slot=slot, position=position, missing=required - len(candidates), reason=reason))
    if not unmet:
        return SchedulingResult(job_id=request.job_id, status="INFEASIBLE", explanations=["工時上限またはロック済み配置が競合しています。"])
    return SchedulingResult(job_id=request.job_id, status="INFEASIBLE", unmet_demand=unmet, explanations=["ハード制約を緩和せず、未充足として返しました。"])

