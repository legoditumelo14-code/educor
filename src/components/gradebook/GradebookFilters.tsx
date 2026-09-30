import { Filter, Search } from "lucide-react";
import { SUBMISSION_STATUSES } from "../../types/assignment";
import type { GradebookFilters as GradebookFiltersValue, GradebookRow } from "../../types/gradebook";

interface GradebookFiltersProps {
  filters: GradebookFiltersValue;
  rows: GradebookRow[];
  resultCount: number;
  onChange: (filters: GradebookFiltersValue) => void;
}

export default function GradebookFilters({ filters, rows, resultCount, onChange }: GradebookFiltersProps) {
  const assignments = Array.from(
    new Map(rows.map((row) => [row.assignmentId, row.assignmentTitle])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <section className="rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_240px_auto] lg:items-center">
        <label className="relative block">
          <span className="sr-only">Search students or assignments</span>
          <Search className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Search students, assignments, or feedback"
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">Filter by status</span>
          <Filter className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
          <select
            value={filters.status}
            onChange={(event) =>
              onChange({ ...filters, status: event.target.value as GradebookFiltersValue["status"] })
            }
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            <option value="All">All statuses</option>
            {SUBMISSION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Filter by assignment</span>
          <select
            value={filters.assignmentId}
            onChange={(event) => onChange({ ...filters, assignmentId: event.target.value })}
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            <option value="All">All assignments</option>
            {assignments.map(([assignmentId, title]) => (
              <option key={assignmentId} value={assignmentId}>
                {title}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg bg-[#eef7f4] px-4 py-3 text-center text-sm font-semibold text-[#135d54]">
          {resultCount} {resultCount === 1 ? "record" : "records"}
        </div>
      </div>
    </section>
  );
}
