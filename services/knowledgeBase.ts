import { BarcodeDb } from '../types';

/**
 * Esta é a base de conhecimento "dentro do código". 
 * Você pode adicionar novos produtos aqui manualmente se desejar que eles 
 * estejam sempre disponíveis, independente do cache do navegador.
 */
export const PREDEFINED_BARCODES: BarcodeDb = {
  "7891000053508": {
    name: "Leite Condensado Moça",
    brand: "Nestlé",
    category: "Mercearia Doce"
  },
  "7891000100103": {
    name: "Cereal Nescau",
    brand: "Nestlé",
    category: "Matinal"
  },
  "7894900011517": {
    name: "Coca-Cola 2L",
    brand: "Coca-Cola",
    category: "Bebidas"
  }
};