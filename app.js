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
    isPaid: true,
    amount: 10000,
    status: "paid",
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

// ========== UTILITY FUNCTIONS ==========

function getAppBaseUrl() {
  return window.location.origin + window.location.pathname;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === "success" ? "#10b981" : type === "error" ? "#ef4444" : type === "warning" ? "#f59e0b" : "#3b82f6"};
    color: white;
    border-radius: 8px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function sanitizeHTML(str) {
  if (!str) return "";
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(\+256|0)[0-9]{9}$/.test(cleaned);
}

function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) return true;
  return new Date(startDate) <= new Date(endDate);
}

function showLoading(element) {
  if (element) {
    element.classList.add("loading");
    element.disabled = true;
  }
}

function hideLoading(element) {
  if (element) {
    element.classList.remove("loading");
    element.disabled = false;
  }
}

// ========== INITIALIZATION ==========

document.addEventListener("DOMContentLoaded", initApp);
// ============================================ //
// STEP-BY-STEP NAVIGATION (NEW)
// ============================================ //

let currentStep = 0;
const steps = ['profile', 'placement', 'logbook', 'report', 'preview', 'export'];

function goToNextStep() {
  if (currentStep < steps.length - 1) {
    currentStep++;
    goToPage(steps[currentStep]);
    updateStepButtons();
  }
}

function goToPreviousStep() {
  if (currentStep > 0) {
    currentStep--;
    goToPage(steps[currentStep]);
    updateStepButtons();
  }
}

function updateStepButtons() {
  const stepButtons = document.querySelectorAll('.step-btn');
  stepButtons.forEach((btn, index) => {
    if (index === currentStep) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
    
    // Mark as completed if section has data
    if (index === 0 && isProfileComplete()) btn.classList.add('completed');
    if (index === 1 && isPlacementComplete()) btn.classList.add('completed');
    if (index === 2 && state.logbookEntries.length > 0) btn.classList.add('completed');
    if (index === 3 && hasAnyReportDraft()) btn.classList.add('completed');
  });
}

// Add Next/Previous buttons to each page
function addNavigationButtons() {
  const pages = ['profile', 'placement', 'logbook', 'report', 'preview', 'export'];
  
  pages.forEach((pageId, index) => {
    const page = document.getElementById(`page-${pageId}`);
    if (!page) return;
    
    // Check if buttons already exist
    if (page.querySelector('.navigation-buttons')) return;
    
    const navDiv = document.createElement('div');
    navDiv.className = 'btn-group navigation-buttons';
    
    if (index > 0) {
      const prevBtn = document.createElement('button');
      prevBtn.className = 'btn-secondary';
      prevBtn.innerHTML = '← Previous';
      prevBtn.onclick = goToPreviousStep;
      navDiv.appendChild(prevBtn);
    }
    
    if (index < pages.length - 1) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn-primary';
      nextBtn.innerHTML = 'Next →';
      nextBtn.onclick = goToNextStep;
      navDiv.appendChild(nextBtn);
    }
    
    page.appendChild(navDiv);
  });
}

// Section navigation for report builder (click section to jump to it)
function bindSectionNavigation() {
  const sections = getAllSectionTitles();
  const container = document.getElementById('sectionNavContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  sections.forEach((title, index) => {
    const btn = document.createElement('button');
    btn.className = 'section-nav-item';
    btn.textContent = title.length > 25 ? title.substring(0, 22) + '...' : title;
    btn.onclick = () => {
      state.selectedSectionTitle = title;
      renderReportEditor();
      renderReportSectionsList();
      
      // Scroll to editor
      document.getElementById('report-editor')?.scrollIntoView({ behavior: 'smooth' });
      
      // Update active class
      document.querySelectorAll('.section-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    container.appendChild(btn);
  });
}

// Add step indicators to the top of each page
function addStepIndicators() {
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) return;
  
  // Check if steps already exist
  if (document.querySelector('.steps-container')) return;
  
  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'steps-container';
  
  const stepNames = ['Profile', 'Placement', 'Logbook', 'Report', 'Preview', 'Export'];
  
  stepNames.forEach((name, index) => {
    const stepBtn = document.createElement('button');
    stepBtn.className = 'step-btn';
    stepBtn.innerHTML = `${index + 1}. ${name}`;
    stepBtn.onclick = () => {
      currentStep = index;
      goToPage(steps[index]);
      updateStepButtons();
    };
    stepsContainer.appendChild(stepBtn);
  });
  
  mainContent.insertBefore(stepsContainer, mainContent.firstChild);
}
async function initApp() {
  try {
    await loadConfigFiles();
    initializeSectionContent();
    bindNavigation();
    bindHomeActions();
    bindProfileInputs();
    bindPlacementInputs();
    bindLogbookInputs();
    bindReportEditor();
    bindGeneralButtons();
    bindAITools();
    loadSavedProjectsFromStorage();
    loadCurrentProjectFromStorage();
    renderStaticAreas();
    await handleReturnedPayment();
    renderAll();
    
    // NEW: Add these lines
    addStepIndicators();
    addNavigationButtons();
    updateStepButtons();
    bindSectionNavigation();
    addButtonRippleEffect();
    
    if (state.payment.isPaid) {
      renderPaymentUI();
      showNotification("Premium features restored", "success");
    }
  } catch (error) {
    console.error("Failed to initialize app:", error);
    showNotification("Failed to load application. Please refresh the page.", "error");
  }
}
    }
  } catch (error) {
    console.error("Failed to initialize app:", error);
    showNotification("Failed to load application. Please refresh the page.", "error");
  }
}

async function loadConfigFiles() {
  try {
    const [placementTypesRes, reportSectionsRes, demoProjectsRes] = await Promise.all([
      fetch("data/placement-types.json"),
      fetch("data/report-sections.json"),
      fetch("data/demo-projects.json")
    ]);

    if (!placementTypesRes.ok) throw new Error(`Placement types: ${placementTypesRes.status}`);
    if (!reportSectionsRes.ok) throw new Error(`Report sections: ${reportSectionsRes.status}`);
    if (!demoProjectsRes.ok) throw new Error(`Demo projects: ${demoProjectsRes.status}`);

    state.placementTypes = await placementTypesRes.json();
    state.reportSectionsConfig = await reportSectionsRes.json();
    state.demoProjects = await demoProjectsRes.json();
    
    if (!Array.isArray(state.placementTypes)) throw new Error("Placement types must be an array");
    if (!state.reportSectionsConfig?.common) throw new Error("Report sections missing common array");
    
  } catch (error) {
    console.error("Failed to load config files:", error);
    showNotification(`Failed to load: ${error.message}. Using fallback data.`, "error");
    
    state.placementTypes = [
      { id: "internship", title: "Internship", description: "Corporate/industry placement" },
      { id: "practicum", title: "Practicum", description: "Academic practice" }
    ];
    state.reportSectionsConfig = {
      common: [
        { title: "Title Page", group: "front_matter", prompts: ["Add title, author, institution"] },
        { title: "Declaration", group: "front_matter", prompts: ["Original work declaration"] }
      ],
      specialized: {}
    };
    state.demoProjects = [];
  }
}

async function handleReturnedPayment() {
  try {
    const params = new URLSearchParams(window.location.search);
    const paymentReturned = params.get("payment");
    const orderTrackingId = params.get("orderTrackingId");
    const merchantReference = params.get("merchantReference");

    console.log("Payment return check:", { paymentReturned, orderTrackingId });

    if (paymentReturned !== "returned" || !orderTrackingId) {
      return;
    }

    showNotification("Verifying payment...", "info");

    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/.netlify/functions/check-status?orderTrackingId=${encodeURIComponent(orderTrackingId)}`
      );
      const data = await response.json();
      
      if (response.ok && data.payment_status_description && String(data.payment_status_description).toLowerCase() === "completed") {
        state.payment = {
          isPaid: true,
          amount: Number(data.amount || 10000),
          status: "paid",
          orderTrackingId,
          merchantReference: merchantReference || data.merchant_reference || ""
        };

        updateCurrentStorage();
        
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        showNotification("Payment confirmed! Redirecting to premium features...", "success");
        
        setTimeout(() => {
          goToPage("report");
          renderPaymentUI();
          renderAll();
          showNotification("Premium features are now unlocked!", "success");
        }, 1500);
        return;
      }
    } catch (error) {
      console.error("Backend verification failed:", error);
    }
    
    // Fallback for testing - remove in production
    if (confirm("Payment verification server is unavailable. Was your payment successful? Click OK to unlock premium features for testing.")) {
      state.payment = {
        isPaid: true,
        amount: 10000,
        status: "paid",
        orderTrackingId,
        merchantReference: merchantReference || ""
      };
      
      updateCurrentStorage();
      window.history.replaceState({}, document.title, window.location.pathname);
      goToPage("report");
      renderPaymentUI();
      renderAll();
      showNotification("Premium features unlocked (test mode)", "success");
    }
    
  } catch (error) {
    console.error("Payment verification failed:", error);
    showNotification("Could not verify payment. Please contact support.", "error");
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

// ========== SECTION MANAGEMENT ==========

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

// ========== NAVIGATION ==========

function bindNavigation() {
  // ============================================ //
  // 1. MAIN NAVIGATION BUTTONS (Home, Profile, Placement, etc.)
  // ============================================ //
  const navButtons = document.querySelectorAll('.nav-btn');
  
  navButtons.forEach(button => {
    // Remove any existing listeners to avoid duplicates
    button.removeEventListener('click', button._listener);
    
    // Create the click handler
    const handler = () => {
      const pageId = button.dataset.page;
      goToPage(pageId);
    };
    
    // Store the handler so we can remove it later if needed
    button._listener = handler;
    button.addEventListener('click', handler);
  });
  
  // ============================================ //
  // 2. CONTINUE/BACK BUTTONS (Profile → Placement, etc.)
  // ============================================ //
  
  // From Profile to Placement
  const toPlacementBtn = document.getElementById('toPlacementBtn');
  if (toPlacementBtn) {
    toPlacementBtn.removeEventListener('click', toPlacementBtn._listener);
    const handler = () => goToPage('placement');
    toPlacementBtn._listener = handler;
    toPlacementBtn.addEventListener('click', handler);
  }
  
  // From Placement to Logbook (if you have this button)
  const toLogbookBtn = document.getElementById('toLogbookBtn');
  if (toLogbookBtn) {
    toLogbookBtn.removeEventListener('click', toLogbookBtn._listener);
    const handler = () => goToPage('logbook');
    toLogbookBtn._listener = handler;
    toLogbookBtn.addEventListener('click', handler);
  }
  
  // ============================================ //
  // 3. ANY OTHER CUSTOM NAVIGATION BUTTONS
  // ============================================ //
  
  // Handle any button with data-go attribute
  const goButtons = document.querySelectorAll('[data-go]');
  goButtons.forEach(button => {
    button.removeEventListener('click', button._listener);
    const handler = () => {
      const targetPage = button.dataset.go;
      goToPage(targetPage);
    };
    button._listener = handler;
    button.addEventListener('click', handler);
  });
}

// ============================================ //
// THE goToPage FUNCTION (switches between pages)
// ============================================ //
function goToPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show the selected page
  const activePage = document.getElementById(`page-${pageId}`);
  if (activePage) {
    activePage.classList.add('active');
  }
  
  // Update active state of navigation buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.page === pageId) {
      btn.classList.add('active');
    }
  });
  
  // Save current page (optional)
  localStorage.setItem('currentPage', pageId);
  
  // Scroll to top when page changes
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== EVENT BINDINGS ==========

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
    "fullName", "registrationNumber", "studentNumber", "university",
    "faculty", "programme", "yearSemester", "phone", "email"
  ];

  profileFields.forEach((field) => {
    const input = document.getElementById(field);
    if (!input) return;
    
    input.addEventListener("input", (e) => {
      state.profile[field] = e.target.value;
      renderProfilePreview();
      renderStatusArea();
      updateCurrentStorage();
      debouncedRenderAll();
    });
  });

  document.getElementById("email")?.addEventListener("blur", (e) => {
    if (e.target.value && !validateEmail(e.target.value)) {
      showNotification("Please enter a valid email address", "warning");
      e.target.value = "";
      state.profile.email = "";
    }
  });

  document.getElementById("phone")?.addEventListener("blur", (e) => {
    if (e.target.value && !validatePhone(e.target.value)) {
      showNotification("Please enter a valid Ugandan phone number (e.g., 07XX XXX XXX or +2567XX XXX XXX)", "warning");
    }
  });

  document.getElementById("toPlacementBtn")?.addEventListener("click", () => {
    goToPage("placement");
  });
}

function bindPlacementInputs() {
  const placementFields = [
    "hostOrganization", "departmentUnit", "location", "startDate", "endDate",
    "duration", "hostSupervisor", "hostSupervisorTitle", "universitySupervisor",
    "universitySupervisorTitle", "missionFunctions"
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
      debouncedRenderAll();
    });
  });

  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");
  
  if (startDate && endDate) {
    const validateDates = () => {
      if (startDate.value && endDate.value && !validateDateRange(startDate.value, endDate.value)) {
        showNotification("End date must be after start date", "warning");
      }
    };
    startDate.addEventListener("change", validateDates);
    endDate.addEventListener("change", validateDates);
  }
}

function bindLogbookInputs() {
  document.getElementById("saveLogbookEntryBtn")?.addEventListener("click", saveLogbookEntry);
}

function bindReportEditor() {
  document.getElementById("generateStarterDraftBtn")?.addEventListener("click", () => {
    if (!state.payment.isPaid) {
      showNotification("Starter draft generation is a premium feature. Pay UGX 10,000 to unlock it.", "warning");
      return;
    }

    const title = state.selectedSectionTitle;
    state.sectionContent[title] = generateStarterDraft(title);
    renderReportEditor();
    renderPreviewPage();
    renderStatusArea();
    renderPaymentUI();
    updateCurrentStorage();
    showNotification("Starter draft generated successfully!", "success");
  });

  document.getElementById("clearSectionBtn")?.addEventListener("click", () => {
    const title = state.selectedSectionTitle;
    if (confirm(`Clear all content from "${title}"?`)) {
      state.sectionContent[title] = "";
      renderReportEditor();
      renderPreviewPage();
      renderStatusArea();
      renderPaymentUI();
      updateCurrentStorage();
      showNotification("Section cleared", "info");
    }
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
      showNotification("Please pay UGX 10,000 to unlock Word export.", "warning");
      return;
    }
    exportAsWord();
  });

  document.getElementById("exportPdfBtn")?.addEventListener("click", () => {
    if (!state.payment.isPaid) {
      showNotification("Please pay UGX 10,000 to unlock PDF export.", "warning");
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

function bindAITools() {
  const container = document.getElementById("aiToolsGrid");
  if (!container) return;
  
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".premium-action");
    if (!btn) return;
    
    if (!state.payment.isPaid) {
      showNotification("Please pay UGX 10,000 to unlock premium features.", "warning");
      return;
    }
    
    const toolItem = btn.closest(".tool-item");
    if (!toolItem) return;
    
    const titleElement = toolItem.querySelector("h4");
    if (!titleElement) return;
    
    const toolName = titleElement.textContent;
    applyAITool(toolName);
  });
}

// ========== AI TOOLS ==========

function applyAITool(toolName) {
  const currentContent = state.sectionContent[state.selectedSectionTitle] || "";
  let newContent = currentContent;
  
  switch(toolName) {
    case "Expand My Points":
      newContent = expandContent(currentContent);
      break;
    case "Rewrite Formally":
      newContent = rewriteFormally(currentContent);
      break;
    case "Improve Grammar":
      newContent = improveGrammar(currentContent);
      break;
    case "Summarize My Logbook":
      newContent = summarizeLogbook();
      break;
    case "Draft This Chapter":
      newContent = generateStarterDraft(state.selectedSectionTitle);
      break;
    case "Remove Repetition":
      newContent = removeRepetition(currentContent);
      break;
    case "Generate Recommendations":
      newContent = generateRecommendations();
      break;
    case "Generate Final Conclusion":
      newContent = generateConclusion();
      break;
    default:
      newContent = currentContent + "\n\n[AI Enhancement: " + toolName + "]\nPlease add your specific content here.";
  }
  
  state.sectionContent[state.selectedSectionTitle] = newContent;
  renderReportEditor();
  renderPreviewPage();
  updateCurrentStorage();
  showNotification(`${toolName} applied successfully!`, "success");
}

function expandContent(content) {
  if (!content.trim()) return "No content to expand. Please write some points first.";
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return content;
  
  return sentences.map(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length < 30) {
      return `${trimmed}. This point can be further elaborated with specific examples from my practicum experience, including observations, challenges encountered, and lessons learned.`;
    }
    return trimmed + ".";
  }).join(" ");
}

function rewriteFormally(content) {
  if (!content.trim()) return "";
  
  const replacements = {
    'got to': 'had the opportunity to',
    'a lot of': 'numerous',
    'I think': 'It is evident that',
    'stuff': 'materials',
    'things': 'items',
    'good': 'beneficial',
    'bad': 'challenging',
    'get': 'obtain',
    'use': 'utilize',
    'show': 'demonstrate',
    'help': 'assist',
    'make': 'produce'
  };
  
  let formalContent = content;
  for (const [informal, formal] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${informal}\\b`, 'gi');
    formalContent = formalContent.replace(regex, formal);
  }
  
  return formalContent;
}

function improveGrammar(content) {
  if (!content.trim()) return "";
  
  return content
    .replace(/\s+/g, ' ')
    .replace(/\.\.+/g, '.')
    .replace(/,\s*\./g, '.')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:])\s*([A-Z])/g, '$1 $2')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\bi\b/g, 'I')
    .replace(/\bi'm\b/g, 'I am')
    .replace(/\bdont\b/g, 'do not')
    .replace(/\bdoesnt\b/g, 'does not')
    .replace(/\bwasnt\b/g, 'was not')
    .replace(/\bwerent\b/g, 'were not');
}

function summarizeLogbook() {
  if (state.logbookEntries.length === 0) {
    return "No logbook entries available to summarize. Please add logbook entries first.";
  }
  
  const summary = state.logbookEntries.slice(0, 5).map((entry, index) => {
    return `${index + 1}. On ${entry.date}, I ${entry.mainActivity.toLowerCase()}. This activity enhanced my ${entry.skillsApplied || "practical skills"} and taught me ${entry.learningPoint || "valuable lessons"}.`;
  }).join("\n\n");
  
  if (state.logbookEntries.length > 5) {
    return summary + `\n\n...and ${state.logbookEntries.length - 5} more entries.`;
  }
  
  return summary;
}

function removeRepetition(content) {
  if (!content.trim()) return "";
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const uniqueSentences = [];
  const seen = new Set();
  
  for (const sentence of sentences) {
    const normalized = sentence.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueSentences.push(sentence.trim());
    }
  }
  
  return uniqueSentences.join(". ") + ".";
}

function generateRecommendations() {
  const placementType = getPlacementLabel();
  const challenges = state.logbookEntries
    .map(entry => entry.challenge)
    .filter(Boolean)
    .slice(0, 3);
  
  let recommendations = `Based on my ${placementType} experience, I recommend the following:\n\n`;
  
  recommendations += "1. Future students should prepare adequately before the placement by researching the host organization and understanding its operations.\n";
  
  if (challenges.length > 0) {
    recommendations += `2. To address challenges such as ${challenges[0].toLowerCase()}, students should maintain regular communication with supervisors.\n`;
  }
  
  recommendations += "3. The host institution should provide structured orientation programs for new practicum students.\n";
  recommendations += "4. The university should strengthen supervision and feedback mechanisms during the placement period.\n";
  recommendations += "5. Students should maintain consistent logbook documentation to facilitate easier report writing.\n";
  
  return recommendations;
}

function generateConclusion() {
  const placementType = getPlacementLabel();
  const skillsGained = state.logbookEntries
    .map(entry => entry.skillsApplied)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  
  let conclusion = `In conclusion, this ${placementType} at ${state.placement.hostOrganization || "the host institution"} was a transformative learning experience that significantly contributed to my professional development. `;
  
  conclusion += `Throughout the placement period, I gained practical exposure to ${skillsGained || "various professional activities"} and developed essential workplace competencies. `;
  conclusion += `The experience bridged the gap between theoretical knowledge acquired in class and real-world application. `;
  conclusion += `I am grateful for the opportunity and will apply these lessons in my future career endeavors.`;
  
  return conclusion;
}

// ========== PAYMENT ==========

async function startPesapalPayment() {
  const payBtn = document.getElementById("payToUnlockBtn");
  
  try {
    if (!state.profile.email) {
      showNotification("Please add the student's email in the profile section before making payment.", "warning");
      return;
    }
    
    if (!isProfileComplete()) {
      showNotification("Please complete your profile before making payment.", "warning");
      return;
    }
    
    showLoading(payBtn);
    saveProject();
    
    const notificationId = "e6d8d436-5f99-48ef-be90-da7a8de67f3d";
    const merchantReference = `PRB-${Date.now()}`;
    const currentBaseUrl = getAppBaseUrl();
    const redirectUrl = `${currentBaseUrl}?payment=returned`;
    
    console.log("Payment redirect URL:", redirectUrl);
    
    const payload = {
      amount: 10000,
      email: state.profile.email,
      phone_number: normalizeUgPhone(state.profile.phone),
      first_name: getFirstName(state.profile.fullName),
      last_name: getLastName(state.profile.fullName),
      project_name: state.projectName || "Practicum Report Builder Premium",
      merchant_reference: merchantReference,
      notification_id: notificationId,
      redirect_url: redirectUrl
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(`${BACKEND_BASE_URL}/.netlify/functions/submit-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok || !data.redirect_url) {
      throw new Error(data.error || "Could not start payment.");
    }

    state.payment.merchantReference = merchantReference;
    updateCurrentStorage();
    window.location.href = data.redirect_url;
    
  } catch (error) {
    console.error("Payment start error:", error);
    
    if (error.name === 'AbortError') {
      showNotification("Payment service is slow. Please try again.", "warning");
    } else {
      showNotification(error.message || "Could not connect to payment service. Please try again later.", "error");
    }
  } finally {
    hideLoading(payBtn);
  }
}

// ========== LOGBOOK ==========

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

  const dynamicFields = [
    "departmentUnit", "classTaught", "subjectTaught", "topicTaught", "teachingMethod",
    "teachingAid", "learnerResponse", "wardUnit", "procedureObserved", "procedureAssisted",
    "patientCareTask", "infectionControl", "legalOfficeSection", "legalDocumentHandled",
    "researchTask", "courtSessionAttended", "draftingFiling", "toolsUsed",
    "meetingFieldActivity", "outputProduced"
  ];
  
  dynamicFields.forEach((key) => {
    const element = document.getElementById(`dynamic-${key}`);
    if (element) entry[key] = element.value;
  });

  return entry;
}

function saveLogbookEntry() {
  const entry = getDraftLogbookEntryFromInputs();

  if (!entry.date || !entry.mainActivity) {
    showNotification("Please add at least the date and main activity.", "warning");
    return;
  }
  
  const isDuplicate = state.logbookEntries.some(existing => 
    existing.date === entry.date && 
    existing.mainActivity.toLowerCase() === entry.mainActivity.toLowerCase()
  );
  
  if (isDuplicate && !confirm("An entry with this date and activity already exists. Do you want to add it anyway?")) {
    return;
  }

  state.logbookEntries.push(entry);
  clearLogbookInputs();
  renderSavedLogbookEntries();
  renderDashboard();
  renderPreviewPage();
  renderStatusArea();
  updateCurrentStorage();
  showNotification("Logbook entry saved successfully!", "success");
}

function clearLogbookInputs() {
  const ids = ["logDate", "logMainActivity", "logSkillsApplied", "logLearningPoint", "logChallenge", "logReflection"];
  ids.forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });

  document.querySelectorAll("#dynamicLogbookFields input, #dynamicLogbookFields textarea").forEach((el) => {
    el.value = "";
  });
}

function editLogbookEntry(index) {
  const entry = state.logbookEntries[index];
  
  document.getElementById("logDate").value = entry.date;
  document.getElementById("logMainActivity").value = entry.mainActivity;
  document.getElementById("logSkillsApplied").value = entry.skillsApplied || "";
  document.getElementById("logLearningPoint").value = entry.learningPoint || "";
  document.getElementById("logChallenge").value = entry.challenge || "";
  document.getElementById("logReflection").value = entry.reflection || "";
  
  state.logbookEntries.splice(index, 1);
  renderSavedLogbookEntries();
  
  document.getElementById("logbook-section")?.scrollIntoView({ behavior: 'smooth' });
  showNotification('Editing entry - update and save changes', 'info');
}

// ========== REPORT GENERATION ==========

function generateStarterDraft(title) {
  const placementLabel = getPlacementLabel().toLowerCase();

  if (title === "Title Page") {
    return `${state.profile.university || "UNIVERSITY NAME"}\n\n${title.toUpperCase()}\n\n${state.profile.fullName || "Student Name"}\n${state.profile.registrationNumber || "Registration Number"}\n${state.profile.programme || "Programme"}\n${state.placement.hostOrganization || "Host Organization"}\n${state.placement.startDate || "Start Date"} - ${state.placement.endDate || "End Date"}`;
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
    return `${state.placement.hostOrganization || "The host institution"} is located in ${state.placement.location || "its location"}. During the ${placementLabel}, I was attached to the ${state.placement.departmentUnit || "relevant department"}. ${state.placement.missionFunctions || "This section should describe the institution's background, functions, and structure."}`;
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

// ========== EXPORT FUNCTIONS ==========

function exportAsWord() {
  if (!state.payment.isPaid) {
    showNotification("Please pay UGX 10,000 to unlock Word export.", "warning");
    return;
  }
  
  if (!hasAnyReportDraft()) {
    showNotification("No report content to export.", "warning");
    return;
  }
  
  const reportHTML = generateFullReportHTML();
  const blob = new Blob([reportHTML], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(state.projectName)}_report.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification("Word document generated successfully!", "success");
}

function generateFullReportHTML() {
  const sections = getAllSectionTitles()
    .filter(title => (state.sectionContent[title] || "").trim())
    .map(title => `
      <div style="margin-bottom: 30px; page-break-inside: avoid;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
          ${escapeHtml(title)}
        </h2>
        <div style="line-height: 1.6; font-size: 12pt;">
          ${escapeHtml(state.sectionContent[title] || "").replace(/\n/g, "<br>")}
        </div>
      </div>
    `).join('');
  
  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(state.projectName)}</title>
      <style>
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          margin: 2.54cm;
          line-height: 1.5;
          font-size: 12pt;
        }
        h1 {
          font-size: 24pt;
          color: #2c3e50;
          text-align: center;
          margin-bottom: 20px;
        }
        h2 {
          font-size: 18pt;
          color: #34495e;
          margin-top: 25px;
          border-bottom: 1px solid #bdc3c7;
          padding-bottom: 5px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .meta {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
        }
        @media print {
          body {
            margin: 2.54cm;
          }
          h2 {
            page-break-after: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHtml(state.projectName)}</h1>
        <div class="meta">
          <p><strong>Student Name:</strong> ${escapeHtml(state.profile.fullName || "Not provided")}</p>
          <p><strong>Registration Number:</strong> ${escapeHtml(state.profile.registrationNumber || "Not provided")}</p>
          <p><strong>Programme:</strong> ${escapeHtml(state.profile.programme || "Not provided")}</p>
          <p><strong>University:</strong> ${escapeHtml(state.profile.university || "Not provided")}</p>
          <p><strong>Placement Type:</strong> ${escapeHtml(getPlacementLabel())}</p>
          <p><strong>Host Organization:</strong> ${escapeHtml(state.placement.hostOrganization || "Not provided")}</p>
          <p><strong>Duration:</strong> ${escapeHtml(state.placement.startDate || "")} - ${escapeHtml(state.placement.endDate || "")}</p>
        </div>
      </div>
      ${sections}
      <div style="margin-top: 50px; text-align: center; font-size: 10pt; color: #7f8c8d;">
        <p>Generated by Practicum Report Builder on ${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>`;
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

  const reportHtml = generateFullReportHTML();

  printWindow.document.open();
  printWindow.document.write(reportHtml);
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
        <title>${escapeHtml(state.projectName)} - Logbook</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #2c3e50; }
          h3 { color: #34495e; margin-top: 20px; }
        </style>
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

// ========== PROJECT MANAGEMENT ==========

function saveProject() {
  const payload = getSerializableState();
  const existing = getSavedProjectsFromStorage();
  const updated = [payload, ...existing.filter((project) => project.projectName !== payload.projectName)];

  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(updated));
  localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(payload));

  state.savedProjects = updated;
  renderSavedProjectsLists();
  showNotification("Project saved successfully!", "success");
}

function loadLatestSavedProject() {
  const projects = getSavedProjectsFromStorage();
  if (projects.length === 0) {
    showNotification("No saved project found.", "warning");
    return;
  }

  applyProjectData(projects[0]);
  localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(projects[0]));
  renderAll();
  goToPage("dashboard");
  showNotification("Latest project loaded!", "success");
}

function loadDemoProject() {
  if (!state.demoProjects.length) {
    showNotification("Demo data not found.", "warning");
    return;
  }

  applyProjectData(state.demoProjects[0]);
  renderAll();
  goToPage("dashboard");
  showNotification("Demo project loaded!", "success");
}

function deleteSavedProject(projectName) {
  if (!confirm(`Delete "${projectName}"?`)) return;
  
  const updated = getSavedProjectsFromStorage().filter((project) => project.projectName !== projectName);
  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(updated));
  state.savedProjects = updated;

  if (state.projectName === projectName) {
    resetProject(false);
  }

  renderSavedProjectsLists();
  showNotification("Project deleted", "info");
}

function loadProjectByName(projectName) {
  const project = getSavedProjectsFromStorage().find((item) => item.projectName === projectName);
  if (!project) return;

  applyProjectData(project);
  localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(project));
  renderAll();
  goToPage("dashboard");
  showNotification(`Loaded: ${projectName}`, "success");
}

function resetProject(withAlert = false) {
  state.profile = {
    fullName: "", registrationNumber: "", studentNumber: "", university: "",
    faculty: "", programme: "", yearSemester: "", phone: "", email: ""
  };

  state.placement = {
    placementType: "", hostOrganization: "", departmentUnit: "", location: "",
    startDate: "", endDate: "", duration: "", hostSupervisor: "", hostSupervisorTitle: "",
    universitySupervisor: "", universitySupervisorTitle: "", missionFunctions: ""
  };

  state.workMode = "";
  state.logbookEntries = [];
  state.projectName = "My Practicum Report Project";
  state.selectedSectionTitle = "Title Page";
  state.sectionContent = {};
  state.payment = {
    isPaid: false, amount: 10000, status: "unpaid", orderTrackingId: "", merchantReference: ""
  };

  initializeSectionContent();
  localStorage.removeItem(STORAGE_KEYS.current);
  renderAll();
  goToPage("home");

  if (withAlert) {
    showNotification("Project has been reset.", "info");
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

// ========== RENDER FUNCTIONS ==========

const debouncedRenderAll = debounce(() => {
  renderAll();
}, 300);

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
      <h4>${escapeHtml(type.title)}</h4>
      <p>${escapeHtml(type.description)}</p>
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
      <h4>${escapeHtml(mode.title)}</h4>
      <p>${escapeHtml(mode.description)}</p>
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
        "Record how activities relate to the student's programme.",
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
        <label for="dynamic-${key}">${escapeHtml(label)}</label>
        <textarea id="dynamic-${key}" rows="3"></textarea>
      `;
    } else {
      wrapper.innerHTML = `
        <label for="dynamic-${key}">${escapeHtml(label)}</label>
        <input type="text" id="dynamic-${key}" />
      `;
    }

    container.appendChild(wrapper);
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

  state.logbookEntries.forEach((entry, index) => {
    const item = document.createElement("div");
    item.className = "saved-entry";
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div style="flex: 1;">
          <h4>${escapeHtml(entry.mainActivity)}</h4>
          <p><strong>Date:</strong> ${escapeHtml(entry.date)}</p>
          <p><strong>Skills:</strong> ${escapeHtml(entry.skillsApplied || "Not added")}</p>
          <p><strong>Learning:</strong> ${escapeHtml(entry.learningPoint || "Not added")}</p>
          ${entry.challenge ? `<p><strong>Challenge:</strong> ${escapeHtml(entry.challenge)}</p>` : ''}
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="secondary-btn edit-entry-btn" data-index="${index}">Edit</button>
          <button class="secondary-btn delete-entry-btn" data-index="${index}" style="background: #ef4444; color: white;">Delete</button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
  
  document.querySelectorAll('.edit-entry-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      editLogbookEntry(index);
    });
  });
  
  document.querySelectorAll('.delete-entry-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      if (confirm('Delete this logbook entry?')) {
        state.logbookEntries.splice(index, 1);
        renderSavedLogbookEntries();
        renderDashboard();
        updateCurrentStorage();
        showNotification('Entry deleted', 'info');
      }
    });
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
      <h4>${escapeHtml(section.title)}</h4>
      <p>${escapeHtml(section.group.replaceAll("_", " "))}</p>
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
  bindSectionNavigation(); 
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

function renderAITools() {
  const container = document.getElementById("aiToolsGrid");
  if (!container) return;

  container.innerHTML = "";
  AI_TOOLS.forEach((tool) => {
    const item = document.createElement("div");
    item.className = "tool-item";

    const lockedText = state.payment.isPaid ? "Use Tool" : "🔒 Locked";
    const disabledAttr = state.payment.isPaid ? "" : "disabled";

    item.innerHTML = `
      <h4>${escapeHtml(tool)}</h4>
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
    { title: "Profile Status", desc: state.profile.fullName || "Add student information", value: isProfileComplete() ? "Complete" : "Needs attention" },
    { title: "Placement Setup", desc: state.placement.hostOrganization || "Add host institution", value: getPlacementLabel() },
    { title: "Work Mode", desc: "Choose the preferred workflow", value: getWorkModeLabel() },
    { title: "Logbook Progress", desc: "Daily or weekly records", value: `${state.logbookEntries.length} entries` },
    { title: "Report Builder", desc: "Front matter, chapters, appendices", value: `${getAllSectionTitles().length} sections` },
    { title: "Export Readiness", desc: "Move toward preview and final output", value: `${getCompletionScore()}% ready` }
  ];

  statsContainer.innerHTML = "";
  stats.forEach((stat) => {
    const item = document.createElement("div");
    item.className = "dashboard-stat";
    item.innerHTML = `
      <h4>${escapeHtml(stat.title)}</h4>
      <p>${escapeHtml(stat.desc)}</p>
      <strong>${escapeHtml(stat.value)}</strong>
    `;
    statsContainer.appendChild(item);
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
      <span>${escapeHtml(item.label)}</span>
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
      <p>${sanitizeHTML(escapeHtml(text)).replace(/\n/g, "<br>")}</p>
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
      <span>${escapeHtml(item.label)}</span>
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
    badge.textContent = state.payment.isPaid ? "✓ Paid" : "Unpaid";
    badge.className = state.payment.isPaid ? "ready-badge" : "inprogress-badge";
  }

  if (exportWordBtn) exportWordBtn.disabled = !state.payment.isPaid;
  if (exportPdfBtn) exportPdfBtn.disabled = !state.payment.isPaid;
  if (starterBtn) starterBtn.disabled = !state.payment.isPaid;

  if (payBtn) {
    payBtn.textContent = state.payment.isPaid ? "✅ Premium Unlocked" : "💳 Pay UGX 10,000 to Unlock Premium";
    payBtn.disabled = state.payment.isPaid;
  }
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

function renderProfilePreview() {
  setText("profilePreviewName", state.profile.fullName || "Student name");
  setText("profilePreviewProgramme", state.profile.programme || "Programme");
  setText("profilePreviewUniversity", state.profile.university || "University");
}

function updateActiveProjectName() {
  setText("activeProjectName", state.projectName);
}

// ========== HELPER FUNCTIONS ==========

function setStatusText(id, ready) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = ready ? "Complete" : "In progress";
  el.className = ready ? "ready-badge" : "inprogress-badge";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
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
    
    if (project.payment?.isPaid === true) {
      state.payment.isPaid = true;
      state.payment.orderTrackingId = project.payment.orderTrackingId;
      state.payment.amount = project.payment.amount || 10000;
      state.payment.status = "paid";
    }
    
    renderPaymentUI();
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

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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
// ========== BUTTON RIPPLE EFFECT FUNCTIONS ==========
// 🔥 ADD THESE FUNCTIONS HERE - BEFORE escapeHtml

function addButtonRippleEffect() {
  document.querySelectorAll('.primary-btn, .secondary-btn, .nav-link').forEach(btn => {
    btn.removeEventListener('click', createRipple);
    btn.addEventListener('click', createRipple);
  });
}

function createRipple(e) {
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  
  const rect = this.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  
  this.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// Your existing escapeHtml function stays here
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
