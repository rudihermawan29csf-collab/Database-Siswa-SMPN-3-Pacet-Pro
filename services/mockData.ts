import { Student, AcademicRecord } from '../types';

// Helper to generate random scores for the new data
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

// 66 COLUMNS STANDARD (Indices 0 to 65) matching Dapodik Export
// Index 56 = Sekolah Asal
const RAW_HEADERS = [
  "No", "Nama", "NIPD", "JK", "NISN", "Tempat Lahir", "Tanggal Lahir", "NIK", "Agama", "Alamat",
  "RT", "RW", "Dusun", "Kelurahan", "Kecamatan", "Kode Pos", "Jenis Tinggal", "Alat Transportasi",
  "Telepon", "HP", "E-Mail", "SKHUN", "Penerima KPS", "No. KPS",
  "Nama Ayah", "Tahun Lahir Ayah", "Jenjang Pendidikan Ayah", "Pekerjaan Ayah", "Penghasilan Ayah", "NIK Ayah",
  "Nama Ibu", "Tahun Lahir Ibu", "Jenjang Pendidikan Ibu", "Pekerjaan Ibu", "Penghasilan Ibu", "NIK Ibu",
  "Nama Wali", "Tahun Lahir Wali", "Jenjang Pendidikan Wali", "Pekerjaan Wali", "Penghasilan Wali", "NIK Wali",
  "Rombel Saat Ini", "No Peserta Ujian Nasional", "No Seri Ijazah",
  "Penerima KIP", "Nomor KIP", "Nama di KIP", "Nomor KKS", "No Registrasi Akta Lahir",
  "Bank", "Nomor Rekening Bank", "Rekening Atas Nama", "Layak PIP (usulan dari sekolah)", "Alasan Layak PIP", "Kebutuhan Khusus",
  "Sekolah Asal", "Anak ke-berapa", "Lintang", "Bujur", "No KK", "Berat Badan", "Tinggi Badan", "Lingkar Kepala", "Jml. Saudara Kandung", "Jarak Rumah ke Sekolah (KM)"
].join('\t');

// Cleaned Data Body to prevent Syntax Errors
const RAW_DATA_BODY = `1	ABEL AULIYA PASA RAMADANI	1129	P	3101640834	MOJOKERTO	2010-08-12	3516035208100001	Islam	Mojokembang	7		Mojokembang	Mojokembang	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Hartono	1978	SMP / sederajat	Lainnya	Rp. 1,000,000 - Rp. 1,999,999	3516030401780003	RODIYAH	1991	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516037012910001							Kelas IX A			Tidak		1		AL7060024640				Ya	Siswa Miskin/Rentan Miskin	Tidak ada	SDN KEMBANGBELOR	2	-7,6441	112,5536	3516032103130001	45	150	51	0	1
2	ABHEL ECHA TRIOCTAVIA NATASYA	1130	P	0103501336	MOJOKERTO	2010-10-28	3516036810100001	Islam	DUSUN PARAS	5	4	PARAS	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085708676054			Tidak		AGUS SUPRIADI	1979	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516030108790004	SRI ERNANIK	1979	SMP / sederajat	Wiraswasta	Kurang dari Rp. 500,000	3516034802790001			Tidak sekolah				Kelas IX B			Tidak		0		8471/UM/2010/KAB.MR				Ya	Siswa Miskin/Rentan Miskin	Tidak ada	SDN KEMBANGBELOR	2	-7,6458	112,5539	3516031701210001	40	150	52	0	1`;

const RAW_DATA = `${RAW_HEADERS}\n${RAW_DATA_BODY}`;

const parseRawData = (): Student[] => {
  const lines = RAW_DATA.split('\n');
  const students: Student[] = [];

  // Start loop from 1 to skip header
  for (let i = 1; i < lines.length; i++) { 
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
    
    // Safety check: skip if not a valid data row (column 0 must be number)
    if (!/^\d+$/.test(cols[0])) continue; 

    // MAPPING (0-based Index based on RAW_HEADERS)
    const className = cols[42] || 'VII A';
    
    const student: Student = {
        id: (i + 1000).toString(),
        fullName: cols[1] || '',
        nis: cols[2] || '',
        gender: (cols[3] as 'L' | 'P') || 'L',
        nisn: cols[4] || '',
        birthPlace: cols[5] || '',
        birthDate: cols[6] || '',
        religion: cols[8] || 'Islam',
        nationality: 'WNI',
        address: cols[9] || '',
        subDistrict: cols[14] || '',
        district: 'Mojokerto', 
        postalCode: cols[15] || '',
        className: className,
        
        height: parseInt(cols[62]) || 0,
        weight: parseInt(cols[61]) || 0,
        bloodType: '-',
        siblingCount: parseInt(cols[64]) || 0,
        childOrder: parseInt(cols[57]) || 1,
        
        father: {
            name: cols[24] || '',
            nik: cols[29] || '',
            birthPlaceDate: cols[25] || '',
            education: cols[26] || '',
            job: cols[27] || '',
            income: cols[28] || '',
            phone: cols[19] || cols[18] || ''
        },
        mother: {
            name: cols[30] || '',
            nik: cols[35] || '',
            birthPlaceDate: cols[31] || '',
            education: cols[32] || '',
            job: cols[33] || '',
            income: cols[34] || '',
            phone: ''
        },
        guardian: {
            name: cols[36] || '',
            nik: cols[41] || '',
            birthPlaceDate: cols[37] || '',
            education: cols[38] || '',
            job: cols[39] || '',
            income: cols[40] || '',
            phone: ''
        },

        entryYear: 2024,
        status: 'AKTIF',
        previousSchool: cols[56] || '', // Mapping Corrected: Index 56
        graduationYear: undefined,
        diplomaNumber: cols[44] || '',
        
        dapodik: {
            nik: cols[7] || '',
            noKK: cols[60] || '',
            rt: cols[10] || '',
            rw: cols[11] || '',
            dusun: cols[12] || '',
            kelurahan: cols[13] || '',
            kecamatan: cols[14] || '',
            kodePos: cols[15] || '',
            livingStatus: cols[16] || '',
            transportation: cols[17] || '',
            email: cols[20] || '',
            skhun: cols[21] || '',
            kpsReceiver: cols[22] || '',
            kpsNumber: cols[23] || '',
            kipReceiver: cols[45] || '',
            kipNumber: cols[46] || '',
            kipName: cols[47] || '',
            kksNumber: cols[48] || '',
            birthRegNumber: cols[49] || '',
            bank: cols[50] || '',
            bankAccount: cols[51] || '',
            bankAccountName: cols[52] || '',
            pipEligible: cols[53] || '',
            pipReason: cols[54] || '',
            specialNeeds: cols[55] || '',
            latitude: cols[58] || '',
            longitude: cols[59] || '',
            headCircumference: parseInt(cols[63]) || 0,
            distanceToSchool: cols[65] || '',
            unExamNumber: cols[43] || '',
            travelTimeMinutes: 0
        },

        documents: [],
        academicRecords: {},
        correctionRequests: [],
        adminMessages: []
    };

    // Generate Mock Academic Records for 6 semesters
    for (let sem = 1; sem <= 6; sem++) {
        if (student.academicRecords) {
            student.academicRecords[sem] = createMockRecord(sem, className);
        }
    }

    students.push(student);
  }
  return students;
};

export const MOCK_STUDENTS: Student[] = parseRawData();