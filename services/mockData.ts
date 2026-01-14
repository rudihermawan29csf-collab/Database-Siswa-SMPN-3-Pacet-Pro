import { Student, AcademicRecord } from '../types';

// Helper to generate random scores for the new data
const createMockRecord = (semester: number, className: string): AcademicRecord => {
  let level = 'VII';
  if (className.includes('VIII')) level = 'VIII';
  if (className.includes('IX')) level = 'IX';

  return {
    semester,
    classLevel: level,
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

const RAW_DATA = `1	ABEL AULIYA PASA RAMADANI	1129	P	3101640834	MOJOKERTO	2010-08-12	3516035208100001	Islam	Mojokembang	7		Mojokembang	Mojokembang	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Hartono	1978	SMP / sederajat	Lainnya	Rp. 1,000,000 - Rp. 1,999,999	3516030401780003	RODIYAH	1991	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516037012910001							Kelas IX A			Tidak		1		AL7060024640
2	ABHEL ECHA TRIOCTAVIA NATASYA	1130	P	0103501336	MOJOKERTO	2010-10-28	3516036810100001	Islam	DUSUN PARAS	5	4	PARAS	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085708676054			Tidak		AGUS SUPRIADI	1979	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516030108790004	SRI ERNANIK	1979	SMP / sederajat	Wiraswasta	Kurang dari Rp. 500,000	3516034802790001			Tidak sekolah				Kelas IX B			Tidak		0		8471/UM/2010/KAB.MR
3	ADINDA DWI PRASETYAWAN	1131	L	0101216265	MOJOKERTO	2010-07-08	3516030807100001	Islam	DUSUN KEMBANG	1	5	KEMBANG	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		083846421251			Tidak		SUMAJI	1979	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516031806790002	ERNA TRI LESTARI	1979	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516037103790003			Tidak sekolah				Kelas IX C			Tidak		0		5958/UM/2010/KAB.MR
4	ADITYA FIRMANSYAH	1132	L	0105795597	MOJOKERTO	2010-06-05	3516030506100001	Islam	Sumberkembar	3	9	Sumbersono	Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		08558694158			Tidak		ABDUL FATAH	1971	SMP / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516031110710002	WATINAH	1982	SD / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035807820001			Tidak sekolah			3516035807820001	Kelas IX A			Tidak		0		AL 7060017200
5	ADITYA SAPUTRA	1133	L	0102941935	MOJOKERTO	2010-11-06	3516020611100001	Islam	cembor	6	2	cembor	Cembor	Kec. Gondang	61374	Bersama orang tua	Ojek		085735934006			Tidak		nihil	0	Tidak sekolah	Tidak bekerja	Tidak Berpenghasilan		DESI ARTIKA SARI	1977	SMP / sederajat	Wiraswasta	Rp. 1,000,000 - Rp. 1,999,999				Tidak sekolah				Kelas IX B			Tidak		0		3516-LT-09062017-0039
6	Ahkmad Ircham Ali Azkiya Jazuly	1134	L	0119754981	Mojokerto	2011-03-16	3516031603110001	Islam	Mojokembang	8	2	Mojokembang	mojokembang	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		083134891797			Tidak		Ahmad Ali Mustofa	0	Tidak sekolah	Karyawan Swasta	Kurang dari Rp. 500,000		Dewi Sampirni	0	Tidak sekolah	Tidak bekerja	Tidak Berpenghasilan				Tidak sekolah				Kelas IX C			Tidak		0		AL.706.0059997
7	AHMAD NIAM IZZI AFKAR	1135	L	0116781615	MOJOKERTO	2011-07-16	3516031607110001	Islam	Claket	1	5	Claket	Desa/Kel. Claket	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Edi Purnomo	0		Tidak bekerja	Tidak Berpenghasilan		FIKI FELINA	1989	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516036104890004							Kelas IX A			Tidak		1		AL7060056375
8	AKBAR KHAFI AS SHAFFAAT	1136	L	0105253328	MOJOKERTO	2010-06-02	3516030206100002	Islam	DUSUN PARAS	6	4	PARAS	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085236729412			Tidak		MOCHAMAD ANSORI	1984	SMA / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516031605840001	TIYANI ANURYANI	1984	SMA / sederajat	Wiraswasta	Kurang dari Rp. 500,000	3516036210840002			Tidak sekolah				Kelas IX B			Tidak		0		7844/Ds.T/2010/KAB. MR
9	AKHMAD EGA JULIANO	1137	L	0109269480	MOJOKERTO	2010-07-04	3516030407100004	Islam	Nogosari	2	1	Nogosari	Nogosari	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		082230116479			Tidak		SLAMET SISWANTO	1981	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516031801810001	YANTI	1989	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035502890002	SLAMET SISWANTO	1981	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516031801810001	Kelas IX C			Tidak		1		AL 7060021759
10	Alviansyah Radityah Putra	1139	L	0113240545	Mojokerto	2011-01-23	3516032301110001	Islam	Tirto Wening	2	2	Karangsari	Bendunganjati	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085940710353			Tidak		Moch. Sopii	1988	SMP / sederajat	Karyawan Swasta	Rp. 2,000,000 - Rp. 4,999,999	3516031807880004	Susiyanti	1992	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516034601920003			Tidak sekolah				Kelas IX B			Tidak		0		1143/UM/2011/KAB.MR
11	AMIRULLOH AKBAR	1140	L	0108301086	MOJOKERTO	2010-05-07	3516030705100001	Islam	DUSUN KEMBANG	4	3	KEMBANG	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		085704149505			Tidak		EDI SISWANTO	1976	SMA / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516031109780003	LIANA RUSDIANA	1983	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036209830002			Tidak sekolah				Kelas IX C			Tidak		0		9207/DS.T/2010/KAB.MR
12	Andien Dinar Fadhillah Qais	1141	P	0116998277	Mojokerto	2011-05-29	3516036905110002	Islam	Tirto Wening	1	1	Merak	Bendunganjati	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		08816946788			Tidak		Andinata Wuri Al-Hizrah	1986	SMP / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999	3516031004860003	Lilik Wahyuningtiyas	0	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516034205890002			Tidak sekolah				Kelas IX C			Tidak		0		3516-LT-22102018-0008
13	ANINDITA WIDIYA CAHYANI	1142	P	3104868345	MOJOKERTO	2010-05-02	3516034205100001	Islam	Mungkut	4	5	Mungkut	Bendunganjati	Kec. Pacet	61372	Bersama orang tua	Ojek					Tidak		Muslimin	1984	SMP / sederajat	Wiraswasta	Kurang dari Rp. 500,000	3516033004840003	RIRIN AIN AMALIAH	1989	SMP / sederajat	Wiraswasta	Kurang dari Rp. 500,000	3516036906890001							Kelas IX B			Tidak		1		AL7060016532
14	AULIA PUTRY RAUDIATUL JANNAH	1143	P	0109660931	MOJOKERTO	2010-06-13	3516035306100001	Islam	DSN. CEMBOR	6	2	CEMBOR	Cembor	Kec. Pacet	61374	Bersama orang tua	Sepeda motor		085894166277			Tidak		nihil	1987	Tidak sekolah	Tidak bekerja	Tidak Berpenghasilan		LUSI MUSFIANAH	1987	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035312870004			SMP / sederajat	Tidak bekerja			Kelas IX C			Tidak		0		3516-LT-15062017-0006
15	AURELIA FATIMAH YUNITA	1144	P	0117735315	MOJOKERTO	2011-06-13	3516035306110002	Islam	SOSO	1	4	SOSO	CEPOKOLIMO	Kec. Pacet	61374	Bersama orang tua	Sepeda		083849131066			Tidak		ARIF WAHYUDI	1988	SMP / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999	3516030203880001	ELI AMBARWATI	1987	SMA / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035712870001			Tidak sekolah	Peternak			Kelas IX C			Tidak		0		706,0056072
16	AYU DEVINA EKA PRATIWI	1145	P	0111308751	MOJOKERTO	2011-06-27	3516036706110001	Islam	DUSUN PARAS	3	3	PARAS	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		081335394560			Tidak		KUSBIANTO	1985	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516031411850001	HALIMATUS SA'DIYAH	1991	SMA / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516034201910001			Tidak sekolah				Kelas IX C			Tidak		0		3516-LT-11012012-0087
17	Bayu Widiat Moko	1146	L	0112954079	Mojokerto	2011-07-16	3516031607110002	Islam	Tirto Wening	2	1	Merak	Bendunganjati	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		082335079129			Tidak		Lapin	1976	SMP / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516030303760002	Wariyah	1977	SD / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516034506770005			Tidak sekolah				Kelas IX B			Tidak		0		3516-LT-09112011-0123
18	BINTANG PRATAMA	1147	L	0101462605	PASURUAN	2010-06-29	3514122906100006	Islam	SUMBER JEJER	1	4	SUMBER JEJER	Desa/Kel. Tanjungkenongo	Kec. Pacet	61372	Bersama orang tua	Ojek					Tidak		MISBAH RUDI	1979	SMA / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3514121210790001	NUR KHUMALAH	1986	SMA / sederajat	Tidak bekerja	Tidak Berpenghasilan	3514125008860008							Kelas IX C			Tidak		1		AL7710253200
19	CANTICA ENGEL AULIA SHAVIRA	1148	P	0119038038	MOJOKERTO	2011-01-18	3516035801110001	Islam	SUMBERPIJI	2	6	SUMBERPIJI	Desa/Kel. Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		083833731666			Tidak		KHOIRUL HUDA	1984	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516032203840002	YESI AILING KRISNANTI	1992	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516036112920001			Tidak sekolah			3516036112920001	Kelas IX B			Tidak		0		AL 7060045009
20	CITRA TRIAN ANDINI	1149	P	0118176727	MOJOKERTO	2011-03-29	3516036903110001	Islam	GLINGSEM	1	1	GLINGSEM	Tanjungkenongo	Kec. Pacet	61374	Bersama orang tua	Sepeda		081555642824			Tidak		MISNAN	1977	SMP / sederajat	Wiraswasta	Kurang dari Rp. 500,000	3516030712770002	SUWATI	1983	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036905830004			Tidak sekolah				Kelas IX C			Tidak		0		AL7060049484
21	DAFA RISKI EKA SYAHPUTRA	1150	L	0101995193	MOJOKERTO	2010-10-10	3516031010100001	Islam	DUSUN PARAS	3	3	PARAS	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		082143354350			Tidak		KASTURI	1980	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516032607800001	ETIK PURWANTI	1988	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516034103880001			Tidak sekolah				Kelas IX A			Tidak		0		10367/DS.T/2010/KAB.MR
22	DEA NAYLATUL AFITA	1151	P	0105890815	MOJOKERTO	2010-05-01	3516034105100001	Islam	DUSUN BELOR	4	2	BELOR	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		081329834837			Ya	3e0meh61374004	USMAN	1975	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516031202750001	MAISAROH	1980	SMP / sederajat	Wiraswasta	Kurang dari Rp. 500,000	3516036904800001			Tidak sekolah				Kelas IX A			Tidak		0		4141/UM/2010/KAB.MR
23	DENIS EKA FEBRIAN	1152	L	0113273151	MOJOKERTO	2011-02-19	3516031902110001	Islam	Claket	3	6	Claket	Desa/Kel. Claket	Kec. Pacet	61372	Bersama orang tua	Ojek					Tidak		SUKIRMAN	1978	SMP / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516031210780003	ANITA RAHMAWATI	1983	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036107830006							Kelas IX C			Tidak		1		AL7060046363
24	DHEA ZASKIA OLIVIA PUTRI	1153	P	0106746087	MOJOKERTO	2010-10-19	3516035910100002	Islam	DUSUN BELOR	5	2	BELOR	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		081280471231			Tidak		KARTONO	1970	SMA / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516037017000003	SULASTRI	1977	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3578034604770003			Tidak sekolah				Kelas IX A			Tidak		0		3516-LT-01112017-0083
25	Elisa Dinda Saviera	1154	P	0118107970	Mojokerto	2011-06-03	3516034306110001	Islam	Tirto Wening	1	1	Merak	Bendunganjati	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085749329909			Tidak		Kurniawan Hadi Purnomo	1980	SMA / sederajat	Wiraswasta	Rp. 1,000,000 - Rp. 1,999,999	3516031003800003	Tutik Handayani	1983	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035005830004			Tidak sekolah				Kelas IX C			Tidak		0		3209/UM/2011/KAB.MR.
26	Enggelita Regina Putri	1155	P	0113763727	Mojokerto	2011-03-07	3516034703110001	Islam	Mojokembang	4	1	Mojokembang	Mojokembang	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085334614256			Tidak		Kartono	1977	SD / sederajat	Karyawan Swasta	Kurang dari Rp. 500,000	3516031111770003	Siti Afsoka	1992	SD / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036109920003			Tidak sekolah				Kelas IX A			Tidak		0		AL.706.0051403
27	FAJAR ADITYA PUTRA	1156	L	0106229715	MOJOKERTO	2010-08-29	3516032908100003	Islam	SUMBERSUKO	4	6	SUMBERSUKO	Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		081357623981			Tidak		FATCHUR	1982	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516032508820001	SUCI ROUFUN	1987	SMA / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516135607870003			Tidak sekolah			3516135607870003	Kelas IX C			Tidak		0		AL 7060045592
28	FANIA KHOIROTUL UMMAH	1157	P	0118502963	MOJOKERTO	2011-02-17	3516035702110001	Islam	SUMBERSUKO	2	5	SUMBERSUKO	Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085806760386			Tidak		MUHAMAD KHOIRUL HUPRON	1981	SMA / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3518610240810003	RATNA TITIK	1989	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516035602890001			Tidak sekolah			3516035602890001	Kelas IX B			Tidak		0		AL 7060048663
29	FAREL ANDRIANSAH	1158	L	0106977334	MOJOKERTO	2010-10-05	3516030510100001	Islam	NOGOSARI	9	2	NOGOSARI	NOGOSARI	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		082143027096			Tidak		DIDIK MARSONO	1986	SMP / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516031305860002	LAFIFA INDAYANI	1992	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036104920003	DIDIK DARSONO	1986	SMP / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516031305860002	Kelas IX A			Tidak		1		AL 7060025778
30	FURI ANGELIKA PUTRI	1159	P	0109547032	MOJOKERTO	2010-07-30	3516037007100006	Islam	Belor	6	2	Belor	Desa/Kel. Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Handy Sanjaya	1984	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516031905840004	RIKA TRI ASTUTIK	1989	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516035508900002							Kelas IX A			Tidak		1		AL7060174684
31	GRISELDA SANDRA ADELIA	1160	P	0107397485	MOJOKERTO	2010-11-01	3516034111100001	Islam	DUSUN BELOR	4	2	BELOR	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		082262272066			Tidak		NUR KHOLIS	1980	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999		RIZMATUL KHASUNAH	1990	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035701900004			Tidak sekolah				Kelas IX C			Tidak		0		3516-LT-29032012-0100
32	HANUM PUSPITA SARI	1161	P	0108602147	MOJOKERTO	2010-09-01	3516034109100001	Islam	SUMBERSONO	1	9	SUMBERSONO	SUMBERKEMBAR	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085807404674			Tidak		SUBANDI	1989	SD / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516033112890081	SITI ROMLAH	1993	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516034509930003			Tidak sekolah			3516034509930003	Kelas IX B			Tidak		0		AL 7060023284
33	JASTINE DIAN DWI ALEXTIAN	1162	L	0105450847	MOJOKERTO	2010-11-20	3516032011100001	Islam	DUSUN PARAS	5	4	PARAS	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		081252524911			Tidak		MAMIK HERI CAHYONO	1982	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516033007820002	ITA PURMIKASARI	1989	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516034204890001			Tidak sekolah				Kelas IX C			Tidak		0		12310/DS.T/2010/KAB.MR
34	JESICHA PUTRI RAMADHANI	1163	P	3121344348	MOJOKERTO	2012-04-06	3516034604120003	Islam	Claket	3	5	Claket	Desa/Kel. Claket	Kec. Pacet	61372	Bersama orang tua	Ojek					Tidak		Eddi Saragosa	1967	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516032809670001	WIJAYANTI	1979	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036901790002							Kelas IX A			Tidak		1		AL7060176908
35	JIHAN DEA VALQOHI	1164	P	0104858504	MOJOKERTO	2010-07-26	3516036607100002	Islam	DUSUN KEMBANG	3	5	KEMBANG	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		081252128709			Tidak		HARDI SAFI'I	1960	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3578042601600002	PARMI	1970	SD / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036011700004			Tidak sekolah				Kelas IX A			Tidak		0		5963/UM/2010/KAB.MR
36	KAFRIDA INDAH DWI PRAMESTI	1165	P	0116123660	MOJOKERTO	2011-02-26	3516036602110001	Islam	DSN. CLAKET	2	3	CLAKET	Claket	Kec. Pacet	61374	Bersama orang tua	Jalan kaki					Tidak		AGUS SUTONO	1972	SD / sederajat	Wiraswasta	Rp. 1,000,000 - Rp. 1,999,999	3516031708720002	TASLIMAH	1970	SD / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035604700001	AGUS SUTONO	1970	SD / sederajat	Wiraswasta	Rp. 1,000,000 - Rp. 1,999,999	3516031708720002	Kelas IX C			Tidak		1
37	KEYVIN RAJA DIRHAM	1166	L	0112450297	MOJOKERTO	2011-10-07	3516030710110002	Islam	Claket	1	2	Claket	Desa/Kel. Claket	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Didik Sagita Danu Saputra	0		Tidak bekerja	Tidak Berpenghasilan		MARIATI	1984	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516037010840001							Kelas IX B			Tidak		1		AL7060133889
38	Kinansye Novita Kreyti	1167	P	0109245298	Mojokerto	2010-10-03	3516034310100001	Islam	Mojokembang	10	2	Mojokembang	Mojokembang	Kec. Pacet	61374	Bersama orang tua	Jalan kaki					Tidak		Solikin	1975	SD / sederajat	Petani	Kurang dari Rp. 500,000	3516031607750001	Surtini	1978	SD / sederajat	Petani	Kurang dari Rp. 500,000	3516034806780001			Tidak sekolah				Kelas IX B			Tidak		0		AL.7060025404
39	KRISNA WAHYU ARIYANSYAH	1168	L	0101451960	MOJOKERTO	2010-09-18	3516031809100002	Islam	DUSUN KEMBANG	4	5	KEMBANG	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		081234488774			Tidak		ARIPIN HARIANTO	1988	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516030903880002	WIWIK UTAMI	1989	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035312890001			Tidak sekolah				Kelas IX C			Tidak		0		10722/DS.T/2010/KAB.MR
40	M. FERDY SANTOSO	1169	L	0106488180	MOJOKERTO	2010-11-25	3516032511100003	Islam	NOGOSARI	10	2	NOGOSARI	Desa/Kel. Nogosari	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		081249018010			Tidak		BUDI SANTOSO	1987	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516030812870001	SUNIPAH	1993	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516077108930002	BUDI SANTOSO	1987	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516030812870001	Kelas IX A			Ya		1		AL.706.0062513
41	M. REVA INDRA RAMADHANI	1170	L	0104963819	MOJOKERTO	2010-08-21	3516032108100003	Islam	NOGOSARI	7	2	NOGOSARI	NOGOSARI	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		081234982277			Tidak		BUDI NURGIANTO	1982	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516140701820005	TINI	1979	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035403790001	BUDI NURGIANTO	1982	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516140701820005	Kelas IX B			Tidak		1		AL7060045870
42	MICHELIA ANDARA PUTRI AGUSTINA	1171	P	0109831534	MOJOKERTO	2010-08-03	3516034308100003	Islam	Krembung	8	4	Krembung	Krembung	Kec. Krembung	61275	Bersama orang tua	Jalan kaki		0895397355568			Tidak		ROHMAD AMIN	1989	SMA / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999	3515032405890002	SITI AMINAH	1990	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516034106900001			Tidak sekolah				Kelas IX A			Tidak		0		AL.706.0147531
43	MIFTAKHUL DWIYANTI	1172	P	3108586688	MOJOKERTO	2010-12-09	3516034912100002	Islam	Sumber sono	2	9	Sumbersono	Desa/Kel. Sumberkembar	Kec. Pacet	61372	Bersama orang tua	Ojek					Tidak		Sudarman	1958		Karyawan Swasta	Kurang dari Rp. 500,000	3516030810580001	ASMINAH	1968		Petani	Kurang dari Rp. 500,000	3516034512680001							Kelas IX C			Tidak		1		AL7060193999
44	MOHAMMAD SURYA PUTRA JUANDA	1173	L	3105045307	MOJOKERTO	2010-11-22	3516036211100002	Islam	Belor	2	1	Belor	Desa/Kel. Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Rusdi Hartono	1976	SMP / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516032509760001	LILIK SUGIARSIH	1980	SD / sederajat	Petani	Kurang dari Rp. 500,000	3516034901800002							Kelas IX B			Tidak		1		56/UM/2011/KAB.MR
45	Mohkamat Slamet Prasetio	1174	L	0104521115	Mojokerto	2010-11-30	3516033011100003	Islam	Tirto Wening	3	3	Kedokbanteng	Bendunganjati	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085843965677			Tidak		Tosari	0	Tidak sekolah	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999		Jamik	1979	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516034501790003			Tidak sekolah				Kelas IX C			Tidak		0
46	MUHAMAD ADITIYA SUGIHARTO	1175	L	0104040213	MOJOKERTO	2010-07-31	3516033107100002	Islam	Bulakunci	5	4	Bulakunci	Desa/Kel. Nogosari	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Sambang	1966	SD / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516033112660087	SAMPURNI	1970	SD / sederajat	Petani	Kurang dari Rp. 500,000	3516037112700108							Kelas IX A			Tidak		1		AL7060028201
47	MUHAMAD RIFKI AFANDI	1176	L	0104235722	MOJOKERTO	2010-11-03	3516030311100001	Islam	SUMBERSONO	3	9	SUMBERSONO	Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085784934058			Ya	3e0opl61374002 / 351603016001479	SUGITO	1977	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516030302770002	LISMIASIH	1983	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516036209830001			Tidak sekolah			3516036209830001	Kelas IX A			Tidak		0		AL7060147409
48	MUHAMAD THORIQ SHOLIKHUL ULAH	1177	L	0106921848	MOJOKERTO	2010-11-07	3516030711100001	Islam	SUMBERSONO	1	9	SUMBERSONO	Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		088226112856			Tidak		IMAM THOHARI	1992	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516031312880003	ALFI NURUL LAILA	1992	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036503920001			Tidak sekolah			3516036503920001	Kelas IX C			Tidak		0		AL 7060028151
49	Muhammad Al Amin	1178	L	0106196356	Mojokerto	2010-07-31	3516033107100001	Islam	Tirto Wening	1	4	Gading	Bendunganjati	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085745565594			Tidak		Sudarman	1966	SMP / sederajat	Peternak	Rp. 1,000,000 - Rp. 1,999,999	3516030404660001	Marpu'ah	1974	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516034102740002			Tidak sekolah				Kelas IX A			Tidak		0		6718/UM/2010/KAB.MR.
50	MUHAMMAD AZZAM AUFA RIZKY	1179	L	0117373628	MOJOKERTO	2011-02-26	3516032602110001	Islam	SUMBERKEMBAR	7	3	SUMBERKEMBAR	Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		082331391862			Tidak		NURIYANTO	1985	SMA / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3515121308850003	FITRIYAH TRI WAHYUNI	1979	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036907910001			Tidak sekolah			3516036907910001	Kelas IX B			Tidak		0		AL 7060146224
51	MUHAMMAD BAGUS DWI SETIAWAN	1180	L	0102102911	MOJOKERTO	2010-10-04	3516030410100001	Islam	SUMBERKEMBAR	2	1	SUMBERKEMBAR	Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		082331040921			Tidak		SUHAR	1975	SD / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516030410750002	WATINI	1978	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036712780001			Tidak sekolah			3516036712780001	Kelas IX C			Tidak		0		AL 7060045887
52	MUHAMMAD BAHRUDIN NICOLAS SAPUTRA	1181	L	0103012183	MOJOKERTO	2010-06-26	3516032606100002	Islam	SUMBERSUKO	6	6	SUMBERSUKO	Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085730530717			Tidak		EKO SUBAGIO	1986	SMP / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516030407860001	AINUR HIDAYATIN	1990	SMP / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516035501900001			Tidak sekolah			3516035501900001	Kelas IX A			Tidak		0		AL 7060020051
53	MUHAMMAD EDO PRATAMA	1182	L	0108378030	MOJOKERTO	2010-04-01	3516040104100002	Islam	Sukosari	7	1	Sukosari	Desa/Kel. Sukosari	Kec. Trawas	61375	Bersama orang tua	Ojek					Tidak		Mukhamad Kodim	1985	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516032706850002	RINI ISWATI PUJI ASTUTI	1988	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516046508880003							Kelas IX B			Tidak		1		7060028459
54	MUHAMMAD HAIKAL DWI APRIANSYAH	1183	L	0107525884	MOJOKERTO	2010-04-19	3516031904100003	Islam	PANJI DEMUNG	1	1	KAMBENGAN	CEPOKOLIMO	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085735601361			Tidak		RUSMAJI	1979	SMP / sederajat	Petani	Rp. 1,000,000 - Rp. 1,999,999	3516032704790003	KASRIATI	1982	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	6471054503820005	RUAMAJI	1997	SMP / sederajat	Petani	Rp. 1,000,000 - Rp. 1,999,999	3516032704790003	Kelas IX A			Tidak		1
55	MUHAMMAD REHAN MEYLANO	1184	L	0113821069	WONOGIRI	2011-05-04	3312150405110001	Islam	Sumberglagah	1	7	Sumberglagah	Tanjungkenongo	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Parmin	1111		Tidak bekerja	Tidak Berpenghasilan		RINI SULISTYOWATI	1992	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3312156210920001	Slamet	1992	SD / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516030501920001	Kelas IX A			Tidak		1		AL6790172814
56	MUHAMMAD RIZKI FEBRIAN PRATAMA	1185	L	0115953314	MOJOKERTO	2011-02-09	3516060902110001	Islam	JLN TRAWAS	4	2	DOSREMO	MOJOREJO	Kec. Pungging	61384	Bersama orang tua	Jalan kaki		082230432219			Tidak		KOLIK DUWI CAHYO	1989	SMA / sederajat	Wiraswasta	Rp. 1,000,000 - Rp. 1,999,999	3516182407890001	HARTINING	1987	SMA / sederajat	Wiraswasta	Rp. 1,000,000 - Rp. 1,999,999	3516064505870003			Tidak sekolah				Kelas IX B			Tidak		0		AL7060044245
57	MUHAMMAD RIZQI FATKUR ROZI	1186	L	0118100000	MOJOKERTO	2011-04-15	3516031504110004	Islam	Mligi	1	7	Mligi	Desa/Kel. Claket	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Sholeh	1989	SMP / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516032706890002	IZZATUL KARIMAH	1994	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036603940001							Kelas IX A			Tidak		1		AL7060058790
58	MUHAMMAD SYAHLAN AL FARISI	1187	L	0104528088	MOJOKERTO	2010-11-24	3516062411100001	Islam	JLN TRAWAS	3	1	DOSREMO	MOJOREJO	Kec. Pungging	61384	Bersama orang tua	Jalan kaki		085859859746			Tidak		AKHMAD FATIKHUL IKHSAN	1984	SMA / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999	3516081104840001	KHOIROTIN ANISAH	1989	SMA / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999	3516064504890003			Tidak sekolah				Kelas IX C			Tidak		0		AL.7060043712
59	MUHAMMAD SYAIFUDIN ZUHRI	1188	L	3104300198	MOJOKERTO	2010-03-25	3516032503100002	Islam	0000000000			000000000000	Desa/Kel. Ketapanrame	Kec. Trawas	31074	Bersama orang tua	Ojek					Tidak			0		Tidak bekerja	Tidak Berpenghasilan	0000000000000000	RIRIN RAHMAWATI	0		Tidak bekerja	Tidak Berpenghasilan	0000000000000000							Kelas IX C			Tidak		1		000000000
60	MUKHAMMAD NAFIS  ZANWAR	1189	L	3113909136	MOJOKERTO	2011-01-12	3516031201110001	Islam	Sumbesuko	1	5	Sumbersuko	Desa/Kel. Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Iswanu	1965	SD / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516030407650003	SUPARNI	1972	SMP / sederajat	Petani	Kurang dari Rp. 500,000	3516035102720002							Kelas IX C			Tidak		1		AL7060048240
61	NABILA SRI WULANDARI	1190	P	0112229604	MOJOKERTO	2011-12-09	3516034912110003	Islam	belor	3	1	Belor	Desa/Kel. Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Sumarno	1979	SD / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516033112790060	KASNITI	1981	SD / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516037112810042							Kelas IX A			Tidak		1		AL7060194856
62	NIHAYATUL HIMMAH	1191	P	0113210782	MOJOKERTO	2011-02-09	3516034902110001	Islam	Claket	3	3	Claket	Desa/Kel. Claket	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Nanang Fatchul Yasin	1979	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516030211790002	RIRIS KRISTIARUM	1988	SMA / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035304880001							Kelas IX B			Tidak		1		AL7060046364
63	PUTRA FAIZ ABILANSA	1192	L	0109279970	MOJOKERTO	2010-06-23	3516032306100001	Islam	Bukakunci	3	3	bulakunci	Desa/Kel. Nogosari	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		AKMAT SUKAR	1964		Petani	Rp. 500,000 - Rp. 999,999	3516033112640110	FATIMAH	1978	SD / sederajat	Petani	Kurang dari Rp. 500,000	3516034404780004							Kelas IX C			Tidak		1		AL7060021714
64	PUTUT EKA DWI PRADANA	1193	L	0103256661	Mojokerto	2010-09-17	3516031709100002	Islam	Dsn. Belor	6	2	Belor	Desa/Kel. Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		082334088463			Tidak		Mujianto	1988	SMP / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999		Tutut Indrawati	1993	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan				Tidak sekolah				Kelas IX B			Tidak		0		10259/DS.T/2010/KAB.MR
65	Raka Za Arkan Al Yahya	1194	L	0109476923	Mojokerto	2010-11-07	3516030711100003	Islam	Tirto Wening	1	2	Merak	Bendunganjati	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085807404671			Tidak		Karsono	1972	SD / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999	3516033112720061	Nurhayati	1974	SMA / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035708740003			Tidak sekolah				Kelas IX C			Tidak		0		8277/UM/2010/KAB.MR.
66	RENO ARDIKA FEBRIANSYAH	1195	L	0113900295	MOJOKERTO	2011-02-10	3516031002110002	Islam	PANJI DEMUNG	2	2	SOSO	CEPOKOLIMO	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		081249171292			Tidak		JUMADI	1986	SD / sederajat	Wiraswasta	Rp. 1,000,000 - Rp. 1,999,999	3516030905860001	WITA VATONIS	1989	SMP / sederajat	Wiraswasta	Rp. 1,000,000 - Rp. 1,999,999	3516035203890006	JUMADI	1986	SD / sederajat	Wiraswasta	Rp. 1,000,000 - Rp. 1,999,999	3516030905860001	Kelas IX B			Tidak		1		7060046354
67	REZKY REVAN'A ADITYA	1196	L	0106051649	MOJOKERTO	2010-12-24	3516032412100001	Islam	NOGOSARI	8	2	NOGOSARI	NOGOSARI	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		082335336703			Tidak		SAMSUL MA'ARIF	1985	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516030906850003	EVA MAS'ULA	1993	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035502930002			SMP / sederajat	Wiraswasta			Kelas IX B			Ya		0		AL7060040671
68	Rifki Ardian Syaputra	1197	L	0113260726	Mojokerto	2011-01-19	3516031901110001	Islam	Tirto Wening	3	3	Kedokbanteng	Bendunganjati	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085732546240			Tidak		Sumali	1981	SMA / sederajat	Wiraswasta	Rp. 1,000,000 - Rp. 1,999,999	3516030506810003	Nadiroh	1989	SD / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516136109890001			Tidak sekolah				Kelas IX A			Tidak		0
69	Rizky Dwi Prasetya	1198	L	0106568386	Mojokerto	2010-10-02	3516030210100001	Islam	Tirto Wening	1	3	Kedokbanteng	Bendunganjati	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		081615990591			Tidak		Mualim	1974	SD / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999	3516031206740003	Sumarita	1979	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036711790002			Tidak sekolah				Kelas IX C			Tidak		0		7727/UM/2010/KAB.MR.
70	ROHMATUN NADIYAH	1199	P	0102171292	MOJOKERTO	2010-04-20	3516036004000004	Islam	BULAKUNCI	4	4	BULAKUNCI	Desa/Kel. Nogosari	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		LAMAT	1988	SD / sederajat	Petani	Rp. 500,000 - Rp. 999,999	3516030804880004	AL INSANUL KHASANAH	1992	SD / sederajat	Petani	Kurang dari Rp. 500,000	3516033610592000							Kelas IX B			Tidak		1		AL7060079972
71	Sahazika Gistiano Maisegalung	1200	P	0103615932	Mojokerto	2010-12-14	3516035412100001	Islam	Tirto Wening	5	2	Belor	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Sepeda motor		082143926300			Tidak		Muliyono	1983	SMA / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999	3516031812830002	Anggistia Bangkit Yuswanendra	1988	S1	Lainnya	Kurang dari Rp. 500,000	3516036005880003			Tidak sekolah			                	Kelas IX C			Tidak		1		57/UM/2011/KAB.MR.
72	SALSABILLA PUTRI RAMADHANI	1202	P	0101966980	MOJOKERTO	2010-08-13	3516035308100002	Islam	SUMBERSONO	2	9	SUMBERSONO	Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		085746040379			Tidak		SYAHRONI	1986	SMA / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516032811860001	RIRIN ANDRIANA	1987	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516084109870001			Tidak sekolah			3516084109870001	Kelas IX A			Tidak		0		AL 7060029021
73	SASKIA AISYAH AZZAHRA	1203	P	0109241032	MOJOKERTO	2010-09-27	3516036709100002	Islam	DUSUN BELOR	4	2	BELOR	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		081336813620			Tidak		AKHMAD RIFA'I	1986	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516031709860001	INDAH ERFINA	1992	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036506920003			Tidak sekolah				Kelas IX A			Tidak		0		7288/UM/2010/KAB.MR
74	SHERLIN HERLA AZZAHRA	1204	P	0106468352	MOJOKERTO	2010-12-02	3516034212100001	Islam	Glingsem	2		Glingsem	Desa/Kel. Tanjungkenongo	Kec. Pacet	61374	Bersama orang tua	Ojek					Tidak		Heru Agus Waluyo	1988	SMP / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516030703880001	LASMIASIH	1989	SD / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516030703880002							Kelas IX A			Tidak		1		AL70600
75	Siwetul Jennah	1205	P	3098115460	Bangkalan	2009-07-26	3526176607090003	Islam	Samelloh	0	0	Samelloh	Pakes	Kec. Konang	69175	Bersama orang tua	Jalan kaki		087858332962			Tidak		Maulidi	1982	Putus SD	Wiraswasta	Kurang dari Rp. 500,000	3527020107821300	Nonah	1990	SD / sederajat	Wiraswasta	Kurang dari Rp. 500,000	3526175408900002			Tidak sekolah				Kelas IX B			Tidak		0
76	Slamet Rizki Gali Rimba Angkasa	1206	L	0116423386	Mojokerto	2011-03-24	3516032403110001	Islam	Mojokembang	9	2	mojokembang	Mojokembang	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		082131712852			Tidak		SOKIB	0	Tidak sekolah	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999		Sujiati	1978	SD / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516035407790004			Tidak sekolah				Kelas IX A			Tidak		0		AL.706.0051037
77	TONI ADI SETIAWAN	1207	L	0105761346	MOJOKERTO	2010-10-27	3516032710100001	Islam	DUSUN KEMBANG	4	5	KEMBANG	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		082131712855			Tidak		SUSANTO	1989	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516030501890001	PIATI	1991	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516034906910001			Tidak sekolah				Kelas IX B			Tidak		0		7978/UM/2010/KAB,MR
78	VALENSYA DWI PUTRI WIJAYA	1208	P	0104036653	MOJOKERTO	2010-07-21	3516036107100006	Islam	SUMBERKEMBAR	1	1	SUMBERKEMBAR	Sumberkembar	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		081515396299			Tidak		SUWITO	1980	SMA / sederajat	Karyawan Swasta	Rp. 500,000 - Rp. 999,999	3516032505800008	NUR IDAYANI	1987	SMA / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036209870002			Tidak sekolah				Kelas IX A			Tidak		0		AL 7060022542
79	VEHANA RECHA INEZHA	1209	P	0111518628	MOJOKERTO	2011-08-28	3516036808110001	Islam	Belor	6	2	Belor	Desa/Kel. Kembangbelor	Kec. Pacet	61372	Bersama orang tua	Ojek					Tidak		Iwan Hari Santoso	1980	SMA / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516031307800003	LILIK IDAYATI	1986	SMA / sederajat	Wiraswasta	Kurang dari Rp. 500,000	3516035404860004							Kelas IX B			Tidak		1		AL7060065228
80	VISCHA AZZAHRA PUTRI	1210	P	0109366316	MOJOKERTO	2010-09-12	3516035209100001	Islam	PANJI DEMUNG	1	1	SOSO	CEPOKOLIMI	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		081216724079			Tidak		AHMADI	1989	SMP / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999	3514081606890004	TUTIK SUSANTI	1989	SD / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036502890003	AHMADI	1989	SMP / sederajat	Karyawan Swasta	Rp. 1,000,000 - Rp. 1,999,999	3514081606890004	Kelas IX B			Tidak		1		7060025452
81	WILDAN DIMAS DWI ANANDA	1211	L	0101281770	MOJOKERTO	2010-06-07	3516030706100003	Islam	DUSUN BELOR	1	1	BELOR	Kembangbelor	Kec. Pacet	61374	Bersama orang tua	Ojek		082228615821			Tidak		NGATMADI	1980	SMP / sederajat	Wiraswasta	Rp. 500,000 - Rp. 999,999	3516030301810002	UTAMI	1983	SMP / sederajat	Tidak bekerja	Tidak Berpenghasilan	3516036801870002			Tidak sekolah				Kelas IX A			Tidak		0		8579/DS.T/2010/KAB.MR
82	WINDA SRI ASTUTIK	1212	P	0101231133	MOJOKERTO	2010-05-10	3516035005100001	Islam	TRAWAS	0	0	LEBAK	LEBAKSONO	Kec. Pacet	61384	Wali	Jalan kaki		082132709708			Tidak		KEMAT	1980	SMP / sederajat	Petani	Rp. 500,000 - Rp. 999,999		WARMI	1982	SMP / sederajat	Sudah Meninggal	Tidak Berpenghasilan				Tidak sekolah				Kelas IX B			Tidak		0		AL 7060117037
83	YUSRIL ALFAREL NUGRAHA	1213	L	0102747531	MOJOKERTO	2010-09-23	3516032309100001	Islam	DSN. SUMBERGLAGAH	3	6	SUMBERGLAGAH	TANJUNGKENONGO	Kec. Pacet	61374	Bersama orang tua	Jalan kaki		083831538276			Tidak		ABDUL KHOLIK	1990	SMP / sederajat`;

// Parse Raw Data
export const MOCK_STUDENTS: Student[] = RAW_DATA.split('\n').map(line => {
  const cols = line.split('\t');
  if (cols.length < 10) return null;

  const className = cols[36] || 'Kelas IX A'; 
  const id = Math.random().toString(36).substring(7);

  // Generate Mock Academic Record
  const records: Record<number, AcademicRecord> = {};
  [1, 2, 3, 4, 5, 6].forEach(sem => {
      records[sem] = createMockRecord(sem, className);
  });

  return {
    id: id,
    nis: cols[2] || '',
    nisn: cols[4] || '',
    fullName: cols[1] || '',
    gender: cols[3] as 'L'|'P',
    birthPlace: cols[5] || '',
    birthDate: cols[6] || '',
    religion: cols[8] || '',
    nationality: 'WNI',
    address: cols[9] || '',
    subDistrict: cols[14] || '',
    district: 'Mojokerto',
    postalCode: cols[15] || '',
    childOrder: Number(cols[11] || 1),
    siblingCount: Number(cols[12] || 0),
    height: 155,
    weight: 45,
    bloodType: 'O',
    className: className,
    entryYear: 2022,
    status: 'AKTIF',
    previousSchool: cols[32] === 'Tidak sekolah' ? '-' : cols[32],
    graduationYear: 2025,
    diplomaNumber: cols[41] || '',
    averageScore: 0,
    achievements: [],
    dapodik: {
      nik: cols[7] || '',
      noKK: '',
      rt: cols[10] || '',
      rw: cols[11] || '',
      dusun: cols[12] || '',
      kelurahan: cols[13] || '',
      kecamatan: cols[14] || '',
      kodePos: cols[15] || '',
      livingStatus: cols[16] || '',
      transportation: cols[17] || '',
      email: '',
      skhun: '',
      kpsReceiver: cols[19] || 'Tidak',
      kpsNumber: cols[20] || '',
      kipReceiver: cols[21] || 'Tidak',
      kipNumber: cols[22] || '',
      kipName: cols[23] || '',
      kksNumber: cols[24] || '',
      birthRegNumber: cols[42] || '',
      bank: '',
      bankAccount: '',
      bankAccountName: '',
      pipEligible: 'Ya',
      pipReason: 'Kurang Mampu',
      specialNeeds: 'Tidak',
      latitude: '-7.6698',
      longitude: '112.5432',
      headCircumference: 0,
      distanceToSchool: cols[18] === 'Jalan kaki' ? '< 1 km' : '> 1 km',
      unExamNumber: '',
      travelTimeHours: 0,
      travelTimeMinutes: cols[18] === 'Jalan kaki' ? 15 : 30
    },
    father: {
      name: cols[25] || '',
      nik: cols[29] || '',
      birthPlaceDate: cols[26] || '',
      education: cols[27] || '',
      job: cols[28] || '',
      income: cols[29] && cols[29].includes('Rp') ? cols[29] : 'Rp. 1.000.000',
      phone: cols[18] || '' // Using transport col as placeholder or find correct one
    },
    mother: {
      name: cols[30] || '',
      nik: cols[34] || '',
      birthPlaceDate: cols[31] || '',
      education: cols[32] || '',
      job: cols[33] || '',
      income: cols[34] && cols[34].includes('Rp') ? cols[34] : 'Rp. 1.000.000',
      phone: ''
    },
    guardian: {
       name: cols[35] || '',
       nik: '',
       birthPlaceDate: cols[36] || '',
       education: cols[37] || '',
       job: cols[38] || '',
       income: cols[39] || '',
       phone: ''
    },
    documents: [],
    correctionRequests: [],
    academicRecords: records
  };
}).filter(Boolean) as Student[];