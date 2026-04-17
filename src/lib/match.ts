// Rule-based match scoring (0–100). Pure functions, no AI.

const norm = (s: string) => s.trim().toLowerCase();
const setOf = (arr: string[] | null | undefined) =>
  new Set((arr ?? []).map(norm).filter(Boolean));

export type ExperienceLevel = "entry" | "junior" | "mid" | "senior";
const LEVEL_ORDER: ExperienceLevel[] = ["entry", "junior", "mid", "senior"];

export interface StudentMatchInput {
  skills: string[];
  preferred_roles: string[];
  experience_level: ExperienceLevel;
  location: string | null;
}
export interface JobMatchInput {
  required_skills: string[];
  preferred_roles: string[];
  experience_level: ExperienceLevel;
  location: string | null;
  title: string;
}

export function skillsOverlap(student: string[], required: string[]): number {
  const req = setOf(required);
  if (req.size === 0) return 1;
  const stu = setOf(student);
  let hit = 0;
  req.forEach((r) => { if (stu.has(r)) hit++; });
  return hit / req.size;
}

export function roleMatch(studentRoles: string[], job: JobMatchInput): number {
  const jobRoles = setOf([...(job.preferred_roles ?? []), job.title]);
  const stu = setOf(studentRoles);
  if (stu.size === 0 || jobRoles.size === 0) return 0;
  // any direct overlap or substring containment
  for (const r of stu) {
    for (const j of jobRoles) {
      if (r === j || j.includes(r) || r.includes(j)) return 1;
    }
  }
  return 0;
}

export function experienceMatch(student: ExperienceLevel, job: ExperienceLevel): number {
  const s = LEVEL_ORDER.indexOf(student);
  const j = LEVEL_ORDER.indexOf(job);
  if (s < 0 || j < 0) return 0.5;
  const diff = Math.abs(s - j);
  if (diff === 0) return 1;
  if (diff === 1) return 0.6;
  if (diff === 2) return 0.3;
  return 0;
}

export function locationMatch(studentLoc: string | null, jobLoc: string | null): number {
  if (!jobLoc) return 1;
  if (!studentLoc) return 0.3;
  const s = norm(studentLoc);
  const j = norm(jobLoc);
  if (j.includes("remote") || s.includes("remote")) return 1;
  if (s === j) return 1;
  if (s.includes(j) || j.includes(s)) return 0.7;
  return 0;
}

export function computeMatchScore(student: StudentMatchInput, job: JobMatchInput): number {
  const score =
    0.6 * skillsOverlap(student.skills, job.required_skills) +
    0.2 * roleMatch(student.preferred_roles, job) +
    0.1 * experienceMatch(student.experience_level, job.experience_level) +
    0.1 * locationMatch(student.location, job.location);
  return Math.round(score * 100);
}

export function matchBreakdown(student: StudentMatchInput, job: JobMatchInput) {
  return {
    skills: Math.round(skillsOverlap(student.skills, job.required_skills) * 100),
    role: Math.round(roleMatch(student.preferred_roles, job) * 100),
    experience: Math.round(experienceMatch(student.experience_level, job.experience_level) * 100),
    location: Math.round(locationMatch(student.location, job.location) * 100),
    total: computeMatchScore(student, job),
  };
}
