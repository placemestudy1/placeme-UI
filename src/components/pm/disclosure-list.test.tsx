import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Mic } from "lucide-react";

import { DisclosureList } from "./disclosure-list";

describe("DisclosureList", () => {
  it("renders a title and body for every item", () => {
    render(
      <DisclosureList
        items={[
          { icon: Mic, title: "Microphone capture", body: "Audio is captured live." },
          { icon: Mic, title: "Retention", body: "Kept until you delete your account." },
        ]}
      />,
    );
    expect(screen.getByText("Microphone capture")).toBeInTheDocument();
    expect(screen.getByText("Audio is captured live.")).toBeInTheDocument();
    expect(screen.getByText("Retention")).toBeInTheDocument();
    expect(screen.getByText("Kept until you delete your account.")).toBeInTheDocument();
  });

  it("renders nothing (an empty list) for an empty items array", () => {
    const { container } = render(<DisclosureList items={[]} />);
    expect(container.querySelectorAll("li")).toHaveLength(0);
  });
});
