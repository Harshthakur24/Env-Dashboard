export type ApiRow = {
  id: string;
  location: string;
  visitDate: string;
  composters: number;
  wetWasteKg: number;
  brownWasteKg: number;
  leachateL: number;
  harvestKg: number;
};

export type Row = Omit<ApiRow, "visitDate"> & { visitDate: Date };
