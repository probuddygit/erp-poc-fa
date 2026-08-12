/** Registers every module store that persists to the cloud. */
import { crm } from "@/lib/crm/store";
import type { CrmState } from "@/lib/crm/types";
import { CRM_TABLES } from "./schema";
import { registerCloudStore, hydrateCloudStores } from "./sync";

let registered = false;

export function initCloudStores() {
  if (!registered) {
    registered = true;
    registerCloudStore({
      module: "crm",
      tables: CRM_TABLES,
      get: () => crm.get() as unknown as Record<string, unknown>,
      replace: (next) => crm.replace(next as unknown as CrmState),
      subscribe: (fn) => {
        const off = crm.subscribe(fn);
        return () => {
          off();
        };
      },
    });
  }
  return hydrateCloudStores();
}
