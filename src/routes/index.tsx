import { createFileRoute } from "@tanstack/react-router";
import { PrecioMetaApp } from "@/components/precio-meta-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main>
      <PrecioMetaApp />
    </main>
  );
}
