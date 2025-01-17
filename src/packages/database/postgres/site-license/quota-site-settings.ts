/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { getServerSettings } from "@cocalc/server/settings";
import { KUCALC_ON_PREMISES } from "@cocalc/util/db-schema/site-defaults";
import { SiteSettingsQuotas } from "@cocalc/util/upgrades/quota";

export async function getQuotaSiteSettings(): Promise<
  SiteSettingsQuotas | undefined
> {
  const allSettings = await getServerSettings();
  // default_quotas and max_upgrades only play a role for cocalc-cloud
  // it's fine to pass down "undefined" to the quota calculation function
  if (allSettings.kucalc === KUCALC_ON_PREMISES) {
    return {
      default_quotas: allSettings.default_quotas,
      max_upgrades: allSettings.max_upgrades,
    };
  }
}
