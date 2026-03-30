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

export const LOGO_SIZES = {
  sidebar: { width: 150, height: 60 },           // 2.5:1 ratio (horizontal SVG 500x200)
  mobileNav: { width: 36, height: 36 },          // icon is square
  authPanel: { width: 240, height: 96 },         // 2.5:1 ratio (prominent on auth pages)
  authPanelWhite: { width: 200, height: 80 },    // white variant on dark panel
  onboarding: { width: 150, height: 60 },        // 2.5:1 ratio
  landing: { width: 140, height: 56 },           // 2.5:1 ratio, for landing page nav
  landingFooter: { width: 140, height: 56 },     // 2.5:1 ratio, for footer
} as const;

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
