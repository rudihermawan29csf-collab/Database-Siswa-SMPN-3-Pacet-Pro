import { Student, DocumentFile } from '../types';

// URL Deployment Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxb8fmeWo7qNdYFQc830sLF5uSWHkFj73Nk82H9qL97kjeP3QQUJggXKm5hJZD6Cin/exec';

// --- HELPER: SMART MAPPER (Penerjemah Spreadsheet ke App) ---
const normalizeStudentData = (rawData: any[]): Student[] => {
    if (!Array.isArray(rawData)) return [];

    // Helper to clean date strings correctly (Handles Timezone Shift)
    const cleanDate = (val: any) => {
        if (!val) return '';
        
        // 1. Jika sudah string YYYY-MM-DD, langsung ambil 10 karakter pertama
        // Ini cara paling aman untuk menghindari pergeseran timezone
        if (typeof val === 'string') {
            const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                // Jika mengandung jam (bukan 00:00), kemungkinan ada pergeseran UTC dari Apps Script
                if (val.includes('T') && !val.includes('T00:00:00')) {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${y}-${m}-${day}`;
                    }
                }
                return isoMatch[1];
            }
        }

        const dateObj = new Date(val);
        // Check if valid date
        if (isNaN(dateObj.getTime())) return String(val).split('T')[0];
        
        // Extract local date components
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    };

    return rawData.map((originalRow: any) => {
        if (Array.isArray(originalRow)) { return null as any; }

        const normalizedRow: Record<string, any> = {};
        Object.keys(originalRow).forEach(key => {
            if (key) {
                const cleanKey = key.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                normalizedRow[cleanKey] = originalRow[key];
                normalizedRow[key] = originalRow[key];
            }
        });

        const findVal = (...keys: string[]) => {
            for (const k of keys) {
                if (normalizedRow[k] !== undefined) return normalizedRow[k];
            }
            return '';
        };

        if (originalRow.id && originalRow.fullName && originalRow.dapodik) {
             const parseIfString = (val: any, def: any) => {
                 if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                     try { return JSON.parse(val); } catch(e) { return def; }
                 }
                 return val || def;
             };

             const student = {
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

             student.birthDate = cleanDate(student.birthDate);
             return student;
        }

        return {
            id: findVal('id', 'nipd', 'no') || Math.random().toString(36).substr(2, 9),
            fullName: findVal('fullname', 'nama', 'namasiswa', 'namalengkap'),
            nis: findVal('nis', 'nipd', 'noinduk'),
            nisn: findVal('nisn'),
            gender: findVal('gender', 'jk', 'jeniskelamin', 'lp') === 'P' ? 'P' : 'L',
            birthPlace: findVal('birthplace', 'tempatlahir', 'tmplahir'),
            birthDate: cleanDate(findVal('birthdate', 'tanggallahir', 'tgllahir')), 
            previousSchool: findVal('previousschool', 'sekolahasal', 'sklasal', 'asalsekolah'), 
            graduationYear: Number(findVal('graduationyear', 'tahunlulus', 'lulusan')) || 0,
            diplomaNumber: findVal('diplomanumber', 'noseriijazah', 'noijazah'),
            averageScore: Number(findVal('averagescore', 'nilairatarata', 'rata2')) || 0,
            achievements: findVal('achievements', 'prestasi') ? String(findVal('achievements', 'prestasi')).split(',') : [],
            religion: findVal('religion', 'agama'),
            nationality: findVal('nationality', 'kewarganegaraan') || 'WNI',
            address: findVal('address', 'alamat', 'alamatjalan'),
            subDistrict: findVal('subdistrict', 'kecamatan'),
            district: findVal('district', 'kabupaten', 'kota'),
            postalCode: findVal('postalcode', 'kodepos'),
            className: findVal('classname', 'kelas', 'rombel', 'rombelsaatini') || 'VII A',
            height: Number(findVal('height', 'tinggibadan', 'tb')) || 0,
            weight: Number(findVal('weight', 'beratbadan', 'bb')) || 0,
            bloodType: findVal('bloodtype', 'golongandarah', 'goldar') || '-',
            siblingCount: Number(findVal('siblingcount', 'jmlsaudara', 'jumlahsaudara')) || 0,
            childOrder: Number(findVal('childorder', 'anakke')) || 1,
            entryYear: new Date().getFullYear(),
            status: 'AKTIF',
            father: {
                name: findVal('fathername', 'namaayah'),
                nik: findVal('fathernik', 'nikayah'),
                birthPlaceDate: findVal('fatherttl', 'ttlayah', 'tahunlahirayah'),
                education: findVal('fathereducation', 'pendidikanayah'),
                job: findVal('fatherjob', 'pekerjaanayah'),
                income: findVal('fatherincome', 'penghasilanayah'),
                phone: findVal('fatherphone', 'nohpayah', 'telepon', 'hp')
            },
            mother: {
                name: findVal('mothername', 'namaibu'),
                nik: findVal('mothernik', 'nikibu'),
                birthPlaceDate: findVal('motherttl', 'ttlibu', 'tahunlahiribu'),
                education: findVal('mothereducation', 'pendidikanibu'),
                job: findVal('motherjob', 'pekerjaanibu'),
                income: findVal('motherincome', 'penghasilanibu'),
                phone: findVal('motherphone', 'nohpibu')
            },
            guardian: {
                name: findVal('guardianname', 'namawali'),
                nik: findVal('guardiannik', 'nikwali'),
                birthPlaceDate: findVal('guardianttl', 'ttlwali'),
                education: findVal('guardianeducation', 'pendidikanwali'),
                job: findVal('guardianjob', 'pekerjaanwali'),
                income: findVal('guardianincome', 'penghasilanwali'),
                phone: findVal('guardianphone', 'nohpwali')
            },
            dapodik: {
                nik: findVal('nik', 'niksiswa'),
                noKK: findVal('nokk'),
                rt: findVal('rt'),
                rw: findVal('rw'),
                dusun: findVal('dusun'),
                kelurahan: findVal('kelurahan', 'desa'),
                kecamatan: findVal('kecamatan'),
                kodePos: findVal('kodepos'),
                livingStatus: findVal('livingstatus', 'jenistinggal'),
                transportation: findVal('transportation', 'alattransportasi'),
                email: findVal('email'),
                skhun: findVal('skhun', 'noskhun'),
                kpsReceiver: findVal('kpsreceiver', 'penerimakps'),
                kpsNumber: findVal('kpsnumber', 'nokps'),
                kipReceiver: findVal('kipreceiver', 'penerimakip'),
                kipNumber: findVal('kipnumber', 'nomorkip'),
                kipName: findVal('kipname', 'namadikip'),
                kksNumber: findVal('kksnumber', 'nomorkks'),
                birthRegNumber: findVal('birthregnumber', 'noregistrasiakta', 'noakta'),
                bank: findVal('bank'),
                bankAccount: findVal('bankaccount', 'norek'),
                bankAccountName: findVal('bankaccountname', 'rekatasnama'),
                pipEligible: findVal('pipeligible', 'layakpip'),
                pipReason: findVal('pipreason', 'alasanlayakpip'),
                specialNeeds: findVal('specialneeds', 'kebutuhankhusus'),
                latitude: findVal('latitude', 'lintang'),
                longitude: findVal('longitude', 'bujur'),
                headCircumference: Number(findVal('headcircumference', 'lingkarkepala')) || 0,
                distanceToSchool: findVal('distancetoschool', 'jarakkesekolah'),
                unExamNumber: findVal('unexamnumber', 'nopesertaun'),
                travelTimeMinutes: Number(findVal('traveltimeminutes', 'waktutempuh')) || 0
            },
            documents: [],
            academicRecords: {},
            correctionRequests: [],
            adminMessages: []
        } as Student;
    }).filter(s => s !== null);
};

const fetchWithTimeout = async (resource: string, options: RequestInit = {}) => {
  const { timeout = 60000 } = options as any; 
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  const finalOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      mode: 'cors',
      redirect: 'follow',
      credentials: 'omit',
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
            headers: { "Content-Type": "text/plain;charset=utf-8" }, 
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
            timeout: 90000 
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
        timeout: 180000 
      } as any);
      const result = await response.json();
      return result.status === 'success';
    } catch (e) { return false; }
  }
};