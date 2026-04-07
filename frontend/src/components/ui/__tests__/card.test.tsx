import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card", () => {
  it("renders with data-slot attribute", () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.querySelector("[data-slot='card']")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<Card>Hello card</Card>);
    expect(screen.getByText("Hello card")).toBeInTheDocument();
  });

  it("renders CardHeader, CardContent, and CardFooter children", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>Footer text</CardFooter>
      </Card>
    );

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByText("Footer text")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Card className="my-card">Test</Card>);
    expect(container.querySelector("[data-slot='card']")).toHaveClass("my-card");
  });

  it("supports size=sm prop", () => {
    const { container } = render(<Card size="sm">Small</Card>);
    expect(container.querySelector("[data-slot='card']")).toHaveAttribute("data-size", "sm");
  });
});
