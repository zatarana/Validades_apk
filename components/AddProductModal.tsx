
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Search, Loader2, Sparkles, ScanLine, StopCircle, AlertTriangle, Plus, Trash2, Calendar, CheckCircle2, Tag, ExternalLink } from 'lucide-react';
import { identifyProductByBarcode } from '../services/gemini';
import { Product, Batch, BarcodeDb, ProductSuggestion } from '../types';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'addedAt'>) => void;
  initialData?: Product | null;
  barcodeDb: BarcodeDb;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSave, initialData, barcodeDb }) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [batches, setBatches] = useState<Batch[]>([{ id: generateId(), expirationDate: '', quantity: 1 }]);
  
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocalMatch, setIsLocalMatch] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<ProductSuggestion | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setBrand(initialData.brand || '');
        setBarcode(initialData.barcode || '');
        setCategory(initialData.category || '');
        setBatches(initialData.batches);
      } else {
        setName('');
        setBrand('');
        setBarcode('');
        setCategory('');
        setBatches([{ id: generateId(), expirationDate: '', quantity: 1 }]);
      }
      setError(null);
      setIsLocalMatch(false);
      setAiSuggestion(null);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (barcode && barcodeDb[barcode] && !initialData) {
      const match = barcodeDb[barcode];
      if (name === '' || name !== match.name) {
        setName(match.name);
        setBrand(match.brand || '');
        setCategory(match.category);
        setIsLocalMatch(true);
        setTimeout(() => setIsLocalMatch(false), 3000);
      }
    }
  }, [barcode, barcodeDb, initialData, name]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch (e) {}
      setIsScanning(false);
    }
  };

  const startScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          setBarcode(decodedText);
          stopScanner();
        },
        () => {}
      ).catch(() => {
        setError("Erro ao acessar câmera.");
        setIsScanning(false);
      });
    }, 100);
  };

  const handleAiLookup = async () => {
    if (!barcode) return;
    setIsIdentifying(true);
    setAiSuggestion(null);
    try {
      const result = await identifyProductByBarcode(barcode);
      if (result) {
        setName(result.name);
        setCategory(result.category);
        if (result.brand) setBrand(result.brand);
        setAiSuggestion(result);
      } else {
        setError("Não foi possível identificar com IA.");
      }
    } catch (e) {
      setError("Falha na conexão com IA.");
    } finally {
      setIsIdentifying(false);
    }
  };

  const addBatch = () => {
    setBatches([...batches, { id: generateId(), expirationDate: '', quantity: 1 }]);
  };

  const removeBatch = (id: string) => {
    if (batches.length > 1) {
      setBatches(batches.filter(b => b.id !== id));
    }
  };

  const updateBatch = (id: string, field: keyof Batch, value: any) => {
    setBatches(batches.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || batches.some(b => !b.expirationDate)) {
      setError("Preencha o nome e todas as validades.");
      return;
    }
    onSave({ name, brand, barcode, category, batches });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-auto animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            {initialData ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {isScanning && (
            <div className="relative bg-black rounded-lg overflow-hidden">
              <div id="reader" className="w-full aspect-square"></div>
              <button type="button" onClick={stopScanner} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-white">Cancelar</button>
            </div>
          )}

          {!isScanning && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Código de barras..."
                    className="w-full pl-9 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {isLocalMatch && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-600 animate-in zoom-in">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <button type="button" onClick={startScanner} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><Camera className="w-5 h-5" /></button>
                <button 
                  type="button" 
                  onClick={handleAiLookup} 
                  disabled={!barcode || isIdentifying}
                  className="px-3 bg-brand-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                  title="Consultar Gemini AI"
                >
                  {isIdentifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  IA
                </button>
              </div>

              {isLocalMatch && (
                <p className="text-[10px] text-brand-600 font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Identificado na memória local
                </p>
              )}

              {/* Display grounding URLs from Google Search as required by guidelines */}
              {aiSuggestion?.searchSourceUrls && aiSuggestion.searchSourceUrls.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-1">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Search className="w-3 h-3" /> Fontes da Pesquisa Gemini:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestion.searchSourceUrls.slice(0, 3).map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[9px] text-blue-500 underline truncate max-w-[150px] flex items-center gap-0.5 hover:text-blue-700"
                      >
                        <ExternalLink className="w-2 h-2" /> {new URL(url).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome do Produto*</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Arroz Integral" className="p-2 border rounded-lg w-full" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Marca</label>
                  <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex: Tio João" className="p-2 border rounded-lg w-full" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Categoria</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    placeholder="Ex: Alimentos, Limpeza, etc." 
                    className="w-full pl-9 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-600 uppercase">Lotes e Validades</h3>
                  <button type="button" onClick={addBatch} className="text-brand-600 text-xs font-bold flex items-center gap-1 hover:underline">
                    <Plus className="w-3 h-3" /> Adicionar Lote
                  </button>
                </div>
                {batches.map((batch, index) => (
                  <div key={batch.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input 
                          type="date" 
                          value={batch.expirationDate} 
                          onChange={e => updateBatch(batch.id, 'expirationDate', e.target.value)} 
                          className="flex-1 p-1.5 text-sm border rounded bg-white" 
                        />
                        <input 
                          type="number" 
                          value={batch.quantity} 
                          onChange={e => updateBatch(batch.id, 'quantity', parseInt(e.target.value))} 
                          placeholder="Qtd"
                          className="w-16 p-1.5 text-sm border rounded bg-white text-center" 
                        />
                      </div>
                      <input 
                        type="text" 
                        value={batch.lotNumber || ''} 
                        onChange={e => updateBatch(batch.id, 'lotNumber', e.target.value)} 
                        placeholder="Nº do Lote (opcional)"
                        className="w-full p-1.5 text-xs border rounded bg-white" 
                      />
                    </div>
                    {batches.length > 1 && (
                      <button type="button" onClick={() => removeBatch(batch.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl font-bold">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-100">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};
