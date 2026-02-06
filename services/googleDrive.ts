import { BackupData } from '../types';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILENAME = 'validade_ai_cloud_backup.json';

let tokenClient: any = null;
let accessToken: string | null = null;

export const initDrive = (clientId: string): Promise<void> => {
  return new Promise((resolve) => {
    // @ts-ignore
    if (!window.google || !clientId || clientId.includes('placeholder')) return resolve();
    
    try {
      // @ts-ignore
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error !== undefined) {
            console.error('Erro OAuth:', response);
            return;
          }
          accessToken = response.access_token;
        },
      });
      resolve();
    } catch (e) {
      console.error('Erro ao inicializar Google Identity:', e);
      resolve();
    }
  });
};

export const requestPermission = (clientId: string): Promise<string | null> => {
  return new Promise(async (resolve) => {
    if (!clientId) {
      alert("Por favor, configure o seu Google Client ID nas configurações primeiro.");
      return resolve(null);
    }

    // Se não inicializou, tenta inicializar agora
    if (!tokenClient) {
      await initDrive(clientId);
    }

    if (!tokenClient) return resolve(null);

    tokenClient.callback = (response: any) => {
      if (response.error) {
        console.error('Auth error:', response.error);
        return resolve(null);
      }
      accessToken = response.access_token;
      resolve(accessToken);
    };
    
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const saveToDrive = async (data: BackupData): Promise<boolean> => {
  if (!accessToken) return false;

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}'&spaces=drive`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchRes.json();
    const fileId = searchData.files?.[0]?.id;

    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (fileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    return res.ok;
  } catch (e) {
    console.error('Erro ao salvar no Drive:', e);
    return false;
  }
};

export const loadFromDrive = async (): Promise<BackupData | null> => {
  if (!accessToken) return null;

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}'&spaces=drive`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchRes.json();
    const fileId = searchData.files?.[0]?.id;

    if (!fileId) return null;

    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (fileRes.ok) {
      return await fileRes.json();
    }
    return null;
  } catch (e) {
    console.error('Erro ao ler do Drive:', e);
    return null;
  }
};