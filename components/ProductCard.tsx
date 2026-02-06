import React from 'react';
import { Product } from '../types';
import { Trash2, Calendar, Pencil, Package } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onDelete: (id: string) => void;
  onEdit: (product: Product) => void;
  onClick: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onDelete, onEdit, onClick }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Safely find nearest expiration from all batches
  const batches = Array.isArray(product.batches) ? product.batches : [];
  
  if (batches.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-red-200 bg-red-50">
        <p className="text-red-600 text-sm font-bold">Erro: Produto sem lotes válidos.</p>
        <button onClick={() => onDelete(product.id)} className="text-xs underline text-red-500 mt-2">Remover item corrompido</button>
      </div>
    );
  }

  const nearestBatch = [...batches].sort((a, b) => 
    new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
  )[0];

  const expDate = new Date(nearestBatch.expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let statusColor = "bg-white border-gray-200";
  let badgeColor = "bg-green-100 text-green-800";
  let statusText = `${diffDays} dias restantes`;

  if (diffDays < 0) {
    statusColor = "bg-red-50 border-red-200";
    badgeColor = "bg-red-100 text-red-800";
    statusText = `Venceu há ${Math.abs(diffDays)} dias`;
  } else if (diffDays === 0) {
    statusColor = "bg-red-50 border-red-200";
    badgeColor = "bg-red-100 text-red-800";
    statusText = "Vence hoje!";
  } else if (diffDays <= 7) {
    statusColor = "bg-orange-50 border-orange-200";
    badgeColor = "bg-orange-100 text-orange-800";
    statusText = `Vence em ${diffDays} dias`;
  }

  const totalQuantity = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);

  return (
    <div 
      onClick={() => onClick(product)}
      className={`relative p-4 rounded-xl border shadow-sm transition-all hover:shadow-md cursor-pointer ${statusColor} flex flex-col group`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 pr-16">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight">{product.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
              {statusText}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 gap-1 uppercase tracking-wider">
              <Package className="w-3 h-3" /> {totalQuantity} unidades
            </span>
          </div>
        </div>
        
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onEdit(product); }} className="p-2 bg-white/80 rounded-full text-gray-400 hover:text-blue-600 border shadow-sm"><Pencil className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(product.id); }} className="p-2 bg-white/80 rounded-full text-gray-400 hover:text-red-600 border shadow-sm"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 font-medium">
          <Calendar className="w-4 h-4" />
          <span>Prox. Venc: {expDate.toLocaleDateString('pt-BR')}</span>
        </div>
        {batches.length > 1 && (
          <span className="text-brand-600 font-bold">+{batches.length - 1} lotes</span>
        )}
      </div>
    </div>
  );
};