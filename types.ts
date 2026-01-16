
export type Role = 'ADMIN' | 'TEACHER' | 'HEADMASTER';

export type Gender = 'L' | 'P';
export type StudentStatus = 'AKTIF' | 'PINDAH' | 'LULUS';

export interface DocumentFile {
  id: string;
  name: string;
  type: 'PDF' | 'IMAGE';
  url: string; 
  category: 'IJAZAH' | 'AKTA' | 'KK' | 'KTP_AYAH' | 'KTP_IBU' | 'KIP' | 'SKL' | 'FOTO' | 'KARTU_PELAJAR' | 'RAPOR' | 'NISN' | 'LAINNYA';
  uploadDate: string;
  size: string;
  status: 'PENDING' | 'APPROVED' | 'REVISION';
  adminNote?: string;
  subType?: {
      semester?: number;
      page?: number;
  };
  verifierName?: string;
  verifierRole?: string;
  verificationDate?: string;
}

export interface P5Project {
  no: number;
  theme: string;
  description: string;
}

export interface AcademicSubject {
  no: number;
  subject: string;
  score: number;
  competency?: string;
}

export interface AcademicRecord {
  semester: number;
  classLevel: string; // VII, VIII, IX
  className?: string; // NEW: Specific class name for this semester (e.g., "VII B")
  phase: 'D';
  year: string; // 2023/2024
  subjects: AcademicSubject[];
  p5Projects: P5Project[];
  extracurriculars: { name: string; score: string }[];
  teacherNote: string;
  attendance: {
      sick: number;
      permitted: number;
      noReason: number;
  };
  promotionStatus?: string; // NAIK, TINGGAL, LULUS
}

export interface CorrectionRequest {
    id: string;
    fieldKey: string; // e.g. 'fullName', 'father.name'
    fieldName: string; // Label for UI
    originalValue: string;
    proposedValue: string;
    studentReason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    adminNote?: string;
    requestDate: string;
    processedDate?: string;
    verifierName?: string;
}

export interface AdminMessage {
    id: string;
    content: string;
    date: string;
    isRead: boolean;
}

export interface Student {
  id: string;
  // 1. Identitas
  fullName: string;
  nis: string;
  nisn: string;
  gender: 'L' | 'P';
  birthPlace: string;
  birthDate: string;
  religion: string;
  nationality: 'WNI' | 'WNA';
  address: string;
  subDistrict: string; // Kecamatan
  district: string; // Kabupaten
  postalCode: string;
  className: string; // VII A (Current / Dapodik Class)
  
  // 2. Data Periodik
  height: number;
  weight: number;
  bloodType: string;
  siblingCount: number;
  childOrder: number;
  
  // 3. Orang Tua
  father: {
      name: string;
      nik: string;
      birthPlaceDate: string;
      education: string;
      job: string;
      income: string;
      phone: string;
  };
  mother: {
      name: string;
      nik: string;
      birthPlaceDate: string;
      education: string;
      job: string;
      income: string;
      phone: string;
  };
  guardian?: {
      name: string;
      nik: string;
      birthPlaceDate: string;
      education: string;
      job: string;
      income: string;
      phone: string;
  };

  // 4. Akademik & Dapodik Detail
  entryYear: number;
  status: StudentStatus;
  previousSchool: string;
  graduationYear?: number;
  diplomaNumber?: string; // No Seri Ijazah
  averageScore?: number;
  achievements?: string[];
  
  // Nested Dapodik specific fields usually requested
  dapodik: {
      nik: string;
      noKK: string;
      rt: string;
      rw: string;
      dusun: string;
      kelurahan: string;
      kecamatan: string;
      kodePos: string;
      livingStatus: string; // Bersama ortu, wali, kos
      transportation: string;
      email: string;
      skhun: string;
      kpsReceiver: string; // Ya/Tidak
      kpsNumber: string;
      kipReceiver: string;
      kipNumber: string;
      kipName: string;
      kksNumber: string;
      birthRegNumber: string;
      bank: string;
      bankAccount: string;
      bankAccountName: string;
      pipEligible: string; // Layak PIP
      pipReason: string;
      specialNeeds: string;
      latitude: string;
      longitude: string;
      headCircumference: number;
      distanceToSchool: string;
      unExamNumber: string;
      travelTimeMinutes: number;
      travelTimeHours?: number;
  };

  // Documents
  documents: DocumentFile[];

  // Academic Records (Semester 1-6)
  academicRecords?: {
      [semester: number]: AcademicRecord;
  };

  // Correction Requests
  correctionRequests?: CorrectionRequest[];

  // Messages
  adminMessages?: AdminMessage[];
}
