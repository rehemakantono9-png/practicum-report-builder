const state = {
  profile: {
    fullName: "",
    registrationNumber: "",
    studentNumber: "",
    university: "",
    faculty: "",
    programme: "",
    yearSemester: "",
    phone: "",
    email: ""
  },
  placement: {
    placementType: "",
    hostOrganization: "",
    departmentUnit: "",
    location: "",
    startDate: "",
    endDate: "",
    duration: "",
    hostSupervisor: "",
    hostSupervisorTitle: "",
    universitySupervisor: "",
    universitySupervisorTitle: "",
    missionFunctions: ""
  },
  workMode: "",
  logbookEntries: [],
  sectionContent: {},
  selectedSectionTitle: "Title Page",
  projectName: "My Practicum Report Project",
  placementTypes: [],
  reportSectionsConfig: null,
  demoProjects: [],
  savedProjects: [],
  payment: {
    isPaid: false,
    amount: 10000,
    status: "unpaid",
    orderTrackingId: "",
    merchantReference: ""
  }
};

const STORAGE_KEYS = {
  projects: "practicum_report_builder_projects",
  current: "practicum_report_builder_current"
};

const BACKEND_BASE_URL = "https://practicum-report-payments-backend.netlify.app";

const WORK_MODES = [
  {
    id: "template_only",
    title: "Template Only",
    description: "Fill a structured report manually and export it."
  },
  {
    id: "logbook_first",
    title: "Logbook First",
    description: "Record activities first, then generate the report later."
  },
  {
    id: "ai_builder",
    title: "AI-Assisted Report Builder",
    description: "Use your inputs and logbook to draft report sections."
  }
];

const AI_TOOLS = [
  "Expand My Points",
  "Rewrite Formally",
  "Summarize My Logbook",
  "Draft This Chapter",
  "Remove Repetition",
  "Improve Grammar",
  "Generate Recommendations",
  "Generate Final Conclusion"
];

const FORMATTING_NOTES = [
  "Institution-branded cover page option.",
  "Automatic table of contents generation.",
  "Page numbering and print layout controls.",
  "Supervisor sign-off page formatting.",
  "Word and PDF export with consistent margins and heading styles.",
  "Separate export for full report and standalone logbook."
];

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  await loadConfigFiles();
  initializeSectionContent();
  bindNavigation();
  bindHomeActions();
  bindProfileInputs();
  bindPlacementInputs();
  bindLogbookInputs();
  bindReportEditor();
  bindGeneralButtons();
  loadSavedProjectsFromStorage();
  loadCurrentProjectFromStorage();
  renderStaticAreas();
  await handleReturnedPayment();
  renderAll();
}

async function loadConfigFiles() {
  try {
    const [placementTypesRes, reportSectionsRes, demoProjectsRes] = await Promise.all([
      fetch("data/placement-types.json"),
      fetch("data/report-sections.json"),
      fetch("data/demo-projects.json")
    ]);

    state.placementTypes = await placementTypesRes.json();
    state.reportSectionsConfig = await reportSectionsRes.json();
    state.demoProjects = await demoProjectsRes.json();
  } catch (error) {
    console.error("Failed to load config files:", error);
    alert("Some data files failed to load. Check file names and JSON formatting.");
  }
}

async function handleReturnedPayment() {
  try {
    const params = new URLSearchParams(window.location.search);
    const paymentReturned = params.get("payment");
    const orderTrackingId = params.get("orderTrackingId");
    const merchantReference = params.get("merchantReference");

    if (paymentReturned !== "returned" || !orderTrackingId) {
      return;
    }

    const response = await fetch(
      `${BACKEND_BASE_URL}/.netlify/functions/check-status?orderTrackingId=${encodeURIComponent(orderTrackingId)}`
    );

    const data = await response.json();

    if (
      response.ok &&
      data.payment_status_description &&
      String(data.payment_status_description).toLowerCase() === "completed"
    ) {
      state.payment = {
        isPaid: true,
        amount: Number(data.amount || 10000),
        status: "paid",
        orderTrackingId,
        merchantReference: merchantReference || data.merchant_reference || ""
      };

      updateCurrentStorage();
      alert("Payment confirmed successfully. Premium features are now unlocked.");
    } else {
      alert("Payment return detected, but payment is not yet confirmed.");
    }

    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanUrl);
  } catch (error) {
    console.error("Payment verification failed:", error);
    alert("Could not verify payment automatically.");
  }
}

function initializeSectionContent() {
  const titles = getAllSectionTitles();
  titles.forEach((title) => {
    if (!Object.prototype.hasOwnProperty.call(state.sectionContent, title)) {
      state.sectionContent[title] = "";
    }
  });
}

function getCommonSections() {
  return state.reportSectionsConfig?.common || [];
}

function getSpecializedSections() {
  const type = state.placement.placementType;
  return state.reportSectionsConfig?.specialized?.[type] || [];
}

function getAllSections() {
  return [...getCommonSections(), ...getSpecializedSections()];
}

function getAllSectionTitles() {
  return getAllSections().map((section) => section.title);
}

function bindNavigation() {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => {
      goToPage(button.dataset.page);
    });
  });

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      goToPage(button.dataset.go);
    });
  });
}

function goToPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.remove("active"));

  const page = document.getElementById(`page-${pageId}`);
  const nav = document.querySelector(`.nav-link[data-page="${pageId}"]`);

  if (page) page.classList.add("active");
  if (nav) nav.classList.add("active");
}

function bindHomeActions() {
  document.getElementById("startNewProjectBtn")?.addEventListener("click", () => {
    resetProject(false);
    goToPage("profile");
  });

  document.getElementById("continueSavedBtn")?.addEventListener("click", () => {
    loadLatestSavedProject();
  });

  document.getElementById("loadDemoBtn")?.addEventListener("click", () => {
    loadDemoProject();
  });

  document.getElementById("openReportBtn")?.addEventListener("click", () => {
    goToPage("report");
  });

  document.getElementById("projectNameInput")?.addEventListener("input", (e) => {
    state.projectName = e.target.value.trim() || "My Practicum Report Project";
    updateActiveProjectName();
    updateCurrentStorage();
  });

  document.getElementById("saveProjectBtn")?.addEventListener("click", saveProject);
  document.getElementById("resetProjectBtn")?.addEventListener("click", () => resetProject(true));
}

function bindProfileInputs() {
  const profileFields = [
    "fullName",
    "registrationNumber",
    "studentNumber",
    "university",
    "faculty",
    "programme",
    "yearSemester",
    "phone",
    "email"
  ];

  profileFields.forEach((field) => {
    const input = document.getElementById(field);
    if (!input) return;
    input.addEventListener("input", (e) => {
      state.profile[field] = e.target.value;
      renderProfilePreview();
      renderStatusArea();
      updateCurrentStorage();
    });
  });

  document.getElementById("toPlacementBtn")?.addEventListener("click", () => {
    goToPage("placement");
  });
}

function bindPlacementInputs() {
  const placementFields = [
    "hostOrganization",
    "departmentUnit",
    "location",
    "startDate",
    "endDate",
    "duration",
    "hostSupervisor",
    "hostSupervisorTitle",
    "universitySupervisor",
    "universitySupervisorTitle",
    "missionFunctions"
  ];

  placementFields.forEach((field) => {
    const input = document.getElementById(field);
    if (!input) return;
    input.addEventListener("input", (e) => {
      state.placement[field] = e.target.value;
      renderPlacementPromptPanel();
      renderDashboard();
      renderPreviewPage();
      renderExportPage();
      updateCurrentStorage();
    });
  });
}

function bindLogbookInputs() {
  document.getElementById("saveLogbookEntryBtn")?.addEventListener("click", saveLogbookEntry);
}

function bindReportEditor() {
  document.getElementById("generateStarterDraftBtn")?.addEventListener("click", () => {
    if (!state.payment.isPaid) {
      alert("Starter draft generation is a premium feature. Pay UGX 10,000 to unlock it.");
      return;
    }

    const title = state.selectedSectionTitle;
    state.sectionContent[title] = generateStarterDraft(title);
    renderReportEditor();
    renderPreviewPage();
    renderStatusArea();
    renderPaymentUI();
    updateCurrentStorage();
  });

  document.getElementById("clearSectionBtn")?.addEventListener("click", () => {
    const title = state.selectedSectionTitle;
    state.sectionContent[title] = "";
    renderReportEditor();
    renderPreviewPage();
    renderStatusArea();
    renderPaymentUI();
    updateCurrentStorage();
  });

  document.getElementById("sectionEditor")?.addEventListener("input", (e) => {
    state.sectionContent[state.selectedSectionTitle] = e.target.value;
    renderPreviewPage();
    renderStatusArea();
    updateCurrentStorage();
  });
}

function bindGeneralButtons() {
  document.getElementById("exportWordBtn")?.addEventListener("click", () => {
    if (!state.payment.isPaid) {
      alert("Please pay UGX 10,000 to unlock Word export.");
      return;
    }
    exportAsTextFile("doc");
  });

  document.getElementById("exportPdfBtn")?.addEventListener("click", () => {
    if (!state.payment.isPaid) {
      alert("Please pay UGX 10,000 to unlock PDF export.");
      return;
    }
    printFullReport();
  });

  document.getElementById("printReportBtn")?.addEventListener("click", () => {
    printFullReport();
  });

  document.getElementById("printLogbookBtn")?.addEventListener("click", () => {
    printLogbookOnly();
  });

  document.getElementById("payToUnlockBtn")?.addEventListener("click", async () => {
    await startPesapalPayment();
  });
}

async function startPesapalPayment() {
  try {
    if (!state.profile.email) {
      alert("Please add the student's email in the profile section before making payment.");
      return;
    }

    const notificationId = "e6d8d436-5f99-48ef-be90-da7a8de67f3d";
    const merchantReference = `PRB-${Date.now()}`;

    const payload = {
      amount: 10000,
      email: state.profile.email,
      phone_number: normalizeUgPhone(state.profile.phone),
      first_name: getFirstName(state.profile.fullName),
      last_name: getLastName(state.profile.fullName),
      project_name: state.projectName || "Practicum Report Builder Premium",
      merchant_reference: merchantReference,
      notification_id: notificationId
    };

    const response = await fetch(`${BACKEND_BASE_URL}/.netlify/functions/submit-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.redirect_url) {
      alert(data.error || "Could not start payment.");
      console.error("Payment start failed:", data);
      return;
    }

    state.payment.merchantReference = merchantReference;
    updateCurrentStorage();
    window.location.href = data.redirect_url;
  } catch (error) {
    console.error("Payment start error:", error);
    alert("Could not connect to payment service.");
  }
}

function renderStaticAreas() {
  renderPlacementTypes();
  renderWorkModes();
  renderAITools();
  renderFormattingNotes();
}

function renderAll() {
  initializeSectionContent();
  syncInputsFromState();
  updateActiveProjectName();
  renderProfilePreview();
  renderPlacementTypes();
  renderWorkModes();
  renderPlacementPromptPanel();
  renderDynamicLogbookFields();
  renderSavedLogbookEntries();
  renderReportSectionsList();
  renderReportGuidancePanel();
  renderReportEditor();
  renderAITools();
  renderAIGuidancePanel();
  renderDashboard();
  renderPreviewPage();
  renderExportPage();
  renderPaymentUI();
  renderSavedProjectsLists();
  renderWorkflowSections();
  renderStatusArea();
}

function renderPlacementTypes() {
  const container = document.getElementById("placementTypesContainer");
  if (!container) return;

  container.innerHTML = "";
  state.placementTypes.forEach((type) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `placement-card ${state.placement.placementType === type.id ? "active" : ""}`;
    card.innerHTML = `
      <h4>${type.title}</h4>
      <p>${type.description}</p>
    `;
    card.addEventListener("click", () => {
      state.placement.placementType = type.id;
      initializeSectionContent();
      if (!getAllSectionTitles().includes(state.selectedSectionTitle)) {
        state.selectedSectionTitle = getAllSectionTitles()[0] || "Title Page";
      }
      renderAll();
      updateCurrentStorage();
    });
    container.appendChild(card);
  });
}

function renderWorkModes() {
  const container = document.getElementById("workModesContainer");
  if (!container) return;

  container.innerHTML = "";
  WORK_MODES.forEach((mode) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `workmode-card ${state.workMode === mode.id ? "active" : ""}`;
    card.innerHTML = `
      <h4>${mode.title}</h4>
      <p>${mode.description}</p>
    `;
    card.addEventListener("click", () => {
      state.workMode = mode.id;
      renderWorkModes();
      renderStatusArea();
      renderDashboard();
      updateCurrentStorage();
    });
    container.appendChild(card);
  });
}

function renderPlacementPromptPanel() {
  const container = document.getElementById("placementPromptPanel");
  const logbookContainer = document.getElementById("logbookPromptPanel");
  const data = getPlacementPromptData();

  [container, logbookContainer].forEach((target) => {
    if (!target) return;
    target.innerHTML = "";
    data.bullets.forEach((bullet) => {
      const item = document.createElement("div");
      item.textContent = bullet;
      target.appendChild(item);
    });
  });
}

function getPlacementPromptData() {
  const map = {
    school_practice: {
      bullets: [
        "Capture class taught, subject, topic, lesson method, and learner response.",
        "Highlight classroom management and teaching aids used.",
        "Reflect on lesson success and professional growth."
      ]
    },
    clinical_placement: {
      bullets: [
        "Record ward or unit, procedures observed, assisted tasks, and patient care roles.",
        "Document infection control, ethics, and competencies gained.",
        "Reflect on professional conduct and learning outcomes."
      ]
    },
    law_attachment: {
      bullets: [
        "Record chambers section, legal documents handled, drafting, and court sessions.",
        "Capture research tasks and legal principles learned.",
        "Reflect on legal ethics and office practice."
      ]
    },
    industrial_training: {
      bullets: [
        "Capture equipment handled, technical operations, and safety procedures.",
        "Record practical tasks and outputs produced.",
        "Reflect on technical skills gained and field readiness."
      ]
    },
    internship: {
      bullets: [
        "Capture department activities, tools used, meetings attended, and outputs produced.",
        "Record professional skills, challenges, and lessons learned.",
        "Reflect on career relevance and growth."
      ]
    },
    field_attachment: {
      bullets: [
        "Capture field visits, office support tasks, tools used, and observations made.",
        "Record practical exposure and lessons from the placement site.",
        "Reflect on professional development and key challenges."
      ]
    },
    practicum: {
      bullets: [
        "Capture the main tasks, learning experiences, and professional exposure.",
        "Record how activities relate to the student’s programme.",
        "Reflect on growth, competence, and recommendations."
      ]
    }
  };

  return map[state.placement.placementType] || {
    bullets: [
      "Select a placement type to see tailored guidance.",
      "The system will adapt logbook and report sections automatically."
    ]
  };
}

function renderDynamicLogbookFields() {
  const container = document.getElementById("dynamicLogbookFields");
  if (!container) return;

  const type = state.placement.placementType;
  let fields = [];

  if (type === "school_practice") {
    fields = [
      ["classTaught", "Class Taught"],
      ["subjectTaught", "Subject Taught"],
      ["topicTaught", "Topic Taught"],
      ["teachingMethod", "Teaching Method"],
      ["teachingAid", "Teaching Aid"],
      ["learnerResponse", "Learner Response"]
    ];
  } else if (type === "clinical_placement") {
    fields = [
      ["wardUnit", "Ward / Unit"],
      ["procedureObserved", "Procedure Observed"],
      ["procedureAssisted", "Procedure Assisted"],
      ["patientCareTask", "Patient Care Task"],
      ["infectionControl", "Infection Control / Ethics Note"]
    ];
  } else if (type === "law_attachment") {
    fields = [
      ["legalOfficeSection", "Legal Office Section"],
      ["legalDocumentHandled", "Legal Document Handled"],
      ["researchTask", "Research Task"],
      ["courtSessionAttended", "Court Session Attended"],
      ["draftingFiling", "Drafting / Filing Activity"]
    ];
  } else {
    fields = [
      ["departmentUnit", "Department / Unit"],
      ["toolsUsed", "Tools / Software Used"],
      ["meetingFieldActivity", "Meeting / Field Activity"],
      ["outputProduced", "Output Produced"]
    ];
  }

  container.innerHTML = "";

  fields.forEach(([key, label]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "form-group";

    if (key === "learnerResponse" || key === "infectionControl" || key === "draftingFiling") {
      wrapper.classList.add("full-span");
      wrapper.innerHTML = `
        <label for="dynamic-${key}">${label}</label>
        <textarea id="dynamic-${key}" rows="3"></textarea>
      `;
    } else {
      wrapper.innerHTML = `
        <label for="dynamic-${key}">${label}</label>
        <input type="text" id="dynamic-${key}" />
      `;
    }

    container.appendChild(wrapper);
  });
}

function getDraftLogbookEntryFromInputs() {
  const entry = {
    date: getInputValue("logDate"),
    departmentUnit: "",
    mainActivity: getInputValue("logMainActivity"),
    skillsApplied: getInputValue("logSkillsApplied"),
    learningPoint: getInputValue("logLearningPoint"),
    challenge: getInputValue("logChallenge"),
    reflection: getInputValue("logReflection"),
    classTaught: "",
    subjectTaught: "",
    topicTaught: "",
    teachingMethod: "",
    teachingAid: "",
    learnerResponse: "",
    wardUnit: "",
    procedureObserved: "",
    procedureAssisted: "",
    patientCareTask: "",
    infectionControl: "",
    legalOfficeSection: "",
    legalDocumentHandled: "",
    researchTask: "",
    courtSessionAttended: "",
    draftingFiling: "",
    toolsUsed: "",
    meetingFieldActivity: "",
    outputProduced: ""
  };

  [
    "departmentUnit",
    "classTaught",
    "subjectTaught",
    "topicTaught",
    "teachingMethod",
    "teachingAid",
    "learnerResponse",
    "wardUnit",
    "procedureObserved",
    "procedureAssisted",
    "patientCareTask",
    "infectionControl",
    "legalOfficeSection",
    "legalDocumentHandled",
    "researchTask",
    "courtSessionAttended",
    "draftingFiling",
    "toolsUsed",
    "meetingFieldActivity",
    "outputProduced"
  ].forEach((key) => {
    const element = document.getElementById(`dynamic-${key}`);
    if (element) entry[key] = element.value;
  });

  return entry;
}

function saveLogbookEntry() {
  const entry = getDraftLogbookEntryFromInputs();

  if (!entry.date || !entry.mainActivity) {
    alert("Please add at least the date and main activity.");
    return;
  }

  state.logbookEntries.push(entry);
  clearLogbookInputs();
  renderSavedLogbookEntries();
  renderDashboard();
  renderPreviewPage();
  renderStatusArea();
  updateCurrentStorage();
}

function clearLogbookInputs() {
  [
    "logDate",
    "logMainActivity",
    "logSkillsApplied",
    "logLearningPoint",
    "logChallenge",
    "logReflection"
  ].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });

  document.querySelectorAll("#dynamicLogbookFields input, #dynamicLogbookFields textarea").forEach((el) => {
    el.value = "";
  });
}

function renderSavedLogbookEntries() {
  const container = document.getElementById("savedLogbookEntries");
  const countText = document.getElementById("logbookCountText");
  if (!container || !countText) return;

  countText.textContent = `${state.logbookEntries.length} logbook record${state.logbookEntries.length === 1 ? "" : "s"} captured so far.`;

  container.innerHTML = "";
  if (state.logbookEntries.length === 0) {
    container.innerHTML = `<p class="muted-text">No entries yet. Add your first daily record.</p>`;
    return;
  }

  state.logbookEntries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "saved-entry";
    item.innerHTML = `
      <h4>${escapeHtml(entry.mainActivity)}</h4>
      <p><strong>Date:</strong> ${escapeHtml(entry.date)}</p>
      <p><strong>Skills:</strong> ${escapeHtml(entry.skillsApplied || "Not added")}</p>
      <p><strong>Learning:</strong> ${escapeHtml(entry.learningPoint || "Not added")}</p>
    `;
    container.appendChild(item);
  });
}

function renderReportSectionsList() {
  const container = document.getElementById("reportSectionsList");
  if (!container) return;

  container.innerHTML = "";
  getAllSections().forEach((section) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `report-section-item ${state.selectedSectionTitle === section.title ? "active" : ""}`;
    item.innerHTML = `
      <h4>${section.title}</h4>
      <p>${section.group.replaceAll("_", " ")}</p>
    `;
    item.addEventListener("click", () => {
      state.selectedSectionTitle = section.title;
      renderReportSectionsList();
      renderReportEditor();
    });
    container.appendChild(item);
  });
}

function renderReportGuidancePanel() {
  const container = document.getElementById("reportGuidancePanel");
  if (!container) return;

  const map = {
    school_practice: [
      "Add sections for subjects taught, classes handled, teaching methods, and classroom management.",
      "Connect lesson delivery experiences to skills and reflection.",
      "Appendices can include lesson plans, schemes of work, and supervisor forms."
    ],
    clinical_placement: [
      "Add sections for wards attached to, procedures observed, and patient care roles.",
      "Highlight infection control, ethics, and competencies gained.",
      "Appendices can include duty rosters, procedure logs, and evaluation forms."
    ],
    law_attachment: [
      "Add sections for court attendance, legal drafting, and research tasks.",
      "Highlight legal ethics, professional conduct, and office practice.",
      "Appendices can include attendance evidence, notes, and sample formats."
    ]
  };

  const guides = map[state.placement.placementType] || [
    "Use the standard structure for organization background, duties performed, skills gained, and recommendations.",
    "Import activities from the logbook into Chapter Three.",
    "Use AI tools to turn notes into formal academic writing."
  ];

  container.innerHTML = "";
  guides.forEach((guide) => {
    const item = document.createElement("div");
    item.textContent = guide;
    container.appendChild(item);
  });
}

function renderReportEditor() {
  const titleEl = document.getElementById("selectedSectionTitle");
  const promptsEl = document.getElementById("selectedSectionPrompts");
  const editor = document.getElementById("sectionEditor");
  if (!titleEl || !promptsEl || !editor) return;

  titleEl.textContent = state.selectedSectionTitle;
  editor.value = state.sectionContent[state.selectedSectionTitle] || "";

  const sectionObj = getAllSections().find((section) => section.title === state.selectedSectionTitle);
  promptsEl.innerHTML = "";

  (sectionObj?.prompts || []).forEach((prompt) => {
    const item = document.createElement("div");
    item.textContent = prompt;
    promptsEl.appendChild(item);
  });
}

function generateStarterDraft(title) {
  const placementLabel = getPlacementLabel().toLowerCase();

  if (title === "Title Page") {
    return `${state.profile.university || "UNIVERSITY NAME"}

${title.toUpperCase()}

${state.profile.fullName || "Student Name"}
${state.profile.registrationNumber || "Registration Number"}
${state.profile.programme || "Programme"}
${state.placement.hostOrganization || "Host Organization"}
${state.placement.startDate || "Start Date"} - ${state.placement.endDate || "End Date"}`;
  }

  if (title === "Declaration") {
    return `I, ${state.profile.fullName || "Student Name"}, declare that this report is my original work and has not been submitted to any other institution for academic award.`;
  }

  if (title === "Approval") {
    return `This report has been submitted for examination with the approval of the relevant supervisors.`;
  }

  if (title === "Executive Summary") {
    return `This report summarizes the experiences, activities, skills gained, and challenges encountered during my ${placementLabel} at ${state.placement.hostOrganization || "the host institution"}. It highlights the practical exposure received, the responsibilities undertaken, and the contribution of the placement to my academic and professional development.`;
  }

  if (title === "Chapter One: Introduction") {
    return `This report presents the experience gained during my ${placementLabel} at ${state.placement.hostOrganization || "the host institution"}. The placement was undertaken as part of the academic requirements for the ${state.profile.programme || "programme"} programme. It provided an opportunity to connect classroom learning with practical work experience, build professional competence, and understand the operations of the host institution.`;
  }

  if (title === "Chapter Two: Background of Host Institution") {
    return `${state.placement.hostOrganization || "The host institution"} is located in ${state.placement.location || "its location"}. During the ${placementLabel}, I was attached to the ${state.placement.departmentUnit || "relevant department"}. ${state.placement.missionFunctions || "This section should describe the institution’s background, functions, and structure."}`;
  }

  if (title === "Chapter Three: Activities Performed") {
    if (state.logbookEntries.length === 0) {
      return "Add logbook entries first so this section can be built from real activities performed during the placement.";
    }

    return state.logbookEntries
      .map((entry, index) => {
        return `${index + 1}. On ${entry.date}, I was involved in ${entry.mainActivity.toLowerCase()}. This activity required ${entry.skillsApplied || "relevant practical skills"} and helped me learn ${entry.learningPoint || "important professional lessons"}.`;
      })
      .join("\n\n");
  }

  if (title === "Chapter Four: Skills and Learning Experience") {
    const skills = state.logbookEntries
      .map((entry) => entry.skillsApplied)
      .filter(Boolean)
      .join(", ");

    return `During the placement, I developed and strengthened a number of practical and professional skills. These included ${skills || "communication, teamwork, and practical problem-solving"}. The placement also improved my confidence, professional exposure, and understanding of workplace expectations.`;
  }

  if (title === "Chapter Five: Challenges, Recommendations, Conclusion") {
    const challenges = state.logbookEntries
      .map((entry) => entry.challenge)
      .filter(Boolean)
      .slice(0, 3)
      .join("; ");

    return `During the placement, I encountered several challenges, including ${challenges || "limited resources, adjustment to the work environment, and time management demands"}. These experiences provided important lessons and highlighted areas for improvement. I recommend that future students prepare well for the placement, maintain accurate records, and actively seek guidance from supervisors. In conclusion, the ${placementLabel} was a valuable learning experience that strengthened my practical competence and professional growth.`;
  }

  return state.sectionContent[title] || "";
}

function renderAITools() {
  const container = document.getElementById("aiToolsGrid");
  if (!container) return;

  container.innerHTML = "";
  AI_TOOLS.forEach((tool) => {
    const item = document.createElement("div");
    item.className = "tool-item";

    const lockedText = state.payment.isPaid ? "Use Tool" : "Locked";
    const disabledAttr = state.payment.isPaid ? "" : "disabled";

    item.innerHTML = `
      <h4>${tool}</h4>
      <button type="button" class="secondary-btn premium-action" ${disabledAttr}>${lockedText}</button>
    `;
    container.appendChild(item);
  });
}

function renderAIGuidancePanel() {
  const container = document.getElementById("aiGuidancePanel");
  if (!container) return;

  const map = {
    school_practice: [
      "Use AI to expand lesson delivery notes into reflective teaching paragraphs.",
      "Generate classroom management reflections and professional growth summaries."
    ],
    clinical_placement: [
      "Use AI to summarize ward exposure, procedures observed, and competencies gained.",
      "Generate professional reflections rooted in patient care and ethics."
    ],
    law_attachment: [
      "Use AI to formalize court observations, drafting work, and legal research summaries.",
      "Generate reflective notes on ethics and legal office experience."
    ]
  };

  const tips = map[state.placement.placementType] || [
    "Use AI to expand your points and improve academic tone.",
    "Summarize multiple logbook entries into clear report paragraphs."
  ];

  container.innerHTML = "";
  tips.forEach((tip) => {
    const item = document.createElement("div");
    item.textContent = tip;
    container.appendChild(item);
  });
}

function renderDashboard() {
  const statsContainer = document.getElementById("dashboardStats");
  if (!statsContainer) return;

  const stats = [
    {
      title: "Profile Status",
      desc: state.profile.fullName || "Add student information",
      value: isProfileComplete() ? "Complete" : "Needs attention"
    },
    {
      title: "Placement Setup",
      desc: state.placement.hostOrganization || "Add host institution",
      value: getPlacementLabel()
    },
    {
      title: "Work Mode",
      desc: "Choose the preferred workflow",
      value: getWorkModeLabel()
    },
    {
      title: "Logbook Progress",
      desc: "Daily or weekly records",
      value: `${state.logbookEntries.length} entries`
    },
    {
      title: "Report Builder",
      desc: "Front matter, chapters, appendices",
      value: `${getAllSectionTitles().length} sections`
    },
    {
      title: "Export Readiness",
      desc: "Move toward preview and final output",
      value: `${getCompletionScore()}% ready`
    }
  ];

  statsContainer.innerHTML = "";
  stats.forEach((stat) => {
    const item = document.createElement("div");
    item.className = "dashboard-stat";
    item.innerHTML = `
      <h4>${stat.title}</h4>
      <p>${stat.desc}</p>
      <strong>${stat.value}</strong>
    `;
    statsContainer.appendChild(item);
  });
}

function renderWorkflowSections() {
  const container = document.getElementById("workflowSections");
  if (!container) return;

  container.innerHTML = "";
  getAllSectionTitles().forEach((title) => {
    const div = document.createElement("div");
    div.textContent = title;
    container.appendChild(div);
  });
}

function renderPreviewPage() {
  renderReviewChecklist();
  renderCompletedSectionsPreview();
  renderFullReportPreview();
}

function renderReviewChecklist() {
  const container = document.getElementById("reviewChecklist");
  if (!container) return;

  const items = [
    { label: "Student profile completed", ready: isProfileComplete() },
    { label: "Placement details completed", ready: isPlacementComplete() },
    { label: "Work mode selected", ready: Boolean(state.workMode) },
    { label: "Logbook started", ready: state.logbookEntries.length > 0 },
    { label: "Report draft started", ready: hasAnyReportDraft() }
  ];

  container.innerHTML = "";
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "status-item";
    div.innerHTML = `
      <span>${item.label}</span>
      <span class="${item.ready ? "ready-badge" : "inprogress-badge"}">${item.ready ? "Complete" : "In progress"}</span>
    `;
    container.appendChild(div);
  });
}

function renderCompletedSectionsPreview() {
  const container = document.getElementById("completedSectionsPreview");
  const summaryText = document.getElementById("sectionsSummaryText");
  if (!container || !summaryText) return;

  const completed = getAllSectionTitles().filter((title) => (state.sectionContent[title] || "").trim());
  const pending = getAllSectionTitles().length - completed.length;

  summaryText.textContent = `${completed.length} completed, ${pending} pending.`;

  container.innerHTML = "";
  if (completed.length === 0) {
    container.innerHTML = `<div>No completed sections yet. Generate or write content in the report builder first.</div>`;
    return;
  }

  completed.forEach((title) => {
    const item = document.createElement("div");
    item.textContent = title;
    container.appendChild(item);
  });
}

function renderFullReportPreview() {
  const container = document.getElementById("fullReportPreview");
  if (!container) return;

  container.innerHTML = "";
  getAllSectionTitles().forEach((title) => {
    const item = document.createElement("div");
    item.className = "preview-section";
    const text = (state.sectionContent[title] || "").trim() || `No content added yet for ${title}.`;
    item.innerHTML = `
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>
    `;
    container.appendChild(item);
  });
}

function renderExportPage() {
  const statusContainer = document.getElementById("exportStatusList");
  const notesContainer = document.getElementById("formattingNotes");
  if (!statusContainer || !notesContainer) return;

  const exportReady = isProfileComplete() && isPlacementComplete() && hasAnyReportDraft();

  const items = [
    { label: "Profile ready", ready: isProfileComplete() },
    { label: "Placement ready", ready: isPlacementComplete() },
    { label: "Draft content ready", ready: hasAnyReportDraft() }
  ];

  statusContainer.innerHTML = "";
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "status-item";
    div.innerHTML = `
      <span>${item.label}</span>
      <span class="${item.ready ? "ready-badge" : "inprogress-badge"}">${item.ready ? "Ready" : "Pending"}</span>
    `;
    statusContainer.appendChild(div);
  });

  const note = document.createElement("div");
  note.className = "export-note";
  note.textContent = exportReady
    ? "Your report is ready for final formatting and export."
    : "Complete your profile, placement details, and draft content before exporting.";
  statusContainer.appendChild(note);

  notesContainer.innerHTML = "";
  FORMATTING_NOTES.forEach((text) => {
    const div = document.createElement("div");
    div.textContent = text;
    notesContainer.appendChild(div);
  });
}

function renderPaymentUI() {
  const badge = document.getElementById("paymentStatusBadge");
  const exportWordBtn = document.getElementById("exportWordBtn");
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  const starterBtn = document.getElementById("generateStarterDraftBtn");
  const payBtn = document.getElementById("payToUnlockBtn");

  if (badge) {
    badge.textContent = state.payment.isPaid ? "Paid" : "Unpaid";
    badge.className = state.payment.isPaid ? "ready-badge" : "inprogress-badge";
  }

  if (exportWordBtn) exportWordBtn.disabled = !state.payment.isPaid;
  if (exportPdfBtn) exportPdfBtn.disabled = !state.payment.isPaid;
  if (starterBtn) starterBtn.disabled = !state.payment.isPaid;

  if (payBtn) {
    payBtn.textContent = state.payment.isPaid ? "Premium Unlocked" : "Pay to Unlock Premium";
    payBtn.disabled = state.payment.isPaid;
  }
}

function saveProject() {
  const payload = getSerializableState();
  const existing = getSavedProjectsFromStorage();
  const updated = [payload, ...existing.filter((project) => project.projectName !== payload.projectName)];

  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(updated));
  localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(payload));

  state.savedProjects = updated;
  renderSavedProjectsLists();
  alert("Project saved.");
}

function loadLatestSavedProject() {
  const projects = getSavedProjectsFromStorage();
  if (projects.length === 0) {
    alert("No saved project found.");
    return;
  }

  applyProjectData(projects[0]);
  localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(projects[0]));
  renderAll();
  goToPage("dashboard");
}

function loadDemoProject() {
  if (!state.demoProjects.length) {
    alert("Demo data not found.");
    return;
  }

  applyProjectData(state.demoProjects[0]);
  renderAll();
  goToPage("dashboard");
}

function deleteSavedProject(projectName) {
  const updated = getSavedProjectsFromStorage().filter((project) => project.projectName !== projectName);
  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(updated));
  state.savedProjects = updated;

  if (state.projectName === projectName) {
    resetProject(false);
  }

  renderSavedProjectsLists();
}

function loadProjectByName(projectName) {
  const project = getSavedProjectsFromStorage().find((item) => item.projectName === projectName);
  if (!project) return;

  applyProjectData(project);
  localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(project));
  renderAll();
  goToPage("dashboard");
}

function resetProject(withAlert = false) {
  state.profile = {
    fullName: "",
    registrationNumber: "",
    studentNumber: "",
    university: "",
    faculty: "",
    programme: "",
    yearSemester: "",
    phone: "",
    email: ""
  };

  state.placement = {
    placementType: "",
    hostOrganization: "",
    departmentUnit: "",
    location: "",
    startDate: "",
    endDate: "",
    duration: "",
    hostSupervisor: "",
    hostSupervisorTitle: "",
    universitySupervisor: "",
    universitySupervisorTitle: "",
    missionFunctions: ""
  };

  state.workMode = "";
  state.logbookEntries = [];
  state.projectName = "My Practicum Report Project";
  state.selectedSectionTitle = "Title Page";
  state.sectionContent = {};
  state.payment = {
    isPaid: false,
    amount: 10000,
    status: "unpaid",
    orderTrackingId: "",
    merchantReference: ""
  };

  initializeSectionContent();
  localStorage.removeItem(STORAGE_KEYS.current);
  renderAll();
  goToPage("home");

  if (withAlert) {
    alert("Project reset.");
  }
}

function renderSavedProjectsLists() {
  const homeContainer = document.getElementById("savedProjectsList");
  const dashboardContainer = document.getElementById("dashboardSavedProjects");
  const projects = getSavedProjectsFromStorage();
  state.savedProjects = projects;

  if (homeContainer) {
    homeContainer.innerHTML = "";
    if (projects.length === 0) {
      homeContainer.innerHTML = `<p class="muted-text">None yet</p>`;
    } else {
      projects.slice(0, 4).forEach((project) => {
        const item = document.createElement("div");
        item.className = "saved-project-item";
        item.innerHTML = `
          <div class="saved-project-meta">
            <strong>${escapeHtml(project.projectName)}</strong>
            <span>${formatDateTime(project.savedAt)}</span>
          </div>
        `;

        const btnWrap = document.createElement("div");

        const openBtn = document.createElement("button");
        openBtn.className = "secondary-btn";
        openBtn.textContent = "Open";
        openBtn.addEventListener("click", () => loadProjectByName(project.projectName));

        const delBtn = document.createElement("button");
        delBtn.className = "secondary-btn";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => deleteSavedProject(project.projectName));

        btnWrap.appendChild(openBtn);
        btnWrap.appendChild(delBtn);
        item.appendChild(btnWrap);
        homeContainer.appendChild(item);
      });
    }
  }

  if (dashboardContainer) {
    dashboardContainer.innerHTML = "";
    if (projects.length === 0) {
      dashboardContainer.innerHTML = `<p class="muted-text">No saved projects yet. Save your current work from the home page.</p>`;
    } else {
      projects.forEach((project) => {
        const item = document.createElement("div");
        item.className = "dashboard-saved-item";
        item.innerHTML = `
          <div class="dashboard-saved-meta">
            <strong>${escapeHtml(project.projectName)}</strong>
            <span>Saved: ${formatDateTime(project.savedAt)}</span>
          </div>
        `;

        const controls = document.createElement("div");

        const openBtn = document.createElement("button");
        openBtn.className = "secondary-btn";
        openBtn.textContent = "Open";
        openBtn.addEventListener("click", () => loadProjectByName(project.projectName));

        const delBtn = document.createElement("button");
        delBtn.className = "secondary-btn";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => deleteSavedProject(project.projectName));

        controls.appendChild(openBtn);
        controls.appendChild(delBtn);
        item.appendChild(controls);
        dashboardContainer.appendChild(item);
      });
    }
  }
}

function renderFormattingNotes() {
  const container = document.getElementById("formattingNotes");
  if (!container) return;
  container.innerHTML = "";
  FORMATTING_NOTES.forEach((note) => {
    const div = document.createElement("div");
    div.textContent = note;
    container.appendChild(div);
  });
}

function renderStatusArea() {
  setStatusText("statusProfile", isProfileComplete());
  setStatusText("statusPlacement", isPlacementComplete());
  setStatusText("statusWorkMode", Boolean(state.workMode));
  setStatusText("statusLogbook", state.logbookEntries.length > 0);
  setStatusText("statusReportDraft", hasAnyReportDraft());

  const percentage = getCompletionScore();
  const valueEl = document.getElementById("completionValue");
  const barEl = document.getElementById("completionBar");

  if (valueEl) valueEl.textContent = `${percentage}%`;
  if (barEl) barEl.style.width = `${percentage}%`;
}

function setStatusText(id, ready) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = ready ? "Complete" : "In progress";
  el.className = ready ? "ready-badge" : "inprogress-badge";
}

function renderProfilePreview() {
  setText("profilePreviewName", state.profile.fullName || "Student name");
  setText("profilePreviewProgramme", state.profile.programme || "Programme");
  setText("profilePreviewUniversity", state.profile.university || "University");
}

function updateActiveProjectName() {
  setText("activeProjectName", state.projectName);
}

function syncInputsFromState() {
  const inputMap = {
    projectNameInput: state.projectName,
    fullName: state.profile.fullName,
    registrationNumber: state.profile.registrationNumber,
    studentNumber: state.profile.studentNumber,
    university: state.profile.university,
    faculty: state.profile.faculty,
    programme: state.profile.programme,
    yearSemester: state.profile.yearSemester,
    phone: state.profile.phone,
    email: state.profile.email,
    hostOrganization: state.placement.hostOrganization,
    departmentUnit: state.placement.departmentUnit,
    location: state.placement.location,
    startDate: state.placement.startDate,
    endDate: state.placement.endDate,
    duration: state.placement.duration,
    hostSupervisor: state.placement.hostSupervisor,
    hostSupervisorTitle: state.placement.hostSupervisorTitle,
    universitySupervisor: state.placement.universitySupervisor,
    universitySupervisorTitle: state.placement.universitySupervisorTitle,
    missionFunctions: state.placement.missionFunctions
  };

  Object.entries(inputMap).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  });
}

function updateCurrentStorage() {
  localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(getSerializableState()));
}

function getSerializableState() {
  return {
    projectName: state.projectName,
    profile: state.profile,
    placement: state.placement,
    workMode: state.workMode,
    logbookEntries: state.logbookEntries,
    sectionContent: state.sectionContent,
    payment: state.payment,
    savedAt: new Date().toISOString()
  };
}

function loadSavedProjectsFromStorage() {
  state.savedProjects = getSavedProjectsFromStorage();
}

function loadCurrentProjectFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEYS.current);
  if (!raw) return;

  try {
    const project = JSON.parse(raw);
    applyProjectData(project);
  } catch (error) {
    console.error("Failed to load current project:", error);
  }
}

function applyProjectData(project) {
  state.projectName = project.projectName || "My Practicum Report Project";
  state.profile = { ...state.profile, ...(project.profile || {}) };
  state.placement = { ...state.placement, ...(project.placement || {}) };
  state.workMode = project.workMode || "";
  state.logbookEntries = Array.isArray(project.logbookEntries) ? project.logbookEntries : [];
  state.sectionContent = { ...state.sectionContent, ...(project.sectionContent || {}) };
  state.payment = {
    isPaid: project.payment?.isPaid || false,
    amount: project.payment?.amount || 10000,
    status: project.payment?.status || "unpaid",
    orderTrackingId: project.payment?.orderTrackingId || "",
    merchantReference: project.payment?.merchantReference || ""
  };

  initializeSectionContent();

  const titles = getAllSectionTitles();
  state.selectedSectionTitle = titles.includes(state.selectedSectionTitle)
    ? state.selectedSectionTitle
    : (titles[0] || "Title Page");
}

function getSavedProjectsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.projects) || "[]");
  } catch {
    return [];
  }
}

function getPlacementLabel() {
  return state.placementTypes.find((item) => item.id === state.placement.placementType)?.title || "Not selected";
}

function getWorkModeLabel() {
  return WORK_MODES.find((mode) => mode.id === state.workMode)?.title || "Not selected";
}

function hasAnyReportDraft() {
  return Object.values(state.sectionContent).some((value) => String(value).trim().length > 0);
}

function isProfileComplete() {
  return [
    state.profile.fullName,
    state.profile.registrationNumber,
    state.profile.studentNumber,
    state.profile.university,
    state.profile.faculty,
    state.profile.programme,
    state.profile.yearSemester,
    state.profile.phone,
    state.profile.email
  ].every(Boolean);
}

function isPlacementComplete() {
  return [
    state.placement.placementType,
    state.placement.hostOrganization,
    state.placement.departmentUnit,
    state.placement.location,
    state.placement.startDate,
    state.placement.endDate,
    state.placement.hostSupervisor,
    state.placement.universitySupervisor
  ].every(Boolean);
}

function getCompletionScore() {
  let score = 0;
  if (isProfileComplete()) score += 20;
  if (isPlacementComplete()) score += 20;
  if (state.workMode) score += 15;
  if (state.logbookEntries.length > 0) score += 15;
  if (hasAnyReportDraft()) score += 20;
  if (isProfileComplete() && isPlacementComplete()) score += 10;
  return score;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function exportAsTextFile(extension) {
  if (!hasAnyReportDraft()) {
    alert("There is no report content to export yet.");
    return;
  }

  const content = buildExportContent();
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(state.projectName)}.${extension === "doc" ? "doc" : "txt"}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildExportContent() {
  const lines = [];
  getAllSectionTitles().forEach((title) => {
    if ((state.sectionContent[title] || "").trim()) {
      lines.push(title.toUpperCase());
      lines.push(state.sectionContent[title] || "");
      lines.push("");
    }
  });
  return lines.join("\n");
}

function printFullReport() {
  const filledSections = getAllSectionTitles().filter((title) => {
    return (state.sectionContent[title] || "").trim().length > 0;
  });

  if (filledSections.length === 0) {
    alert("There is no report content to print yet.");
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("The print window was blocked by the browser. Please allow popups and try again.");
    return;
  }

  const reportHtml = filledSections
    .map((title) => {
      const rawContent = state.sectionContent[title] || "";
      const content = escapeHtml(rawContent).replace(/\n/g, "<br>");
      return `
        <section style="margin-bottom: 28px;">
          <h2 style="margin-bottom: 10px; font-size: 20px; color: #111827;">${escapeHtml(title)}</h2>
          <div style="line-height: 1.7; font-size: 15px; color: #374151;">
            ${content}
          </div>
        </section>
      `;
    })
    .join("");

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(state.projectName)} - Full Report</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 40px;
            color: #111827;
            line-height: 1.6;
          }
          h1 {
            margin-bottom: 8px;
            font-size: 28px;
          }
          .meta {
            margin-bottom: 30px;
            color: #4b5563;
            font-size: 14px;
          }
          h2 {
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 6px;
            margin-top: 30px;
          }
          @media print {
            body {
              margin: 20px;
            }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(state.projectName)}</h1>
        <div class="meta">
          <div><strong>Student:</strong> ${escapeHtml(state.profile.fullName || "Not provided")}</div>
          <div><strong>Programme:</strong> ${escapeHtml(state.profile.programme || "Not provided")}</div>
          <div><strong>Placement Type:</strong> ${escapeHtml(getPlacementLabel())}</div>
          <div><strong>Host Institution:</strong> ${escapeHtml(state.placement.hostOrganization || "Not provided")}</div>
        </div>
        ${reportHtml}
      </body>
    </html>
  `);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

function printLogbookOnly() {
  if (!state.logbookEntries.length) {
    alert("There are no logbook entries to print.");
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("The print window was blocked by the browser. Please allow popups and try again.");
    return;
  }

  const content = state.logbookEntries
    .map((entry, index) => {
      return `
        <h3>Entry ${index + 1}</h3>
        <p><strong>Date:</strong> ${escapeHtml(entry.date)}</p>
        <p><strong>Main Activity:</strong> ${escapeHtml(entry.mainActivity)}</p>
        <p><strong>Skills Applied:</strong> ${escapeHtml(entry.skillsApplied || "")}</p>
        <p><strong>Learning Point:</strong> ${escapeHtml(entry.learningPoint || "")}</p>
        <p><strong>Challenge:</strong> ${escapeHtml(entry.challenge || "")}</p>
        <p><strong>Reflection:</strong> ${escapeHtml(entry.reflection || "")}</p>
        <hr />
      `;
    })
    .join("");

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Logbook Print</title>
      </head>
      <body>
        <h1>${escapeHtml(state.projectName)} - Logbook</h1>
        ${content}
      </body>
    </html>
  `);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

function normalizeUgPhone(phone) {
  const cleaned = String(phone || "").replace(/[^\d]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("256")) return cleaned;
  if (cleaned.startsWith("0")) return `256${cleaned.slice(1)}`;
  return cleaned;
}

function getFirstName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return parts[0] || "Student";
}

function getLastName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return "User";
  return parts.slice(1).join(" ");
}

function slugify(text) {
  return String(text || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
