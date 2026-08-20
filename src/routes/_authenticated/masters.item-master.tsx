import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Item Master is now project-specific and lives on the Items tab of each
 * project. This legacy URL redirects to the project portfolio.
 */
export const Route = createFileRoute("/_authenticated/masters/item-master")({
  beforeLoad: () => {
    throw redirect({ to: "/projects" });
  },
  component: () => null,
});
