import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowKey: (row: T) => string;
  emptyState: ReactNode;
}

export default function DataTable<T>({ columns, rows, getRowKey, emptyState }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/45 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#dbe7e2] text-left text-sm dark:divide-white/10">
          <thead className="bg-[#eef7f4] text-xs font-bold uppercase text-[#52645f] dark:bg-white/10 dark:text-white/65">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={`px-4 py-3 ${column.className ?? ""}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dbe7e2] dark:divide-white/10">
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="transition hover:bg-white/70 dark:hover:bg-white/5">
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-4 align-top ${column.className ?? ""}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
