import { Student, AcademicRecord } from '../types';

// Helper to generate random academic records
const createMockRecord = (semester: number, className: string): AcademicRecord => {
  let level = 'VII';
  if (className.includes('VIII')) level = 'VIII';
  if (className.includes('IX')) level = 'IX';

  return {
    semester,
    classLevel: level,
    className: className,
    phase: 'D',
    year: semester <= 2 ? '2024/2025' : '2023/2024',
    subjects: [
      { no: 1, subject: 'Pendidikan Agama dan Budi Pekerti', score: Math.floor(Math.random() * (95 - 78) + 78), competency: 'Sangat baik dalam memahami sejarah nabi.' },
      { no: 2, subject: 'Pendidikan Pancasila', score: Math.floor(Math.random() * (90 - 75) + 75), competency: 'Baik dalam menerapkan nilai-nilai Pancasila.' },
      { no: 3, subject: 'Bahasa Indonesia', score: Math.floor(Math.random() * (92 - 75) + 75), competency: 'Terampil menulis teks laporan.' },
      { no: 4, subject: 'Matematika', score: Math.floor(Math.random() * (88 - 70) + 70), competency: 'Perlu peningkatan dalam aljabar.' },
      { no: 5, subject: 'IPA', score: Math.floor(Math.random() * (90 - 72) + 72), competency: 'Baik dalam praktikum sains.' },
      { no: 6, subject: 'IPS', score: Math.floor(Math.random() * (90 - 75) + 75), competency: 'Memahami konsep geografi dengan baik.' },
      { no: 7, subject: 'Bahasa Inggris', score: Math.floor(Math.random() * (95 - 75) + 75), competency: 'Good in speaking and listening.' },
      { no: 8, subject: 'Seni dan Prakarya', score: Math.floor(Math.random() * (90 - 80) + 80), competency: 'Kreatif dalam berkarya.' },
      { no: 9, subject: 'PJOK', score: Math.floor(Math.random() * (92 - 80) + 80), competency: 'Aktif dalam olahraga permainan.' },
      { no: 10, subject: 'Informatika', score: Math.floor(Math.random() * (95 - 75) + 75), competency: 'Mahir menggunakan komputer.' },
      { no: 11, subject: 'Bahasa Jawa', score: Math.floor(Math.random() * (90 - 75) + 75), competency: 'Sae sanget.' },
    ],
    p5Projects: [
      { no: 1, theme: 'Gaya Hidup Berkelanjutan', description: 'Pengolahan sampah plastik.' },
    ],
    extracurriculars: [
      { name: 'Pramuka', score: 'A' },
    ],
    teacherNote: 'Tingkatkan terus prestasimu.',
    promotionStatus: '',
    attendance: {
      sick: Math.floor(Math.random() * 3),
      permitted: Math.floor(Math.random() * 2),
      noReason: 0
    }
  };
};

const generateStudents = (): Student[] => {
  const students: Student[] = [];
  const classes = ['VII A', 'VII B', 'VIII A', 'IX A'];
  const names = [
    "ABEL AULIYA PASA RAMADANI", "ABHEL ECHA TRIOCTAVIA", "ACHMAD FAUZI", 
    "ADINDA PUTRI", "AGUS SETIAWAN", "AHMAD DANI", "AISYAH RAANI", 
    "ALDO PRATAMA", "ALVIN KURNIAWAN", "AMELIA SARI", "ANDI SAPUTRA", 
    "ANGGA WIJAYA", "ANISA RAHMA", "ARIEF HIDAYAT", "AYU LESTARI"
  ];

  names.forEach((name, index) => {
    const classIdx = index % classes.length;
    const className = classes[classIdx];
    
    const student: Student = {
      id: (1000 + index).toString(),
      fullName: name,
      nis: (2000 + index).toString(),
      nisn: `00${34567890 + index}`,
      gender: index % 2 === 0 ? 'L' : 'P',
      birthPlace: 'MOJOKERTO',
      birthDate: '2010-01-01',
      religion: 'Islam',
      nationality: 'WNI',
      address: 'Dusun Pacet',
      subDistrict: 'Pacet',
      district: 'Mojokerto',
      postalCode: '61374',
      className: className,
      height: 150 + (index % 10),
      weight: 40 + (index % 10),
      bloodType: '-',
      siblingCount: 1,
      childOrder: 1,
      father: {
        name: `Ayah ${name.split(' ')[0]}`,
        nik: '3516000000000001',
        birthPlaceDate: '1980',
        education: 'SMA',
        job: 'Wiraswasta',
        income: '2000000',
        phone: '08123456789'
      },
      mother: {
        name: `Ibu ${name.split(' ')[0]}`,
        nik: '3516000000000002',
        birthPlaceDate: '1985',
        education: 'SMA',
        job: 'Ibu Rumah Tangga',
        income: '0',
        phone: ''
      },
      guardian: {
        name: '', nik: '', birthPlaceDate: '', education: '', job: '', income: '', phone: ''
      },
      entryYear: 2024,
      status: 'AKTIF',
      previousSchool: 'SDN Pacet 1',
      diplomaNumber: `DN-01/D-000${index}`,
      dapodik: {
        nik: `351603000000000${index}`,
        noKK: '3516030000000000',
        rt: '01', rw: '02',
        dusun: 'Pacet', kelurahan: 'Pacet', kecamatan: 'Pacet', kodePos: '61374',
        livingStatus: 'Bersama Orang Tua', transportation: 'Jalan Kaki',
        email: `student${index}@smpn3pacet.sch.id`,
        skhun: '', kpsReceiver: 'Tidak', kpsNumber: '',
        kipReceiver: 'Tidak', kipNumber: '', kipName: '',
        kksNumber: '', birthRegNumber: '',
        bank: '', bankAccount: '', bankAccountName: '',
        pipEligible: 'Tidak', pipReason: '',
        specialNeeds: 'Tidak ada',
        latitude: '-7.6', longitude: '112.5',
        headCircumference: 50, distanceToSchool: '1', unExamNumber: '',
        travelTimeMinutes: 10
      },
      documents: [],
      academicRecords: {},
      correctionRequests: [],
      adminMessages: []
    };

    // Fill academic records
    for (let i = 1; i <= 6; i++) {
        if (!student.academicRecords) student.academicRecords = {};
        student.academicRecords[i] = createMockRecord(i, className);
    }

    students.push(student);
  });

  return students;
};

export const MOCK_STUDENTS: Student[] = generateStudents();