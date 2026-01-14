import { Student, DocumentFile } from '../types';

// URL Deployment Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdJ-8ZAhkZSi4Q21jab9ZvROpeIOurf_ER-ajpRhOF4Y-rUvEXvy9zRgEgafXFa_D6/exec';

export const api = {
  // Fetch all students
  getStudents: async (): Promise<Student[]> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) {
        console.warn("Google Script URL not configured. Using mock data.");
        throw new Error("URL Not Configured"); 
    }

    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStudents&t=${timestamp}`);
      
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
      throw error;
    }
  },

  // Fetch Users (Teachers/Admins)
  getUsers: async (): Promise<any[]> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) return [];

    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUsers&t=${timestamp}`);
      const result = await response.json();
      if (result.status === 'success') {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching users:", error);
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
        const response = await fetch(GOOGLE_SCRIPT_URL, {
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
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getSettings&t=${timestamp}`);
        const result = await response.json();
        if (result.status === 'success') {
            return result.data; // Object containing all configs
        }
        return null;
    } catch (e) {
        console.error("Error fetching settings:", e);
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
          const response = await fetch(GOOGLE_SCRIPT_URL, {
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

  // Update Single Student Data
  updateStudent: async (student: Student): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) return true;

    try {
      const payload = {
        action: 'updateStudent',
        student: student
      };
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

  // Update Multiple Students at once (Bulk)
  updateStudentsBulk: async (students: Student[]): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_URL')) return true;
    if (students.length === 0) return true;

    try {
        const payload = {
            action: 'updateStudentsBulk', 
            students: students
        };
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

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