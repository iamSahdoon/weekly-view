import { Avatar } from "../ui/Avatar.jsx";
import { RoleChip } from "../ui/RoleChip.jsx";

// The person under review (design §3.6 rail 1): avatar, name, the projects the week's
// lines touch, and their role chip when they are a manager or admin.

export function ReviewPersonBlock({ author, projects }) {
  return (
    <div className="flex items-start gap-11">
      <Avatar name={author.name} size={32} />
      <div className="flex min-w-0 flex-col gap-2">
        <span className="flex flex-wrap items-center gap-8 text-base font-medium text-ink">
          {author.name}
          <RoleChip role={author.role} />
        </span>
        <span className="text-dense text-mut">
          {projects.length ? projects.join(", ") : "No projects"}
        </span>
      </div>
    </div>
  );
}
