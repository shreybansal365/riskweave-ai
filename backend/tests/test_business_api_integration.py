from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import delete, func, select

from app.core.config import Settings
from app.core.security import PasswordService
from app.db.session import SessionFactory
from app.models.domain import (
    AnalystAction,
    AuditEvent,
    Incident,
    RiskContribution,
    Transaction,
)
from app.models.enums import (
    AnalystActionType,
    AuditEventType,
    ContributionCategory,
    TransactionStatus,
)
from app.services.demo_data import DemoDataService, dataset_fingerprint
from app.services.seeding import seed_demo_users


def _secret(value: SecretStr | None) -> str:
    assert value is not None
    return value.get_secret_value()


def _prepare(
    session_factory: SessionFactory,
    settings: Settings,
    password_service: PasswordService,
) -> str:
    snapshot = DemoDataService(session_factory).reset(request_id=f"api-reset-{uuid4()}")
    with session_factory.begin() as session:
        seed_demo_users(session, settings=settings, password_service=password_service)
    return snapshot.fingerprint


def _login(client: TestClient, settings: Settings, role: str) -> dict[str, str]:
    if role == "admin":
        email = settings.demo_admin_email
        password = _secret(settings.demo_admin_password)
    else:
        email = settings.demo_analyst_email
        password = _secret(settings.demo_analyst_password)
    response = client.post(
        "/api/auth/login",
        headers={"X-Request-ID": f"api-login-{role}-{uuid4()}"},
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _first_incident_id(session_factory: SessionFactory) -> UUID:
    with session_factory() as session:
        incident_id = session.scalar(
            select(Incident.incident_id).order_by(Incident.created_at, Incident.incident_id)
        )
    assert incident_id is not None
    return incident_id


@pytest.mark.integration
def test_incident_list_pagination_sort_filters_search_and_validation(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _prepare(postgres_session_factory, postgres_settings, password_service)
    headers = _login(postgres_client, postgres_settings, "analyst")

    response = postgres_client.get(
        "/api/incidents?page=1&page_size=5&sort_by=fused_score&sort_direction=desc",
        headers=headers,
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["pagination"] == {
        "page": 1,
        "page_size": 5,
        "total_items": 15,
        "total_pages": 3,
    }
    scores = [item["fused_score"] for item in payload["items"]]
    assert scores == sorted(scores, reverse=True)
    assert all(item["customer_reference"].startswith("CUS-••••-") for item in payload["items"])

    critical = postgres_client.get("/api/incidents?severity=critical", headers=headers)
    assert critical.status_code == 200
    assert critical.json()["pagination"]["total_items"] == 3
    assert all(item["severity"] == "critical" for item in critical.json()["items"])
    open_cases = postgres_client.get("/api/incidents?status=open", headers=headers)
    assert open_cases.status_code == 200
    assert open_cases.json()["pagination"]["total_items"] == 15
    no_scenario = postgres_client.get("/api/incidents?scenario=account_takeover", headers=headers)
    assert no_scenario.status_code == 200
    assert no_scenario.json()["pagination"]["total_items"] == 0
    permitted = postgres_client.get(
        "/api/incidents?transaction_status=permitted",
        headers=headers,
    )
    assert permitted.status_code == 200
    assert permitted.json()["pagination"]["total_items"] > 0
    assert all(item["transaction_status"] == "permitted" for item in permitted.json()["items"])
    held = postgres_client.get("/api/incidents?transaction_status=held", headers=headers)
    assert held.status_code == 200
    assert held.json()["pagination"]["total_items"] > 0
    assert all(item["transaction_status"] == "held" for item in held.json()["items"])

    first = payload["items"][0]
    searched = postgres_client.get(
        f"/api/incidents?search={first['incident_id']}",
        headers=headers,
    )
    assert searched.status_code == 200
    assert searched.json()["pagination"]["total_items"] == 1
    by_name = postgres_client.get(
        f"/api/incidents?search={first['customer_display_name'].split()[0]}",
        headers=headers,
    )
    assert by_name.status_code == 200
    assert by_name.json()["pagination"]["total_items"] >= 1
    created_at = first["created_at"]
    by_date = postgres_client.get(
        "/api/incidents",
        params={"date_from": created_at, "date_to": created_at},
        headers=headers,
    )
    assert by_date.status_code == 200
    assert by_date.json()["pagination"]["total_items"] >= 1

    invalid_range = postgres_client.get(
        "/api/incidents?date_from=2026-07-10T00:00:00Z&date_to=2026-07-01T00:00:00Z",
        headers=headers,
    )
    assert invalid_range.status_code == 422
    assert (
        postgres_client.get(
            "/api/incidents?date_from=2026-07-10T00:00:00", headers=headers
        ).status_code
        == 422
    )
    assert (
        postgres_client.get(
            "/api/incidents?date_to=2026-07-10T00:00:00", headers=headers
        ).status_code
        == 422
    )
    assert postgres_client.get("/api/incidents?page_size=101", headers=headers).status_code == 422
    assert (
        postgres_client.get(
            "/api/incidents?transaction_status=not-a-status",
            headers=headers,
        ).status_code
        == 422
    )


@pytest.mark.integration
def test_incident_detail_is_chronological_grounded_and_consistent(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _prepare(postgres_session_factory, postgres_settings, password_service)
    headers = _login(postgres_client, postgres_settings, "analyst")
    incident_id = _first_incident_id(postgres_session_factory)

    response = postgres_client.get(f"/api/incidents/{incident_id}", headers=headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["incident_id"] == str(incident_id)
    assert payload["raw_fused_score"] == "9.00"
    assert payload["fused_score"] == 9
    assert payload["fusion_projection"] == {
        "cyber": {"score": 10, "weight": "0.45", "weighted_term": "4.50"},
        "transaction": {"score": 10, "weight": "0.45", "weighted_term": "4.50"},
        "correlation_bonus": 0,
        "raw_fused_score": "9.00",
        "rounded_fused_score": 9,
        "rounding_mode": "ROUND_HALF_UP",
        "interaction_source_pairs": [],
    }
    assert payload["customer"]["customer_reference"].startswith("CUS-••••-")
    assert "xxx.xxx" in payload["session"]["masked_ip_address"]
    assert payload["crypto_readiness"]["fraud_risk_separation_notice"]
    assert payload["decision_explanation"]
    assert payload["action_explanation"]
    contribution_points = sum(
        item["points"]
        for group in (
            payload["cyber_contributions"],
            payload["transaction_contributions"],
            payload["interaction_contributions"],
        )
        for item in group
    )
    assert contribution_points >= 0
    timestamps = [datetime.fromisoformat(item["occurred_at"]) for item in payload["timeline"]]
    assert timestamps == sorted(timestamps)

    missing = postgres_client.get(f"/api/incidents/{uuid4()}", headers=headers)
    assert missing.status_code == 404
    assert missing.json() == {"detail": "Incident not found"}


@pytest.mark.integration
def test_incident_detail_fails_safely_for_malformed_persisted_interaction_provenance(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _prepare(postgres_session_factory, postgres_settings, password_service)
    headers = _login(postgres_client, postgres_settings, "analyst")
    with postgres_session_factory.begin() as session:
        interaction = session.scalar(
            select(RiskContribution)
            .join(Incident, Incident.incident_id == RiskContribution.incident_id)
            .where(
                RiskContribution.category == ContributionCategory.CORRELATION,
                Incident.correlation_bonus > 0,
            )
            .order_by(RiskContribution.display_order, RiskContribution.contribution_id)
        )
        assert interaction is not None
        incident_id = interaction.incident_id
        interaction.source_event_id = None

    response = postgres_client.get(f"/api/incidents/{incident_id}", headers=headers)

    assert response.status_code == 500
    assert response.json() == {"detail": "Incident provenance is unavailable"}


@pytest.mark.integration
def test_incident_status_workflow_is_idempotent_concurrency_safe_and_audited(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _prepare(postgres_session_factory, postgres_settings, password_service)
    headers = _login(postgres_client, postgres_settings, "analyst")
    incident_id = _first_incident_id(postgres_session_factory)
    detail = postgres_client.get(f"/api/incidents/{incident_id}", headers=headers).json()
    mutation_headers = {
        **headers,
        "Idempotency-Key": "review-first-incident",
        "X-Request-ID": "workflow-review-request",
    }
    payload = {
        "status": "in_review",
        "note": "Reviewing the deterministic evidence.",
        "expected_updated_at": detail["updated_at"],
    }
    first = postgres_client.patch(
        f"/api/incidents/{incident_id}", headers=mutation_headers, json=payload
    )
    assert first.status_code == 200, first.text
    assert first.json()["status"] == "in_review"
    assert first.json()["idempotent_replay"] is False

    replay = postgres_client.patch(
        f"/api/incidents/{incident_id}", headers=mutation_headers, json=payload
    )
    assert replay.status_code == 200
    assert (
        replay.json()["recorded_action"]["analyst_action_id"]
        == first.json()["recorded_action"]["analyst_action_id"]
    )
    assert replay.json()["idempotent_replay"] is True

    key_reuse = postgres_client.patch(
        f"/api/incidents/{incident_id}",
        headers=mutation_headers,
        json={"status": "confirmed_fraud", "note": "Different action."},
    )
    assert key_reuse.status_code == 409
    stale = postgres_client.patch(
        f"/api/incidents/{incident_id}",
        headers={**headers, "Idempotency-Key": "stale-update"},
        json={"status": "confirmed_fraud", "expected_updated_at": detail["updated_at"]},
    )
    assert stale.status_code == 409

    confirmed = postgres_client.patch(
        f"/api/incidents/{incident_id}",
        headers={**headers, "Idempotency-Key": "confirm-fraud"},
        json={"status": "confirmed_fraud"},
    )
    assert confirmed.status_code == 200
    closed = postgres_client.patch(
        f"/api/incidents/{incident_id}",
        headers={**headers, "Idempotency-Key": "close-case"},
        json={"status": "closed"},
    )
    assert closed.status_code == 200

    with postgres_session_factory() as session:
        actions = session.scalars(
            select(AnalystAction).where(AnalystAction.incident_id == incident_id)
        ).all()
        assert [item.action_type for item in actions] == [
            AnalystActionType.START_REVIEW,
            AnalystActionType.MARK_CONFIRMED_FRAUD,
            AnalystActionType.CLOSE_INCIDENT,
        ]
        audit = session.scalar(
            select(AuditEvent).where(AuditEvent.request_id == "workflow-review-request")
        )
        assert audit is not None
        assert audit.event_type == AuditEventType.ANALYST_ACTION_RECORDED


@pytest.mark.integration
def test_analyst_actions_validate_notes_and_simulated_transaction_responses(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _prepare(postgres_session_factory, postgres_settings, password_service)
    headers = _login(postgres_client, postgres_settings, "analyst")
    with postgres_session_factory() as session:
        incident_id = session.scalar(
            select(Incident.incident_id)
            .join(Transaction, Transaction.transaction_id == Incident.transaction_id)
            .where(Transaction.status == TransactionStatus.PERMITTED)
            .order_by(Incident.created_at)
        )
    assert incident_id is not None

    missing_note = postgres_client.post(
        f"/api/incidents/{incident_id}/actions",
        headers={**headers, "Idempotency-Key": "missing-note"},
        json={"action_type": "add_note"},
    )
    assert missing_note.status_code == 422
    note = postgres_client.post(
        f"/api/incidents/{incident_id}/actions",
        headers={**headers, "Idempotency-Key": "note-1"},
        json={"action_type": "add_note", "note": "Customer verification queued."},
    )
    assert note.status_code == 200
    assert note.json()["transaction_status"] == "permitted"

    hold = postgres_client.post(
        f"/api/incidents/{incident_id}/actions",
        headers={**headers, "Idempotency-Key": "hold-1"},
        json={"action_type": "simulate_hold"},
    )
    assert hold.status_code == 200
    assert hold.json()["transaction_status"] == "held"
    release = postgres_client.post(
        f"/api/incidents/{incident_id}/actions",
        headers={**headers, "Idempotency-Key": "release-1"},
        json={"action_type": "simulate_release"},
    )
    assert release.status_code == 200
    assert release.json()["transaction_status"] == "released"
    invalid_release = postgres_client.post(
        f"/api/incidents/{incident_id}/actions",
        headers={**headers, "Idempotency-Key": "release-again"},
        json={"action_type": "simulate_release"},
    )
    assert invalid_release.status_code == 409
    detail = postgres_client.get(f"/api/incidents/{incident_id}", headers=headers)
    assert detail.status_code == 200
    assert any(item["code"] == "transaction_status_changed" for item in detail.json()["timeline"])


@pytest.mark.integration
def test_remaining_workflow_transitions_and_missing_targets_are_rejected_safely(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _prepare(postgres_session_factory, postgres_settings, password_service)
    analyst_headers = _login(postgres_client, postgres_settings, "analyst")
    admin_headers = _login(postgres_client, postgres_settings, "admin")
    with postgres_session_factory() as session:
        permitted_ids = list(
            session.scalars(
                select(Incident.incident_id)
                .join(Transaction, Transaction.transaction_id == Incident.transaction_id)
                .where(Transaction.status == TransactionStatus.PERMITTED)
                .order_by(Incident.created_at)
                .limit(2)
            )
        )
        held_id = session.scalar(
            select(Incident.incident_id)
            .join(Transaction, Transaction.transaction_id == Incident.transaction_id)
            .where(Transaction.status == TransactionStatus.HELD)
            .order_by(Incident.created_at)
        )
    assert len(permitted_ids) == 2
    assert held_id is not None

    legitimate = postgres_client.patch(
        f"/api/incidents/{permitted_ids[0]}",
        headers={**admin_headers, "Idempotency-Key": "admin-mark-legitimate"},
        json={"status": "legitimate"},
    )
    assert legitimate.status_code == 200
    assert legitimate.json()["status"] == "legitimate"
    invalid_review = postgres_client.patch(
        f"/api/incidents/{permitted_ids[0]}",
        headers={**analyst_headers, "Idempotency-Key": "review-after-legitimate"},
        json={"status": "in_review"},
    )
    assert invalid_review.status_code == 409

    decline = postgres_client.post(
        f"/api/incidents/{held_id}/actions",
        headers={**analyst_headers, "Idempotency-Key": "decline-held"},
        json={"action_type": "simulate_decline"},
    )
    assert decline.status_code == 200
    assert decline.json()["transaction_status"] == "declined"

    missing_id = uuid4()
    missing_patch = postgres_client.patch(
        f"/api/incidents/{missing_id}",
        headers={**analyst_headers, "Idempotency-Key": "missing-patch"},
        json={"status": "in_review"},
    )
    assert missing_patch.status_code == 404
    missing_action = postgres_client.post(
        f"/api/incidents/{missing_id}/actions",
        headers={**analyst_headers, "Idempotency-Key": "missing-action"},
        json={"action_type": "add_note", "note": "No target."},
    )
    assert missing_action.status_code == 404
    assert (
        postgres_client.patch(
            f"/api/incidents/{permitted_ids[1]}",
            headers={**analyst_headers, "Idempotency-Key": "reopen-invalid"},
            json={"status": "open"},
        ).status_code
        == 422
    )


@pytest.mark.integration
def test_dashboard_summary_and_trends_match_persisted_source_records(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _prepare(postgres_session_factory, postgres_settings, password_service)
    headers = _login(postgres_client, postgres_settings, "analyst")
    summary = postgres_client.get("/api/dashboard/summary", headers=headers)
    assert summary.status_code == 200, summary.text
    payload = summary.json()
    assert payload["visible_incidents"] == 15
    assert sum(payload["incidents_by_severity"].values()) == 15
    assert payload["open_incidents"] == 15
    assert len(payload["source_systems"]) == 4
    assert all(item["record_count"] > 0 for item in payload["source_systems"])

    trends = postgres_client.get("/api/dashboard/trends", headers=headers)
    assert trends.status_code == 200, trends.text
    points = trends.json()["points"]
    assert len(points) == 14
    assert sum(item["incident_volume"] for item in points) == 15
    assert all(
        sum(item["severity_distribution"].values()) == item["incident_volume"] for item in points
    )
    with postgres_session_factory() as session:
        held_count = int(
            session.scalar(
                select(func.count(Transaction.transaction_id)).where(
                    Transaction.status == TransactionStatus.HELD
                )
            )
            or 0
        )
    assert payload["transactions_held"] == held_count


@pytest.mark.integration
def test_customer_and_account_context_is_bounded_masked_and_linked(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _prepare(postgres_session_factory, postgres_settings, password_service)
    headers = _login(postgres_client, postgres_settings, "analyst")
    with postgres_session_factory() as session:
        incident = session.scalar(select(Incident).order_by(Incident.created_at))
        assert incident is not None
        customer_id = incident.customer_id
        account_id = incident.account_id

    customer = postgres_client.get(f"/api/customers/{customer_id}", headers=headers)
    assert customer.status_code == 200, customer.text
    customer_payload = customer.json()
    assert customer_payload["customer_reference"].startswith("CUS-••••-")
    assert customer_payload["behavioural_baseline"]["normal_transaction_median_minor"] > 0
    assert len(customer_payload["recent_sessions"]) <= 10
    assert all(
        "xxx.xxx" in item["masked_ip_address"] for item in customer_payload["recent_sessions"]
    )
    assert all("•" in item["bank_code_masked"] for item in customer_payload["recent_beneficiaries"])

    account = postgres_client.get(f"/api/accounts/{account_id}", headers=headers)
    assert account.status_code == 200, account.text
    account_payload = account.json()
    assert account_payload["account_reference"].startswith("ACC-••••-")
    assert account_payload["customer_id"] == str(customer_id)
    assert all(
        item["account_id"] == str(account_id) for item in account_payload["recent_transactions"]
    )

    assert postgres_client.get(f"/api/customers/{uuid4()}", headers=headers).status_code == 404
    assert postgres_client.get(f"/api/accounts/{uuid4()}", headers=headers).status_code == 404


@pytest.mark.integration
def test_scenario_api_is_admin_only_idempotent_and_exactly_resettable(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    baseline_fingerprint = _prepare(postgres_session_factory, postgres_settings, password_service)
    analyst_headers = _login(postgres_client, postgres_settings, "analyst")
    admin_headers = _login(postgres_client, postgres_settings, "admin")
    catalog = postgres_client.get("/api/scenarios", headers=analyst_headers)
    assert catalog.status_code == 200
    assert len(catalog.json()["items"]) == 3
    assert all(item["status"] == "not_run" for item in catalog.json()["items"])

    denied_run = postgres_client.post(
        "/api/scenarios/account_takeover/run",
        headers={**analyst_headers, "X-Request-ID": "analyst-scenario-denied"},
    )
    assert denied_run.status_code == 403
    assert postgres_client.post("/api/scenarios/reset", headers=analyst_headers).status_code == 403

    first = postgres_client.post(
        "/api/scenarios/account_takeover/run",
        headers={**admin_headers, "X-Request-ID": "admin-scenario-first"},
    )
    assert first.status_code == 200, first.text
    assert first.json()["fused_score"] == 89
    assert first.json()["idempotent"] is False
    second = postgres_client.post(
        "/api/scenarios/account_takeover/run",
        headers={**admin_headers, "X-Request-ID": "admin-scenario-replay"},
    )
    assert second.status_code == 200
    assert second.json()["incident_id"] == first.json()["incident_id"]
    assert second.json()["idempotent"] is True
    attack_detail = postgres_client.get(
        f"/api/incidents/{first.json()['incident_id']}", headers=analyst_headers
    )
    assert attack_detail.status_code == 200
    attack_payload = attack_detail.json()
    attack_projection = attack_payload["fusion_projection"]
    attack_pairs = attack_projection.pop("interaction_source_pairs")
    assert attack_projection == {
        "cyber": {"score": 78, "weight": "0.45", "weighted_term": "35.10"},
        "transaction": {"score": 79, "weight": "0.45", "weighted_term": "35.55"},
        "correlation_bonus": 18,
        "raw_fused_score": "88.65",
        "rounded_fused_score": 89,
        "rounding_mode": "ROUND_HALF_UP",
    }
    assert [item["interaction_rule_code"] for item in attack_pairs] == [
        "correlation.new_device_new_beneficiary",
        "correlation.failed_mfa_high_amount",
        "correlation.endpoint_velocity_spike",
    ]
    assert all(
        item["cyber_component"]["contribution_id"]
        and item["cyber_component"]["source_event_id"]
        and item["transaction_component"]["contribution_id"]
        and item["transaction_component"]["source_transaction_id"]
        == attack_payload["transaction"]["transaction_id"]
        for item in attack_pairs
    )
    assert attack_payload["session"]["device_posture"] == "trusted"
    assert attack_payload["session"]["organizationally_trusted"] is True
    assert attack_payload["session"]["customer_device_familiar"] is False
    assert attack_payload["session"]["customer_familiarity"] == "new_to_behavioural_history"
    assert (
        attack_payload["session"]["customer_familiarity_basis"]
        == "behavioural_baseline_known_device_ids"
    )
    assert attack_payload["session"]["device_first_seen_scope"] == "technical_device_inventory"
    assert "not previously observed" in next(
        item["explanation"]
        for item in attack_payload["cyber_contributions"]
        if item["code"] == "cyber.new_device"
    )
    assert "trusted organizational posture" in next(
        item["explanation"]
        for item in attack_payload["cyber_contributions"]
        if item["code"] == "cyber.behavioural_deviation"
    )
    legitimate = postgres_client.post(
        "/api/scenarios/legitimate_new_device/run",
        headers={**admin_headers, "X-Request-ID": "admin-scenario-legitimate"},
    )
    assert legitimate.status_code == 200
    legitimate_detail = postgres_client.get(
        f"/api/incidents/{legitimate.json()['incident_id']}", headers=analyst_headers
    )
    assert legitimate_detail.status_code == 200
    assert legitimate_detail.json()["fusion_projection"] == {
        "cyber": {"score": 40, "weight": "0.45", "weighted_term": "18.00"},
        "transaction": {"score": 10, "weight": "0.45", "weighted_term": "4.50"},
        "correlation_bonus": 0,
        "raw_fused_score": "22.50",
        "rounded_fused_score": 23,
        "rounding_mode": "ROUND_HALF_UP",
        "interaction_source_pairs": [],
    }
    scenario_filter = postgres_client.get(
        "/api/incidents?scenario=account_takeover", headers=analyst_headers
    )
    assert scenario_filter.status_code == 200
    assert scenario_filter.json()["pagination"]["total_items"] == 1

    reset = postgres_client.post(
        "/api/scenarios/reset",
        headers={**admin_headers, "X-Request-ID": "admin-scenario-reset"},
    )
    assert reset.status_code == 200, reset.text
    assert reset.json()["counts"]["incidents"] == 15
    assert reset.json()["fingerprint"] == baseline_fingerprint
    assert reset.json()["exact_baseline_restored"] is True
    with postgres_session_factory() as session:
        assert dataset_fingerprint(session) == baseline_fingerprint
        denial = session.scalar(
            select(AuditEvent).where(AuditEvent.request_id == "analyst-scenario-denied")
        )
        assert denial is not None
        assert denial.event_type == AuditEventType.AUTHORIZATION_DENIED
        replay_audit = session.scalar(
            select(AuditEvent).where(AuditEvent.request_id == "admin-scenario-replay")
        )
        assert replay_audit is not None
        assert replay_audit.details["idempotent_replay"] is True


@pytest.mark.integration
def test_quantum_and_benchmark_apis_are_explainable_transparent_and_authenticated(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _prepare(postgres_session_factory, postgres_settings, password_service)
    headers = _login(postgres_client, postgres_settings, "analyst")

    assets = postgres_client.get("/api/quantum/assets", headers=headers)
    assert assets.status_code == 200, assets.text
    items = assets.json()["items"]
    assert [
        (item["readiness_priority_score"], item["readiness_priority_level"]) for item in items
    ] == [
        (88, "urgent"),
        (22, "low"),
    ]
    assert sum(len(item["linked_channels"]) for item in items) == 2
    assert all(len(item["migration_priority_reasons"]) == 5 for item in items)
    assert (
        "does not detect an active quantum attack"
        in assets.json()["active_attack_detection_disclaimer"]
    )
    quantum_summary = postgres_client.get("/api/quantum/summary", headers=headers)
    assert quantum_summary.status_code == 200
    assert quantum_summary.json()["pqc_ready_assets"] == 1
    assert quantum_summary.json()["readiness_priority_counts"] == {
        "low": 1,
        "medium": 0,
        "high": 0,
        "urgent": 1,
    }

    benchmark = postgres_client.get("/api/benchmark/summary", headers=headers)
    assert benchmark.status_code == 200, benchmark.text
    report = benchmark.json()
    assert report["fixture_version"] == "benchmark-v1"
    assert set(report["operating_points"]) == {
        "escalation_40",
        "intervention_60",
        "critical_80",
    }
    intervention = report["operating_points"]["intervention_60"]
    assert intervention["fused_hybrid_contextual_score"] == {
        "true_positives": 6,
        "false_positives": 0,
        "true_negatives": 30,
        "false_negatives": 12,
        "precision": "1.0000",
        "recall": "0.3333",
        "f1": "0.5000",
        "decisions": {"permitted": 24, "monitored": 16, "stepped_up": 2, "held": 6},
    }
    assert set(report["cohorts"]) == {
        "normal_legitimate",
        "legitimate_unusual_cyber",
        "legitimate_unusual_transaction",
        "cross_domain_attacks",
        "cyber_only_attacks",
        "transaction_only_attacks",
    }
    assert any("underperforms" in item for item in report["limitations"])
    assert "synthetic" in report["disclaimer"].lower()


@pytest.mark.integration
def test_business_routes_reject_unauthenticated_access_and_support_empty_incident_state(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _prepare(postgres_session_factory, postgres_settings, password_service)
    protected_paths = (
        "/api/incidents",
        "/api/dashboard/summary",
        "/api/dashboard/trends",
        "/api/scenarios",
        "/api/quantum/assets",
        "/api/quantum/summary",
        "/api/benchmark/summary",
        "/api/system/context",
        "/api/system/integrity",
    )
    for path in protected_paths:
        response = postgres_client.get(path)
        assert response.status_code == 401, path

    headers = _login(postgres_client, postgres_settings, "analyst")
    with postgres_session_factory.begin() as session:
        session.execute(delete(Incident))
    empty = postgres_client.get("/api/incidents", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["items"] == []
    assert empty.json()["pagination"]["total_items"] == 0
    summary = postgres_client.get("/api/dashboard/summary", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["visible_incidents"] == 0


@pytest.mark.integration
def test_openapi_contains_complete_milestone_four_surface(
    postgres_client: TestClient,
) -> None:
    response = postgres_client.get("/openapi.json")
    assert response.status_code == 200
    document = response.json()
    paths: dict[str, Any] = document["paths"]
    required = {
        "/api/incidents",
        "/api/incidents/{incident_id}",
        "/api/incidents/{incident_id}/actions",
        "/api/dashboard/summary",
        "/api/dashboard/trends",
        "/api/customers/{customer_id}",
        "/api/accounts/{account_id}",
        "/api/scenarios",
        "/api/scenarios/{scenario_key}/run",
        "/api/scenarios/reset",
        "/api/quantum/assets",
        "/api/quantum/summary",
        "/api/benchmark/summary",
        "/api/system/context",
        "/api/system/integrity",
    }
    assert required <= set(paths)
    assert "patch" in paths["/api/incidents/{incident_id}"]
    assert "post" in paths["/api/incidents/{incident_id}/actions"]
    incident_parameters = {
        parameter["name"] for parameter in paths["/api/incidents"]["get"]["parameters"]
    }
    assert "transaction_status" in incident_parameters
    incident_detail_schema = document["components"]["schemas"]["IncidentDetailResponse"]
    assert "fusion_projection" in incident_detail_schema["required"]
    fusion_schema = document["components"]["schemas"]["FusionProjectionResponse"]
    assert "interaction_source_pairs" in fusion_schema["required"]
    pair_schema = document["components"]["schemas"]["InteractionSourcePairResponse"]
    assert {
        "interaction_contribution_id",
        "interaction_rule_code",
        "display_order",
        "interaction_source_event_id",
        "interaction_source_transaction_id",
        "interaction_source_baseline_id",
        "cyber_component",
        "transaction_component",
    } <= set(pair_schema["required"])
    session_schema = document["components"]["schemas"]["SessionSummaryResponse"]
    assert {
        "device_posture",
        "organizationally_trusted",
        "customer_device_familiar",
        "customer_familiarity",
        "device_first_seen_at",
    } <= set(session_schema["required"])
    assert "/api/system/status" not in paths
    assert "/api/audit-events" not in paths
    assert paths["/api/system/context"]["get"]["security"] == [{"HTTPBearer": []}]
    assert paths["/api/system/integrity"]["get"]["security"] == [{"HTTPBearer": []}]


@pytest.mark.integration
def test_system_integrity_is_admin_only_safe_and_backend_authoritative(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    baseline_fingerprint = _prepare(postgres_session_factory, postgres_settings, password_service)
    analyst_headers = _login(postgres_client, postgres_settings, "analyst")
    admin_headers = _login(postgres_client, postgres_settings, "admin")

    assert postgres_client.get("/api/system/integrity").status_code == 401
    denied = postgres_client.get(
        "/api/system/integrity",
        headers={**analyst_headers, "X-Request-ID": "analyst-integrity-denied"},
    )
    assert denied.status_code == 403

    context = postgres_client.get("/api/system/context", headers=analyst_headers)
    assert context.status_code == 200
    assert context.json() == {
        "environment_label": "Deterministic test environment",
        "deployment_mode": "test",
        "dataset_version": "baseline-v1",
        "simulation_epoch": "2026-07-14T09:00:00Z",
        "dataset_state": "baseline_restored",
        "dataset_state_label": "Baseline dataset restored",
    }

    response = postgres_client.get("/api/system/integrity", headers=admin_headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["runtime"] == {
        "configured_environment": "test",
        "deployment_mode": "test",
        "environment_label": "Deterministic test environment",
        "api_origin": "http://testserver",
        "api_origin_scope": "loopback",
    }
    assert payload["readiness"] == {
        "database": "reachable",
        "migrations": "current",
        "revision": "0003_intelligence_support",
    }
    assert payload["dataset"]["version"] == "baseline-v1"
    assert payload["dataset"]["generator_seed"] == 26026
    assert payload["dataset"]["model_seed"] == 26026
    assert payload["dataset"]["simulation_epoch"] == "2026-07-14T09:00:00Z"
    assert payload["dataset"]["expected_baseline_counts"] == {
        "customers": 12,
        "accounts": 12,
        "devices": 16,
        "transactions": 180,
        "cyber_events": 240,
        "incidents": 15,
        "scenario_runs": 3,
    }
    assert payload["dataset"]["current_counts"] == payload["dataset"]["expected_baseline_counts"]
    assert payload["dataset"]["current_fingerprint"] == baseline_fingerprint
    assert payload["dataset"]["latest_reset_fingerprint"] == baseline_fingerprint
    assert payload["dataset"]["exact_baseline_restored"] is True
    assert len(payload["scenarios"]) == 3
    assert all(item["status"] == "not_run" for item in payload["scenarios"])
    assert payload["benchmark"] == {
        "fixture_version": "benchmark-v1",
        "benchmark_name": "benchmark-v1 — mixed synthetic security benchmark",
        "case_count": 48,
    }
    assert payload["audit"]["latest_reset"]["event_type"] == "scenario_reset"
    assert payload["audit"]["latest_event"] is not None
    serialized = response.text.lower()
    assert "password" not in serialized
    assert "jwt_secret" not in serialized
    assert "database_url" not in serialized

    run = postgres_client.post(
        "/api/scenarios/account_takeover/run",
        headers={**admin_headers, "X-Request-ID": "integrity-scenario-run"},
    )
    assert run.status_code == 200
    changed = postgres_client.get("/api/system/integrity", headers=admin_headers)
    assert changed.status_code == 200
    changed_payload = changed.json()
    assert changed_payload["dataset"]["exact_baseline_restored"] is False
    assert changed_payload["dataset"]["current_counts"]["incidents"] == 16
    scenario = next(
        item for item in changed_payload["scenarios"] if item["scenario_key"] == "account_takeover"
    )
    assert scenario["status"] == "completed"
    assert scenario["result_incident_id"] == run.json()["incident_id"]
    changed_context = postgres_client.get("/api/system/context", headers=analyst_headers)
    assert changed_context.status_code == 200
    assert changed_context.json()["dataset_state"] == "showcase_active"
    assert changed_context.json()["dataset_state_label"] == "Showcase scenarios active"

    with postgres_session_factory() as session:
        denial = session.scalar(
            select(AuditEvent).where(AuditEvent.request_id == "analyst-integrity-denied")
        )
        assert denial is not None
        assert denial.event_type == AuditEventType.AUTHORIZATION_DENIED
