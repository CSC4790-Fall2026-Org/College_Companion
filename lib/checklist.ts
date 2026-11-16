import { addPennantMetadata } from "@/lib/colleges";
import type { PennantKey } from "@/lib/colleges";

export type Requirement = {
  id: number;
  title: string;
  category: string;
  date: string;
  doneLabel: string;
  openLabel: string;
  done: boolean;
};

export type School = {
  id: number;
  name: string;
  dueLabel: string;
  requirements: Requirement[];
  pennantKey?: PennantKey;
};

export function parseSavedSchools(value: unknown): School[] {
  if (!Array.isArray(value)) {
    throw new Error("The saved college checklist is not in the expected format.");
  }

  return value.map((entry, schoolIndex) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("id" in entry) ||
      !("name" in entry) ||
      !("dueLabel" in entry) ||
      !("requirements" in entry) ||
      typeof entry.id !== "number" ||
      typeof entry.name !== "string" ||
      typeof entry.dueLabel !== "string" ||
      !Array.isArray(entry.requirements)
    ) {
      throw new Error(`Saved college ${schoolIndex + 1} is not in the expected format.`);
    }

    const requirements = entry.requirements.map((requirement: unknown, requirementIndex: number) => {
      if (
        typeof requirement !== "object" ||
        requirement === null ||
        !("id" in requirement) ||
        !("title" in requirement) ||
        !("category" in requirement) ||
        !("date" in requirement) ||
        !("doneLabel" in requirement) ||
        !("openLabel" in requirement) ||
        !("done" in requirement) ||
        typeof requirement.id !== "number" ||
        typeof requirement.title !== "string" ||
        typeof requirement.category !== "string" ||
        typeof requirement.date !== "string" ||
        typeof requirement.doneLabel !== "string" ||
        typeof requirement.openLabel !== "string" ||
        typeof requirement.done !== "boolean"
      ) {
        throw new Error(
          `Requirement ${requirementIndex + 1} for ${entry.name} is not in the expected format.`,
        );
      }

      return {
        id: requirement.id,
        title: requirement.title,
        category: requirement.category,
        date: requirement.date,
        doneLabel: requirement.doneLabel,
        openLabel: requirement.openLabel,
        done: requirement.done,
      };
    });

    return addPennantMetadata({
      id: entry.id,
      name: entry.name,
      dueLabel: entry.dueLabel,
      requirements,
    });
  });
}
