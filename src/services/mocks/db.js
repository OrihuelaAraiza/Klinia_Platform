const DB_KEY = "romimente.mockdb.v6";

const isBrowser = () => typeof window !== "undefined";

function nowIso() {
  return new Date().toISOString();
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function seed() {
  const profId = "prof_demo_1";
  const psicId = "prof_demo_2";
  const adminId = "admin_demo_1";
  const assistantId = "asst_demo_1";
  const patient1Id = "pat_demo_1";
  const patient2Id = "pat_demo_2";
  const patient3Id = "pat_demo_3";
  const patient4Id = "pat_demo_4";
  const patientUserId = "user_pat_1";
  const patient4UserId = "user_pat_4";

  const users = [
    {
      id: profId,
      email: "doctor@demo.com",
      password: "demo1234",
      firstName: "Ana",
      lastName: "García",
      name: "Dra. Ana García",
      role: "PROFESSIONAL",
      specialty: "PSIQUIATRA",
      specialtyName: "Psiquiatría Clínica",
      phone: "+52 555 111 2222",
      certificateFolio: "PSI-12345",
      officeName: "Consultorio Romimente Centro",
      address: {
        street: "Av. Reforma 123",
        neighborhood: "Centro",
        city: "Ciudad de México",
        state: "CDMX",
        postalCode: "06000",
      },
      bio: "Psiquiatra con enfoque integrativo en trastornos del ánimo y ansiedad. Acompaño a personas adultas en procesos farmacoterapéuticos y de psicoterapia breve.",
      yearsExperience: 12,
      languages: ["Español", "Inglés"],
      focusAreas: ["Depresión", "Trastornos de ansiedad", "Insomnio", "TDAH adulto"],
      modality: "MIXTA",
      publicProfile: true,
      verified: true,
    },
    {
      id: psicId,
      email: "psicologo@demo.com",
      password: "demo1234",
      firstName: "Sofía",
      lastName: "Reyes",
      name: "Lic. Sofía Reyes",
      role: "PROFESSIONAL",
      specialty: "PSICOLOGO",
      specialtyName: "Psicología Clínica",
      phone: "+52 555 222 3333",
      certificateFolio: "PSI-67890",
      officeName: "Consultorio Romimente Polanco",
      address: {
        street: "Av. Presidente Masaryk 100",
        neighborhood: "Polanco",
        city: "Ciudad de México",
        state: "CDMX",
        postalCode: "11550",
      },
      bio: "Psicóloga clínica enfocada en terapia cognitivo-conductual y manejo del estrés laboral. Trabajo con adolescentes y adultos jóvenes.",
      yearsExperience: 8,
      languages: ["Español"],
      focusAreas: ["Estrés laboral", "Ansiedad", "Duelo", "Terapia de pareja"],
      modality: "VIRTUAL",
      publicProfile: true,
      verified: true,
    },
    {
      id: "prof_demo_3",
      email: "psicoterapeuta@demo.com",
      password: "demo1234",
      firstName: "Mateo",
      lastName: "Hernández",
      name: "Mtro. Mateo Hernández",
      role: "PROFESSIONAL",
      specialty: "PSICOTERAPEUTA",
      specialtyName: "Psicoterapia humanista",
      phone: "+52 555 444 5555",
      certificateFolio: "PSI-44321",
      officeName: "Espacio Terapéutico Roma Norte",
      address: {
        street: "Calle Orizaba 99",
        neighborhood: "Roma Norte",
        city: "Ciudad de México",
        state: "CDMX",
        postalCode: "06700",
      },
      bio: "Psicoterapeuta humanista con posgrado en enfoque gestalt. Trabajo con duelo, identidad y procesos de autoconocimiento en personas adultas.",
      yearsExperience: 15,
      languages: ["Español", "Portugués"],
      focusAreas: ["Duelo", "Identidad", "Crecimiento personal", "Vínculos"],
      modality: "PRESENCIAL",
      publicProfile: true,
      verified: true,
    },
    {
      id: adminId,
      email: "admin@demo.com",
      password: "demo1234",
      firstName: "Carlos",
      lastName: "Mendoza",
      name: "Carlos Mendoza",
      role: "ADMIN",
      verified: true,
    },
    {
      id: patientUserId,
      email: "paciente@demo.com",
      password: "demo1234",
      firstName: "María",
      lastName: "López",
      name: "María López",
      role: "PATIENT",
      phone: "+52 555 333 4444",
      patientId: patient1Id,
      verified: true,
    },
    {
      id: assistantId,
      email: "asistente@demo.com",
      password: "demo1234",
      firstName: "Daniela",
      lastName: "Ortiz",
      name: "Daniela Ortiz",
      role: "ASSISTANT",
      phone: "+52 555 666 7777",
      professionalId: profId,
      verified: true,
    },
    {
      id: patient4UserId,
      email: "paciente2@demo.com",
      password: "demo1234",
      firstName: "Andrés",
      lastName: "Castillo",
      name: "Andrés Castillo",
      role: "PATIENT",
      phone: "+52 555 888 9999",
      patientId: patient4Id,
      verified: true,
    },
  ];

  const patients = [
    {
      id: patient1Id,
      userId: patientUserId,
      professionalId: profId,
      firstName: "María",
      lastName: "López Hernández",
      curp: "LOHM900101MDFPRR05",
      email: "paciente@demo.com",
      phone: "+52 555 333 4444",
      birthDate: "1990-01-01",
      gender: "F",
      civilStatus: "SOLTERO",
      occupation: "Diseñadora gráfica",
      education: "LICENCIATURA",
      religion: "NINGUNA",
      address: {
        street: "Calle Hidalgo 45",
        neighborhood: "Roma Norte",
        city: "Ciudad de México",
        state: "CDMX",
        postalCode: "06700",
      },
      emergencyName: "Pedro López",
      emergencyPhone: "+52 555 999 8888",
      referral: "Recomendación médico de cabecera",
      purpose: "Ansiedad y manejo del estrés laboral",
      status: "ACTIVE",
      createdAt: daysFromNow(-120),
      updatedAt: daysFromNow(-2),
      attachments: [],
    },
    {
      id: patient2Id,
      professionalId: profId,
      firstName: "Juan",
      lastName: "Ramírez Soto",
      curp: "RASJ850615HDFMTN09",
      email: "juan.ramirez@example.com",
      phone: "+52 555 222 1111",
      birthDate: "1985-06-15",
      gender: "M",
      civilStatus: "CASADO",
      occupation: "Ingeniero de software",
      education: "POSGRADO",
      religion: "CATOLICA",
      address: {
        street: "Av. Insurgentes 890",
        neighborhood: "Del Valle",
        city: "Ciudad de México",
        state: "CDMX",
        postalCode: "03100",
      },
      emergencyName: "Laura Ramírez",
      emergencyPhone: "+52 555 777 6666",
      referral: "Búsqueda directa",
      purpose: "Terapia de pareja",
      status: "ACTIVE",
      createdAt: daysFromNow(-90),
      updatedAt: daysFromNow(-5),
      attachments: [],
    },
    {
      id: patient3Id,
      professionalId: profId,
      firstName: "Sofía",
      lastName: "Vargas Núñez",
      curp: "VANS950820MDFRRF03",
      email: "sofia.vargas@example.com",
      phone: "+52 555 444 5555",
      birthDate: "1995-08-20",
      gender: "F",
      civilStatus: "UNION_LIBRE",
      occupation: "Médica residente",
      education: "POSGRADO",
      religion: "OTRA",
      address: {
        street: "Calle Pino 12",
        neighborhood: "Polanco",
        city: "Ciudad de México",
        state: "CDMX",
        postalCode: "11550",
      },
      emergencyName: "Roberto Vargas",
      emergencyPhone: "+52 555 333 2222",
      referral: "Referencia psiquiatra",
      purpose: "Episodios depresivos",
      status: "ACTIVE",
      createdAt: daysFromNow(-200),
      updatedAt: daysFromNow(-15),
      attachments: [],
    },
    {
      id: patient4Id,
      userId: patient4UserId,
      professionalId: profId,
      firstName: "Andrés",
      lastName: "Castillo Romero",
      curp: "CARA920305HDFSMN08",
      email: "paciente2@demo.com",
      phone: "+52 555 888 9999",
      birthDate: "1992-03-05",
      gender: "M",
      civilStatus: "SOLTERO",
      occupation: "Arquitecto",
      education: "LICENCIATURA",
      religion: "NINGUNA",
      address: {
        street: "Av. Universidad 1500",
        neighborhood: "Coyoacán",
        city: "Ciudad de México",
        state: "CDMX",
        postalCode: "04510",
      },
      emergencyName: "Lucía Castillo",
      emergencyPhone: "+52 555 111 0000",
      referral: "Redes sociales",
      purpose: "Insomnio crónico y rumiación nocturna",
      status: "ACTIVE",
      createdAt: daysFromNow(-30),
      updatedAt: daysFromNow(-1),
      attachments: [],
    },
  ];

  const sessions = [
    {
      id: uid("ses"),
      patientId: patient1Id,
      patientName: "María López Hernández",
      professionalId: profId,
      scheduledAt: daysFromNow(0),
      time: daysFromNow(0),
      duration: 60,
      modality: "PRESENCIAL",
      status: "SCHEDULED",
      notes: "",
      noteId: null,
      createdAt: daysFromNow(-7),
    },
    {
      id: uid("ses"),
      patientId: patient2Id,
      patientName: "Juan Ramírez Soto",
      professionalId: profId,
      scheduledAt: daysFromNow(0),
      time: daysFromNow(0),
      duration: 60,
      modality: "VIDEO",
      status: "SCHEDULED",
      notes: "",
      noteId: null,
      createdAt: daysFromNow(-3),
    },
    {
      id: uid("ses"),
      patientId: patient1Id,
      patientName: "María López Hernández",
      professionalId: profId,
      scheduledAt: daysFromNow(-7),
      time: daysFromNow(-7),
      duration: 60,
      modality: "PRESENCIAL",
      status: "COMPLETED",
      notes: "Sesión completa",
      noteId: null,
      createdAt: daysFromNow(-14),
    },
    {
      id: uid("ses"),
      patientId: patient3Id,
      patientName: "Sofía Vargas Núñez",
      professionalId: profId,
      scheduledAt: daysFromNow(3),
      time: daysFromNow(3),
      duration: 60,
      modality: "VIDEO",
      status: "SCHEDULED",
      notes: "",
      noteId: null,
      createdAt: daysFromNow(-1),
    },
    {
      id: uid("ses"),
      patientId: patient2Id,
      patientName: "Juan Ramírez Soto",
      professionalId: profId,
      scheduledAt: daysFromNow(-14),
      time: daysFromNow(-14),
      duration: 60,
      modality: "PRESENCIAL",
      status: "COMPLETED",
      notes: "",
      noteId: null,
      createdAt: daysFromNow(-20),
    },
  ];

  const notes = [
    {
      id: uid("note"),
      patientId: patient1Id,
      professionalId: profId,
      sessionId: null,
      title: "Nota inicial",
      content:
        "Paciente acude con sintomatología ansiosa. Reporta dificultades para conciliar el sueño y pensamientos rumiantes. Se establece plan de manejo cognitivo-conductual.",
      status: "CLOSED",
      signature: null,
      addendums: [],
      createdAt: daysFromNow(-30),
      updatedAt: daysFromNow(-30),
      closedAt: daysFromNow(-30),
    },
    {
      id: uid("note"),
      patientId: patient2Id,
      professionalId: profId,
      sessionId: null,
      title: "Seguimiento",
      content: "Paciente reporta avances. Continúa con técnicas de relajación.",
      status: "DRAFT",
      signature: null,
      addendums: [],
      createdAt: daysFromNow(-5),
      updatedAt: daysFromNow(-5),
      closedAt: null,
    },
  ];

  const prescriptions = [
    {
      id: uid("rx"),
      patientRecordId: patient1Id,
      patientId: patient1Id,
      patientName: "María López Hernández",
      professionalId: profId,
      folio: "RX-2025-0001",
      status: "ACTIVE",
      medications: [
        {
          name: "Sertralina",
          dose: "50 mg",
          frequency: "Cada 24h",
          duration: "30 días",
          instructions: "Tomar por la mañana con alimentos",
        },
      ],
      indications: "Continuar terapia psicológica semanal",
      signedAt: daysFromNow(-10),
      createdAt: daysFromNow(-10),
    },
  ];

  const reports = [
    {
      id: uid("rep"),
      patientId: patient1Id,
      professionalId: profId,
      folio: "REP-2025-0001",
      template: "LIBRE",
      data: {
        title: "Reporte trimestral de avance",
        content:
          "Paciente muestra evolución favorable. Reducción de síntomas ansiosos en escala GAD-7 de 16 a 8 puntos.",
      },
      status: "FIRMADO",
      pdfHash: "demo_hash_001",
      verificationCode: "REP-2025-0001",
      createdAt: daysFromNow(-20),
      updatedAt: daysFromNow(-18),
      signedAt: daysFromNow(-18),
    },
  ];

  const orders = [];

  const consents = [
    {
      id: uid("cns"),
      patientId: patient1Id,
      type: "PRIVACY",
      status: "signed",
      signedAt: daysFromNow(-120),
    },
    {
      id: uid("cns"),
      patientId: patient1Id,
      type: "INFORMED_CONSENT",
      status: "signed",
      signedAt: daysFromNow(-120),
    },
    {
      id: uid("cns"),
      patientId: patient2Id,
      type: "PRIVACY",
      status: "signed",
      signedAt: daysFromNow(-90),
    },
  ];

  const histories = {
    [patient1Id]: {
      patientId: patient1Id,
      professionalId: profId,
      firstName: "María",
      lastName: "López Hernández",
      curp: "LOHM900101MDFPRR05",
      birthDate: "1990-01-01",
      gender: "F",
      civilStatus: "SOLTERO",
      occupation: "Diseñadora gráfica",
      education: "LICENCIATURA",
      religion: "NINGUNA",
      motivoConsulta: "Ansiedad generalizada y problemas de sueño",
      antecedentesPersonales: "Sin antecedentes médicos relevantes",
      antecedentesFamiliares: "Madre con depresión tratada",
      evolucionTemporal: "Progresivo",
      pronostico: "Bueno",
      diagnoses: [
        { code: "F41.1", description: "Trastorno de ansiedad generalizada" },
      ],
      areasYo: ["Trabajo", "Estudio"],
      areasDemas: ["Familia origen"],
      areasMundo: ["Sociedad"],
      dimensionesSPR: ["Pensamientos", "Sensaciones"],
      completionPercentage: 85,
      missingFieldsCount: 2,
      createdAt: daysFromNow(-120),
      updatedAt: daysFromNow(-10),
    },
    [patient2Id]: {
      patientId: patient2Id,
      professionalId: profId,
      firstName: "Juan",
      lastName: "Ramírez Soto",
      curp: "RASJ850615HDFMTN09",
      birthDate: "1985-06-15",
      gender: "M",
      motivoConsulta: "Terapia de pareja",
      diagnoses: [],
      completionPercentage: 60,
      missingFieldsCount: 8,
      createdAt: daysFromNow(-90),
      updatedAt: daysFromNow(-20),
    },
    [patient3Id]: {
      patientId: patient3Id,
      professionalId: profId,
      firstName: "Sofía",
      lastName: "Vargas Núñez",
      motivoConsulta: "Episodios depresivos",
      diagnoses: [
        { code: "F32.1", description: "Episodio depresivo moderado" },
      ],
      completionPercentage: 40,
      missingFieldsCount: 12,
      createdAt: daysFromNow(-200),
      updatedAt: daysFromNow(-30),
    },
  };

  const supervision = [
    {
      id: uid("sup"),
      professionalId: profId,
      supervisorName: "Dr. Manuel Téllez",
      caseDescription: "Caso de María L. — manejo de ansiedad generalizada",
      observations: "Revisar técnicas de exposición gradual",
      createdAt: daysFromNow(-30),
    },
  ];

  const delegates = [
    {
      id: assistantId,
      professionalId: profId,
      email: "asistente@demo.com",
      name: "Daniela Ortiz",
      createdAt: daysFromNow(-45),
    },
  ];
  const auditLog = [];

  // Solicitudes de cita: paciente pide nueva sesión a su terapeuta.
  // Status: PENDING / ACCEPTED / DECLINED / CANCELLED.
  // Al aceptar, el terapeuta crea la sesión real y deja el id en sessionId.
  const appointmentRequests = [
    {
      id: uid("apt"),
      patientId: patient1Id,
      patientName: "María López Hernández",
      patientEmail: "paciente@demo.com",
      professionalId: profId,
      professionalName: "Dra. Ana García",
      requestedAt: daysFromNow(5),
      modality: "PRESENCIAL",
      reason: "Quisiera revisar mi ajuste de medicación, he sentido mucho sueño durante el día.",
      status: "PENDING",
      responseMessage: "",
      sessionId: null,
      createdAt: daysFromNow(-1),
      respondedAt: null,
    },
  ];

  // Solicitudes de vinculación paciente → terapeuta.
  // Las crea el paciente al registrarse desde la landing pública con
  // su(s) terapeuta(s) elegido(s). El terapeuta las acepta/rechaza
  // desde /solicitudes en su panel.
  const linkageRequests = [
    {
      id: uid("link"),
      patientId: patient2Id,
      patientName: "Juan Ramírez Soto",
      patientEmail: "juan.ramirez@example.com",
      professionalId: profId,
      professionalName: "Dra. Ana García",
      professionalSpecialty: "PSIQUIATRA",
      priority: "primary",
      reason: "Necesito apoyo para manejo de ansiedad y crisis de pánico recientes.",
      status: "PENDING",
      responseMessage: "",
      createdAt: daysFromNow(-2),
      respondedAt: null,
    },
  ];

  return {
    users,
    patients,
    sessions,
    notes,
    prescriptions,
    reports,
    orders,
    consents,
    histories,
    supervision,
    delegates,
    linkageRequests,
    appointmentRequests,
    auditLog,
    currentUserId: null,
  };
}

let _db = null;

function load() {
  if (_db) return _db;
  if (!isBrowser()) {
    _db = seed();
    return _db;
  }
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      _db = JSON.parse(raw);
      return _db;
    }
  } catch {
    // fall through to seed
  }
  _db = seed();
  save();
  return _db;
}

function save() {
  if (!isBrowser() || !_db) return;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(_db));
  } catch (e) {
    console.warn("[mockdb] save failed", e);
  }
}

export function db() {
  return load();
}

export function persist() {
  save();
}

export function resetDb() {
  _db = seed();
  save();
  return _db;
}

export function paginate(items, { page = 1, size = 50 } = {}) {
  const p = Math.max(1, Number(page) || 1);
  const s = Math.max(1, Number(size) || 50);
  const start = (p - 1) * s;
  return {
    items: items.slice(start, start + s),
    total: items.length,
    page: p,
    size: s,
  };
}

export function delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms));
}

if (isBrowser()) {
  window.__romimenteMockDb = {
    db: () => load(),
    reset: () => resetDb(),
    persist,
  };
}

export { nowIso, daysFromNow };
