import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { HistorySession } from "@/lib/api";
import { buildHeatmap } from "@/lib/session/history";
import { ScoreHeatmap } from "./blocks";

describe("ScoreHeatmap", () => {
  const today = new Date(2026, 8, 26, 12);
  // One session on Tue 8 Sep scoring 72 (level 3).
  const scored: HistorySession = {
    id: "s1",
    code: "GD-1",
    status: "ended",
    durationSeconds: 900,
    topicText: "T",
    startedAt: new Date(2026, 8, 8, 10).toISOString(),
    endedAt: null,
    feedback: null,
    score: 72,
    dimensions: [],
    strengths: [],
    improvements: [],
    talkShare: null,
  };

  it("renders one box per day for the last three months", () => {
    render(<ScoreHeatmap days={buildHeatmap([], today)} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(31 + 31 + 30);
  });

  it("labels each month and every weekday", () => {
    render(<ScoreHeatmap days={buildHeatmap([], today)} />);
    for (const label of ["Jul", "Aug", "Sept?", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByText(new RegExp(`^${label}$`))).toBeInTheDocument();
    }
  });

  it("places days in weekday rows and week columns", () => {
    // 1 Jul 2026 is a Wednesday (row 3, first week); 6 Jul is the next
    // Monday (row 1, second week). Row/column 1 hold the labels.
    render(<ScoreHeatmap days={buildHeatmap([], today)} />);
    const boxes = screen.getAllByRole("listitem");
    expect(boxes[0]?.style.gridRow).toBe("4");
    expect(boxes[0]?.style.gridColumn).toBe("2");
    expect(boxes[5]?.style.gridRow).toBe("2");
    expect(boxes[5]?.style.gridColumn).toBe("3");
  });

  it("labels each box with its date and score", () => {
    render(<ScoreHeatmap days={buildHeatmap([scored], today)} />);
    expect(screen.getByLabelText(/ 8 Sept? · Score 72/)).toHaveAttribute("data-level", "3");
    expect(screen.getByLabelText(/ 9 Sept? · No session/)).toHaveAttribute("data-level", "0");
  });

  it("shows the date and score in a tooltip on hover", async () => {
    render(<ScoreHeatmap days={buildHeatmap([scored], today)} />);
    await userEvent.hover(screen.getByLabelText(/ 8 Sept? · Score 72/));
    expect((await screen.findAllByText(/^Tue, 8 Sept?$/))[0]).toBeInTheDocument();
    expect(screen.getAllByText("Score 72")[0]).toBeInTheDocument();
  });
});
