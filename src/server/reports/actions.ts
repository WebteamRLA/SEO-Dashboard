"use server";

import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { canEditReports } from "@/lib/data/reports";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import { getToday } from "@/lib/data/calendar";
import { describeError } from "@/server/log";
import { isReportableMonth } from "./assemble";
import { buildMonthlyReport } from "./build";

/**
 * Report notes and status. Admins and managers only; every action checks the
 * session and the month. Finalising freezes the figures in a snapshot; reopening
 * drops it, so the report goes back to live figures.
 */

export type ReportActionResult = { ok: true } | { ok: false; error: string };

const NOTE = z.string().max(5000, "Keep each note under 5,000 characters.");
const notesSchema = z.object({ highlights: NOTE, missed: NOTE, nextMonth: NOTE });

async function authorise(month: unknown): Promise<{ userId: string; month: string } | { error: string }> {
  const user = await requireSessionUser();
  if (!canEditReports(user.role)) return { error: "Only admins and managers can change reports." };
  if (typeof month !== "string" || !isReportableMonth(month, await getToday())) {
    return { error: "Reports cover complete months only." };
  }
  return { userId: user.id, month };
}

const blankToNull = (value: string) => (value.trim() === "" ? null : value.trim());

export async function saveReportNotes(month: unknown, notes: unknown): Promise<ReportActionResult> {
  const auth = await authorise(month);
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = notesSchema.safeParse(notes);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the notes." };
  const data = {
    highlights: blankToNull(parsed.data.highlights),
    missed: blankToNull(parsed.data.missed),
    nextMonth: blankToNull(parsed.data.nextMonth),
    updatedById: auth.userId,
  };
  const db = createDb();
  try {
    const existing = await db.monthlyReport.findUnique({ where: { month: auth.month }, select: { status: true } });
    if (existing && existing.status !== "draft") return { ok: false, error: "Reopen the report to change its notes." };
    await db.monthlyReport.upsert({ where: { month: auth.month }, create: { month: auth.month, ...data }, update: data });
    return { ok: true };
  } catch (error) {
    console.error("Saving report notes failed:", describeError(error));
    return { ok: false, error: "The notes could not be saved. Try again." };
  } finally {
    await releaseDb(db);
  }
}

export async function finalizeReport(month: unknown): Promise<ReportActionResult> {
  const auth = await authorise(month);
  if ("error" in auth) return { ok: false, error: auth.error };
  const snapshot = await buildMonthlyReport(auth.month);
  const db = createDb();
  try {
    const now = new Date();
    const data = {
      status: "ready",
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      finalizedAt: now,
      finalizedById: auth.userId,
      updatedById: auth.userId,
    };
    await db.monthlyReport.upsert({ where: { month: auth.month }, create: { month: auth.month, ...data }, update: data });
    return { ok: true };
  } catch (error) {
    console.error("Finalising report failed:", describeError(error));
    return { ok: false, error: "The report could not be finalised. Try again." };
  } finally {
    await releaseDb(db);
  }
}

export async function reopenReport(month: unknown): Promise<ReportActionResult> {
  const auth = await authorise(month);
  if ("error" in auth) return { ok: false, error: auth.error };
  const db = createDb();
  try {
    await db.monthlyReport.updateMany({
      where: { month: auth.month },
      data: { status: "draft", snapshot: Prisma.DbNull, finalizedAt: null, finalizedById: null, updatedById: auth.userId },
    });
    return { ok: true };
  } catch (error) {
    console.error("Reopening report failed:", describeError(error));
    return { ok: false, error: "The report could not be reopened. Try again." };
  } finally {
    await releaseDb(db);
  }
}
