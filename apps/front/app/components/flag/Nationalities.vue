<script lang="ts" setup>
interface Props {
  nationalities?: string[] | string | null;
  size?: "sm" | "md" | "lg";
  fallbackToContinent?: boolean;
}

const { nationalities = null, size = "md", fallbackToContinent = true } = defineProps<Props>();

const sizeClasses = {
  lg: "w-6 h-4",
  md: "w-4 h-3",
  sm: "w-3 h-2",
};

type StringLookup = Readonly<Record<string, string>>;

const lookupStringMap = (map: StringLookup, key: string): string | undefined => {
  for (const [entryKey, value] of Object.entries(map)) {
    if (entryKey === key) {
      return value;
    }
  }

  return undefined;
};

const getContinent = (countryCode: string): string => {
  const continentMap = {
    AD: "EU",
    AE: "AS",
    AF: "AS",
    AL: "EU",
    AM: "AS",
    AO: "AF",
    AR: "SA",
    AT: "EU",
    AU: "OC",
    AZ: "AS",
    BA: "EU",
    BD: "AS",
    BE: "EU",
    BF: "AF",
    BG: "EU",
    BH: "AS",
    BI: "AF",
    BJ: "AF",
    BN: "AS",
    BO: "SA",
    BR: "SA",
    BT: "AS",
    BW: "AF",
    BY: "EU",
    BZ: "NA",
    CA: "NA",
    CD: "AF",
    CF: "AF",
    CG: "AF",
    CH: "EU",
    CI: "AF",
    CL: "SA",
    CM: "AF",
    CN: "AS",
    CO: "SA",
    CR: "NA",
    CV: "AF",
    CY: "EU",
    CZ: "EU",
    DE: "EU",
    DJ: "AF",
    DK: "EU",
    DZ: "AF",
    EC: "SA",
    EE: "EU",
    EG: "AF",
    ER: "AF",
    ES: "EU",
    ET: "AF",
    FI: "EU",
    FJ: "OC",
    FK: "SA",
    FM: "OC",
    FR: "EU",
    GA: "AF",
    GB: "EU",
    GE: "AS",
    GF: "SA",
    GH: "AF",
    GM: "AF",
    GN: "AF",
    GQ: "AF",
    GR: "EU",
    GT: "NA",
    GW: "AF",
    GY: "SA",
    HN: "NA",
    HR: "EU",
    HU: "EU",
    ID: "AS",
    IE: "EU",
    IL: "AS",
    IN: "AS",
    IQ: "AS",
    IR: "AS",
    IS: "EU",
    IT: "EU",
    JO: "AS",
    JP: "AS",
    KE: "AF",
    KG: "AS",
    KH: "AS",
    KI: "OC",
    KM: "AF",
    KP: "AS",
    KR: "AS",
    KW: "AS",
    KZ: "AS",
    LA: "AS",
    LB: "AS",
    LI: "EU",
    LK: "AS",
    LR: "AF",
    LS: "AF",
    LT: "EU",
    LU: "EU",
    LV: "EU",
    LY: "AF",
    MA: "AF",
    MC: "EU",
    MD: "EU",
    ME: "EU",
    MG: "AF",
    MH: "OC",
    MK: "EU",
    ML: "AF",
    MM: "AS",
    MN: "AS",
    MR: "AF",
    MT: "EU",
    MU: "AF",
    MV: "AS",
    MW: "AF",
    MX: "NA",
    MY: "AS",
    MZ: "AF",
    NA: "AF",
    NE: "AF",
    NG: "AF",
    NI: "NA",
    NL: "EU",
    NO: "EU",
    NP: "AS",
    NR: "OC",
    NZ: "OC",
    OM: "AS",
    PA: "NA",
    PE: "SA",
    PG: "OC",
    PH: "AS",
    PK: "AS",
    PL: "EU",
    PS: "AS",
    PT: "EU",
    PW: "OC",
    PY: "SA",
    QA: "AS",
    RO: "EU",
    RS: "EU",
    RU: "EU",
    RW: "AF",
    SA: "AS",
    SB: "OC",
    SC: "AF",
    SD: "AF",
    SE: "EU",
    SG: "AS",
    SI: "EU",
    SK: "EU",
    SL: "AF",
    SM: "EU",
    SN: "AF",
    SO: "AF",
    SR: "SA",
    SS: "AF",
    ST: "AF",
    SV: "NA",
    SY: "AS",
    SZ: "AF",
    TD: "AF",
    TG: "AF",
    TH: "AS",
    TJ: "AS",
    TL: "AS",
    TM: "AS",
    TN: "AF",
    TO: "OC",
    TR: "AS",
    TV: "OC",
    TW: "AS",
    TZ: "AF",
    UA: "EU",
    UG: "AF",
    US: "NA",
    UY: "SA",
    UZ: "AS",
    VA: "EU",
    VE: "SA",
    VN: "AS",
    VU: "OC",
    WS: "OC",
    YE: "AS",
    ZA: "AF",
    ZM: "AF",
    ZW: "AF",
  } as const;

  return lookupStringMap(continentMap, countryCode.toUpperCase()) ?? "UNKNOWN";
};

const flagToDisplay = computed(() => {
  if (!nationalities) {
    return null;
  }

  const nationalitiesArray = Array.isArray(nationalities) ? nationalities : [nationalities];

  const validNationalities = nationalitiesArray.filter((n) => n && n.trim());

  if (validNationalities.length === 0) {
    return null;
  }

  if (validNationalities.length === 1) {
    return validNationalities[0]?.toLowerCase() || null;
  }

  const nationalityCounts: Record<string, number> = {};
  const continentCounts: Record<string, number> = {};

  for (const nationality of validNationalities) {
    const upperNationality = nationality.toUpperCase();
    nationalityCounts[upperNationality] = (nationalityCounts[upperNationality] || 0) + 1;
    const continent = getContinent(upperNationality);

    if (continent !== "UNKNOWN") {
      continentCounts[continent] = (continentCounts[continent] || 0) + 1;
    }
  }

  const totalCount = validNationalities.length;

  for (const [nationality, count] of Object.entries(nationalityCounts)) {
    if (count / totalCount > 0.5) {
      return nationality.toLowerCase();
    }
  }

  if (!fallbackToContinent) {
    const mostCommonNationality = Object.entries(nationalityCounts).toSorted(
      ([, a], [, b]) => b - a,
    )[0]?.[0];

    return mostCommonNationality?.toLowerCase() || null;
  }

  const mostCommonContinent = Object.entries(continentCounts).toSorted(
    ([, a], [, b]) => b - a,
  )[0]?.[0];

  const continentFlags = {
    AF: "za",
    AS: "cn",
    EU: "eu",
    NA: "us",
    OC: "au",
    SA: "br",
  } as const;

  return mostCommonContinent ? lookupStringMap(continentFlags, mostCommonContinent) || null : null;
});

const tooltipText = computed(() => {
  if (!nationalities) {
    return "";
  }

  const nationalitiesArray = Array.isArray(nationalities) ? nationalities : [nationalities];

  const validNationalities = nationalitiesArray.filter((n) => n && n.trim());

  if (validNationalities.length <= 1) {
    return "";
  }

  return `Nationalities: ${validNationalities.join(", ")}`;
});
</script>

<template>
  <STooltip v-if="flagToDisplay" :text="tooltipText">
    <img
      :src="`/flags/${flagToDisplay}.svg`"
      alt=""
      width="4"
      height="3"
      loading="lazy"
      decoding="async"
      :class="sizeClasses[size]"
      class="inline-block"
    />
  </STooltip>
</template>
