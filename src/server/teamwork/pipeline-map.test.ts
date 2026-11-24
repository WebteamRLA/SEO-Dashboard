import { describe, expect, it } from "vitest";
import type { PipelineColumn } from "@/lib/types";
import {
  BACKLOG_COLUMN,
  parseCardDescription,
  sourceFor,
  sourceForTags,
  stageForColumn,
  toPipelineLeads,
  type PipelineTask,
} from "./pipeline-map";

const column = (id: number, name: string, order = id): PipelineColumn => ({ id, name, order, color: "#000000" });

describe("stageForColumn", () => {
  it("maps the RLA board's columns to stage groups", () => {
    expect(stageForColumn(BACKLOG_COLUMN)).toBe("new");
    expect(stageForColumn(column(1, "First Contact"))).toBe("contacted");
    expect(stageForColumn(column(2, "Scheduled Call"))).toBe("meeting");
    expect(stageForColumn(column(3, "Analysis"))).toBe("meeting");
    expect(stageForColumn(column(4, "Sent Quote"))).toBe("proposal");
    expect(stageForColumn(column(5, "Followed Up on Quote"))).toBe("proposal");
    expect(stageForColumn(column(6, "Sent Updated Offer"))).toBe("proposal");
    expect(stageForColumn(column(7, "Sent Proposal"))).toBe("proposal");
    expect(stageForColumn(column(8, "WON"))).toBe("won");
    expect(stageForColumn(column(9, "LOST"))).toBe("lost");
    expect(stageForColumn(column(10, "Current Client Upsell Opportunities"))).toBe("contacted");
    expect(stageForColumn(column(11, "Follow Up Every Few Months"))).toBe("contacted");
  });
});

describe("sourceForTags", () => {
  it("reads the board's tags as lead sources", () => {
    expect(sourceForTags(["Organic (Search)"])).toBe("Organic Search");
    expect(sourceForTags(["Organic (AI)"])).toBe("AI Search");
    expect(sourceForTags(["Referral"])).toBe("Referral");
    expect(sourceForTags(["Client Referral/Upsell"])).toBe("Referral");
    expect(sourceForTags(["Cold Email"])).toBe("Email");
    expect(sourceForTags(["Social Media"])).toBe("Social");
    expect(sourceForTags(["Conference"])).toBe("Event");
    expect(sourceForTags(["Unknown"])).toBe("Unknown");
    expect(sourceForTags([])).toBe("Unknown");
  });
});

describe("sourceFor", () => {
  it("uses the tags first, then the card's Source line", () => {
    expect(sourceFor(["Referral"], "ChatGPT")).toBe("Referral");
    expect(sourceFor([], "ChatGPT")).toBe("AI Search");
    expect(sourceFor(["Unknown"], "LinkedIn")).toBe("Social");
    expect(sourceFor([], "Peter at the expo")).toBe("Event");
    expect(sourceFor([], "A friend")).toBe("Unknown");
    expect(sourceFor([], null)).toBe("Unknown");
  });
});

describe("parseCardDescription", () => {
  it("reads the card template on one line, with Markdown links", () => {
    expect(
      parseCardDescription(
        "Source: Trade show Contact Name: Sam Example Contact Email: [sam@example.com](mailto:sam@example.com) Website: [https://example.com/](https://example.com/) Notes: Wants a quote",
      ),
    ).toEqual({
      source: "Trade show",
      contactName: "Sam Example",
      contactEmail: "sam@example.com",
      website: "https://example.com/",
      notes: "Wants a quote",
    });
  });

  it("reads the template over several lines and keeps note line breaks", () => {
    const details = parseCardDescription("Source:\nContact Name: Alex\nContact Email:\nWebsite:\nNotes: Line one\nLine two");
    expect(details).toEqual({ source: null, contactName: "Alex", contactEmail: null, website: null, notes: "Line one\nLine two" });
  });

  it("treats a description without the template as notes", () => {
    expect(parseCardDescription("Met at the expo.").notes).toBe("Met at the expo.");
    expect(parseCardDescription(null).notes).toBeNull();
  });
});

describe("toPipelineLeads", () => {
  const columns = [column(10, "First Contact", 1), column(20, "WON", 2)];
  const base: PipelineTask = {
    id: 1,
    name: "Example Co",
    description: "Contact Name: Sam Contact Email: sam@example.com",
    status: "new",
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-02T10:00:00Z",
    startDate: "2026-11-03",
    dueDate: null,
    tagIds: [5],
    assigneeUserIds: [7],
    workflowStages: [{ workflowId: 1, stageId: 10 }],
  };
  const included = { tags: { "5": { id: 5, name: "Referral" } }, users: { "7": { id: 7, firstName: "Pat", lastName: "Lee" } } };

  it("maps a card to a lead with its Teamwork column, tags and people", () => {
    const [lead] = toPipelineLeads([base], columns, included, "https://team.example");
    expect(lead).toMatchObject({
      id: "tw-1",
      origin: "teamwork",
      name: "Example Co",
      email: "sam@example.com",
      company: "Sam",
      stage: "contacted",
      dealValue: null,
      attribution: { source: "Referral" },
      teamwork: {
        url: "https://team.example/app/tasks/1",
        column: { name: "First Contact" },
        tags: ["Referral"],
        assignees: ["Pat Lee"],
        startDate: "2026-11-03",
      },
    });
  });

  it("dates a won card by its last update, puts unplaced cards in Backlog, and skips completed cards", () => {
    const leads = toPipelineLeads(
      [
        { ...base, id: 2, workflowStages: [{ workflowId: 1, stageId: 20 }] },
        { ...base, id: 3, workflowStages: [] },
        { ...base, id: 4, status: "completed" },
      ],
      columns,
      included,
      "https://team.example",
    );
    expect(leads.map((lead) => lead.id)).toEqual(["tw-2", "tw-3"]);
    expect(leads[0]).toMatchObject({ stage: "won", wonOn: "2026-11-02" });
    expect(leads[1]?.teamwork?.column.name).toBe("Backlog");
  });
});
