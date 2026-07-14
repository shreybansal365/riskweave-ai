import { useQuery } from "@tanstack/react-query";
import { useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { incidentsApi, type IncidentQuery } from "../api/riskweave";
import { useAuth } from "../app/use-auth";
import {
  Button,
  EmptyState,
  EnterpriseTable,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  RiskBadge,
  StatusBadge,
} from "../components/ui";
import { formatDateTime, titleCase } from "../lib/format";

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function dayBoundary(value: string | null, end = false): string | undefined {
  if (value === null || value === "") return undefined;
  return `${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`;
}

export function IncidentsPage() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchDraft, setSearchDraft] = useState(params.get("search") ?? "");
  const token = session?.token ?? "";
  const query: IncidentQuery = {
    page: positiveInteger(params.get("page"), 1),
    pageSize: positiveInteger(params.get("page_size"), 20),
    sortBy: (params.get("sort_by") as IncidentQuery["sortBy"]) ?? "created_at",
    sortDirection: (params.get("sort_direction") as "asc" | "desc" | null) ?? "desc",
    severity: params.get("severity") ?? undefined,
    status: params.get("status") ?? undefined,
    scenario: params.get("scenario") ?? undefined,
    dateFrom: dayBoundary(params.get("date_from")),
    dateTo: dayBoundary(params.get("date_to"), true),
    search: params.get("search") ?? undefined,
  };

  const incidents = useQuery({
    queryKey: ["incidents", "list", query],
    queryFn: ({ signal }) => incidentsApi.list(token, query, signal),
  });

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    });
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };
  const submitSearch = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    update({ search: searchDraft.trim() || null });
  };
  const openRow = (id: string) => {
    void navigate(
      `/incidents/${id}${params.toString() === "" ? "" : `?return=${encodeURIComponent(params.toString())}`}`,
    );
  };
  const rowKey = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRow(id);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Investigation operations"
        title="Incident queue"
        description="Filter and triage persisted incidents without recreating risk decisions in the browser."
      />
      <form className="filter-bar" onSubmit={submitSearch} aria-label="Incident filters">
        <label className="search-control">
          <span>Search supported identifiers or customer</span>
          <input
            value={searchDraft}
            onChange={(event) => {
              setSearchDraft(event.target.value);
            }}
            placeholder="INC reference, UUID, or customer"
          />
        </label>
        <label>
          <span>Severity</span>
          <select
            value={params.get("severity") ?? ""}
            onChange={(event) => {
              update({ severity: event.target.value || null });
            }}
          >
            <option value="">All severities</option>
            {(["low", "guarded", "elevated", "high", "critical"] as const).map(
              (value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select
            value={params.get("status") ?? ""}
            onChange={(event) => {
              update({ status: event.target.value || null });
            }}
          >
            <option value="">All statuses</option>
            {(
              ["open", "in_review", "confirmed_fraud", "legitimate", "closed"] as const
            ).map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Scenario</span>
          <select
            value={params.get("scenario") ?? ""}
            onChange={(event) => {
              update({ scenario: event.target.value || null });
            }}
          >
            <option value="">All sources</option>
            <option value="normal_activity">Normal activity</option>
            <option value="legitimate_new_device">Legitimate new device</option>
            <option value="account_takeover">Account takeover</option>
          </select>
        </label>
        <label>
          <span>From</span>
          <input
            type="date"
            value={params.get("date_from") ?? ""}
            onChange={(event) => {
              update({ date_from: event.target.value || null });
            }}
          />
        </label>
        <label>
          <span>To</span>
          <input
            type="date"
            value={params.get("date_to") ?? ""}
            onChange={(event) => {
              update({ date_to: event.target.value || null });
            }}
          />
        </label>
        <div className="filter-actions">
          <Button type="submit" tone="primary">
            Apply search
          </Button>
          <Button
            type="button"
            tone="quiet"
            onClick={() => {
              setParams({});
              setSearchDraft("");
            }}
          >
            Reset filters
          </Button>
        </div>
      </form>

      {incidents.isPending ? (
        <LoadingSkeleton label="Loading incident queue" />
      ) : incidents.isError ? (
        <ErrorState
          message="The incident queue could not be loaded with the selected filters."
          onRetry={() => void incidents.refetch()}
        />
      ) : incidents.data.items.length === 0 ? (
        <EmptyState
          title="No incidents match these filters"
          message="Reset or broaden the current filters to return to the complete synthetic queue."
          action={
            <Button
              type="button"
              onClick={() => {
                setParams({});
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <section className="queue-panel" aria-labelledby="queue-title">
          <header>
            <div>
              <p className="panel-eyebrow">
                {incidents.data.pagination.total_items} persisted cases
              </p>
              <h2 id="queue-title">Prioritized investigation queue</h2>
            </div>
            <label className="sort-control">
              <span>Sort</span>
              <select
                value={`${query.sortBy ?? "created_at"}:${query.sortDirection ?? "desc"}`}
                onChange={(event) => {
                  const [sortBy, sortDirection] = event.target.value.split(":");
                  update({
                    sort_by: sortBy ?? "created_at",
                    sort_direction: sortDirection ?? "desc",
                  });
                }}
              >
                <option value="created_at:desc">Newest first</option>
                <option value="fused_score:desc">Highest fused score</option>
                <option value="severity:desc">Highest severity</option>
                <option value="updated_at:desc">Recently updated</option>
                <option value="created_at:asc">Oldest first</option>
              </select>
            </label>
          </header>
          <EnterpriseTable label="Incident queue results">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Customer / account</th>
                <th>Observed</th>
                <th>Cyber</th>
                <th>Transaction</th>
                <th>Fused</th>
                <th>Severity</th>
                <th>Recommended action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.data.items.map((incident) => (
                <tr
                  key={incident.incident_id}
                  className="clickable-row"
                  tabIndex={0}
                  onClick={() => {
                    openRow(incident.incident_id);
                  }}
                  onKeyDown={(event) => {
                    rowKey(event, incident.incident_id);
                  }}
                  aria-label={`Open ${incident.incident_reference}`}
                >
                  <td>
                    <strong>{incident.incident_reference}</strong>
                    <small>
                      {incident.scenario_key === null
                        ? "Background"
                        : titleCase(incident.scenario_key)}
                    </small>
                  </td>
                  <td>
                    <strong>{incident.customer_display_name}</strong>
                    <small>{incident.account_reference}</small>
                  </td>
                  <td>{formatDateTime(incident.created_at)}</td>
                  <td className="score-cell">{incident.cyber_score}</td>
                  <td className="score-cell">{incident.transaction_score}</td>
                  <td className="score-cell score-cell--fused">{incident.fused_score}</td>
                  <td>
                    <RiskBadge severity={incident.severity} />
                  </td>
                  <td>{titleCase(incident.recommended_action)}</td>
                  <td>
                    <StatusBadge status={incident.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </EnterpriseTable>
          <footer className="pagination">
            <span>
              Page {incidents.data.pagination.page} of{" "}
              {incidents.data.pagination.total_pages}
            </span>
            <div>
              <Button
                type="button"
                disabled={incidents.data.pagination.page <= 1}
                onClick={() => {
                  update({ page: String(incidents.data.pagination.page - 1) });
                }}
              >
                Previous
              </Button>
              <Button
                type="button"
                disabled={
                  incidents.data.pagination.page >= incidents.data.pagination.total_pages
                }
                onClick={() => {
                  update({ page: String(incidents.data.pagination.page + 1) });
                }}
              >
                Next
              </Button>
            </div>
          </footer>
        </section>
      )}
    </>
  );
}
