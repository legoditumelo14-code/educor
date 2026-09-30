import { Filter, Search } from "lucide-react";
import { COURSE_CATEGORIES, COURSE_LEVELS, type CourseFilters } from "../../types/course";

interface CourseFiltersProps {
  filters: CourseFilters;
  resultCount: number;
  onChange: (filters: CourseFilters) => void;
}

export default function CourseFilters({ filters, resultCount, onChange }: CourseFiltersProps) {
  return (
    <section className="rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto] lg:items-center">
        <label className="relative block">
          <span className="sr-only">Search courses</span>
          <Search className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Search by title, teacher, or description"
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">Filter by category</span>
          <Filter className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
          <select
            value={filters.category}
            onChange={(event) =>
              onChange({ ...filters, category: event.target.value as CourseFilters["category"] })
            }
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            <option value="All">All categories</option>
            {COURSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Filter by level</span>
          <select
            value={filters.level}
            onChange={(event) => onChange({ ...filters, level: event.target.value as CourseFilters["level"] })}
            className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
          >
            <option value="All">All levels</option>
            {COURSE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg bg-[#eef7f4] px-4 py-3 text-center text-sm font-semibold text-[#135d54]">
          {resultCount} {resultCount === 1 ? "course" : "courses"}
        </div>
      </div>
    </section>
  );
}
