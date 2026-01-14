
export type Role = 'ADMIN' | 'TEACHER' | 'HEADMASTER';

export type Gender = 'L' | 'P';
export type StudentStatus = 'AKTIF' | 'PINDAH' | 'LULUS';

export interface DocumentFile {
  id: string;
  name: string;
  type: 'PDF' | 'IMAGE';
  url: string; 
  category: 'IJAZAH' | 'AKTA' | 'KK' | 'KTP_AYAH' | 'KTP_IBU' | 'KIP' | 'SKL' | 'FOTO' | 'KARTU_PELAJAR' | 'RAPOR' | 'LAINNYA';
  uploadDate: string;
  size: string;
  status: 'PENDING' | 'APPROVED' | 'REVISION';
  adminNote?: string;
  verificationDate?: string;
  // Metadata specifically for Rapor
  subType?: {
      semester: number;
      page: number;
  };
}

export interface ParentData {
  name: string;
  nik: string;
  birthPlaceDate: string; 
  education: string;
  job: string;
  income: string;
  phone: string;
}

export interface DapodikData {
  nik: string;
  noKK: string;
  rt: string;
  rw: string;
  dusun: string;
  kelurahan: string;
  kecamatan: string;
  kodePos: string;
  livingStatus: string;
  transportation: string;
  email: string;
  skhun: string;
  kpsReceiver: string;
  kpsNumber: string;
  kipReceiver: string;
  kipNumber: string;
  kipName: string;
  kksNumber: string;
  birthRegNumber: string;
  bank: string;
  bankAccount: string;
  bankAccountName: string;
  pipEligible: string;
  pipReason: string;
  specialNeeds: string;
  latitude: string;
  longitude: string;
  headCircumference: number;
  distanceToSchool: number | string;
  unExamNumber: string;
  // Extra fields for 69 columns
  travelTimeHours?: number;
  travelTimeMinutes?: number;
  nickname?: string;
}

export interface AdminMessage {
    id: string;
    content: string;
    date: string;
    isRead: boolean;
}

export interface Student {
  id: string;
  nis: string; 
  nisn: string;
  fullName: string;
  gender: Gender;
  birthPlace: string;
  birthDate: string;
  religion: string;
  nationality: string;
  address: string;
  subDistrict: string;
  district: string;
  postalCode: string;
  childOrder: number;
  siblingCount: number;
  height: number;
  weight: number;
  bloodType: string;
  className: string;
  entryYear: number;
  status: StudentStatus;
  father: ParentData;
  mother: ParentData;
  guardian?: ParentData;
  previousSchool: string;
  graduationYear: number;
  diplomaNumber: string;
  averageScore: number;
  achievements: string[];
  dapodik: DapodikData;
  documents: DocumentFile[];
  correctionRequests: CorrectionRequest[];
  academicRecords?: Record<number, AcademicRecord>;
  adminMessages?: AdminMessage[]; // New field for report comments
}

export interface CorrectionRequest {
  id: string;
  fieldKey: string;
  fieldName: string;
  originalValue: string;
  proposedValue: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: string;
  adminNote?: string;
  processedDate?: string;
  attachment?: {
      url: string;
      type: 'IMAGE' | 'PDF';
      name: string;
  };
}

export interface SubjectGrade {
  no: number;
  subject: string;
  score: number;
  competency: string;
}

export interface P5Project {
  no: number;
  theme: string;
  description: string;
}

export interface AcademicRecord {
  semester: number;
  classLevel: string;
  phase: string;
  year: string;
  subjects: SubjectGrade[];
  p5Projects: P5Project[];
  extracurriculars: { name: string; score: string }[];
  teacherNote: string;
  promotionStatus: string;
  attendance: {
    sick: number;
    permitted: number;
    noReason: number;
  };
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  documentCompleteness: number;
  studentsPerClass: { name: string; count: number }[];
  genderDistribution: { name: string; value: number }[];
}