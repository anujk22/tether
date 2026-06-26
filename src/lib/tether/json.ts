import type { JsonRecord } from "../domain/types";

export function asJsonRecord(value: unknown): JsonRecord {
  if (typeof value === "string") {
    return JSON.parse(value) as JsonRecord;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

export function asJsonArray(value: unknown): unknown[] {
  if (typeof value === "string") {
    return JSON.parse(value) as unknown[];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [];
}
