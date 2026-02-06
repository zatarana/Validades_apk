import React, { useEffect, useRef } from 'react';
import { X, Calendar, Tag, Store, Clock, Pencil, AlertTriangle, CheckCircle, Trash2, Package } from 'lucide-react';
import { Product } from '../types';
import JsBarcode from 'jsbarcode';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onDeleteBatch?: (productId: string, batchId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onEdit, onDelete, onDeleteBatch }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (product?.barcode && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, product.barcode, {
          lineColor: "#000", width: 2, height: 50, displayValue: true, fontSize: 12
        });
      } catch (e) {}
    }
  }, [product]);

  if (!product) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedBatches = [...product.batches].sort((a, b) => 
    new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b flex justify-between items-start bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-xs text-gray-500 font-medium uppercase mt-1">{product.brand || 'Sem Marca'} • {product.category || 'Sem Categoria'}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lotes Cadastrados</h3>
            {sortedBatches.map((batch, idx) => {
              const exp = new Date(batch.expirationDate);
              const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isExpired = diff < 0;
              const isWarning = diff >= 0 && diff <= 7;

              return (
                <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Vencimento</span>
                    <span className={`font-bold ${isExpired ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-gray-900'}`}>
                      {exp.toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-gray-500">{batch.lotNumber || 'Lote não identificado'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Qtd</span>
                      <span className="text-lg font-black text-brand-600">{batch.quantity}</span>
                    </div>
                    {onDeleteBatch && (
                      <button 
                        onClick={() => onDeleteBatch(product.id, batch.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        title="Remover este lote"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {product.barcode && (
            <div className="flex flex-col items-center py-4 bg-gray-50 rounded-xl border-dashed border">
              <svg ref={barcodeRef}></svg>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button onClick={() => { onEdit(product); onClose(); }} className="flex-1 py-3 border bg-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50"><Pencil className="w-4 h-4" /> Editar Tudo</button>
          <button onClick={() => onDelete(product.id)} className="flex-1 py-3 border bg-white text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50"><Trash2 className="w-4 h-4" /> Excluir Produto</button>
        </div>
      </div>
    </div>
  );
};