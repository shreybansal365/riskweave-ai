import { useQuery } from "@tanstack/react-query";
import { useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

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
import { formatDateTime, formatMoney, titleCase } from "../lib/format";

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
    transactionStatus: params.get("transaction_status") ?? undefined,
    scenario: params.get("scenario") ?? undefined,
    dateFrom: dayBoundary(params.get("date_from")),
    dateTo: dayBoundary(params.get("date_to"), true),
    search: params.get("search") ?? undefined,
  };

  const incidents = useQuery({
    queryKey: ["incidents", "list", query],
    queryFn: ({ signal }) => incidentsApi.list(token, query, signal),
  });
  const activeFilterCount = [
    query.severity,
    query.status,
    query.transactionStatus,
    query.scenario,
    query.dateFrom,
    query.dateTo,
    query.search,
  ].filter((value) => value !== undefined).length;

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
        eyebrow="Work queue"
        title="Incident queue"
        description="Compare payment state, cross-domain evidence, and case treatment across persisted investigations."
        variant="queue"
      />
      <form className="filter-bar" onSubmit={submitSearch} aria-label="Incident filters">
        <label className="search-control" htmlFor="incident-search">
          <span>Search UUID or customer name</span>
          <input
            id="incident-search"
            value={searchDraft}
            onChange={(event) => {
              setSearchDraft(event.target.value);
            }}
            placeholder="Incident UUID or synthetic customer"
          />
        </label>
        <label htmlFor="severity-filter">
          <span>Severity</span>
          <select
            id="severity-filter"
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
        <label htmlFor="status-filter">
          <span>Case status</span>
          <select
            id="status-filter"
            aria-label="Status"
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
        <label htmlFor="transaction-status-filter">
          <span>Transaction state</span>
          <select
            id="transaction-status-filter"
            value={params.get("transaction_status") ?? ""}
            onChange={(event) => {
              update({ transaction_status: event.target.value || null });
            }}
          >
            <option value="">All transaction states</option>
            {(
              [
                "pending",
                "permitted",
                "held",
                "released",
                "declined",
                "cancelled",
              ] as const
            ).map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </label>
        <details className="advanced-filters">
          <summary>Advanced filters</summary>
          <div>
            <label htmlFor="scenario-filter">
              <span>Scenario source</span>
              <select
                id="scenario-filter"
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
            <label htmlFor="date-from-filter">
              <span>Observed from</span>
              <input
                id="date-from-filter"
                type="date"
                value={params.get("date_from") ?? ""}
                onChange={(event) => {
                  update({ date_from: event.target.value || null });
                }}
              />
            </label>
            <label htmlFor="date-to-filter">
              <span>Observed to</span>
              <input
                id="date-to-filter"
                type="date"
                value={params.get("date_to") ?? ""}
                onChange={(event) => {
                  update({ date_to: event.target.value || null });
                }}
              />
            </label>
          </div>
        </details>
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
      <div className="filter-summary" role="status" aria-live="polite">
        <span>
          {activeFilterCount === 0
            ? "Complete persisted queue"
            : `${activeFilterCount.toString()} active ${activeFilterCount === 1 ? "filter" : "filters"}`}
        </span>
        <small>URL state is preserved when an investigation is opened.</small>
      </div>

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
            <label className="sort-control" htmlFor="incident-sort">
              <span>Sort</span>
              <select
                id="incident-sort"
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
          <EnterpriseTable
            label="Incident queue results"
            className="incident-table-scroll"
          >
            <thead>
              <tr>
                <th>Incident</th>
                <th>Decision</th>
                <th>Customer / account</th>
                <th>Amount</th>
                <th>Observed</th>
                <th>Risk composition</th>
                <th>Recommended action</th>
                <th>Transaction state</th>
                <th>Case status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.data.items.map((incident) => (
                <tr
                  key={incident.incident_id}
                  className="clickable-row"
                  data-incident-id={incident.incident_id}
                  tabIndex={0}
                  onClick={() => {
                    openRow(incident.incident_id);
                  }}
                  onKeyDown={(event) => {
                    rowKey(event, incident.incident_id);
                  }}
                  aria-label={`Open ${incident.incident_reference}`}
                >
                  <th scope="row" className="queue-identity">
                    <Link
                      to={`/incidents/${incident.incident_id}${params.toString() === "" ? "" : `?return=${encodeURIComponent(params.toString())}`}`}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      {incident.incident_reference}
                    </Link>
                    <small>
                      {incident.scenario_key === null
                        ? "Background"
                        : titleCase(incident.scenario_key)}
                    </small>
                  </th>
                  <td>
                    <span className="queue-decision">
                      <RiskBadge severity={incident.severity} />
                      <strong>{incident.fused_score}</strong>
                    </span>
                  </td>
                  <td>
                    <strong>{incident.customer_display_name}</strong>
                    <small>{incident.account_reference}</small>
                  </td>
                  <td className="money-cell">
                    {formatMoney(incident.amount_minor, incident.currency)}
                  </td>
                  <td>{formatDateTime(incident.created_at)}</td>
                  <td>
                    <span
                      className="risk-composition-cell"
                      aria-label={`Cyber ${incident.cyber_score.toString()}, transaction ${incident.transaction_score.toString()}, correlation bonus ${incident.correlation_bonus.toString()}, fused ${incident.fused_score.toString()}`}
                    >
                      <span>C{incident.cyber_score}</span>
                      <span>T{incident.transaction_score}</span>
                      <span>+{incident.correlation_bonus}</span>
                      <strong>{incident.fused_score}</strong>
                    </span>
                  </td>
                  <td>{titleCase(incident.recommended_action)}</td>
                  <td>
                    <StatusBadge status={incident.transaction_status} />
                  </td>
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
