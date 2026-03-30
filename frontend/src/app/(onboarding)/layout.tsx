import { Logo } from "@/components/shared/logo";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="absolute top-4 end-4 flex items-center gap-1">
        <LocaleToggle />
        <ThemeToggle />
      </div>
      <div className="mb-8">
        <Logo variant="horizontal" width={150} height={60} />
      </div>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
