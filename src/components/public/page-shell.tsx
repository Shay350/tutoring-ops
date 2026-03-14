import type { ReactNode } from "react";

import { PublicFooter } from "./footer";
import { PublicNavbar } from "./navbar";
import { PublicContainer } from "./primitives";

export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicNavbar />
      <main>
        <PublicContainer>{children}</PublicContainer>
      </main>
      <PublicFooter />
    </div>
  );
}
