type SdgIndicator = {
  id: string;
  name: string;
  indicatorCode: string;
  weight: number;
  schemeSuccess: number;
  direction?: "higher" | "lower";
};

export const SDG_INDICATORS: SdgIndicator[] = [
  { id: "sdg1", name: "No Poverty", indicatorCode: "1.1.1", weight: 0.06, schemeSuccess: 0.68, direction: "lower" },
  { id: "sdg2", name: "Zero Hunger", indicatorCode: "2.1.2", weight: 0.06, schemeSuccess: 0.64, direction: "lower" },
  { id: "sdg3", name: "Good Health", indicatorCode: "3.1.1", weight: 0.06, schemeSuccess: 0.7, direction: "lower" },
  { id: "sdg4", name: "Quality Education", indicatorCode: "4.1.1", weight: 0.06, schemeSuccess: 0.66 },
  { id: "sdg5", name: "Gender Equality", indicatorCode: "5.1.1", weight: 0.06, schemeSuccess: 0.63 },
  { id: "sdg6", name: "Clean Water", indicatorCode: "6.1.1", weight: 0.06, schemeSuccess: 0.65 },
  { id: "sdg7", name: "Affordable Energy", indicatorCode: "7.1.1", weight: 0.06, schemeSuccess: 0.71 },
  { id: "sdg8", name: "Decent Work", indicatorCode: "8.1.1", weight: 0.06, schemeSuccess: 0.62 },
  { id: "sdg9", name: "Industry & Innovation", indicatorCode: "9.1.1", weight: 0.06, schemeSuccess: 0.69 },
  { id: "sdg10", name: "Reduced Inequality", indicatorCode: "10.1.1", weight: 0.05, schemeSuccess: 0.6 },
  { id: "sdg11", name: "Sustainable Cities", indicatorCode: "11.1.1", weight: 0.05, schemeSuccess: 0.64, direction: "lower" },
  { id: "sdg12", name: "Responsible Consumption", indicatorCode: "12.1.1", weight: 0.06, schemeSuccess: 0.61 },
  { id: "sdg13", name: "Climate Action", indicatorCode: "13.1.1", weight: 0.07, schemeSuccess: 0.67, direction: "lower" },
  { id: "sdg14", name: "Life Below Water", indicatorCode: "14.1.1", weight: 0.05, schemeSuccess: 0.58, direction: "lower" },
  { id: "sdg15", name: "Life On Land", indicatorCode: "15.1.1", weight: 0.06, schemeSuccess: 0.62 },
  { id: "sdg16", name: "Peace & Justice", indicatorCode: "16.1.1", weight: 0.06, schemeSuccess: 0.6, direction: "lower" },
  { id: "sdg17", name: "Partnerships", indicatorCode: "17.1.1", weight: 0.05, schemeSuccess: 0.65 },
];

export const SDG_SAMPLE_COUNTRIES = [
  "India",
  "China",
  "United States",
  "Germany",
  "Brazil",
  "South Africa",
  "Japan",
  "Australia",
] as const;

export const SDG_YEARS = Array.from({ length: 10 }, (_, idx) => 2015 + idx);

type Contribution = {
  id: string;
  name: string;
  indicatorCode: string;
  weight: number;
  schemeSuccess: number;
  performance: number;
  weightedScore: number;
};

type IndexPoint = {
  year: number;
  country: string;
  index: number;
};

export type SdgContribution = {
  id: string;
  name: string;
  indicatorCode: string;
  weight: number;
  schemeSuccess: number;
  performance: number;
  weightedScore: number;
};

export type SdgIndexResponse = {
  ok: boolean;
  countries: { code: number; name: string }[];
  years: number[];
  series: IndexPoint[];
  contributions: SdgContribution[];
  source: "unsd" | "sample";
};

const COUNTRY_BASE: Record<string, number> = {
  India: 52,
  China: 60,
  "United States": 72,
  Germany: 76,
  Brazil: 58,
  "South Africa": 54,
  Japan: 74,
  Australia: 73,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function indicatorPerformance(country: string, year: number, indicatorId: string) {
  const base = COUNTRY_BASE[country] ?? 55;
  const yearTrend = (year - 2015) * 1.2;
  const indicatorBias = (hashString(indicatorId) % 13) - 6;
  const countryBias = (hashString(country) % 11) - 5;
  const yearNoise = (hashString(`${country}-${year}-${indicatorId}`) % 7) - 3;
  return clamp(base + yearTrend + indicatorBias + countryBias + yearNoise, 28, 95);
}

function computeIndex(performance: Record<string, number>) {
  const totalWeight = SDG_INDICATORS.reduce((sum, i) => sum + i.weight, 0);
  let weightedSum = 0;
  const contributions: Contribution[] = SDG_INDICATORS.map((indicator) => {
    const value = performance[indicator.id] ?? 0;
    const weightedScore = value * indicator.weight * indicator.schemeSuccess;
    weightedSum += weightedScore;
    return {
      id: indicator.id,
      name: indicator.name,
      indicatorCode: indicator.indicatorCode,
      weight: indicator.weight,
      schemeSuccess: indicator.schemeSuccess,
      performance: value,
      weightedScore,
    };
  });

  return {
    index: totalWeight ? weightedSum / totalWeight : 0,
    contributions,
  };
}

function getCountryPerformance(country: string, year: number) {
  return SDG_INDICATORS.reduce<Record<string, number>>((acc, indicator) => {
    acc[indicator.id] = indicatorPerformance(country, year, indicator.id);
    return acc;
  }, {});
}

export function buildSdgIndexSeries() {
  const series: Record<string, IndexPoint[]> = {};
  for (const country of SDG_SAMPLE_COUNTRIES) {
    series[country] = SDG_YEARS.map((year) => {
      const performance = getCountryPerformance(country, year);
      const { index } = computeIndex(performance);
      return { year, country, index: Number(index.toFixed(2)) };
    });
  }

  series.World = SDG_YEARS.map((year) => {
    const values = SDG_SAMPLE_COUNTRIES.map((country) => {
      const performance = getCountryPerformance(country, year);
      return computeIndex(performance).index;
    });
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { year, country: "World", index: Number(avg.toFixed(2)) };
  });

  return series;
}

export function getSdgIndicatorContributions(country: string, year: number) {
  if (country === "World") {
    const totals = SDG_INDICATORS.reduce<Record<string, number>>((acc, indicator) => {
      acc[indicator.id] = 0;
      return acc;
    }, {});

    for (const sampleCountry of SDG_SAMPLE_COUNTRIES) {
      const performance = getCountryPerformance(sampleCountry, year);
      for (const indicator of SDG_INDICATORS) {
        totals[indicator.id] += performance[indicator.id] ?? 0;
      }
    }

    const avgPerformance = SDG_INDICATORS.reduce<Record<string, number>>((acc, indicator) => {
      acc[indicator.id] = totals[indicator.id] / SDG_SAMPLE_COUNTRIES.length;
      return acc;
    }, {});

    return computeIndex(avgPerformance);
  }

  const performance = getCountryPerformance(country, year);
  return computeIndex(performance);
}
