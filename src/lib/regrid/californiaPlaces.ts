/**
 * Rough demo anchors for natural-language copilot (not a geocoder).
 * Order matters: more specific phrases before broader ones.
 */
export const CALIFORNIA_PLACE_HINTS: { re: RegExp; center: [number, number]; label: string }[] = [
  { re: /\bsilicon valley\b/, center: [-121.96, 37.37], label: "silicon_valley" },
  { re: /\bsan francisco\b/, center: [-122.4194, 37.7749], label: "san_francisco" },
  { re: /\bsan jose\b/, center: [-121.8863, 37.3382], label: "san_jose" },
  { re: /\bsacramento\b/, center: [-121.4944, 38.5816], label: "sacramento" },
  { re: /\boakland\b/, center: [-122.2712, 37.8044], label: "oakland" },
  { re: /\bberkeley\b/, center: [-122.2725, 37.8716], label: "berkeley" },
  { re: /\bpalo alto\b/, center: [-122.143, 37.4419], label: "palo_alto" },
  { re: /\bfresno\b/, center: [-119.7871, 36.7378], label: "fresno" },
  { re: /\bbakersfield\b/, center: [-119.0187, 35.3733], label: "bakersfield" },
  { re: /\blos angeles\b/, center: [-118.2437, 34.0522], label: "los_angeles" },
  { re: /\blong beach\b/, center: [-118.1937, 33.7701], label: "long_beach" },
  { re: /\bsan diego\b/, center: [-117.1611, 32.7157], label: "san_diego" },
  { re: /\banaheim\b/, center: [-117.9145, 33.8366], label: "anaheim" },
  { re: /\briverside\b/, center: [-117.3962, 33.9533], label: "riverside" },
  { re: /\bsan bernardino\b/, center: [-117.2898, 34.1083], label: "san_bernardino" },
  { re: /\bontario\b/, center: [-117.6509, 34.0633], label: "ontario_ca" },
  { re: /\bpomona\b/, center: [-117.7503, 34.0551], label: "pomona" },
  { re: /\binland empire\b/, center: [-117.29, 34.06], label: "inland_empire" },
  { re: /\bcentral valley\b/, center: [-119.55, 36.35], label: "central_valley" },
];

export function matchCaliforniaPlaceHint(textLower: string): { center: [number, number]; label: string } | null {
  for (const row of CALIFORNIA_PLACE_HINTS) {
    if (row.re.test(textLower)) return { center: row.center, label: row.label };
  }
  return null;
}
