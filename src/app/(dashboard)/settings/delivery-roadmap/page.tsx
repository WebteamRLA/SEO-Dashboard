import type { Metadata } from "next";
import { DeliveryRoadmap, type PhaseSection } from "@/features/delivery/delivery-roadmap";
import { phaseProgress } from "@/lib/domain/delivery";
import { getDeliveryModules } from "@/lib/data/operations";
import type { Phase } from "@/lib/types";

export const metadata: Metadata = { title: "Delivery Roadmap" };

const PHASE_SECTIONS: readonly { phase: Phase; title: string }[] = [
  { phase: "P1", title: "Phase 1" },
  { phase: "P2", title: "Phase 2" },
  { phase: "P3", title: "Phase 3" },
];

/** Rendered inside the Settings layout, which provides the page title and section tabs. */
export default async function DeliveryRoadmapPage() {
  const modules = await getDeliveryModules();
  const sections: PhaseSection[] = PHASE_SECTIONS.map(({ phase, title }) => ({
    phase,
    title,
    progress: phaseProgress(modules, phase),
    modules: modules.filter((module) => module.phase === phase),
  }));

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Progress is the share of each module&apos;s delivery steps that are finished. Planned dates stay
        “To be confirmed” until they are confirmed.
      </p>
      <DeliveryRoadmap sections={sections} />
    </>
  );
}
