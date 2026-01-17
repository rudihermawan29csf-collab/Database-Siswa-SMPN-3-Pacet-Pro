import { Student, DocumentFile } from '../types';

// URL Deployment Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLeUDR_iMNcbxz8f016dn-u2LrCU4xeU59XVWW3iqfFVBob5V_hO_NpA2xOHh33jQg/exec';

// Helper for fetch with timeout
const fetchWithTimeout = async (resource: string, options: RequestInit = {}) => {
  // Increased default timeout to 60s because Google Apps Script can be slow (cold start/high load)
  const { timeout = 60000 } = options as any; 
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    // Handle AbortError specifically to give a clearer message
    if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms. Koneksi lambat atau server sibuk.`);
    }
    throw error;
  }
}

export const api = {
  // Fetch all students
  getStudents: async (): Promise<Student[]> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) {
        console.warn("Google Script URL not configured. Using mock data.");
        throw new Error("URL Not Configured"); 
    }

    try {
      const timestamp = new Date().getTime();
      const response = await fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=getStudents&t=${timestamp}`);
      
      if (!response.ok) {
          throw new Error(`HTTP Status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.status === 'success') {
        return result.data;
      }
      throw new Error(result.message || 'Gagal mengambil data');
    } catch (error) {
      console.warn("API Error (getStudents), falling back to mock data:", error);
      throw error;
    }
  },

  // Fetch Users (Teachers/Admins)
  getUsers: async (): Promise<any[]> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) return [];

    try {
      const timestamp = new Date().getTime();
      const response = await fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=getUsers&t=${timestamp}`);
      const result = await response.json();
      if (result.status === 'success') {
        return result.data;
      }
      return [];
    } catch (error) {
      console.warn("Error fetching users:", error);
      return [];
    }
  },

  // Update Users List
  updateUsers: async (users: any[]): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) return true;

    try {
        const payload = {
            action: 'updateUsers',
            users: users
        };
        const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Error saving users:", e);
        return false;
    }
  },

  // NEW: Fetch Global App Settings
  getAppSettings: async (): Promise<any> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) return null;

    try {
        const timestamp = new Date().getTime();
        const response = await fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=getSettings&t=${timestamp}`);
        const result = await response.json();
        if (result.status === 'success') {
            return result.data; // Object containing all configs
        }
        return null;
    } catch (e) {
        console.warn("Error fetching settings:", e);
        return null;
    }
  },

  // NEW: Save Global App Settings
  saveAppSettings: async (settings: any): Promise<boolean> => {
      if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) return true;

      try {
          const payload = {
              action: 'saveSettings',
              settings: settings
          };
          const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              body: JSON.stringify(payload)
          });
          const result = await response.json();
          return result.status === 'success';
      } catch (e) {
          console.error("Error saving settings:", e);
          return false;
      }
  },

  // Upload file (Convert to Base64 first)
  uploadFile: async (file: File, studentId: string, category: string): Promise<string | null> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) {
        return new Promise(resolve => setTimeout(() => resolve(URL.createObjectURL(file)), 1000));
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const payload = {
            action: 'uploadFile',
            fileBase64: base64,
            fileName: file.name,
            mimeType: file.type,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            studentId: studentId,
            docId: Math.random().toString(36).substr(2, 9),
            category: category
          };

          const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            timeout: 90000 // 90s timeout for upload to allow Drive processing
          } as any);
          
          const result = await response.json();
          if (result.status === 'success') {
            resolve(result.url);
          } else {
            reject(result.message);
          }
        } catch (e) {
          console.error("Upload error:", e);
          reject(e);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  },

  // Update Single Student Data with Retry Logic
  updateStudent: async (student: Student): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) return true;

    const attemptUpdate = async (retryCount = 0): Promise<boolean> => {
        try {
          const payload = {
            action: 'updateStudent',
            student: student
          };
          // Increased timeout significantly to ensure large objects save correctly
          const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            timeout: 60000 
          } as any);
          
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);

          const result = await response.json();
          return result.status === 'success';
        } catch (e) {
          console.error(`Update attempt ${retryCount + 1} failed:`, e);
          // Retry logic: up to 2 retries (3 attempts total)
          if (retryCount < 2) {
              const delay = (retryCount + 1) * 3000; // Increased delay
              await new Promise(res => setTimeout(res, delay)); 
              return attemptUpdate(retryCount + 1);
          }
          return false;
        }
    };

    return attemptUpdate();
  },

  // Update Multiple Students at once (Bulk)
  updateStudentsBulk: async (students: Student[]): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) return true;
    if (students.length === 0) return true;

    try {
        const payload = {
            action: 'updateStudentsBulk', 
            students: students
        };
        
        const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            timeout: 120000 // 120s
        } as any);

        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Bulk update error:", e);
        return false;
    }
  },

  // Sync Initial Mock Data to Sheet (Admin Only)
  syncInitialData: async (students: Student[]): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) {
        alert("URL Belum dikonfigurasi.");
        return false;
    }

    try {
      const payload = {
        action: 'syncData',
        students: students
      };
      
      console.log("Mulai sinkronisasi data...");
      const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        timeout: 180000 // 180s timeout for full sync (very slow)
      } as any);

      const result = await response.json();
      console.log("Sync Result:", result);
      return result.status === 'success';
    } catch (e) {
      console.error("Sync error:", e);
      return false;
    }
  }
};