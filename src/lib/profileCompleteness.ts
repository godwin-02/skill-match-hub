export type CompletenessField = {
  key: string;
  label: string;
  done: boolean;
  weight: number;
};

export function computeStudentCompleteness(args: {
  full_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  education?: string | null;
  preferred_roles?: string[] | null;
  location?: string | null;
  resume_url?: string | null;
  projects?: string | null;
}): { percent: number; fields: CompletenessField[] } {
  const fields: CompletenessField[] = [
    { key: "full_name", label: "Full name", done: !!args.full_name?.trim(), weight: 10 },
    { key: "headline", label: "Headline", done: !!args.headline?.trim(), weight: 10 },
    { key: "skills", label: "Skills (3+)", done: (args.skills ?? []).length >= 3, weight: 20 },
    { key: "education", label: "Education", done: !!args.education?.trim(), weight: 10 },
    { key: "preferred_roles", label: "Preferred roles", done: (args.preferred_roles ?? []).length > 0, weight: 10 },
    { key: "location", label: "Location", done: !!args.location?.trim(), weight: 5 },
    { key: "bio", label: "Short bio", done: (args.bio ?? "").trim().length >= 40, weight: 10 },
    { key: "projects", label: "Projects", done: (args.projects ?? "").trim().length >= 30, weight: 10 },
    { key: "resume_url", label: "Resume PDF", done: !!args.resume_url, weight: 15 },
  ];
  const total = fields.reduce((s, f) => s + f.weight, 0);
  const earned = fields.reduce((s, f) => s + (f.done ? f.weight : 0), 0);
  return { percent: Math.round((earned / total) * 100), fields };
}
