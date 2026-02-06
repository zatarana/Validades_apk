
export interface Batch {
  id: string;
  expirationDate: string; // YYYY-MM-DD
  quantity: number;
  lotNumber?: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  category?: string;
  imageUrl?: string;
  addedAt: number;
  batches: Batch[];
}

export type BarcodeMapping = {
  name: string;
  brand?: string;
  category: string;
};

export interface BarcodeDbMapping {
  name: string;
  brand?: string;
  category: string;
}

export type BarcodeDb = Record<string, BarcodeDbMapping>;

export interface BackupData {
  products: Product[];
  barcodeDb: BarcodeDb;
  version: string;
}

export enum SortOption {
  EXPIRATION_ASC = 'EXPIRATION_ASC',
  EXPIRATION_DESC = 'EXPIRATION_DESC',
  NAME_ASC = 'NAME_ASC',
  BRAND_ASC = 'BRAND_ASC',
  ADDED_DATE_DESC = 'ADDED_DATE_DESC',
}

export enum FilterStatus {
  ALL = 'ALL',
  EXPIRED = 'EXPIRED',
  WARNING = 'WARNING',
  GOOD = 'GOOD',
}

export type ExpirationWindow = 'ALL' | '5' | '10' | '15' | '20' | '30';

export interface ProductSuggestion {
  name: string;
  brand?: string;
  category: string;
  searchSourceUrls?: string[];
}
