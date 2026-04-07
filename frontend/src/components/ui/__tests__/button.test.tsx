import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";

/** Helper: get the actual button element by data-slot */
function getButton(container: HTMLElement) {
  return container.querySelector("[data-slot='button']") as HTMLElement;
}

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("fires onClick handler", () => {
    const handleClick = vi.fn();
    const { container } = render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(getButton(container));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const handleClick = vi.fn();
    const { container } = render(<Button disabled onClick={handleClick}>Click</Button>);
    fireEvent.click(getButton(container));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders default variant without error", () => {
    const { container } = render(<Button variant="default">Default</Button>);
    expect(getButton(container)).toBeInTheDocument();
  });

  it("renders outline variant without error", () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    expect(getButton(container)).toBeInTheDocument();
  });

  it("renders secondary variant without error", () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    expect(getButton(container)).toBeInTheDocument();
  });

  it("renders ghost variant without error", () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    expect(getButton(container)).toBeInTheDocument();
  });

  it("renders destructive variant without error", () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    expect(getButton(container)).toBeInTheDocument();
  });

  it("renders link variant without error", () => {
    const { container } = render(<Button variant="link">Link</Button>);
    expect(getButton(container)).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Button className="custom-class">Custom</Button>);
    expect(getButton(container)).toHaveClass("custom-class");
  });

  it("renders with different sizes", () => {
    const { container, rerender } = render(<Button size="sm">Small</Button>);
    expect(getButton(container)).toBeInTheDocument();
    rerender(<Button size="lg">Large</Button>);
    expect(getButton(container)).toBeInTheDocument();
  });
});
