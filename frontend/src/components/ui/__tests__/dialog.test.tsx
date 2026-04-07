import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

describe("Dialog", () => {
  it("renders dialog content when open", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>A test dialog description</DialogDescription>
          </DialogHeader>
          <p>Dialog body</p>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText("Test Dialog")).toBeInTheDocument();
    expect(screen.getByText("A test dialog description")).toBeInTheDocument();
    expect(screen.getByText("Dialog body")).toBeInTheDocument();
  });

  it("renders close button by default", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    // Dialog portal renders into document body, use screen to find sr-only "Close" text
    const closeTexts = screen.getAllByText("Close");
    expect(closeTexts.length).toBeGreaterThan(0);
  });

  it("renders fewer close elements when showCloseButton=false", () => {
    // Render with close button
    const { unmount: unmount1 } = render(
      <Dialog open>
        <DialogContent showCloseButton={true}>
          <DialogTitle>With Close</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const withCloseCount = screen.getAllByText("Close").length;
    unmount1();

    // Render without close button
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Without Close</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const withoutCloseCount = screen.queryAllByText("Close").length;

    // showCloseButton=false should produce fewer "Close" texts
    expect(withoutCloseCount).toBeLessThan(withCloseCount);
  });

  it("renders DialogFooter", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogFooter>
            <button>Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText("Save")).toBeInTheDocument();
  });
});
