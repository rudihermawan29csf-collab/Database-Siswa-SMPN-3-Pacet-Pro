import { Student, DocumentFile } from '../types';

// URL Deployment Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwvhwFPtmdzw07pusXUmW9dslD_fRg0ObD4j10eIFrGRRORgFyP4LSestGpAJSMD-Dn6g/exec';

export const api = {
  // Fetch all students
  getStudents: async (): Promise<Student[]> => {
    // Prevent fetching if URL is not configured
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) {
        console.warn("Google Script URL not configured. Using mock data.");
        return []; 
    }

    try {
      // mode: 'cors' diperlukan untuk request ke Google Script
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStudents`);
      
      if (!response.ok) {
          throw new Error(`HTTP Status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.status === 'success') {
        return result.data;
      }
      throw new Error(result.message || 'Gagal mengambil data');
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  },

  // Upload file (Convert to Base64 first)
  uploadFile: async (file: File, studentId: string, category: string): Promise<string | null> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) {
        // Fallback mock upload
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

          const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          
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

  // Update Student Data (JSON)
  updateStudent: async (student: Student): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) return true;

    try {
      const payload = {
        action: 'updateStudent',
        student: student
      };
      // Menggunakan no-cors untuk update jika perlu, tapi idealnya POST mengembalikan JSON
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      return result.status === 'success';
    } catch (e) {
      console.error("Update student error:", e);
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
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log("Sync Result:", result);
      return result.status === 'success';
    } catch (e) {
      console.error("Sync error:", e);
      return false;
    }
  }
};