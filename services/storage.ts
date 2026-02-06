import { Product, BarcodeDb } from '../types';

const STORAGE_KEY = 'validade_ai_products';
const BARCODE_DB_KEY = 'validade_ai_barcodes';
const GOOGLE_CLIENT_ID_KEY = 'validade_ai_google_client_id';

export const saveProducts = (products: Product[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    console.error('Failed to save products', error);
  }
};

export const loadProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

export const saveBarcodeDb = (db: BarcodeDb): void => {
  try {
    localStorage.setItem(BARCODE_DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Failed to save barcode database', error);
  }
};

export const loadBarcodeDb = (): BarcodeDb => {
  try {
    const stored = localStorage.getItem(BARCODE_DB_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
};

export const saveGoogleClientId = (id: string): void => {
  localStorage.setItem(GOOGLE_CLIENT_ID_KEY, id);
};

export const loadGoogleClientId = (): string => {
  return localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || '';
};