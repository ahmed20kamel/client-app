-- ============================================================
-- Stride HR Seed — Employees + Projects
-- Run this in Neon SQL Editor
-- Safe to run multiple times (ON CONFLICT DO UPDATE)
-- ============================================================

-- ── EMPLOYEES ────────────────────────────────────────────────

-- STRIDE OFFICE (8 hrs/day)
INSERT INTO "PayrollEmployee" ("id","empCode","name","visaType","costCenter","wpsEntity","paymentMethod","basicSalary","allowances","totalSalary","otherAllowance","hoursPerDay","status","createdAt","updatedAt")
VALUES
  (gen_random_uuid(),'NEW-02',  'Mohammed SHAREEF',           'SC-MAIN','Stride Office','SC',   'WPS', 3000,2000,5000,0,8,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'SC47',    'Mohamed Elsayed',            'SC-MAIN','Stride Office','SC',   'WPS', 2000,2000,4000,0,8,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'SC23',    'Hussein Jasim',              'SC-MAIN','Stride Office','SC',   'WPS', 3000,2000,5000,0,8,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'MAISAN13','Basmah Ali Abid Abid',       'SC-MAIN','Stride Office','SC',   'WPS', 1000,1000,2000,0,8,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'SC24',    'Mohammed Malik',             'SC-MAIN','Stride Office','SC',   'Cash',2100,1400,3500,0,8,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'SC-35',   'Ansar Abdulrehman',         'SC-MAIN','Stride Office','SC',   'WPS', 2400,2100,4500,0,8,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'SC-43',   'Ryad Mohammad',              'SC-MAIN','Stride Office','SC',   'WPS', 1500,1500,3000,0,8,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NF-25',   'Mohamed Fares',              'SC-MAIN','Stride Office','SC',   'WPS', 1200, 800,2000,0,8,'HOLD',  NOW(),NOW()),
  (gen_random_uuid(),'SC45',    'Eng. Hanna (Alin)',          'SC-MAIN','Stride Office','SC',   'WPS', 2000,2000,3500,0,8,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'SC46',    'Yaseen Nizar',               'SC-MAIN','Stride Office','SC',   'WPS', 1500,2000,3500,0,8,'ACTIVE',NOW(),NOW())
ON CONFLICT ("empCode") DO UPDATE SET
  "name"=EXCLUDED."name","visaType"=EXCLUDED."visaType","costCenter"=EXCLUDED."costCenter",
  "wpsEntity"=EXCLUDED."wpsEntity","paymentMethod"=EXCLUDED."paymentMethod",
  "basicSalary"=EXCLUDED."basicSalary","allowances"=EXCLUDED."allowances",
  "totalSalary"=EXCLUDED."totalSalary","otherAllowance"=EXCLUDED."otherAllowance",
  "hoursPerDay"=EXCLUDED."hoursPerDay","status"=EXCLUDED."status","updatedAt"=NOW();

-- STRIDE MAIN (9 hrs/day)
INSERT INTO "PayrollEmployee" ("id","empCode","name","visaType","costCenter","wpsEntity","paymentMethod","basicSalary","allowances","totalSalary","otherAllowance","hoursPerDay","status","createdAt","updatedAt")
VALUES
  (gen_random_uuid(),'SC16',      'Ahmed MD Foysol',            'SC-MAIN','Stride Main','SC',  'WPS',  700, 950,1650,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'SC17',      'Khalil Rahman',              'SC-MAIN','Stride Main','SC',  'WPS', 3000,1500,4500,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'SC19',      'MD Oliur Rahman',            'SC-MAIN','Stride Main','SC',  'WPS',  600,1100,1700,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'SC28',      'MD Mohin',                   'SC-MAIN','Stride Main','SC',  'WPS',  660, 590,1250,150,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'SC29',      'Juel Rana',                  'SC-MAIN','Stride Main','SC',  'WPS',  660, 840,1500,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'SC38(RK7)', 'Bhagwan Prasad Ramashare',   'SC-MAIN','Stride Main','SC',  'WPS', 1100, 600,1700,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'NF05',      'Karthik',                    'SC-MAIN','Stride Main','SC',  'WPS', 3000,1000,4000,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'SC48',      'Abebe Girma Wendimu',        'SC-MAIN','Stride Main','NF',  'WPS',  400, 600,1200,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'NF08',      'Thariq Mahmood',             'SC-MAIN','Stride Main','Cash','Cash', 950,3050,4000,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'NF09',      'Asif Zafar',                 'SC-MAIN','Stride Main','SC',  'WPS', 1000,2500,3500,  0,9,'VACATION',NOW(),NOW()),
  (gen_random_uuid(),'SC49',      'Mahomoud Forman',            'SC-MAIN','Stride Main','SC',  'WPS', 2400,1600,4000,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'SC50',      'Harendra Prasad',            'SC-MAIN','Stride Main','Cash','Cash', 500, 720,1250,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'NF10',      'Mohammed Shopon Adom Ali',   'Outside','Stride Main','Cash','Cash',1200, 800,2000,  0,9,'ACTIVE',  NOW(),NOW()),
  (gen_random_uuid(),'NF11',      'Akrakul Karim Abdul Khalek', 'Outside','Stride Main','Cash','Cash',1000,1000,2000,  0,9,'ACTIVE',  NOW(),NOW())
ON CONFLICT ("empCode") DO UPDATE SET
  "name"=EXCLUDED."name","visaType"=EXCLUDED."visaType","costCenter"=EXCLUDED."costCenter",
  "wpsEntity"=EXCLUDED."wpsEntity","paymentMethod"=EXCLUDED."paymentMethod",
  "basicSalary"=EXCLUDED."basicSalary","allowances"=EXCLUDED."allowances",
  "totalSalary"=EXCLUDED."totalSalary","otherAllowance"=EXCLUDED."otherAllowance",
  "hoursPerDay"=EXCLUDED."hoursPerDay","status"=EXCLUDED."status","updatedAt"=NOW();

-- NATIONAL FACTORY (9 hrs/day)
INSERT INTO "PayrollEmployee" ("id","empCode","name","visaType","costCenter","wpsEntity","paymentMethod","basicSalary","allowances","totalSalary","otherAllowance","hoursPerDay","status","createdAt","updatedAt")
VALUES
  (gen_random_uuid(),'NF26','Alok',                   'NF',  'National Factory','NF','WPS', 660, 740,1400,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NF24','Saeed Ahmad',            'NF',  'National Factory','NF','WPS',1800,1200,3000,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NF23','Shahvaj Khan',           'NF',  'National Factory','NF','WPS', 990, 660,1650,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NF31','Ragab Shokry',           'ALUM','National Factory','NF','WPS', 500, 500,1000,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NF32','Osama Said',             'ALUM','National Factory','NF','WPS', 500, 500,1000,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NF33','Mohamed Abdou',          'ALUM','National Factory','NF','WPS', 500, 500,1000,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NF27','Kulvir Singh Paramjit',  'NF',  'National Factory','NF','WPS', 950, 650,1600,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NF28','Nebre Seyoum Desta',     'NF',  'National Factory','NF','WPS', 400, 600,1200,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NF30','Tsegaye Abebe Alembo',   'NF',  'National Factory','NF','WPS', 400, 600,1200,0,9,'ACTIVE',NOW(),NOW())
ON CONFLICT ("empCode") DO UPDATE SET
  "name"=EXCLUDED."name","visaType"=EXCLUDED."visaType","costCenter"=EXCLUDED."costCenter",
  "wpsEntity"=EXCLUDED."wpsEntity","paymentMethod"=EXCLUDED."paymentMethod",
  "basicSalary"=EXCLUDED."basicSalary","allowances"=EXCLUDED."allowances",
  "totalSalary"=EXCLUDED."totalSalary","otherAllowance"=EXCLUDED."otherAllowance",
  "hoursPerDay"=EXCLUDED."hoursPerDay","status"=EXCLUDED."status","updatedAt"=NOW();

-- MAISAN CARPENTRY (9 hrs/day)
INSERT INTO "PayrollEmployee" ("id","empCode","name","visaType","costCenter","wpsEntity","paymentMethod","basicSalary","allowances","totalSalary","otherAllowance","hoursPerDay","status","createdAt","updatedAt")
VALUES
  (gen_random_uuid(),'MAISAN05','Saiful Islam Rafiq Ullah',     'MAISAN', 'Maisan Carpentry','Maisan','WPS',1000,1000,2000,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'MAISAN02','Mantu Kumar Parwat Baliram',   'SC-MAIN','Maisan Carpentry','Maisan','WPS',1100, 550,1650,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'SC25',   'Niraj Kumar',                   'MAISAN', 'Maisan Carpentry','Maisan','WPS', 660,1340,2000,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NF06',   'Saadullah Fazal Naeem Fazal',   'MAISAN', 'Maisan Carpentry','Maisan','WPS',1500,2200,3700,0,9,'ACTIVE',NOW(),NOW())
ON CONFLICT ("empCode") DO UPDATE SET
  "name"=EXCLUDED."name","visaType"=EXCLUDED."visaType","costCenter"=EXCLUDED."costCenter",
  "wpsEntity"=EXCLUDED."wpsEntity","paymentMethod"=EXCLUDED."paymentMethod",
  "basicSalary"=EXCLUDED."basicSalary","allowances"=EXCLUDED."allowances",
  "totalSalary"=EXCLUDED."totalSalary","otherAllowance"=EXCLUDED."otherAllowance",
  "hoursPerDay"=EXCLUDED."hoursPerDay","status"=EXCLUDED."status","updatedAt"=NOW();

-- OUTSIDE VISA (9 hrs/day)
INSERT INTO "PayrollEmployee" ("id","empCode","name","visaType","costCenter","wpsEntity","paymentMethod","basicSalary","allowances","totalSalary","otherAllowance","hoursPerDay","status","createdAt","updatedAt")
VALUES
  (gen_random_uuid(),'NW-48','Charanjith Singh',       'NW',     'Outside Visa','Cash','Cash',480,  720,1200,0,9,'HOLD',  NOW(),NOW()),
  (gen_random_uuid(),'NW-55','Hameed Khan',            'Outside','Outside Visa','Cash','Cash',650, 1000,1650,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NW-50','Bahaa Dadud',            'Outside','Outside Visa','Cash','Cash',  0,    0,2000,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NW-51','Ahmed Shahat',           'Outside','Outside Visa','Cash','Cash',  0,    0,2000,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NW-52','Mahmoud Abouhoraira',    'Outside','Outside Visa','Cash','Cash',  0,    0,2000,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NW-53','Moustafa Mason',         'Outside','Outside Visa','Cash','Cash',  0,    0,2500,0,9,'ACTIVE',NOW(),NOW()),
  (gen_random_uuid(),'NW-54','Haysam',                 'Outside','Outside Visa','Cash','Cash',  0,    0,2000,0,9,'ACTIVE',NOW(),NOW())
ON CONFLICT ("empCode") DO UPDATE SET
  "name"=EXCLUDED."name","visaType"=EXCLUDED."visaType","costCenter"=EXCLUDED."costCenter",
  "wpsEntity"=EXCLUDED."wpsEntity","paymentMethod"=EXCLUDED."paymentMethod",
  "basicSalary"=EXCLUDED."basicSalary","allowances"=EXCLUDED."allowances",
  "totalSalary"=EXCLUDED."totalSalary","otherAllowance"=EXCLUDED."otherAllowance",
  "hoursPerDay"=EXCLUDED."hoursPerDay","status"=EXCLUDED."status","updatedAt"=NOW();


-- ── PROJECTS ─────────────────────────────────────────────────

INSERT INTO "PayrollProject" ("id","projectCode","projectName","location","completionPct","contractValue","consultant","status","retention","createdAt","updatedAt")
VALUES
  (gen_random_uuid(),'SC-P50','Mohamed Rashid Alhefeiti',           'Khalifa City, SE45, Plot #168',            1.00, 2466346,'Corredera Engineering Consulting',        'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P52','Mohammad Gareeb Albloushi',          'Madinat Al Riyad, RD30, Plot #509',        1.00, 2300000,'Corredera Engineering Consulting',        'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P53','Tariq Almarzooqi',                   'Al Shamka, SH32, Plot #84',                1.00, 2441286,'Corredera Engineering Consulting',        'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P54','Fahed Al Khori',                     'Al Shawamekh, SHM12, Plot #303',           1.00, 2000000,'Smart Buildings Engineering Consultancy', 'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P55','Faraj Al Humeiri',                   'Mohamed Bin Zayed City, ME4, Plot #51',    1.00, 2000000,'Corredera Engineering Consulting',        'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P56','Khaled Al Humeiri',                  'Mohamed Bin Zayed City, ME4, Plot #49',    1.00, 2000000,'Corredera Engineering Consulting',        'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P57','Waleed Al Zaabi',                    'Zayed City, MZ7, Plot 59',                 1.00, 2000000,'Kunooz Engineering Consultant LLC',       'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P58','Hasan Al Ansaray',                   'Madinat Al Riyad, RD30, Plot #521',        1.00, 2000000,'Fazaa Engineering Consultant LLC',        'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P59','Abdullah Albloushi',                 'Riyadh City, RD25, Plot #63',              0.85, 2500000,'Modern Home Engineering Consultant',      'ONGOING',  375000,NOW(),NOW()),
  (gen_random_uuid(),'SC-P60','Fahed Alhammady',                    'Al Shamka, SH32, Plot #106',               0.85, 2000000,'Modern Style Engineering Consultant',     'ONGOING',  300000,NOW(),NOW()),
  (gen_random_uuid(),'SC-P62','Mohammed Saeed Alkitby',             'Al Shawamekh, SHM1, Plot #61',             0.80, 2700000,'Al Bahri Engineering Consultant',         'ONGOING',  540000,NOW(),NOW()),
  (gen_random_uuid(),'SC-P63','Tayah Almansoury',                   'Baniyas City Sharq 12, Plot No.42',        1.00, 2323729,'Al Badhaus Engineering Consultant',       'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P65','Hammad Alyahyai',                    'Shamkah',                                  1.00, 2000000,'Kunooz Engineering Consultant LLC',       'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P66','Mohammad Abdulrahaman',              'Zayed City 1, Plot 215',                   1.00, 2000000,'Al Ruayah Al Thakiah',                    'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P67','Hamdan Alyahyee',                    'Riyadh City, RD74, Plot #13',              1.00, 2000000,'Modern Home Engineering Consultant',      'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P68','Fadil Alshamsy Villa',               'Alain',                                    0.76, 2000000,'Arak Engineering',                        'ONGOING',  480000,NOW(),NOW()),
  (gen_random_uuid(),'SC-P69','Mosque',                             'Madinat',                                  1.00,  550000, NULL,                                      'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P70','Fawzyah Albloushi',                  'Alain',                                    1.00,  600000, NULL,                                      'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P71','Nasser Mohammed',                    'Alain',                                    1.00,  210000, NULL,                                      'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P72','Abdulazeez Al Balushi',              'Al Bahia',                                 0.00,  740000, NULL,                                      'ONGOING',      NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P73','Mohamad Sabry Mahmoud',              'Fujeira',                                  0.00,  210000, NULL,                                      'HOLD',         NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P74','Abu Bakr Ahmed Al-Sayyari',          'Al Falah',                                 1.00,  167000, NULL,                                      'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P75','Hameed Alrumaithy Store',            'Khalifa City',                             1.00,   45000, NULL,                                      'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P76','Ali Albloshi',                       'Al Taweelah',                              0.75, 1090000, NULL,                                      'ONGOING',      NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P77','Moon Flower City Majlis',            'Musafah, M36A',                            1.00,  299250, NULL,                                      'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P78','Abdulah Mohamad',                    'Alain',                                    0.00,  149100, NULL,                                      'CANCELLED',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P79','Dhay General Contracting',           'Madinat Zayed',                            1.00,  396000, NULL,                                      'WORK_DONE',    NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P80','Hsan Almuhairy Roof Extension',      'Madinat Zayed, MZW18',                     0.80,  200000, NULL,                                      'ONGOING',   40000,NOW(),NOW()),
  (gen_random_uuid(),'SC-P81','Suhaib Albastaki Villa',             'Al Shamkha City 32',                       0.00,  475000,'Moore Engineering Consulting',             'ONGOING',      NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P82','Musab Al Hamady',                    'Riyadh',                                   0.00,  550000,'Al Ruayah Al Thakiah',                    'ONGOING',      NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P83','Abdullah Al Jafry',                  'Mohammed Bin Zayed City',                  0.60,  685000,'Vision Engineering Consultancy',           'ONGOING',  424700,NOW(),NOW()),
  (gen_random_uuid(),'SC-P84','Abdulla Alyasi',                     'Al Sader, Al Shatie Al Jadeedah',          0.00,   95000, NULL,                                      'ONGOING',      NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P85','Eng. Amr Roof Shed',                 'Zayed City, MZ11',                         0.00,   43000, NULL,                                      'ONGOING',      NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P86','Saeed Mohammad Almuhairby',          'Al Rahba Farms',                           0.00, 1330000, NULL,                                      'ONGOING',      NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P87','Speed For Windows and Doors',        'Al Rahba Farms',                           0.00,  600000, NULL,                                      'ONGOING',      NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P88','Silver Falcon General',              'Riyadh City 17, Plot 995',                 0.00,  175000, NULL,                                      'ONGOING',      NULL,NOW(),NOW()),
  (gen_random_uuid(),'SC-P89','Mr. Saif Ahmed Jaber Alham',         'Al Bateen 25, Plot #8',                    0.00,  105000,'Alrakiz Contracting',                     'ONGOING',      NULL,NOW(),NOW())
ON CONFLICT ("projectCode") DO UPDATE SET
  "projectName"=EXCLUDED."projectName","location"=EXCLUDED."location",
  "completionPct"=EXCLUDED."completionPct","contractValue"=EXCLUDED."contractValue",
  "consultant"=EXCLUDED."consultant","status"=EXCLUDED."status",
  "retention"=EXCLUDED."retention","updatedAt"=NOW();

-- ── VERIFY ───────────────────────────────────────────────────
SELECT 'Employees' AS "table", COUNT(*) AS "count" FROM "PayrollEmployee"
UNION ALL
SELECT 'Projects',             COUNT(*)              FROM "PayrollProject";
