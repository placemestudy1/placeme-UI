import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Only the presentational exports (LiveRoomError/LiveCaptionFeed/
// LiveTranscriptPanel) are under test here -- useLiveRoom itself owns a
// real LiveKit connection and is integration-tested manually per
// ACTION_PLAN.md Phase 0, not unit-tested against a mocked Room.
import { LiveCaptionFeed, LiveRoomError, LiveTranscriptPanel } from "./live-room";

describe("LiveRoomError", () => {
  it("shows consent-specific messaging when the failure looks consent-related", () => {
    render(<LiveRoomError error="Missing consent grant" needsConsent />);
    expect(screen.getByText("Microphone consent required")).toBeInTheDocument();
    expect(screen.getByText(/agreed to the consent terms/i)).toBeInTheDocument();
  });

  it("shows a generic reconnect message with the raw error otherwise", () => {
    render(<LiveRoomError error="socket hang up" needsConsent={false} />);
    expect(screen.getByText("Couldn't connect to the audio room")).toBeInTheDocument();
    expect(screen.getByText(/socket hang up/)).toBeInTheDocument();
  });
});

describe("LiveCaptionFeed", () => {
  it("renders nothing when there's no caption yet", () => {
    const { container } = render(
      <LiveCaptionFeed latestCaption={undefined} nameFor={(id) => id} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the resolved speaker name and caption text", () => {
    render(
      <LiveCaptionFeed
        latestCaption={{ id: 1, identity: "u1", displayName: "u1", text: "hello there" }}
        nameFor={() => "Aarav"}
      />,
    );
    expect(screen.getByText("Aarav: hello there")).toBeInTheDocument();
  });
});

describe("LiveTranscriptPanel", () => {
  it("shows a placeholder when there are no captions yet", () => {
    render(<LiveTranscriptPanel captions={[]} nameFor={(id) => id} />);
    expect(screen.getByText(/live captions will appear here/i)).toBeInTheDocument();
  });

  it("renders each caption as a transcript line, name resolved via nameFor", () => {
    render(
      <LiveTranscriptPanel
        captions={[
          { id: 1, identity: "u1", displayName: "u1", text: "first point" },
          { id: 2, identity: "u2", displayName: "u2", text: "second point" },
        ]}
        nameFor={(id) => (id === "u1" ? "Aarav" : "Ishita")}
      />,
    );
    expect(screen.getByText("Aarav")).toBeInTheDocument();
    expect(screen.getByText("first point")).toBeInTheDocument();
    expect(screen.getByText("Ishita")).toBeInTheDocument();
    expect(screen.getByText("second point")).toBeInTheDocument();
  });
});
