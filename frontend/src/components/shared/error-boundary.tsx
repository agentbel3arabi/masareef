"use client";

import { Component, ReactNode } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground" dir="rtl" lang="ar">
              حدث خطأ ما
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, message: "" })}
            >
              Try Again / حاول مجدداً
            </Button>
            <Button variant="ghost" render={<Link href="/dashboard" />}>
              Go Home / الرئيسية
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
