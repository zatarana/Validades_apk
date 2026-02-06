
import React, { useRef, useState } from 'react';
import { X, Save, Upload, Trash2, Info, Cloud, Check, Loader2, LogOut, ExternalLink, Key, AlertTriangle } from 'lucide-react';
import { Product, BarcodeDb, BackupData } from '../types';
import { requestPermission, loadFromDrive } from '../services/googleDrive';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  barcodeDb: BarcodeDb;
  onImport: (backup: BackupData) => void;
  onClear: () => void;
  isDriveConnected: boolean;
  setIsDriveConnected: (val: boolean) => void;
  lastSync: number | null;
  googleClientId: string;
  setGoogleClientId: (id: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, products, barcodeDb, onImport, onClear, 
  isDriveConnected, setIsDriveConnected, lastSync,
  googleClientId, setGoogleClientId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncing, setSyncing] = useState(false);
  const [tempClientId, setTempClientId] = useState(googleClientId);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    const backup: BackupData = {
      products,
      barcodeDb,
      version: "1.4.0"
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `validade_ai_backup.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSaveClientId = () => {
    setGoogleClientId(tempClientId);
    alert("Identificação do Google salva com sucesso!");
  };

  const handleDriveConnect = async () => {
    if (!googleClientId) {
      alert("Por favor, insira o seu Google Client ID abaixo primeiro.");
      return;
    }

    setSyncing(true);
    try {
      const token = await requestPermission(googleClientId);
      if (token) {
        setIsDriveConnected(true);
        const cloudBackup = await loadFromDrive();
        if (cloudBackup) {
          if (confirm("Encontramos um backup no seu Drive! Deseja restaurar agora?")) {
            onImport(cloudBackup);
          }
        }
      }
    } catch (e) {
      alert("Não foi possível conectar ao Google Drive. Verifique se o Client ID está correto e os pop-ups permitidos.");
    } finally {
      setSyncing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          onImport({ products: json, barcodeDb: {}, version: "legacy" });
        } else if (json.products && Array.isArray(json.products)) {
          onImport(json as BackupData);
        } else {
          throw new Error("Formato inválido");
        }
      } catch (err) { alert("Arquivo de backup inválido."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800">Configurações</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* SEÇÃO GOOGLE CLIENT ID */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Key className="w-3 h-3" /> Identidade Google (Obrigatório para Nuvem)
            </h3>
            <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-blue-700 leading-relaxed border border-blue-100">
              Para usar o Drive, você precisa criar um <strong>Client ID</strong> (grátis) no Google Cloud. 
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="font-bold underline flex items-center gap-1 mt-1 text-blue-800">
                Criar meu Client ID agora <ExternalLink className="w-3 h-3" />
              </a>
              <p className="mt-1 opacity-70">Adicione "https://google.com" (ou o domínio do app) em 'Origens JavaScript autorizadas'.</p>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Cole seu Client ID aqui..." 
                value={tempClientId}
                onChange={(e) => setTempClientId(e.target.value)}
                className="flex-1 p-2 text-xs border rounded-lg outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button 
                onClick={handleSaveClientId}
                className="px-3 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors"
              >
                Salvar
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sincronização Nuvem</h3>
            
            {isDriveConnected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-xl border border-green-100">
                  <div className="flex items-center gap-3">
                    <Cloud className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-bold text-sm">Google Drive Ativo</div>
                      <div className="text-[10px] opacity-70">
                        {lastSync ? `Último sync: ${new Date(lastSync).toLocaleTimeString()}` : 'Aguardando sincronização...'}
                      </div>
                    </div>
                  </div>
                  <Check className="w-5 h-5" />
                </div>
                <button 
                  onClick={() => setIsDriveConnected(false)} 
                  className="w-full text-[10px] text-gray-400 font-bold uppercase hover:text-red-500 flex items-center justify-center gap-1"
                >
                  <LogOut className="w-3 h-3" /> Desconectar conta
                </button>
              </div>
            ) : (
              <button 
                onClick={handleDriveConnect}
                disabled={syncing}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors shadow-lg ${googleClientId ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-3">
                  {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />}
                  <div className="text-left">
                    <div className="font-bold text-sm">Conectar Google Drive</div>
                    <div className="text-[10px] opacity-70">
                      {googleClientId ? 'Clique para autorizar acesso' : 'Insira o Client ID acima primeiro'}
                    </div>
                  </div>
                </div>
                {!googleClientId && <AlertTriangle className="w-4 h-4 text-orange-400" />}
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleExportBackup} className="flex items-center justify-center gap-2 p-3 bg-gray-50 text-gray-600 rounded-xl border text-sm font-bold hover:bg-gray-100">
                <Save className="w-4 h-4" /> Exportar JSON
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-3 bg-gray-50 text-gray-600 rounded-xl border text-sm font-bold hover:bg-gray-100">
                <Upload className="w-4 h-4" /> Importar JSON
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest">Zona Crítica</h3>
            <button onClick={onClear} className="w-full flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-100 font-bold text-sm">
              <Trash2 className="w-5 h-5" /> Limpar Memória e Produtos
            </button>
          </section>

          <div className="text-center pt-2">
            <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1 uppercase font-bold">
              Validade.ai v1.4.1 • Google Drive Cloud
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
