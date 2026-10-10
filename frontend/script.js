// CampusCare AI — connected to the PostgreSQL-backed CampusCare API.

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  const STORAGE_KEYS = {
    data: "campuscare_ai_v2_data",
    user: "campuscare_ai_v2_user"
  };

  // ids of the <section> elements in index.html
  const PAGES = {
    home: "home-page",
    login: "login-page",
    student: "student-dashboard-page",
    complaint: "complaint-page",
    admin: "admin-page"
  };

  const STATUS = {
    PENDING: "Pending",
    PROGRESS: "In Progress",
    DONE: "Completed"
  };

  const TIMELINE_LABELS = ["Submitted", "Under Review", "In Progress", "Resolved"];

  // Which timeline step is "current" for each status
  const TIMELINE_STEP = {
    [STATUS.PENDING]: 1,
    [STATUS.PROGRESS]: 2,
    [STATUS.DONE]: 3
  };

  const CATEGORIES = ["Wi-Fi", "Lab Equipment", "Water Supply", "Electrical", "Maintenance", "Other"];

  const CATEGORY_META = {
    "Wi-Fi":         { icon: "i-wifi",    issue: "Wi-Fi Connectivity",       tone: "blue" },
    "Lab Equipment": { icon: "i-monitor", issue: "Lab Computer Not Working", tone: "purple" },
    "Water Supply":  { icon: "i-droplet", issue: "Water Leakage",            tone: "blue" },
    "Electrical":    { icon: "i-zap",     issue: "Electrical Faults",        tone: "amber" },
    "Maintenance":   { icon: "i-tool",    issue: "Maintenance Requests",     tone: "green" },
    "Other":         { icon: "i-more",    issue: "Other Issues",             tone: "blue" }
  };

  // Hard-coded suggestions shown in the "root cause review" popup.
  // There is no real analysis behind these, it's just a lookup by category.
  const POSSIBLE_CAUSES = {
    "Wi-Fi": [
      "Overloaded access point serving the library and reading areas",
      "Outdated router firmware in Block B",
      "Weak signal coverage in Hostel A corridors"
    ],
    "Lab Equipment": [
      "Ageing hard drives or hardware in older machines",
      "Unstable power supply causing sudden shutdowns",
      "Corrupted system image after a failed update"
    ],
    "Water Supply": [
      "Corroded pipe joints in older plumbing lines",
      "Low-quality fittings from earlier repairs",
      "Excess pressure from the main water tank"
    ],
    default: [
      "Review the maintenance history of the affected locations",
      "Inspect shared infrastructure serving these areas"
    ]
  };

  const REVIEW_STATUSES = ["Needs review", "Investigating", "Fix in progress", "Resolved"];

  // A category is flagged as "recurring" once it has this many complaints
  const RECURRING_THRESHOLD = 4;
  const MAX_PHOTO_MB = 5;
  const PHOTO_HINT = `PNG or JPG, up to ${MAX_PHOTO_MB} MB`;

  // ---------------------------------------------------------------
  // Sample data
  // ---------------------------------------------------------------
  const HISTORY_TEXT = {
    received: ["Complaint received", "Your report was submitted and logged."],
    review: ["Under review", "Management reviewed the report and assigned it to the responsible team."],
    progress: ["Work in progress", "The assigned team has started working on the issue."],
    resolved: ["Marked as resolved", "Management marked the issue as fixed. Please confirm if it is resolved."]
  };

  // Builds a believable history for seeded complaints. Newest entry first.
  function buildHistory(status, date) {
    const steps = ["received"];
    if (status === STATUS.PROGRESS || status === STATUS.DONE) {
      steps.push("review", "progress");
    }
    if (status === STATUS.DONE) {
      steps.push("resolved");
    }

    return steps
      .map(step => ({ title: HISTORY_TEXT[step][0], detail: HISTORY_TEXT[step][1], at: date }))
      .reverse();
  }

  function makeSample(id, title, category, location, status, date, mine = false, description = "") {
    return {
      id,
      title,
      category,
      location,
      status,
      date,
      mine,
      confirmed: false,
      photo: "",
      description: description || `${title} reported at ${location}. Please inspect and resolve.`,
      reporter: mine ? "Aarav Sharma" : "Student",
      history: buildHistory(status, date)
    };
  }

  const SAMPLE_COMPLAINTS = [
    makeSample("CC-1046", "Wi-Fi drops in reading hall", "Wi-Fi", "Library", STATUS.PENDING, "09 Oct 2026"),
    makeSample("CC-1045", "Pipe leaking in washroom", "Water Supply", "Hostel Block C", STATUS.PENDING, "09 Oct 2026"),
    makeSample("CC-1044", "Slow internet in classrooms", "Wi-Fi", "Block B", STATUS.PROGRESS, "07 Oct 2026"),
    makeSample("CC-1043", "Tube light flickering", "Electrical", "Block A", STATUS.PROGRESS, "07 Oct 2026"),
    makeSample("CC-1042", "Wi-Fi not working", "Wi-Fi", "Library", STATUS.PROGRESS, "08 Oct 2026", true,
      "The Wi-Fi keeps disconnecting every few minutes on the 2nd floor, making it impossible to attend online lectures or download study material."),
    makeSample("CC-1041", "Lab system keeps freezing", "Lab Equipment", "Computer Lab 3", STATUS.PROGRESS, "06 Oct 2026"),
    makeSample("CC-1040", "Broken bench in canteen", "Maintenance", "Canteen", STATUS.DONE, "05 Oct 2026"),
    makeSample("CC-1039", "No signal in corridor", "Wi-Fi", "Hostel A", STATUS.DONE, "04 Oct 2026"),
    makeSample("CC-1038", "Lab computer not working", "Lab Equipment", "Computer Lab 3", STATUS.PENDING, "05 Oct 2026", true,
      "Computer number 14 does not boot past the logo screen. It has been like this for two days."),
    makeSample("CC-1037", "Tap leaking in corridor", "Water Supply", "Block A", STATUS.PROGRESS, "03 Oct 2026"),
    makeSample("CC-1036", "Broken socket in reading room", "Electrical", "Library", STATUS.DONE, "02 Oct 2026"),
    makeSample("CC-1035", "Router offline", "Wi-Fi", "Block B", STATUS.PROGRESS, "02 Oct 2026"),
    makeSample("CC-1034", "Seepage on canteen ceiling", "Water Supply", "Canteen", STATUS.PENDING, "01 Oct 2026"),
    makeSample("CC-1033", "PC not booting", "Lab Equipment", "Computer Lab 1", STATUS.DONE, "01 Oct 2026"),
    makeSample("CC-1032", "Ceiling fan not working", "Electrical", "Hostel A", STATUS.PENDING, "29 Sep 2026"),
    makeSample("CC-1031", "Water leakage", "Water Supply", "Hostel Block C", STATUS.DONE, "29 Sep 2026", true,
      "Water is leaking from the pipe near the common washroom and the corridor floor is wet and slippery."),
    makeSample("CC-1030", "Dripping pipe near stairs", "Water Supply", "Block A", STATUS.DONE, "28 Sep 2026"),
    makeSample("CC-1029", "Keyboard and mouse unresponsive", "Lab Equipment", "Computer Lab 1", STATUS.PENDING, "30 Sep 2026"),
    makeSample("CC-1028", "Classroom door lock jammed", "Maintenance", "Block B", STATUS.PENDING, "27 Sep 2026"),
    makeSample("CC-1027", "Water logging outside hostel", "Water Supply", "Hostel Block C", STATUS.PROGRESS, "26 Sep 2026"),
    makeSample("CC-1026", "Lost and found desk closed", "Other", "Admin Block", STATUS.DONE, "25 Sep 2026")
  ];

  // ---------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  // Escape anything that came from a user before putting it in innerHTML
  function esc(value) {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(value ?? "").replace(/[&<>"']/g, ch => entities[ch]);
  }

  function icon(name) {
    return `<svg class="icon"><use href="#${name}"/></svg>`;
  }

  // "CC-1042" -> 1042
  function idNumber(id) {
    return parseInt(String(id).replace(/\D/g, ""), 10) || 0;
  }

  function newestFirst(a, b) {
    return idNumber(b.id) - idNumber(a.id);
  }

  // "In Progress" -> "in-progress" (used as a css class)
  function statusClass(status) {
    return String(status).toLowerCase().replace(/\s+/g, "-");
  }

  function statusBadge(status) {
    return `<span class="status-badge ${statusClass(status)}">${esc(status)}</span>`;
  }

  function formatDate(date = new Date()) {
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function timestamp() {
    const now = new Date();
    const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return `${formatDate(now)}, ${time}`;
  }

  function readFromStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  // ---------------------------------------------------------------
  // App state
  // ---------------------------------------------------------------
  function freshData() {
    return { complaints: structuredClone(SAMPLE_COMPLAINTS), reviews: {} };
  }

  function loadData() {
    const saved = readFromStorage(STORAGE_KEYS.data, null);
    const looksValid = saved && Array.isArray(saved.complaints) && saved.complaints.length > 0;

    if (!looksValid) {
      return freshData();
    }
    return { complaints: saved.complaints, reviews: saved.reviews || {} };
  }

  const state = { complaints: [], reviews: {} };
  let currentUser = readFromStorage(STORAGE_KEYS.user, null);
  let authToken = localStorage.getItem("campuscare_token") || "";
  const API_URL = "https://campus-care-ai-ndhh.onrender.com";

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  function mapComplaint(c) {
    const status = c.status || "Pending";
    const history = (c.history || []).map(h => ({
      title: h.status || "Update",
      detail: h.note || "Complaint status updated.",
      at: h.created_at ? new Date(h.created_at).toLocaleString("en-GB") : ""
    }));
    if (!history.length) history.push({ title: "Complaint received", detail: "Your report was submitted and logged.", at: c.created_at ? new Date(c.created_at).toLocaleString("en-GB") : "" });
    return { ...c, id: String(c.id), date: c.date || (c.created_at ? formatDate(new Date(c.created_at)) : formatDate()), mine: c.mine !== false, confirmed: false, photo: "", history };
  }

  async function refreshComplaints() {
    const data = await api(currentUser.role === "admin" ? "/complaints" : "/complaints/mine");
    state.complaints = (data.complaints || []).map(mapComplaint);
    ui.selectedId = state.complaints[0]?.id || null;
    renderAll();
  }


  // Short-lived UI state that doesn't need saving
  const ui = {
    selectedId: null,      // complaint shown on the tracking panel
    authRole: "student",   // which tab is active on the login page
    toastTimer: null,
    successTimer: null,
    onModalClose: null
  };

  function save() {
    try {
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(state));
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.user);
      }
    } catch (err) {
      showToast("Browser storage is unavailable. Changes will not be saved.", "error");
    }
  }

  function myComplaints() {
    return state.complaints.filter(c => c.mine).sort(newestFirst);
  }

  function findComplaint(id) {
    return state.complaints.find(c => c.id === id);
  }

  function countWithStatus(list, status) {
    return list.filter(c => c.status === status).length;
  }

  // Categories with enough complaints to be worth a closer look
  function recurringGroups() {
    const groups = [];

    CATEGORIES.forEach(category => {
      const items = state.complaints.filter(c => c.category === category);
      if (items.length < RECURRING_THRESHOLD) return;

      // Count each location once, ignoring case and stray spaces
      const locations = new Map();
      items.forEach(c => {
        const key = c.location.trim().toLowerCase();
        if (!locations.has(key)) locations.set(key, c.location.trim());
      });

      groups.push({
        category,
        items: items.sort(newestFirst),
        locations: Array.from(locations.values()),
        count: items.length
      });
    });

    return groups;
  }

  function reviewFor(category) {
    return state.reviews[category] || { status: REVIEW_STATUSES[0], note: "" };
  }

  // ---------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------
  function showToast(message, type = "default") {
    const toast = $("#toast");
    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add("show");

    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  // ---------------------------------------------------------------
  // Modal (uses the native <dialog> element)
  // ---------------------------------------------------------------
  const dialog = $("#modal");

  function modalMarkup({ title, subtitle = "", body = "", footer = "", center = false }) {
    return `
      <div class="modal-body ${center ? "modal-center" : ""}">
        <button class="modal-close" data-action="close-modal" aria-label="Close">${icon("i-x")}</button>
        <h2 id="modal-title">${title}</h2>
        ${subtitle ? `<p class="modal-sub">${subtitle}</p>` : ""}
        ${body}
        ${footer ? `<div class="modal-actions">${footer}</div>` : ""}
      </div>`;
  }

  function openModal(html, { wide = false, onClose = null } = {}) {
    clearTimeout(ui.successTimer);
    ui.onModalClose = onClose;
    dialog.className = wide ? "modal wide" : "modal";
    dialog.innerHTML = html;
    if (!dialog.open) dialog.showModal();
  }

  // Pass runCallback: false when the caller is already navigating somewhere
  // and doesn't want the modal's onClose handler to fire as well.
  function closeModal({ runCallback = true } = {}) {
    clearTimeout(ui.successTimer);
    if (!runCallback) ui.onModalClose = null;
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener("close", () => {
    const callback = ui.onModalClose;
    ui.onModalClose = null;
    if (callback) callback();
  });

  // Clicking the dark backdrop closes the dialog
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeModal();
  });

  // ---------------------------------------------------------------
  // Sidebars
  // ---------------------------------------------------------------
  const SIDEBARS = {
    student: {
      title: "STUDENT PORTAL",
      label: "STUDENT MENU",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "i-grid", go: PAGES.student },
        { key: "new", label: "New Complaint", icon: "i-plus", go: PAGES.complaint, isNew: true },
        { key: "mine", label: "My Complaints", icon: "i-list", go: PAGES.student, scroll: "my-complaints" },
        { key: "profile", label: "Profile", icon: "i-user", modal: "profile" }
      ]
    },
    admin: {
      title: "MANAGEMENT PORTAL",
      label: "MANAGEMENT MENU",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "i-grid", go: PAGES.admin, scroll: "admin-top" },
        { key: "all", label: "All Complaints", icon: "i-list", go: PAGES.admin, scroll: "all-complaints" },
        { key: "recurring", label: "Recurring Issues", icon: "i-repeat", go: PAGES.admin, scroll: "recurring-section" },
        { key: "reports", label: "Reports", icon: "i-chart", modal: "reports" }
      ]
    }
  };

  function sidebarItemMarkup(item, activeKey) {
    let attributes;
    if (item.modal) {
      attributes = `data-action="open-modal" data-modal="${item.modal}"`;
    } else {
      attributes = `data-go="${item.go}"`;
      if (item.scroll) attributes += ` data-scroll="${item.scroll}"`;
      if (item.isNew) attributes += ` data-new="1"`;
    }

    const active = item.key === activeKey ? "active" : "";
    return `<button class="side-link ${active}" data-key="${item.key}" ${attributes}>${icon(item.icon)} ${item.label}</button>`;
  }

  function renderSidebars() {
    $$("[data-sidebar]").forEach(aside => {
      const role = aside.dataset.sidebar;
      const config = SIDEBARS[role];
      const homePage = role === "admin" ? PAGES.admin : PAGES.student;
      const items = config.items.map(item => sidebarItemMarkup(item, aside.dataset.active)).join("");

      aside.innerHTML = `
        <a class="brand sidebar-brand" href="#" data-go="${homePage}">
          <span class="brand-icon">${icon("i-heart")}</span>
          <span>CampusCare<small>${config.title}</small></span>
        </a>
        <p class="side-label">${config.label}</p>
        <nav aria-label="${config.title.toLowerCase()} navigation">${items}</nav>
        <div class="sidebar-bottom">
          <button class="side-link logout" data-action="logout">${icon("i-logout")} Logout</button>
        </div>`;
    });
  }

  function setActiveSideLink(link) {
    const sidebar = link.closest(".sidebar");
    $$(".side-link", sidebar).forEach(other => {
      other.classList.toggle("active", other === link);
    });
  }

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  // Decides where the user is actually allowed to go.
  // Not logged in -> login page; wrong role -> the other dashboard.
  function allowedPage(pageId) {
    const isStudentPage = pageId === PAGES.student || pageId === PAGES.complaint;
    const isAdminPage = pageId === PAGES.admin;

    if (!isStudentPage && !isAdminPage) return pageId;

    if (!currentUser) {
      showToast("Please log in first.");
      return PAGES.login;
    }
    if (isStudentPage && currentUser.role !== "student") {
      showToast("Use the Student Login to open the student pages.", "error");
      return PAGES.admin;
    }
    if (isAdminPage && currentUser.role !== "admin") {
      showToast("Use the Management Login to open the admin dashboard.", "error");
      return PAGES.student;
    }
    return pageId;
  }

  function homeForCurrentUser() {
    return currentUser && currentUser.role === "admin" ? PAGES.admin : PAGES.student;
  }

  function navigate(pageId, { scroll = null, complaintId = null, newForm = false } = {}) {
    if (!Object.values(PAGES).includes(pageId)) return;

    pageId = allowedPage(pageId);
    closeModal({ runCallback: false });

    if (pageId === PAGES.complaint) {
      if (complaintId) ui.selectedId = complaintId;
      if (newForm) resetForm();
    }

    renderAll();

    Object.values(PAGES).forEach(id => {
      $("#" + id).hidden = id !== pageId;
    });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Move keyboard focus to the page heading so screen readers announce the change
    const heading = $(`#${pageId} h1`);
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }

    if (scroll) {
      requestAnimationFrame(() => {
        const target = document.getElementById(scroll);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  // ---------------------------------------------------------------
  // Rendering: shared bits
  // ---------------------------------------------------------------
  function updateUserNames() {
    const name = currentUser?.name || "Student";
    const firstName = name.trim().split(/\s+/)[0] || "Student";
    const initial = name.trim().charAt(0).toUpperCase() || "S";

    $$(".user-display-name").forEach(el => { el.textContent = name; });
    $$(".user-first-name").forEach(el => { el.textContent = firstName; });
    $$(".user-initial").forEach(el => { el.textContent = initial; });
  }

  // The four number cards at the top of the student and admin dashboards.
  // `labels` is [total, pending, progress, done], each one a [title, hint] pair.
  function statCardsMarkup(list, labels) {
    const [total, pending, progress, done] = labels;

    const cards = [
      { label: total[0],    value: list.length,                             hint: total[1],    icon: "i-file",     tone: "blue" },
      { label: pending[0],  value: countWithStatus(list, STATUS.PENDING),  hint: pending[1],  icon: "i-clock",    tone: "amber" },
      { label: progress[0], value: countWithStatus(list, STATUS.PROGRESS), hint: progress[1], icon: "i-activity", tone: "purple" },
      { label: done[0],     value: countWithStatus(list, STATUS.DONE),     hint: done[1],     icon: "i-check",    tone: "green" }
    ];

    return cards.map(card => `
      <article class="stat-card">
        <div class="stat-top">${card.label}<span class="stat-icon stat-${card.tone}">${icon(card.icon)}</span></div>
        <strong>${card.value}</strong><small>${card.hint}</small>
      </article>`).join("");
  }

  function renderAll() {
    updateUserNames();
    renderStudent();
    renderTrackingSelect();
    renderTracking();
    renderAdmin();
  }

  // ---------------------------------------------------------------
  // Student dashboard
  // ---------------------------------------------------------------
  function renderStudent() {
    const list = myComplaints();

    $("#student-stats").innerHTML = statCardsMarkup(list, [
      ["Total", "Reports submitted"],
      ["Pending", "Awaiting review"],
      ["In Progress", "Being addressed"],
      ["Completed", "Resolved reports"]
    ]);

    if (list.length === 0) {
      $("#student-table").innerHTML = `
        <tr><td colspan="5" class="empty-state">No complaints yet. Use “Submit New Complaint” to file your first report.</td></tr>`;
      return;
    }

    $("#student-table").innerHTML = list.map(c => `
      <tr tabindex="0" role="link" data-complaint="${esc(c.id)}" aria-label="Open tracking for ${esc(c.title)}">
        <td class="cell-id">${esc(c.id)}</td>
        <td class="cell-title">${esc(c.title)}</td>
        <td><span class="chip">${esc(c.category)}</span></td>
        <td class="cell-muted">${esc(c.date)}</td>
        <td>${statusBadge(c.status)}</td>
      </tr>`).join("");
  }

  // ---------------------------------------------------------------
  // Complaint form + tracking
  // ---------------------------------------------------------------
  function renderTrackingSelect() {
    const select = $("#tracking-select");
    const list = myComplaints();

    // If the selected complaint is gone (or nothing is selected yet), fall back to the newest one
    const stillExists = list.some(c => c.id === ui.selectedId);
    if (!stillExists) {
      ui.selectedId = list.length ? list[0].id : null;
    }

    select.innerHTML = list.map(c => {
      const selected = c.id === ui.selectedId ? "selected" : "";
      return `<option value="${esc(c.id)}" ${selected}>${esc(c.id)} · ${esc(c.title)}</option>`;
    }).join("");
    select.hidden = list.length === 0;
  }

  function timelineMarkup(complaint) {
    const isDone = complaint.status === STATUS.DONE;
    const current = TIMELINE_STEP[complaint.status] ?? 1;

    return TIMELINE_LABELS.map((label, index) => {
      let stepClass = "";
      if (isDone || index < current) stepClass = "done";
      else if (index === current) stepClass = "current";

      const dot = stepClass === "done" ? icon("i-check") : "";
      return `<div class="step ${stepClass}"><div class="step-dot">${dot}</div><span>${label}</span></div>`;
    }).join("");
  }

  function historyMarkup(complaint) {
    return complaint.history.map(entry => `
      <div class="history-item">
        <span class="history-icon">${icon("i-user")}</span>
        <div><b>${esc(entry.title)}</b><p>${esc(entry.detail)}</p></div>
        <time>${esc(entry.at)}</time>
      </div>`).join("");
  }

  function renderTracking() {
    const body = $("#tracking-body");
    const c = findComplaint(ui.selectedId);

    if (!c) {
      body.innerHTML = `<p class="empty-state">No complaint selected. Submit a complaint to start tracking it.</p>`;
      return;
    }

    const photoLine = c.photo
      ? `<p class="tracking-desc" style="margin-top:8px">${icon("i-upload")} Photo attached: ${esc(c.photo)}</p>`
      : "";
    const confirmedNote = c.confirmed
      ? `<div class="confirm-note">${icon("i-check")} You confirmed that this issue was resolved. Thank you!</div>`
      : "";

    body.innerHTML = `
      <div class="tracking-top"><h3>${esc(c.title)}</h3>${statusBadge(c.status)}</div>
      <div class="meta-grid">
        <div><small>Complaint ID</small><b>${esc(c.id)}</b></div>
        <div><small>Category</small><b>${esc(c.category)}</b></div>
        <div><small>Location</small><b>${esc(c.location)}</b></div>
      </div>
      <p class="tracking-desc">${esc(c.description)}</p>
      ${photoLine}

      <h4 class="sub-heading">Status Timeline</h4>
      <div class="timeline">${timelineMarkup(c)}</div>

      <h4 class="sub-heading">Management Action History</h4>
      <div class="history">${historyMarkup(c)}</div>

      ${confirmedNote}
      <div class="tracking-actions">
        <button class="btn btn-success" data-action="confirm-resolution">${icon("i-check")} Confirm Resolution</button>
        <button class="btn btn-outline" data-action="report-unresolved">${icon("i-alert")} Report Unresolved</button>
        <button class="btn btn-ghost push" data-go="${PAGES.student}">${icon("i-arrow-left")} Back to Dashboard</button>
      </div>`;
  }

  function resetForm() {
    $("#complaint-form").reset();
    $("#photo-name").textContent = PHOTO_HINT;
    $("#form-error").hidden = true;
    $$("#complaint-form [aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
  }

  async function submitComplaint(event) {
    event.preventDefault();
    const fields = [$("#f-category"), $("#f-title"), $("#f-description"), $("#f-location")];
    const firstEmpty = fields.find(field => !field.value.trim());
    fields.forEach(field => field.toggleAttribute("aria-invalid", !field.value.trim()));
    const errorBox = $("#form-error");
    if (firstEmpty) { errorBox.textContent = "Please fill in the category, title, description and campus location."; errorBox.hidden = false; firstEmpty.focus(); return; }
    errorBox.hidden = true;
    const [category, title, description, location] = fields.map(f => f.value.trim());
    try {
      const data = await api("/complaints", { method: "POST", body: JSON.stringify({ title, category, description, location, anonymous: false }) });
      const complaint = mapComplaint(data.complaint);
      state.complaints.unshift(complaint);
      ui.selectedId = complaint.id;
      resetForm(); renderAll();
      openModal(modalMarkup({ center: true, title: "Complaint submitted", subtitle: `<b>${esc(complaint.id)}</b> has been received and saved to the database.`, body: `<div class="success-ring">${icon("i-check")}</div>`, footer: `<button class="btn btn-primary" data-action="close-modal">Go to Dashboard</button>` }), { onClose: () => navigate(PAGES.student) });
    } catch (err) { errorBox.textContent = err.message; errorBox.hidden = false; }
  }

  // ---------------------------------------------------------------
  // Admin dashboard
  // ---------------------------------------------------------------
  function renderAdmin() {
    const all = state.complaints;

    $("#admin-stats").innerHTML = statCardsMarkup(all, [
      ["Total Complaints", "All campus reports"],
      ["Pending", "Awaiting review"],
      ["In Progress", "Being addressed"],
      ["Resolved", "Marked as resolved"]
    ]);

    renderCategoryChart(all);

    $("#admin-table").innerHTML = [...all].sort(newestFirst).map(c => `
      <tr tabindex="0" role="button" data-admin-id="${esc(c.id)}" aria-label="Review ${esc(c.title)}">
        <td class="cell-id">${esc(c.id)}</td>
        <td class="cell-title">${esc(c.title)}</td>
        <td><span class="chip">${esc(c.category)}</span></td>
        <td class="cell-muted">${esc(c.location)}</td>
        <td>${statusBadge(c.status)}</td>
      </tr>`).join("");

    renderRecurring();
  }

  function renderCategoryChart(complaints) {
    const counts = CATEGORIES.map(name => ({
      name,
      total: complaints.filter(c => c.category === name).length
    }));
    const biggest = Math.max(1, ...counts.map(c => c.total));

    $("#category-chart").innerHTML = counts.map(({ name, total }) => {
      // keep a small minimum width so empty categories still show a sliver of bar
      const width = Math.max(4, (total / biggest) * 100);
      return `
        <div class="chart-row"><span>${esc(name)}</span>
          <div class="chart-bar" role="img" aria-label="${esc(name)}: ${total} complaints"><span style="width:${width}%"></span></div>
          <b>${total}</b></div>`;
    }).join("");
  }

  function recurringCardMarkup(group) {
    const meta = CATEGORY_META[group.category] || CATEGORY_META.Other;
    const review = reviewFor(group.category);
    const isSolved = review.status === "Resolved";

    const badge = isSolved
      ? `<span class="recurring-badge ok">${icon("i-check")} Root cause addressed</span>`
      : `<span class="recurring-badge">${icon("i-alert")} Recurring Problem – Root Cause Review Needed</span>`;

    return `
      <article class="recurring-card ${isSolved ? "resolved" : ""}">
        <div class="recurring-head">
          <span class="stat-icon stat-${meta.tone}">${icon(meta.icon)}</span>
          <h3>${esc(meta.issue)}</h3>
        </div>
        ${badge}
        <div class="recurring-numbers">
          <div><b>${group.count}</b><span>similar complaints</span></div>
          <div><b>${group.locations.length}</b><span>locations</span></div>
        </div>
        <p class="review-status">Review status: <b>${esc(review.status)}</b></p>
        <div class="recurring-actions">
          <button class="btn btn-primary btn-small" data-action="investigate" data-category="${esc(group.category)}">Investigate Root Cause</button>
          <button class="btn btn-outline btn-small" data-action="update-review" data-category="${esc(group.category)}">Update Status</button>
        </div>
      </article>`;
  }

  function renderRecurring() {
    const groups = recurringGroups();
    const grid = $("#recurring-grid");

    if (groups.length === 0) {
      grid.innerHTML = `<p class="empty-state">No recurring problems detected right now.</p>`;
      return;
    }
    grid.innerHTML = groups.map(recurringCardMarkup).join("");
  }

  // ---------------------------------------------------------------
  // Modals opened from the sidebar / login page
  // ---------------------------------------------------------------
  const MODALS = {
    profile() {
      const user = currentUser || { name: "Student", email: "student@campus.edu", role: "student" };
      const isAdmin = user.role === "admin";

      openModal(modalMarkup({
        title: esc(user.name),
        subtitle: isAdmin ? "Management account" : "B.Tech · Computer Science · Year 3",
        body: `
          <div class="avatar-lg">${esc(user.name.charAt(0).toUpperCase())}</div>
          <dl class="kv">
            <dt>Email</dt><dd>${esc(user.email)}</dd>
            <dt>Role</dt><dd>${isAdmin ? "Management" : "Student"}</dd>
            <dt>Student ID</dt><dd>CS21B042</dd>
          </dl>`,
        footer: `
          <button class="btn btn-ghost" data-action="reset-demo">Reset demo data</button>
          <button class="btn btn-primary" data-action="close-modal">Close</button>`
      }));
    },

    forgot() {
      openModal(modalMarkup({
        title: "Reset your password",
        subtitle: "Enter your email and we will send a reset link. (Demo only)",
        body: `
          <label for="reset-email">Email</label>
          <input id="reset-email" type="email" placeholder="you@college.edu">`,
        footer: `
          <button class="btn btn-outline" data-action="close-modal">Cancel</button>
          <button class="btn btn-primary" data-action="send-reset">Send reset link</button>`
      }));
    },

    reports() {
      const all = state.complaints;
      const done = countWithStatus(all, STATUS.DONE);
      const resolutionRate = all.length ? Math.round((done / all.length) * 100) : 0;

      openModal(modalMarkup({
        title: "Campus report",
        subtitle: "A quick summary you can export for your review meeting.",
        body: `
          <div class="report-grid">
            <div><b>${all.length}</b><span>Complaints received</span></div>
            <div><b>${resolutionRate}%</b><span>Resolution rate</span></div>
            <div><b>${recurringGroups().length}</b><span>Recurring problems</span></div>
            <div><b>${all.length - done}</b><span>Open complaints</span></div>
          </div>`,
        footer: `
          <button class="btn btn-outline" data-action="close-modal">Close</button>
          <button class="btn btn-primary" data-action="export-report">${icon("i-download")} Export CSV</button>`
      }), { wide: true });
    }
  };

  function optionsMarkup(values, selectedValue) {
    return values.map(v => `<option ${v === selectedValue ? "selected" : ""}>${v}</option>`).join("");
  }

  function openAdminDetail(id) {
    const c = findComplaint(id);
    if (!c) return;

    openModal(modalMarkup({
      title: esc(c.title),
      subtitle: `${esc(c.id)} · ${esc(c.category)}`,
      body: `
        <dl class="kv">
          <dt>Location</dt><dd>${esc(c.location)}</dd>
          <dt>Reported</dt><dd>${esc(c.date)}</dd>
          <dt>Status</dt><dd>${statusBadge(c.status)}</dd>
          <dt>Details</dt><dd>${esc(c.description)}</dd>
        </dl>
        <label for="admin-status">Update status</label>
        <select id="admin-status">${optionsMarkup(Object.values(STATUS), c.status)}</select>`,
      footer: `
        <button class="btn btn-outline" data-action="close-modal">Cancel</button>
        <button class="btn btn-primary" data-action="save-admin-status" data-id="${esc(c.id)}">Save changes</button>`
    }), { wide: true });
  }

  function openInvestigate(category) {
    const group = recurringGroups().find(g => g.category === category);
    if (!group) return;

    const meta = CATEGORY_META[category] || CATEGORY_META.Other;
    const causes = POSSIBLE_CAUSES[category] || POSSIBLE_CAUSES.default;

    const locationChips = group.locations.map(l => `<span>${esc(l)}</span>`).join("");
    const causeItems = causes.map(text => `<li>${icon("i-zap")}<span>${esc(text)}</span></li>`).join("");
    const linked = group.items.slice(0, 6).map(c =>
      `<div><span><b>${esc(c.id)}</b>${esc(c.title)}</span>${statusBadge(c.status)}</div>`
    ).join("");

    openModal(modalMarkup({
      title: `${esc(meta.issue)}: Root Cause Review`,
      subtitle: `${group.count} similar complaints across ${group.locations.length} locations. Rule-based demo analysis.`,
      body: `
        <div class="chip-row">${locationChips}</div>
        <p class="modal-label">Possible causes to check</p>
        <ul class="cause-list">${causeItems}</ul>
        <p class="modal-label" style="margin-top:18px">Linked complaints</p>
        <div class="linked-list">${linked}</div>`,
      footer: `
        <button class="btn btn-outline" data-action="close-modal">Close</button>
        <button class="btn btn-primary" data-action="start-investigation" data-category="${esc(category)}">Start investigation</button>`
    }), { wide: true });
  }

  function openUpdateReview(category) {
    const meta = CATEGORY_META[category] || CATEGORY_META.Other;
    const review = reviewFor(category);

    openModal(modalMarkup({
      title: "Update review status",
      subtitle: esc(meta.issue),
      body: `
        <label for="review-status">Review status</label>
        <select id="review-status">${optionsMarkup(REVIEW_STATUSES, review.status)}</select>
        <label for="review-note">Note for the team <em>(optional)</em></label>
        <textarea id="review-note" rows="3" placeholder="e.g. Router replacement scheduled for Monday">${esc(review.note)}</textarea>`,
      footer: `
        <button class="btn btn-outline" data-action="close-modal">Cancel</button>
        <button class="btn btn-primary" data-action="save-review" data-category="${esc(category)}">Save status</button>`
    }));
  }

  function openUnresolved() {
    openModal(modalMarkup({
      title: "Report as unresolved",
      subtitle: "Tell management what is still wrong. The complaint will be reopened.",
      body: `
        <label for="unresolved-reason">What is still not fixed?</label>
        <textarea id="unresolved-reason" rows="3" placeholder="e.g. The Wi-Fi drops again every evening"></textarea>`,
      footer: `
        <button class="btn btn-outline" data-action="close-modal">Cancel</button>
        <button class="btn btn-danger" data-action="submit-unresolved">Reopen complaint</button>`
    }));
  }

  // ---------------------------------------------------------------
  // Actions (buttons with a data-action attribute)
  // ---------------------------------------------------------------
  function addHistoryEntry(complaint, title, detail) {
    complaint.history.unshift({ title, detail, at: timestamp() });
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function exportCSV() {
    const headers = ["ID", "Title", "Category", "Description", "Location", "Status", "Date", "Reporter"];
    const rows = [...state.complaints].sort(newestFirst).map(c => [
      c.id, c.title, c.category, c.description, c.location, c.status, c.date, c.reporter
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(csvCell).join(","))
      .join("\r\n");

    // The BOM at the start makes Excel read the file as UTF-8
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "campuscare-complaints.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast("Report exported as CSV.", "success");
  }

  const ACTIONS = {
    "close-modal": () => closeModal(),

    "open-modal": el => {
      const open = MODALS[el.dataset.modal];
      if (open) open();
    },

    "logout": () => {
      currentUser = null;
      authToken = "";
      localStorage.removeItem("campuscare_token");
      save();
      $("#auth-form").reset();
      setAuthRole("student");
      navigate(PAGES.home);
      showToast("You have been logged out.");
    },

    "cancel-form": () => {
      resetForm();
      navigate(PAGES.student);
    },

    "export-report": () => exportCSV(),

    "send-reset": () => {
      closeModal();
      showToast("Reset link sent (demo).", "success");
    },

    "reset-demo": () => {
      Object.assign(state, freshData());
      ui.selectedId = null;
      save();
      closeModal();
      renderAll();
      showToast("Demo data has been reset.", "success");
    },

    "confirm-resolution": () => {
      const c = findComplaint(ui.selectedId);
      if (!c) return;

      if (c.status !== STATUS.DONE) {
        showToast("Management has not marked this complaint as resolved yet.", "error");
        return;
      }
      if (c.confirmed) {
        showToast("You have already confirmed this resolution.");
        return;
      }

      c.confirmed = true;
      addHistoryEntry(c, "Resolution confirmed", "The student confirmed the issue is fixed.");
      save();
      renderAll();
      showToast("Thank you! Resolution confirmed.", "success");
    },

    "report-unresolved": () => {
      const c = findComplaint(ui.selectedId);
      if (!c) return;

      if (c.status !== STATUS.DONE) {
        showToast("This complaint is still being handled by management.", "error");
        return;
      }
      openUnresolved();
    },

    "submit-unresolved": () => {
      const reasonBox = $("#unresolved-reason");
      const reason = reasonBox.value.trim();

      if (!reason) {
        reasonBox.setAttribute("aria-invalid", "true");
        showToast("Please describe what is still not fixed.", "error");
        return;
      }

      const c = findComplaint(ui.selectedId);
      c.status = STATUS.PROGRESS;
      c.confirmed = false;
      addHistoryEntry(c, "Reopened by student", reason);

      save();
      closeModal();
      renderAll();
      showToast("Complaint reopened for review.", "success");
    },

    "save-admin-status": async el => {
      const c = findComplaint(el.dataset.id);
      const newStatus = $("#admin-status").value;

      if (c && c.status !== newStatus) {
        try { await api(`/complaints/${encodeURIComponent(c.id)}/status`, { method: "PATCH", body: JSON.stringify({ status: newStatus, note: "Status updated by management" }) }); }
        catch (err) { showToast(err.message, "error"); return; }
        c.status = newStatus;
        c.confirmed = false;

        let historyKey = "review";
        if (newStatus === STATUS.DONE) historyKey = "resolved";
        else if (newStatus === STATUS.PROGRESS) historyKey = "progress";

        addHistoryEntry(c, HISTORY_TEXT[historyKey][0], HISTORY_TEXT[historyKey][1]);
      }

      save();
      closeModal();
      renderAll();
      showToast(`${el.dataset.id} updated to ${newStatus}.`, "success");
    },

    "investigate": el => openInvestigate(el.dataset.category),

    "update-review": el => openUpdateReview(el.dataset.category),

    "start-investigation": el => {
      const category = el.dataset.category;
      state.reviews[category] = { ...reviewFor(category), status: "Investigating" };

      save();
      closeModal();
      renderAll();
      showToast("Investigation started.", "success");
    },

    "save-review": el => {
      const category = el.dataset.category;
      const status = $("#review-status").value;
      const note = $("#review-note").value.trim();
      state.reviews[category] = { status, note };

      save();
      closeModal();
      renderAll();
      showToast(`Review status set to “${status}”.`, "success");
    }
  };

  // ---------------------------------------------------------------
  // Click + keyboard handling
  // One listener on the document handles every button and table row.
  // ---------------------------------------------------------------
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-action],[data-go],[data-complaint],[data-admin-id],[data-auth-role]");
    if (!target) return;

    // links use href="#", don't let them jump the page
    if (target.tagName === "A") event.preventDefault();

    if (target.dataset.action) {
      const run = ACTIONS[target.dataset.action];
      if (run) run(target);
    } else if (target.dataset.go) {
      const sideLink = target.closest(".side-link");
      if (sideLink) setActiveSideLink(sideLink);

      navigate(target.dataset.go, {
        scroll: target.dataset.scroll || null,
        newForm: Boolean(target.dataset.new)
      });
    } else if (target.dataset.complaint) {
      navigate(PAGES.complaint, { complaintId: target.dataset.complaint, scroll: "tracking-section" });
    } else if (target.dataset.adminId) {
      openAdminDetail(target.dataset.adminId);
    } else if (target.dataset.authRole) {
      setAuthRole(target.dataset.authRole);
    }
  });

  // Table rows are focusable, so Enter should open them like a click would
  document.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;

    const row = event.target.closest("tr[data-complaint], tr[data-admin-id]");
    if (row) row.click();
  });

  // ---------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------
  // Switches between the student and management tabs and pre-fills demo credentials
  function setAuthRole(role) {
    ui.authRole = role;
    const isAdmin = role === "admin";

    $$("[data-auth-role]").forEach(tab => {
      const isActive = tab.dataset.authRole === role;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    $("#auth-heading").textContent = isAdmin ? "Management Login" : "Student Login";
    $("#auth-subtitle").textContent = isAdmin
      ? "Sign in to review complaints and investigate recurring issues."
      : "Sign in to report an issue or track a request.";
    $("#auth-email").value = isAdmin ? "admin@campus.edu" : "aarav.sharma@campus.edu";
    $("#auth-password").value = "demo1234";
  }

  // "aarav.sharma@campus.edu" -> "Aarav Sharma"
  function nameFromEmail(email) {
    return email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  // Create-account button is added here to keep the existing page design intact.
  const registerButton = document.createElement("button");
  registerButton.type = "button";
  registerButton.className = "btn btn-outline btn-full";
  registerButton.style.marginTop = "10px";
  registerButton.textContent = "Create student account";
  $("#auth-form").insertAdjacentElement("afterend", registerButton);
  registerButton.addEventListener("click", async () => {
    const name = prompt("Enter your full name:");
    if (!name || !name.trim()) return;
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    if (!/^\S+@\S+\.\S+$/.test(email)) return showToast("Enter a valid email first.", "error");
    if (password.length < 8) return showToast("Password must contain at least 8 characters.", "error");
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify({ name: name.trim(), email, password }) });
      showToast("Account created. Please log in.", "success");
    } catch (err) { showToast(err.message, "error"); }
  });

  $("#auth-form").addEventListener("submit", async event => {
    event.preventDefault();
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    if (!/^\S+@\S+\.\S+$/.test(email)) return showToast("Please enter a valid email address.", "error");
    if (!password) return showToast("Enter your password.", "error");
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (ui.authRole === "admin" && data.user.role !== "admin") return showToast("This account does not have management access.", "error");
      if (ui.authRole === "student" && data.user.role === "admin") return showToast("Choose Management Login for this account.", "error");
      authToken = data.token;
      localStorage.setItem("campuscare_token", authToken);
      currentUser = data.user;
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(currentUser));
      await refreshComplaints();
      showToast("Logged in successfully.", "success");
      navigate(homeForCurrentUser());
    } catch (err) { showToast(err.message, "error"); }
  });

  // ---------------------------------------------------------------
  // Form and tracking events
  // ---------------------------------------------------------------
  $("#complaint-form").addEventListener("submit", submitComplaint);

  // Clear the red error state as soon as the user starts fixing a field
  $("#complaint-form").addEventListener("input", event => {
    if (event.target.removeAttribute) event.target.removeAttribute("aria-invalid");
  });

  $("#f-photo").addEventListener("change", event => {
    const file = event.target.files[0];
    const label = $("#photo-name");

    if (!file) {
      label.textContent = PHOTO_HINT;
      return;
    }

    const tooBig = file.size > MAX_PHOTO_MB * 1024 * 1024;
    if (!file.type.startsWith("image/") || tooBig) {
      event.target.value = "";
      label.textContent = PHOTO_HINT;
      showToast(`Please choose an image smaller than ${MAX_PHOTO_MB} MB.`, "error");
      return;
    }

    label.textContent = `Selected: ${file.name}`;
  });

  $("#tracking-select").addEventListener("change", event => {
    ui.selectedId = event.target.value;
    renderTracking();
  });

  // ---------------------------------------------------------------
  // Start up
  // ---------------------------------------------------------------
  renderSidebars();
  setAuthRole("student");
  // Never show seeded demo complaints as if they came from PostgreSQL.
  state.complaints = [];
  renderAll();
  if (currentUser && authToken) {
    refreshComplaints().then(() => navigate(homeForCurrentUser())).catch(() => { currentUser = null; authToken = ""; localStorage.removeItem("campuscare_token"); localStorage.removeItem(STORAGE_KEYS.user); navigate(PAGES.home); });
  } else {
    currentUser = null;
    navigate(PAGES.home);
  }
});
