<script lang="ts" setup>
interface Props {
  nationalities?: string[] | string | null;
  size?: "sm" | "md" | "lg";
  fallbackToContinent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  nationalities: null,
  size: "md",
  fallbackToContinent: true,
});

const sizeClasses = {
  sm: "w-3 h-2",
  md: "w-4 h-3",
  lg: "w-6 h-4",
};

const getContinent = (countryCode: string): string => {
  const continentMap: Record<string, string> = {
    // Europe
    AD: "EU",
    AL: "EU",
    AT: "EU",
    BY: "EU",
    BE: "EU",
    BA: "EU",
    BG: "EU",
    HR: "EU",
    CY: "EU",
    CZ: "EU",
    DK: "EU",
    EE: "EU",
    FI: "EU",
    FR: "EU",
    DE: "EU",
    GR: "EU",
    HU: "EU",
    IS: "EU",
    IE: "EU",
    IT: "EU",
    LV: "EU",
    LI: "EU",
    LT: "EU",
    LU: "EU",
    MT: "EU",
    MD: "EU",
    MC: "EU",
    ME: "EU",
    NL: "EU",
    MK: "EU",
    NO: "EU",
    PL: "EU",
    PT: "EU",
    RO: "EU",
    RU: "EU",
    SM: "EU",
    RS: "EU",
    SK: "EU",
    SI: "EU",
    ES: "EU",
    SE: "EU",
    CH: "EU",
    UA: "EU",
    GB: "EU",
    VA: "EU",
    // North America
    US: "NA",
    CA: "NA",
    MX: "NA",
    GT: "NA",
    BZ: "NA",
    SV: "NA",
    HN: "NA",
    NI: "NA",
    CR: "NA",
    PA: "NA",
    // South America
    AR: "SA",
    BO: "SA",
    BR: "SA",
    CL: "SA",
    CO: "SA",
    EC: "SA",
    FK: "SA",
    GF: "SA",
    GY: "SA",
    PY: "SA",
    PE: "SA",
    SR: "SA",
    UY: "SA",
    VE: "SA",
    // Asia
    AF: "AS",
    AM: "AS",
    AZ: "AS",
    BH: "AS",
    BD: "AS",
    BT: "AS",
    BN: "AS",
    KH: "AS",
    CN: "AS",
    GE: "AS",
    IN: "AS",
    ID: "AS",
    IR: "AS",
    IQ: "AS",
    IL: "AS",
    JP: "AS",
    JO: "AS",
    KZ: "AS",
    KW: "AS",
    KG: "AS",
    LA: "AS",
    LB: "AS",
    MY: "AS",
    MV: "AS",
    MN: "AS",
    MM: "AS",
    NP: "AS",
    KP: "AS",
    KR: "AS",
    OM: "AS",
    PK: "AS",
    PS: "AS",
    PH: "AS",
    QA: "AS",
    SA: "AS",
    SG: "AS",
    LK: "AS",
    SY: "AS",
    TW: "AS",
    TJ: "AS",
    TH: "AS",
    TL: "AS",
    TR: "AS",
    TM: "AS",
    AE: "AS",
    UZ: "AS",
    VN: "AS",
    YE: "AS",
    // Africa
    DZ: "AF",
    AO: "AF",
    BJ: "AF",
    BW: "AF",
    BF: "AF",
    BI: "AF",
    CM: "AF",
    CV: "AF",
    CF: "AF",
    TD: "AF",
    KM: "AF",
    CG: "AF",
    CD: "AF",
    CI: "AF",
    DJ: "AF",
    EG: "AF",
    GQ: "AF",
    ER: "AF",
    ET: "AF",
    GA: "AF",
    GM: "AF",
    GH: "AF",
    GN: "AF",
    GW: "AF",
    KE: "AF",
    LS: "AF",
    LR: "AF",
    LY: "AF",
    MG: "AF",
    MW: "AF",
    ML: "AF",
    MR: "AF",
    MU: "AF",
    MA: "AF",
    MZ: "AF",
    NA: "AF",
    NE: "AF",
    NG: "AF",
    RW: "AF",
    ST: "AF",
    SN: "AF",
    SC: "AF",
    SL: "AF",
    SO: "AF",
    ZA: "AF",
    SS: "AF",
    SD: "AF",
    SZ: "AF",
    TZ: "AF",
    TG: "AF",
    TN: "AF",
    UG: "AF",
    ZM: "AF",
    ZW: "AF",
    // Oceania
    AU: "OC",
    FJ: "OC",
    KI: "OC",
    MH: "OC",
    FM: "OC",
    NR: "OC",
    NZ: "OC",
    PW: "OC",
    PG: "OC",
    WS: "OC",
    SB: "OC",
    TO: "OC",
    TV: "OC",
    VU: "OC",
  };
  return continentMap[countryCode.toUpperCase()] || "UNKNOWN";
};

const flagToDisplay = computed(() => {
  if (!props.nationalities) return null;

  const nationalitiesArray = Array.isArray(props.nationalities)
    ? props.nationalities
    : [props.nationalities];

  const validNationalities = nationalitiesArray.filter((n) => n && n.trim());

  if (validNationalities.length === 0) return null;

  if (validNationalities.length === 1) {
    return validNationalities[0]?.toLowerCase() || null;
  }

  const nationalityCounts: Record<string, number> = {};
  const continentCounts: Record<string, number> = {};

  validNationalities.forEach((nationality) => {
    const upperNationality = nationality.toUpperCase();
    nationalityCounts[upperNationality] = (nationalityCounts[upperNationality] || 0) + 1;
    const continent = getContinent(upperNationality);
    if (continent !== "UNKNOWN") {
      continentCounts[continent] = (continentCounts[continent] || 0) + 1;
    }
  });

  const totalCount = validNationalities.length;
  for (const [nationality, count] of Object.entries(nationalityCounts)) {
    if (count / totalCount > 0.5) {
      return nationality.toLowerCase();
    }
  }

  if (!props.fallbackToContinent) {
    const mostCommonNationality = Object.entries(nationalityCounts).sort(
      ([, a], [, b]) => b - a,
    )[0]?.[0];
    return mostCommonNationality?.toLowerCase() || null;
  }

  const mostCommonContinent = Object.entries(continentCounts).sort(([, a], [, b]) => b - a)[0]?.[0];

  const continentFlags: Record<string, string> = {
    EU: "eu",
    NA: "us",
    SA: "br",
    AS: "cn",
    AF: "za",
    OC: "au",
  };

  return mostCommonContinent ? continentFlags[mostCommonContinent] || null : null;
});

const tooltipText = computed(() => {
  if (!props.nationalities) return "";

  const nationalitiesArray = Array.isArray(props.nationalities)
    ? props.nationalities
    : [props.nationalities];

  const validNationalities = nationalitiesArray.filter((n) => n && n.trim());

  if (validNationalities.length <= 1) return "";

  return `Nationalities: ${validNationalities.join(", ")}`;
});
</script>

<template>
  <UTooltip v-if="flagToDisplay" :text="tooltipText" :popper="{ placement: 'top' }">
    <UIcon :name="`flag:${flagToDisplay}-4x3`" :class="sizeClasses[size]" class="inline-block" />
  </UTooltip>
</template>
