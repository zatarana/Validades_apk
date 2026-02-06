import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Filter, Search, Calendar, Info, FileText, Download, WifiOff, Settings, AlertTriangle, Cloud } from 'lucide-react';
import { Product, SortOption, FilterStatus, ExpirationWindow, Batch, BarcodeDb, BackupData } from './types';
import { saveProducts, loadProducts, saveBarcodeDb, loadBarcodeDb, saveGoogleClientId, loadGoogleClientId } from './services/storage';
import { PREDEFINED_BARCODES } from './services/knowledgeBase';
import { initDrive, saveToDrive, loadFromDrive } from './services/googleDrive';
import { ProductCard } from './components/ProductCard';
import { AddProductModal } from './components/AddProductModal';
import { StatsOverview } from './components/StatsOverview';
import { SettingsModal } from './components/SettingsModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ConfirmationModal } from './components/ConfirmationModal';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [barcodeDb, setBarcodeDb] = useState<BarcodeDb>({});
  const [googleClientId, setGoogleClientId] = useState<string>(loadGoogleClientId());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.EXPIRATION_ASC);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(FilterStatus.ALL);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [expirationWindow, setExpirationWindow] = useState<ExpirationWindow>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);
  const [isConfirmImportOpen, setIsConfirmImportOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<BackupData | null>(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  useEffect(() => {
    if (googleClientId) {
      initDrive(googleClientId);
    }
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, [googleClientId]);

  useEffect(() => {
    const loaded = loadProducts();
    const loadedDb = loadBarcodeDb();
    
    const sanitized = loaded.map(p => {
      const anyP = p as any;
      const batches = Array.isArray(p.batches) ? p.batches : (anyP.expirationDate ? [
        {
          id: generateId(),
          expirationDate: anyP.expirationDate,
          quantity: 1,
          lotNumber: 'Lote Inicial'
        }
      ] : []);

      return {
        ...p,
        id: p.id || generateId(),
        batches: batches.length > 0 ? batches : [
          {
            id: generateId(),
            expirationDate: new Date().toISOString().split('T')[0],
            quantity: 1,
            lotNumber: 'Lote Inicial'
          }
        ]
      };
    });
    setProducts(sanitized);
    setBarcodeDb(loadedDb);
  }, []);

  const fullBarcodeDb = useMemo(() => ({
    ...PREDEFINED_BARCODES,
    ...barcodeDb
  }), [barcodeDb]);

  const syncToCloud = async (currentProducts: Product[], currentDb: BarcodeDb) => {
    if (!isDriveConnected || !isOnline || !googleClientId) return;
    const backup: BackupData = {
      products: currentProducts,
      barcodeDb: currentDb,
      version: "1.4.0"
    };
    const success = await saveToDrive(backup);
    if (success) setLastSync(Date.now());
  };

  useEffect(() => {
    saveProducts(products);
    syncToCloud(products, barcodeDb);
  }, [products]);

  useEffect(() => {
    saveBarcodeDb(barcodeDb);
    syncToCloud(products, barcodeDb);
  }, [barcodeDb]);

  const handleSaveProduct = (productData: Omit<Product, 'id' | 'addedAt'>) => {
    if (editingProduct) {
      setProducts((prev) => 
        prev.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p)
      );
      setEditingProduct(null);
    } else {
      const newProduct: Product = {
        ...productData,
        id: generateId(),
        addedAt: Date.now(),
      };
      setProducts((prev) => [...prev, newProduct]);
    }

    if (productData.barcode && productData.barcode.trim() !== '') {
      setBarcodeDb(prev => ({
        ...prev,
        [productData.barcode!]: {
          name: productData.name,
          brand: productData.brand,
          category: productData.category || 'Geral'
        }
      }));
    }
  };

  const handleDeleteBatch = (productId: string, batchId: string) => {
    setProducts(prev => {
      return prev.map(p => {
        if (p.id !== productId) return p;
        const newBatches = p.batches.filter(b => b.id !== batchId);
        return { ...p, batches: newBatches };
      }).filter(p => p.batches.length > 0);
    });
    
    if (viewingProduct?.id === productId) {
      const updatedBatches = viewingProduct.batches.filter(b => b.id !== batchId);
      if (updatedBatches.length === 0) setViewingProduct(null);
      else setViewingProduct({ ...viewingProduct, batches: updatedBatches });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    setProductToDeleteId(id);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!productToDeleteId) return;
    setProducts((prev) => prev.filter((p) => p.id !== productToDeleteId));
    if (viewingProduct?.id === productToDeleteId) setViewingProduct(null);
    setProductToDeleteId(null);
  };

  const handleImportRequest = (backup: BackupData) => {
    setPendingImportData(backup);
    setIsConfirmImportOpen(true);
  };

  const confirmImport = () => {
    if (!pendingImportData) return;
    setProducts(pendingImportData.products);
    setBarcodeDb(pendingImportData.barcodeDb || {});
    setPendingImportData(null);
    setIsSettingsOpen(false);
  };

  const handleUpdateClientId = (id: string) => {
    setGoogleClientId(id);
    saveGoogleClientId(id);
  };

  const getNearestExpiration = (product: Product): number => {
    if (!product.batches || !Array.isArray(product.batches) || product.batches.length === 0) return Infinity;
    return Math.min(...product.batches.map(b => new Date(b.expirationDate).getTime()));
  };

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.barcode?.includes(q) || p.brand?.toLowerCase().includes(q));
    }

    if (filterCategory !== 'ALL') {
      result = result.filter(p => p.category === filterCategory);
    }

    result = result.filter(p => {
      const nearest = getNearestExpiration(p);
      const diffDays = Math.ceil((nearest - today.getTime()) / (1000 * 60 * 60 * 24));

      if (expirationWindow !== 'ALL') {
        const windowMax = parseInt(expirationWindow);
        if (diffDays < 0 || diffDays > windowMax) return false;
      }

      if (filterStatus === FilterStatus.EXPIRED) return diffDays < 0;
      if (filterStatus === FilterStatus.WARNING) return diffDays >= 0 && diffDays <= 7;
      if (filterStatus === FilterStatus.GOOD) return diffDays > 7;

      return true;
    });

    result.sort((a, b) => {
      const nearestA = getNearestExpiration(a);
      const nearestB = getNearestExpiration(b);
      switch (sortOption) {
        case SortOption.EXPIRATION_ASC: return nearestA - nearestB;
        case SortOption.EXPIRATION_DESC: return nearestB - nearestA;
        case SortOption.NAME_ASC: return a.name.localeCompare(b.name);
        case SortOption.BRAND_ASC: return (a.brand || '').localeCompare(b.brand || '');
        case SortOption.ADDED_DATE_DESC: return b.addedAt - a.addedAt;
        default: return 0;
      }
    });

    return result;
  }, [products, searchQuery, sortOption, filterStatus, filterCategory, expirationWindow]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Validade.ai</h1>
          </div>
          <div className="flex items-center gap-2">
            {isDriveConnected && (
              <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full">
                <Cloud className="w-3 h-3" /> DRIVE OK
              </div>
            )}
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <StatsOverview products={products} />

        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${showFilters ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 text-gray-600'}`}>
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Ordenar</label>
                <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value={SortOption.EXPIRATION_ASC}>Validade (Mais próxima)</option>
                  <option value={SortOption.NAME_ASC}>Nome (A-Z)</option>
                  <option value={SortOption.ADDED_DATE_DESC}>Adicionados agora</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Vencendo em...</label>
                <select value={expirationWindow} onChange={(e) => setExpirationWindow(e.target.value as ExpirationWindow)} className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="ALL">Qualquer período</option>
                  <option value="5">Próximos 5 dias</option>
                  <option value="10">Próximos 10 dias</option>
                  <option value="15">Próximos 15 dias</option>
                  <option value="20">Próximos 20 dias</option>
                  <option value="30">Próximos 30 dias</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Info className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Nenhum produto encontrado.</p>
            </div>
          ) : (
            filteredAndSortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onDelete={handleDeleteRequest}
                onEdit={handleEditProduct}
                onClick={setViewingProduct}
              />
            ))
          )}
        </div>
      </main>

      <div className="fixed bottom-6 right-6">
        <button onClick={() => setIsModalOpen(true)} className="bg-brand-600 text-white w-14 h-14 rounded-full shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center transition-all">
          <Plus className="w-8 h-8" />
        </button>
      </div>

      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
        onSave={handleSaveProduct}
        initialData={editingProduct}
        barcodeDb={fullBarcodeDb}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        products={products}
        barcodeDb={barcodeDb}
        onImport={handleImportRequest}
        onClear={() => setIsConfirmClearOpen(true)}
        isDriveConnected={isDriveConnected}
        setIsDriveConnected={setIsDriveConnected}
        lastSync={lastSync}
        googleClientId={googleClientId}
        setGoogleClientId={handleUpdateClientId}
      />

      <ProductDetailModal
        product={viewingProduct}
        onClose={() => setViewingProduct(null)}
        onEdit={handleEditProduct}
        onDelete={handleDeleteRequest}
        onDeleteBatch={handleDeleteBatch}
      />

      <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Produto?"
        message="Isso removerá o produto e todos os seus lotes."
      />

      <ConfirmationModal
        isOpen={isConfirmImportOpen}
        onClose={() => setIsConfirmImportOpen(false)}
        onConfirm={confirmImport}
        title="Restaurar Backup?"
        message="Sua lista e memória de códigos de barras serão substituídas pelos dados do arquivo."
      />

      <ConfirmationModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={() => { setProducts([]); setBarcodeDb({}); setIsSettingsOpen(false); }}
        title="Limpar Tudo?"
        message="Atenção: todos os produtos e cadastros de códigos de barras serão apagados."
      />
    </div>
  );
};

export default App;