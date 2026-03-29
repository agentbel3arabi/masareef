"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

const subscribe = () => () => {};

interface LogoProps {
  variant: "horizontal" | "stacked" | "icon";
  width: number;
  height: number;
  className?: string;
  colorScheme?: "auto" | "light" | "dark";
}

const logoFiles: Record<string, { light: string; dark: string }> = {
  horizontal: {
    light: "/logos/horizontal.svg",
    dark: "/logos/horizontal-white.svg",
  },
  stacked: {
    light: "/logos/stacked.svg",
    dark: "/logos/stacked-white.svg",
  },
  icon: {
    light: "/logos/icon.svg",
    dark: "/logos/icon.svg",
  },
};

export function Logo({ variant, width, height, className, colorScheme = "auto" }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  let theme: "light" | "dark";
  if (colorScheme === "light") {
    theme = "light";
  } else if (colorScheme === "dark") {
    theme = "dark";
  } else {
    theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  }

  const src = logoFiles[variant][theme];

  return (
    <Image
      src={src}
      alt="Masareef"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
