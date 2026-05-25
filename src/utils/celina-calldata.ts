import { concat, stringToHex, type Hex } from "viem";

export const CELINA_CALLDATA_TAG = stringToHex("CELINA");

export function appendCelinaCalldataTag(data?: Hex): Hex {
  if (!data || data === "0x") {
    return CELINA_CALLDATA_TAG;
  }

  if (data.endsWith(CELINA_CALLDATA_TAG.slice(2))) {
    return data;
  }

  return concat([data, CELINA_CALLDATA_TAG]);
}
