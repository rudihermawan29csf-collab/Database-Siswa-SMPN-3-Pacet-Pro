import { Student, DocumentFile } from '../types';

// URL Deployment Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxb8fmeWo7qNdYFQc830sLF5uSWHkFj73Nk82H9qL97kjeP3QQUJggXKm5hJZD6Cin/exec';

// --- HELPER: SMART MAPPER (Penerjemah Spreadsheet ke App) ---
const normalizeStudentData = (rawData: any[]): Student[] => {
    if (!Array.isArray(rawData)) return [];

    return rawData.map((originalRow: any) => {
        // Handle if rawData is array of arrays instead of objects (failsafe)
        const row: Record<string, any> = {};
        if (Array.isArray(originalRow)) { return null as any; }

        // Lowercase keys for fuzzy matching
        Object.keys(originalRow).forEach(key => {
            if (key) {
                const cleanKey = key.toString().replace(/\s+/g, ' ').trim().toLowerCase();
                row[cleanKey] = originalRow[key];
                row[cleanKey.replace(/[^a-z0-9]/g, '')] = originalRow[key];
            }
        });

        // Jika data dari JSON string (cara baru), langsung return
        // Karena script GAS kita yang baru sudah mengembalikan object yang bersih
        if (originalRow.id && originalRow.fullName) {
             // Pastikan nested objects diparsing jika masih string (double safety)
             const parseIfString = (val: any, def: any) => {
                 if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                     try { return JSON.parse(val); } catch(e) { return def; }
                 }
                 return val || def;
             };

             return {
                 ...originalRow,
                 dapodik: parseIfString(originalRow.dapodik, {}),
                 father: parseIfString(originalRow.father, {}),
                 mother: parseIfString(originalRow.mother, {}),
                 guardian: parseIfString(originalRow.guardian, {}),
                 documents: parseIfString(originalRow.documents, []),
                 academicRecords: parseIfString(originalRow.academicRecords, {}),
                 correctionRequests: parseIfString(originalRow.correctionRequests, []),
                 adminMessages: parseIfString(originalRow.adminMessages, [])
             } as Student;
        }
        
        return null;
    }).filter(s => s !== null);
};

const fetchWithTimeout = async (resource: string, options: RequestInit = {}) => {
  const { timeout = 60000 } = options as any; 
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  // CRITICAL FIXES FOR GOOGLE APPS SCRIPT CORS
  const finalOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      mode: 'cors', // Explicit CORS mode
      redirect: 'follow', // GAS redirects 302 to content, must follow
      credentials: 'omit', // Prevent sending cookies which breaks CORS on public scripts
  };

  try {
    const response = await fetch(resource, finalOptions);
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    throw error;
  }
}

export const api = {
  getStudents: async (): Promise<Student[]> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_URL')) {
        console.warn("URL Not Configured"); throw new Error("URL Not Configured"); 
    }
    try {
      const timestamp = new Date().getTime();
      const response = await fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=getStudents&t=${timestamp}`, {
          method: 'GET'
      });
      
      if (!response.ok) throw new Error(`HTTP Status: ${response.status}`);
      
      const result = await response.json();
      if (result.status === 'success') return normalizeStudentData(result.data);
      throw new Error(result.message || 'Gagal mengambil data');
    } catch (error) {
      console.warn("API Error:", error); 
      throw error;
    }
  },
  
  getUsers: async (): Promise<any[]> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_URL')) return [];
    try {
      const timestamp = new Date().getTime();
      const response = await fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=getUsers&t=${timestamp}`, {
          method: 'GET'
      });
      const result = await response.json();
      if (result.status === 'success') return result.data;
      return [];
    } catch (error) { return []; }
  },

  updateUsers: async (users: any[]): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_URL')) return true;
    try {
        const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
            method: 'POST', 
            headers: { "Content-Type": "text/plain;charset=utf-8" }, // text/plain prevents OPTIONS preflight
            body: JSON.stringify({ action: 'updateUsers', users: users })
        });
        const result = await response.json();
        return result.status === 'success';
    } catch (e) { return false; }
  },

  getAppSettings: async (): Promise<any> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_URL')) return null;
    try {
        const timestamp = new Date().getTime();
        const response = await fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=getSettings&t=${timestamp}`, {
            method: 'GET'
        });
        const result = await response.json();
        return result.status === 'success' ? result.data : null;
    } catch (e) { return null; }
  },

  saveAppSettings: async (settings: any): Promise<boolean> => {
      if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_URL')) return true;
      try {
          const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
              method: 'POST', 
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({ action: 'saveSettings', settings: settings })
          });
          const result = await response.json();
          return result.status === 'success';
      } catch (e) { return false; }
  },

  uploadFile: async (file: File, studentId: string, category: string): Promise<string | null> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_URL')) {
        return new Promise(resolve => setTimeout(() => resolve(URL.createObjectURL(file)), 1000));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
            method: 'POST', 
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: 'uploadFile', fileBase64: base64, fileName: file.name, mimeType: file.type,
                studentId: studentId, category: category
            }),
            timeout: 90000 // 90s timeout for uploads
          } as any);
          const result = await response.json();
          if (result.status === 'success') resolve(result.url); else reject(result.message);
        } catch (e) { reject(e); }
      };
      reader.onerror = (error) => reject(error);
    });
  },

  updateStudent: async (student: Student): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_URL')) return true;
    try {
        const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
            method: 'POST', 
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'updateStudent', student: student }),
            timeout: 60000 
        } as any);
        const result = await response.json();
        return result.status === 'success';
    } catch (e) { return false; }
  },

  syncInitialData: async (students: Student[]): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_URL')) return false;
    try {
      const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
        method: 'POST', 
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'syncData', students: students }),
        timeout: 180000 // 3 min timeout for bulk sync
      } as any);
      const result = await response.json();
      return result.status === 'success';
    } catch (e) { return false; }
  }
};