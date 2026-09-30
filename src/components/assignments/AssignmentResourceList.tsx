import { FileText, Image as ImageIcon, Paperclip, Video } from "lucide-react";
import type { AssignmentResource } from "../../types/assignment";

interface AssignmentResourceListProps {
  resources: AssignmentResource[];
  onRemove?: (resourceId: string) => void;
}

const iconForType = (type: AssignmentResource["type"]) => {
  if (type === "image") return ImageIcon;
  if (type === "video") return Video;
  if (type === "pdf" || type === "document") return FileText;
  return Paperclip;
};

const formatSize = (size: number) => {
  if (!size) return "Stored file";
  if (size < 1024 * 1024) return `${Math.max(Math.round(size / 1024), 1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AssignmentResourceList({ resources, onRemove }: AssignmentResourceListProps) {
  if (resources.length === 0) return null;

  return (
    <div className="mt-4 grid gap-2">
      {resources.map((resource) => {
        const Icon = iconForType(resource.type);

        return (
          <div
            key={resource.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#dbe7e2] bg-white/80 p-3 text-sm dark:border-white/10 dark:bg-white/5"
          >
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-3 font-semibold text-[#17211f] transition hover:text-[#135d54] dark:text-white"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef7f4] text-[#135d54]">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate">{resource.name}</span>
                <span className="block text-xs font-normal text-[#6c7d78] dark:text-white/55">
                  {resource.type.toUpperCase()} - {formatSize(resource.size)}
                </span>
              </span>
            </a>

            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(resource.id)}
                className="rounded-full bg-[#fff1ec] px-3 py-1 text-xs font-bold text-[#9d321f] transition hover:bg-[#ffd8c9]"
              >
                Remove
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
