/** Registers every module store that persists to the cloud. */
import { crm } from "@/lib/crm/store";
import type { CrmState } from "@/lib/crm/types";
import { projectsStore } from "@/lib/projects/store";
import type { ProjectsState } from "@/lib/projects/types";
import { plmStore } from "@/lib/plm/store";
import type { PlmState } from "@/lib/plm/types";
import { CRM_TABLES } from "./schema";
import { ENGINEERING_TABLES, PROJECT_TABLES } from "./schema.projects";
import { registerCloudStore, hydrateCloudStores, type CloudStore } from "./sync";

type AnyState = Record<string, unknown>;

function adapt<S>(
  module: string,
  tables: CloudStore["tables"],
  store: {
    get: () => S;
    replace: (next: S) => void;
    subscribe: (fn: () => void) => unknown;
  },
): CloudStore {
  return {
    module,
    tables,
    get: () => store.get() as unknown as AnyState,
    replace: (next) => store.replace(next as unknown as S),
    subscribe: (fn) => {
      const off = store.subscribe(fn) as () => void;
      return () => {
        off();
      };
    },
  };
}

let registered = false;

export function initCloudStores() {
  if (!registered) {
    registered = true;
    registerCloudStore(adapt<CrmState>("crm", CRM_TABLES, crm));
    registerCloudStore(adapt<ProjectsState>("projects", PROJECT_TABLES, projectsStore));
    registerCloudStore(adapt<PlmState>("engineering", ENGINEERING_TABLES, plmStore));
  }
  return hydrateCloudStores();
}
