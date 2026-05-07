import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────
// Source: Salary April-26.xlsx  |  hoursPerDay: 8=Office, 9=Field
// visaType: SC-MAIN | NF | ALUM | MAISAN | Outside | NW
// wpsEntity: SC | SC-RAK | Maisan | NF | Cash
// paymentMethod: WPS | Cash
// status: ACTIVE | HOLD | VACATION | TERMINATED

const employees = [
  // ── STRIDE OFFICE (8 hrs/day) ────────────────────────────────────────────
  { empCode: 'NEW-02',   name: 'Mohammed SHAREEF',            visaType: 'SC-MAIN', costCenter: 'Stride Office',    wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 3000, allowances: 2000, totalSalary: 5000, otherAllowance: 0,   hoursPerDay: 8, status: 'ACTIVE' },
  { empCode: 'SC47',     name: 'Mohamed Elsayed',             visaType: 'SC-MAIN', costCenter: 'Stride Office',    wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 2000, allowances: 2000, totalSalary: 4000, otherAllowance: 0,   hoursPerDay: 8, status: 'ACTIVE' },
  { empCode: 'SC23',     name: 'Hussein Jasim',               visaType: 'SC-MAIN', costCenter: 'Stride Office',    wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 3000, allowances: 2000, totalSalary: 5000, otherAllowance: 0,   hoursPerDay: 8, status: 'ACTIVE' },
  { empCode: 'MAISAN13', name: 'Basmah Ali Abid Abid',        visaType: 'SC-MAIN', costCenter: 'Stride Office',    wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 1000, allowances: 1000, totalSalary: 2000, otherAllowance: 0,   hoursPerDay: 8, status: 'ACTIVE' },
  { empCode: 'SC24',     name: 'Mohammed Malik',              visaType: 'SC-MAIN', costCenter: 'Stride Office',    wpsEntity: 'SC',     paymentMethod: 'Cash', basicSalary: 2100, allowances: 1400, totalSalary: 3500, otherAllowance: 0,   hoursPerDay: 8, status: 'ACTIVE' },
  { empCode: 'SC-35',    name: 'Ansar Abdulrehman',           visaType: 'SC-MAIN', costCenter: 'Stride Office',    wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 2400, allowances: 2100, totalSalary: 4500, otherAllowance: 0,   hoursPerDay: 8, status: 'ACTIVE' },
  { empCode: 'SC-43',    name: 'Ryad Mohammad',               visaType: 'SC-MAIN', costCenter: 'Stride Office',    wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 1500, allowances: 1500, totalSalary: 3000, otherAllowance: 0,   hoursPerDay: 8, status: 'ACTIVE' },
  { empCode: 'NF-25',    name: 'Mohamed Fares',               visaType: 'SC-MAIN', costCenter: 'Stride Office',    wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 1200, allowances:  800, totalSalary: 2000, otherAllowance: 0,   hoursPerDay: 8, status: 'HOLD'   },
  { empCode: 'SC45',     name: 'Eng. Hanna (Alin)',           visaType: 'SC-MAIN', costCenter: 'Stride Office',    wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 2000, allowances: 2000, totalSalary: 3500, otherAllowance: 0,   hoursPerDay: 8, status: 'ACTIVE' },
  { empCode: 'SC46',     name: 'Yaseen Nizar',                visaType: 'SC-MAIN', costCenter: 'Stride Office',    wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 1500, allowances: 2000, totalSalary: 3500, otherAllowance: 0,   hoursPerDay: 8, status: 'ACTIVE' },
  // NOTE: ISLAM HAMDY also appears as SC46 in the Excel — needs a unique code. Add manually.

  // ── STRIDE MAIN (9 hrs/day) ──────────────────────────────────────────────
  { empCode: 'SC16',      name: 'Ahmed MD Foysol',             visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary:  700, allowances:  950, totalSalary: 1650, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'SC17',      name: 'Khalil Rahman',               visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 3000, allowances: 1500, totalSalary: 4500, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'SC19',      name: 'MD Oliur Rahman',             visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary:  600, allowances: 1100, totalSalary: 1700, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'SC28',      name: 'MD Mohin',                    visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary:  660, allowances:  590, totalSalary: 1250, otherAllowance: 150, hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'SC29',      name: 'Juel Rana',                   visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary:  660, allowances:  840, totalSalary: 1500, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'SC38(RK7)', name: 'Bhagwan Prasad Ramashare',    visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 1100, allowances:  600, totalSalary: 1700, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'NF05',      name: 'Karthik',                     visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 3000, allowances: 1000, totalSalary: 4000, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'SC48',      name: 'Abebe Girma Wendimu',         visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'NF',     paymentMethod: 'WPS',  basicSalary:  400, allowances:  600, totalSalary: 1200, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'NF08',      name: 'Thariq Mahmood',              visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'Cash',   paymentMethod: 'Cash', basicSalary:  950, allowances: 3050, totalSalary: 4000, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'NF09',      name: 'Asif Zafar',                  visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 1000, allowances: 2500, totalSalary: 3500, otherAllowance: 0,   hoursPerDay: 9, status: 'VACATION' },
  { empCode: 'SC49',      name: 'Mahomoud Forman',             visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'SC',     paymentMethod: 'WPS',  basicSalary: 2400, allowances: 1600, totalSalary: 4000, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'SC50',      name: 'Harendra Prasad',             visaType: 'SC-MAIN', costCenter: 'Stride Main',      wpsEntity: 'Cash',   paymentMethod: 'Cash', basicSalary:  500, allowances:  720, totalSalary: 1250, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'NF10',      name: 'Mohammed Shopon Adom Ali',    visaType: 'Outside', costCenter: 'Stride Main',      wpsEntity: 'Cash',   paymentMethod: 'Cash', basicSalary: 1200, allowances:  800, totalSalary: 2000, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },
  { empCode: 'NF11',      name: 'Akrakul Karim Abdul Khalek',  visaType: 'Outside', costCenter: 'Stride Main',      wpsEntity: 'Cash',   paymentMethod: 'Cash', basicSalary: 1000, allowances: 1000, totalSalary: 2000, otherAllowance: 0,   hoursPerDay: 9, status: 'ACTIVE'   },

  // ── NATIONAL FACTORY (9 hrs/day) ─────────────────────────────────────────
  { empCode: 'NF26',  name: 'Alok',                    visaType: 'NF',   costCenter: 'National Factory', wpsEntity: 'NF', paymentMethod: 'WPS',  basicSalary:  660, allowances:  740, totalSalary: 1400, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NF24',  name: 'Saeed Ahmad',             visaType: 'NF',   costCenter: 'National Factory', wpsEntity: 'NF', paymentMethod: 'WPS',  basicSalary: 1800, allowances: 1200, totalSalary: 3000, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NF23',  name: 'Shahvaj Khan',            visaType: 'NF',   costCenter: 'National Factory', wpsEntity: 'NF', paymentMethod: 'WPS',  basicSalary:  990, allowances:  660, totalSalary: 1650, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NF31',  name: 'Ragab Shokry',            visaType: 'ALUM', costCenter: 'National Factory', wpsEntity: 'NF', paymentMethod: 'WPS',  basicSalary:  500, allowances:  500, totalSalary: 1000, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NF32',  name: 'Osama Said',              visaType: 'ALUM', costCenter: 'National Factory', wpsEntity: 'NF', paymentMethod: 'WPS',  basicSalary:  500, allowances:  500, totalSalary: 1000, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NF33',  name: 'Mohamed Abdou',           visaType: 'ALUM', costCenter: 'National Factory', wpsEntity: 'NF', paymentMethod: 'WPS',  basicSalary:  500, allowances:  500, totalSalary: 1000, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NF27',  name: 'Kulvir Singh Paramjit',   visaType: 'NF',   costCenter: 'National Factory', wpsEntity: 'NF', paymentMethod: 'WPS',  basicSalary:  950, allowances:  650, totalSalary: 1600, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NF28',  name: 'Nebre Seyoum Desta',      visaType: 'NF',   costCenter: 'National Factory', wpsEntity: 'NF', paymentMethod: 'WPS',  basicSalary:  400, allowances:  600, totalSalary: 1200, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NF30',  name: 'Tsegaye Abebe Alembo',    visaType: 'NF',   costCenter: 'National Factory', wpsEntity: 'NF', paymentMethod: 'WPS',  basicSalary:  400, allowances:  600, totalSalary: 1200, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },

  // ── MAISAN CARPENTRY (9 hrs/day) ─────────────────────────────────────────
  { empCode: 'MAISAN05', name: 'Saiful Islam Rafiq Ullah',        visaType: 'MAISAN',  costCenter: 'Maisan Carpentry', wpsEntity: 'Maisan', paymentMethod: 'WPS', basicSalary: 1000, allowances: 1000, totalSalary: 2000, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'MAISAN02', name: 'Mantu Kumar Parwat Baliram',      visaType: 'SC-MAIN', costCenter: 'Maisan Carpentry', wpsEntity: 'Maisan', paymentMethod: 'WPS', basicSalary: 1100, allowances:  550, totalSalary: 1650, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'SC25',     name: 'Niraj Kumar',                     visaType: 'MAISAN',  costCenter: 'Maisan Carpentry', wpsEntity: 'Maisan', paymentMethod: 'WPS', basicSalary:  660, allowances: 1340, totalSalary: 2000, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NF06',     name: 'Saadullah Fazal Naeem Fazal',     visaType: 'MAISAN',  costCenter: 'Maisan Carpentry', wpsEntity: 'Maisan', paymentMethod: 'WPS', basicSalary: 1500, allowances: 2200, totalSalary: 3700, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },

  // ── OUTSIDE VISA (9 hrs/day) ─────────────────────────────────────────────
  { empCode: 'NW-48', name: 'Charanjith Singh',         visaType: 'NW',      costCenter: 'Outside Visa', wpsEntity: 'Cash', paymentMethod: 'Cash', basicSalary:  480, allowances:  720, totalSalary: 1200, otherAllowance: 0, hoursPerDay: 9, status: 'HOLD'   },
  { empCode: 'NW-55', name: 'Hameed Khan',              visaType: 'Outside', costCenter: 'Outside Visa', wpsEntity: 'Cash', paymentMethod: 'Cash', basicSalary:  650, allowances: 1000, totalSalary: 1650, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NW-50', name: 'Bahaa Dadud',              visaType: 'Outside', costCenter: 'Outside Visa', wpsEntity: 'Cash', paymentMethod: 'Cash', basicSalary:    0, allowances:    0, totalSalary: 2000, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NW-51', name: 'Ahmed Shahat',             visaType: 'Outside', costCenter: 'Outside Visa', wpsEntity: 'Cash', paymentMethod: 'Cash', basicSalary:    0, allowances:    0, totalSalary: 2000, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NW-52', name: 'Mahmoud Abouhoraira',      visaType: 'Outside', costCenter: 'Outside Visa', wpsEntity: 'Cash', paymentMethod: 'Cash', basicSalary:    0, allowances:    0, totalSalary: 2000, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NW-53', name: 'Moustafa Mason',           visaType: 'Outside', costCenter: 'Outside Visa', wpsEntity: 'Cash', paymentMethod: 'Cash', basicSalary:    0, allowances:    0, totalSalary: 2500, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
  { empCode: 'NW-54', name: 'Haysam',                   visaType: 'Outside', costCenter: 'Outside Visa', wpsEntity: 'Cash', paymentMethod: 'Cash', basicSalary:    0, allowances:    0, totalSalary: 2000, otherAllowance: 0, hoursPerDay: 9, status: 'ACTIVE' },
];

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
// Source: PROJECTS LIST 26.xlsx — SC-On going sheet
// status: ONGOING | WORK_DONE | MOBILIZING | HOLD | CANCELLED
// completionPct: 0.0–1.0 (parsed from status string or Excel column)

const projects = [
  { projectCode: 'SC-P50', projectName: 'Mohamed Rashid Alhefeiti',          location: 'Khalifa City, SE45, Plot #168',           completionPct: 1.0,  contractValue: 2466346, consultant: 'Corredera Engineering Consulting',         status: 'WORK_DONE' },
  { projectCode: 'SC-P52', projectName: 'Mohammad Gareeb Albloushi',          location: 'Madinat Al Riyad, RD30, Plot #509',       completionPct: 1.0,  contractValue: 2300000, consultant: 'Corredera Engineering Consulting',         status: 'WORK_DONE' },
  { projectCode: 'SC-P53', projectName: 'Tariq Almarzooqi',                   location: 'Al Shamka, SH32, Plot #84',               completionPct: 1.0,  contractValue: 2441286, consultant: 'Corredera Engineering Consulting',         status: 'WORK_DONE' },
  { projectCode: 'SC-P54', projectName: 'Fahed Al Khori',                     location: 'Al Shawamekh, SHM12, Plot #303',          completionPct: 1.0,  contractValue: 2000000, consultant: 'Smart Buildings Engineering Consultancy',  status: 'WORK_DONE' },
  { projectCode: 'SC-P55', projectName: 'Faraj Al Humeiri',                   location: 'Mohamed Bin Zayed City, ME4, Plot #51',   completionPct: 1.0,  contractValue: 2000000, consultant: 'Corredera Engineering Consulting',         status: 'WORK_DONE' },
  { projectCode: 'SC-P56', projectName: 'Khaled Al Humeiri',                  location: 'Mohamed Bin Zayed City, ME4, Plot #49',   completionPct: 1.0,  contractValue: 2000000, consultant: 'Corredera Engineering Consulting',         status: 'WORK_DONE' },
  { projectCode: 'SC-P57', projectName: 'Waleed Al Zaabi',                    location: 'Zayed City, MZ7, Plot 59',                completionPct: 1.0,  contractValue: 2000000, consultant: 'Kunooz Engineering Consultant LLC',        status: 'WORK_DONE' },
  { projectCode: 'SC-P58', projectName: 'Hasan Al Ansaray',                   location: 'Madinat Al Riyad, RD30, Plot #521',       completionPct: 1.0,  contractValue: 2000000, consultant: 'Fazaa Engineering Consultant LLC',         status: 'WORK_DONE' },
  { projectCode: 'SC-P59', projectName: 'Abdullah Albloushi',                 location: 'Riyadh City, RD25, Plot #63',             completionPct: 0.85, contractValue: 2500000, consultant: 'Modern Home Engineering Consultant',      status: 'ONGOING',   retention: 375000 },
  { projectCode: 'SC-P60', projectName: 'Fahed Alhammady',                    location: 'Al Shamka, SH32, Plot #106',              completionPct: 0.85, contractValue: 2000000, consultant: 'Modern Style Engineering Consultant',     status: 'ONGOING',   retention: 300000 },
  { projectCode: 'SC-P62', projectName: 'Mohammed Saeed Alkitby',             location: 'Al Shawamekh, SHM1, Plot #61',            completionPct: 0.80, contractValue: 2700000, consultant: 'Al Bahri Engineering Consultant',          status: 'ONGOING',   retention: 540000 },
  { projectCode: 'SC-P63', projectName: 'Tayah Almansoury',                   location: 'Baniyas City Sharq 12, Plot No.42',       completionPct: 1.0,  contractValue: 2323729, consultant: 'Al Badhaus Engineering Consultant',        status: 'WORK_DONE' },
  { projectCode: 'SC-P65', projectName: 'Hammad Alyahyai',                    location: 'Shamkah',                                 completionPct: 1.0,  contractValue: 2000000, consultant: 'Kunooz Engineering Consultant LLC',        status: 'WORK_DONE' },
  { projectCode: 'SC-P66', projectName: 'Mohammad Abdulrahaman',              location: 'Zayed City 1, Plot 215',                  completionPct: 1.0,  contractValue: 2000000, consultant: 'Al Ruayah Al Thakiah',                    status: 'WORK_DONE' },
  { projectCode: 'SC-P67', projectName: 'Hamdan Alyahyee',                    location: 'Riyadh City, RD74, Plot #13',             completionPct: 1.0,  contractValue: 2000000, consultant: 'Modern Home Engineering Consultant',      status: 'WORK_DONE' },
  { projectCode: 'SC-P68', projectName: 'Fadil Alshamsy Villa',               location: 'Alain',                                   completionPct: 0.76, contractValue: 2000000, consultant: 'Arak Engineering',                        status: 'ONGOING',   retention: 480000 },
  { projectCode: 'SC-P69', projectName: 'Mosque',                             location: 'Madinat',                                 completionPct: 1.0,  contractValue:  550000, consultant: null,                                       status: 'WORK_DONE' },
  { projectCode: 'SC-P70', projectName: 'Fawzyah Albloushi',                  location: 'Alain',                                   completionPct: 1.0,  contractValue:  600000, consultant: null,                                       status: 'WORK_DONE' },
  { projectCode: 'SC-P71', projectName: 'Nasser Mohammed',                    location: 'Alain',                                   completionPct: 1.0,  contractValue:  210000, consultant: null,                                       status: 'WORK_DONE' },
  { projectCode: 'SC-P72', projectName: 'Abdulazeez Al Balushi',              location: 'Al Bahia',                                completionPct: 0.0,  contractValue:  740000, consultant: null,                                       status: 'ONGOING'   },
  { projectCode: 'SC-P73', projectName: 'Mohamad Sabry Mahmoud',              location: 'Fujeira',                                 completionPct: 0.0,  contractValue:  210000, consultant: null,                                       status: 'HOLD'      },
  { projectCode: 'SC-P74', projectName: 'Abu Bakr Ahmed Al-Khader Al-Sayyari',location: 'Al Falah',                                completionPct: 1.0,  contractValue:  167000, consultant: null,                                       status: 'WORK_DONE' },
  { projectCode: 'SC-P75', projectName: 'Hameed Alrumaithy Store',            location: 'Khalifa City',                            completionPct: 1.0,  contractValue:   45000, consultant: null,                                       status: 'WORK_DONE' },
  { projectCode: 'SC-P76', projectName: 'Ali Albloshi',                       location: 'Al Taweelah',                             completionPct: 0.75, contractValue: 1090000, consultant: null,                                       status: 'ONGOING'   },
  { projectCode: 'SC-P77', projectName: 'Moon Flower City Majlis',            location: 'Musafah, M36A',                           completionPct: 1.0,  contractValue:  299250, consultant: null,                                       status: 'WORK_DONE' },
  { projectCode: 'SC-P78', projectName: 'Abdulah Mohamad',                    location: 'Alain',                                   completionPct: 0.0,  contractValue:  149100, consultant: null,                                       status: 'CANCELLED' },
  { projectCode: 'SC-P79', projectName: 'Dhay General Contracting',           location: 'Madinat Zayed',                           completionPct: 1.0,  contractValue:  396000, consultant: null,                                       status: 'WORK_DONE' },
  { projectCode: 'SC-P80', projectName: 'Hsan Almuhairy Roof Extension',      location: 'Madinat Zayed, MZW18',                    completionPct: 0.80, contractValue:  200000, consultant: null,                                       status: 'ONGOING',   retention: 40000  },
  { projectCode: 'SC-P81', projectName: 'Suhaib Albastaki Villa',             location: 'Al Shamkha City 32',                      completionPct: 0.0,  contractValue:  475000, consultant: 'Moore Engineering Consulting',             status: 'ONGOING'   },
  { projectCode: 'SC-P82', projectName: 'Musab Al Hamady',                    location: 'Riyadh',                                  completionPct: 0.0,  contractValue:  550000, consultant: 'Al Ruayah Al Thakiah',                    status: 'ONGOING'   },
  { projectCode: 'SC-P83', projectName: 'Abdullah Al Jafry',                  location: 'Mohammed Bin Zayed City',                 completionPct: 0.60, contractValue:  685000, consultant: 'Vision Engineering Consultancy',           status: 'ONGOING',   retention: 424700 },
  { projectCode: 'SC-P84', projectName: 'Abdulla Alyasi',                     location: 'Al Sader, Al Shatie Al Jadeedah',         completionPct: 0.0,  contractValue:   95000, consultant: null,                                       status: 'ONGOING'   },
  { projectCode: 'SC-P85', projectName: 'Eng. Amr Roof Shed',                 location: 'Zayed City, MZ11',                        completionPct: 0.0,  contractValue:   43000, consultant: null,                                       status: 'ONGOING'   },
  { projectCode: 'SC-P86', projectName: 'Saeed Mohammad Almuhairby',          location: 'Al Rahba Farms',                          completionPct: 0.0,  contractValue: 1330000, consultant: null,                                       status: 'ONGOING'   },
  { projectCode: 'SC-P87', projectName: 'Speed For Windows and Doors',        location: 'Al Rahba Farms',                          completionPct: 0.0,  contractValue:  600000, consultant: null,                                       status: 'ONGOING'   },
  { projectCode: 'SC-P88', projectName: 'Silver Falcon General',              location: 'Riyadh City 17, Plot 995',                completionPct: 0.0,  contractValue:  175000, consultant: null,                                       status: 'ONGOING'   },
  { projectCode: 'SC-P89', projectName: 'Mr. Saif Ahmed Jaber Alham',         location: 'Al Bateen 25, Plot #8',                   completionPct: 0.0,  contractValue:  105000, consultant: 'Alrakiz Contracting',                     status: 'ONGOING'   },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Stride HR Seed — Employees + Projects');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Employees — upsert so re-running is safe
  let empCount = 0;
  for (const emp of employees) {
    await prisma.payrollEmployee.upsert({
      where:  { empCode: emp.empCode },
      update: emp,
      create: emp,
    });
    empCount++;
  }
  console.log(`✓ Employees: ${empCount} upserted`);

  // Projects — upsert so re-running is safe
  let projCount = 0;
  for (const proj of projects) {
    await prisma.payrollProject.upsert({
      where:  { projectCode: proj.projectCode },
      update: proj,
      create: proj,
    });
    projCount++;
  }
  console.log(`✓ Projects:  ${projCount} upserted`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Done. Review data at /payroll/employees and /payroll/projects');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
