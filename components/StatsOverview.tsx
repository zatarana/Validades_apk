import React from 'react';
import { Product } from '../types';
import { AlertTriangle, Package } from 'lucide-react';

interface StatsOverviewProps {
  products: Product[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ products }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const total = products.length;
  
  const expired = products.filter(p => {
    if (!p.batches || !Array.isArray(p.batches)) return false;
    return p.batches.some(batch => {
      const d = new Date(batch.expirationDate);
      d.setHours(0, 0, 0, 0);
      return d < today;
    });
  }).length;

  const warning = products.filter(p => {
    if (!p.batches || !Array.isArray(p.batches)) return false;
    // We only count as "Warning" if it's NOT expired but has at least one batch expiring soon
    const hasExpiredBatch = p.batches.some(batch => {
      const d = new Date(batch.expirationDate);
      d.setHours(0, 0, 0, 0);
      return d < today;
    });

    if (hasExpiredBatch) return false;

    return p.batches.some(batch => {
      const d = new Date(batch.expirationDate);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    });
  }).length;

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-full mb-2">
          <Package className="w-5 h-5" />
        </div>
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">Total</span>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <div className="p-2 bg-orange-50 text-orange-600 rounded-full mb-2">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <span className="text-2xl font-bold text-gray-900">{warning}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">Atenção</span>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <div className="p-2 bg-red-50 text-red-600 rounded-full mb-2">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <span className="text-2xl font-bold text-gray-900">{expired}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">Vencidos</span>
      </div>
    </div>
  );
};