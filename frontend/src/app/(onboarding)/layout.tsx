import { Logo } from "@/components/shared/logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="mb-8">
        <Logo variant="horizontal" width={160} height={36} />
      </div>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
