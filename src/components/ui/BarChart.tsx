import { motion } from "framer-motion";

export interface BarChartItem {
  label: string;
  value: number;
  tone?: "green" | "orange" | "blue";
}

interface BarChartProps {
  title: string;
  items: BarChartItem[];
  valueSuffix?: string;
}

const toneStyles: Record<NonNullable<BarChartItem["tone"]>, string> = {
  green: "bg-[#135d54]",
  orange: "bg-[#d85435]",
  blue: "bg-[#2f6f9f]",
};

export default function BarChart({ title, items, valueSuffix = "%" }: BarChartProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-5 space-y-4">
        {items.map((item, index) => {
          const width = Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0);
          const colorClass = toneStyles[item.tone ?? "green"];

          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-[#34423e] dark:text-white/80">{item.label}</span>
                <span className="text-[#52645f] dark:text-white/65">
                  {item.value}
                  {valueSuffix}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#dbe7e2] dark:bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.75, delay: index * 0.08 }}
                  className={`h-full rounded-full ${colorClass}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
