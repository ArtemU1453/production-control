import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { ScreenScaffold } from "@/components";
import { Button } from "@/components/ui/button";

/** Scaffold for a settings sub-screen: the standard screen shell plus a back
 *  control returning to the settings hub, so every admin screen shares one
 *  navigation affordance. */
export function SettingsScaffold({
  title,
  subtitle,
  toolbar,
  children,
}: {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ScreenScaffold
      title={title}
      subtitle={subtitle}
      toolbar={
        <>
          <Link href="/settings">
            <Button variant="secondary" size="icon" className="rounded-xl" aria-label="Назад к настройкам">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          {toolbar}
        </>
      }
    >
      {children}
    </ScreenScaffold>
  );
}
