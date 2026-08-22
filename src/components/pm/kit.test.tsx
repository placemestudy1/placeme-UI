import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeedbackList, ScoreBar, ScoreRing } from "./kit";

describe("ScoreRing", () => {
  it("renders the numeric score in the center", () => {
    render(<ScoreRing score={82} />);
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("score")).toBeInTheDocument();
  });
});

describe("ScoreBar", () => {
  it("renders the label, score, and an optional note", () => {
    render(<ScoreBar label="Clarity" score={78} note="Clear structure throughout." />);
    expect(screen.getByText("Clarity")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText("Clear structure throughout.")).toBeInTheDocument();
  });

  it("omits the note element entirely when none is given", () => {
    const { container } = render(<ScoreBar label="Fluency" score={69} />);
    expect(screen.getByText("Fluency")).toBeInTheDocument();
    // ScoreBar's only <p> is the optional note -- absent means it rendered null.
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});

describe("FeedbackList", () => {
  it("renders a title and every item as a bullet", () => {
    render(
      <FeedbackList
        title="What worked"
        items={["Opened with a crisp framing.", "Cited two data points."]}
      />,
    );
    expect(screen.getByText("What worked")).toBeInTheDocument();
    expect(screen.getByText("Opened with a crisp framing.")).toBeInTheDocument();
    expect(screen.getByText("Cited two data points.")).toBeInTheDocument();
  });

  it("renders nothing for an empty item list beyond the title", () => {
    render(<FeedbackList title="Fix next time" items={[]} />);
    expect(screen.getByText("Fix next time")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
