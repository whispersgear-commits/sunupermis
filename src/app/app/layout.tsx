import { Shell } from "@/components/app/shell";
import { MotionRoot } from "@/components/motion-root";
import { requireContext } from "@/lib/session";
import { signOut } from "../auth-actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const trialDays = Math.max(0, Math.ceil((new Date(ctx.school.trial_ends_at).getTime() - Date.now()) / 86_400_000));

  return (
    <MotionRoot>
      <Shell schoolName={ctx.school.name} userName={ctx.fullName || ctx.email} trialDays={trialDays} signOut={signOut}>
        {children}
      </Shell>
    </MotionRoot>
  );
}
