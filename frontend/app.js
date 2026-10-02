// ── API location ──
// When the page is served by the Express backend (npm run dev → http://localhost:3000)
// the API is on the same origin. If it's opened some other way (Live Server, file://),
// send requests to the backend directly instead.
const API_PORT = "3000";
const API_BASE = location.protocol.startsWith("http") && location.port === API_PORT
  ? ""
  : `http://localhost:${API_PORT}`;

// fetch + JSON with a readable error when the backend isn't answering
async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(API_BASE + path, options);
  } catch (_) {
    throw new Error("Can't reach the server — start the backend with npm run dev");
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (data === null) {
    throw new Error(`Server sent no data (${res.status}) — is the backend running on port ${API_PORT}?`);
  }
  return { res, data };
}

const authHeaders = (extra = {}) => ({ ...extra, Authorization: `Bearer ${currentToken}` });

// ── State ──
let currentToken = "";
let currentUser = null;   // { id, name, email, role }
let allTutors = [];
let authRole = "parent";  // which role is picked on the sign-in screen
let authMode = "login";   // "login" | "signup"

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));


// ── Session (kept in localStorage so a refresh doesn't log you out) ──
function saveSession() {
  try {
    if (currentToken) localStorage.setItem("htm-session", JSON.stringify({ currentToken, currentUser }));
    else localStorage.removeItem("htm-session");
  } catch (_) {}
}
function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem("htm-session") || "null");
    if (s && s.currentToken) { currentToken = s.currentToken; currentUser = s.currentUser; }
  } catch (_) {}
}

// ── Navigation (what each role is allowed to see) ──
//   signed out → Find tutors (+ sign in)
//   parent     → Find tutors + My requests
//   tutor      → Requests only
const isTutor = () => currentUser?.role === "tutor";

function homeTab() { return isTutor() ? "requests" : "search"; }

function switchTab(tab) {
  if (tab === "search" && isTutor()) tab = "requests";
  if (tab === "requests" && !currentUser) tab = "login";

  ["search", "requests", "login"].forEach((t) => { $(`view-${t}`).hidden = t !== tab; });
  ["search", "requests"].forEach((t) => $(`tab-${t}-btn`).classList.toggle("active", t === tab));
  if (tab === "requests") loadMyRequests();
  if (tab === "search") searchTutors(); // always show fresh tutors/resumes
  window.scrollTo(0, 0);
}

function renderChrome() {
  // nav links
  $("tab-search-btn").hidden = isTutor();
  $("tab-requests-btn").hidden = !currentUser;
  $("tab-requests-btn").textContent = isTutor() ? "Requests" : "My requests";

  // account area
  const area = $("account-area");
  area.innerHTML = currentUser
    ? `<span class="who"><strong>${esc(currentUser.name || currentUser.email)}</strong> · ${esc(currentUser.role)}</span>
       <button class="btn btn-outline btn-sm" onclick="logout()">Sign out</button>`
    : `<button class="btn btn-outline btn-sm" onclick="setAuthMode('login'); switchTab('login')">Sign in</button>`;

  // requests page bits
  $("requests-view-title").textContent = isTutor() ? "Incoming requests" : "My requests";
}

// ── File picker ──
function showFileName(input) {
  const label = input.parentElement.querySelector(".file-name");
  const f = input.files[0];
  const size = f && (f.size < 1024 * 1024 ? `${Math.max(1, Math.round(f.size / 1024))} KB` : `${(f.size / 1024 / 1024).toFixed(1)} MB`);
  label.textContent = f ? `${f.name} · ${size}` : label.dataset.empty;
  label.classList.toggle("chosen", !!f);
}

function resetFile(id) {
  const input = $(id);
  input.value = "";
  showFileName(input);
}

const MAX_RESUME_MB = 5;
function checkResumeFile(file) {
  if (!file) return "Please choose your resume file";
  if (file.size > MAX_RESUME_MB * 1024 * 1024) return `Resume must be smaller than ${MAX_RESUME_MB} MB`;
  return "";
}

// ── Sign in / create account ──
function setAuthRole(role) {
  authRole = role;
  document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.toggle("active", b.dataset.role === role));
  renderAuthForm();
}

function setAuthMode(mode) {
  authMode = mode;
  renderAuthForm();
}

function renderAuthForm() {
  const signup = authMode === "signup";
  const tutor = authRole === "tutor";

  document.querySelectorAll("#auth-form .signup-only").forEach((el) => { el.hidden = !signup; });
  document.querySelectorAll("#auth-form .login-only").forEach((el) => { el.hidden = signup; });
  document.querySelector(".tutor-signup").hidden = !(signup && tutor);
  $("reg-resume-field").hidden = !(signup && tutor);

  $("auth-title").innerHTML = signup
    ? (tutor ? "Join as<br>a Tutor." : "Join as<br>a Parent.")
    : "Sign<br>In.";
  $("auth-note").textContent = signup
    ? (tutor ? "Upload your resume and add your teaching details — parents can open it before hiring."
             : "Create an account to find and request tutors.")
    : (tutor ? "Tutors go straight to their requests." : "Parents go straight to finding a tutor.");
  $("auth-submit").textContent = signup ? "Create account →" : "Sign in →";
  $("auth-switch-text").textContent = signup ? "Already have an account?" : "New here?";
  $("auth-switch-btn").textContent = signup ? "Sign in" : "Create an account";
}

async function handleAuth() {
  const email = $("login-email").value.trim();
  const password = $("login-password").value;
  let path = "/api/auth/login";
  let options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role: authRole })
  };

  if (authMode === "signup") {
    path = "/api/auth/register";
    const name = $("reg-name").value.trim();
    if (!name) return toast("Please enter your name", "error");

    if (authRole === "tutor") {
      const subjects = $("reg-subjects").value.trim();
      const locality = $("reg-locality").value.trim();
      const slots = $("reg-slots").value.trim();
      const file = $("reg-resume").files[0];
      const fileError = checkResumeFile(file);
      if (fileError) return toast(fileError, "error");
      if (!subjects || !locality || !slots) return toast("Add your subjects, locality and slots", "error");

      // multipart/form-data so multer can read the file (field name "resume")
      const form = new FormData();
      form.append("role", "tutor");
      form.append("name", name);
      form.append("email", email);
      form.append("password", password);
      form.append("subjects", subjects);
      form.append("locality", locality);
      form.append("availableSlots", slots);
      form.append("resume", file);
      options = { method: "POST", body: form }; // browser sets the multipart header
    } else {
      options.body = JSON.stringify({ name, email, password, role: "parent" });
    }
  }

  try {
    const { res, data } = await api(path, options);
    if (!res.ok || !data.token) return toast(data.message || "Something went wrong", "error");

    currentToken = data.token;
    currentUser = data.user;
    saveSession();
    $("login-password").value = "";
    resetFile("reg-resume");
    toast(`Welcome, ${data.user.name}`);
    await afterSignIn();
  } catch (err) { toast(err.message, "error"); }
}

async function afterSignIn() {
  renderChrome();
  switchTab(homeTab());
}

function logout() {
  currentToken = "";
  currentUser = null;
  saveSession();
  renderChrome();
  switchTab("search");
}

const fileHref = (url) => API_BASE + url;

// ── Tutors (parent view) ──
async function searchTutors() {
  const params = new URLSearchParams();
  const subject = $("search-subject").value.trim();
  const locality = $("search-locality").value.trim();
  if (subject) params.append("subject", subject);
  if (locality) params.append("locality", locality);
  try {
    const { data } = await api(`/api/tutors?${params}`);
    allTutors = Array.isArray(data) ? data : [];
    renderTutors(allTutors);
  } catch (err) {
    $("tutor-cards-container").innerHTML = `<p class="empty">${esc(err.message)}</p>`;
  }
}

function clearSearch() {
  $("search-subject").value = "";
  $("search-locality").value = "";
  searchTutors();
}

function resumeHtml(r) {
  if (!r || !r.fileUrl) return `<span class="resume-empty">No resume uploaded yet</span>`;
  return `<a class="resume-link" href="${esc(fileHref(r.fileUrl))}" target="_blank" rel="noopener">View resume <span>↗</span></a>`;
}

function renderTutors(tutors) {
  $("tutor-count").textContent = `${String(tutors.length).padStart(2, "0")} found`;
  const box = $("tutor-cards-container");
  if (!tutors.length) {
    box.innerHTML = `<p class="empty">No tutors match your search.</p>`;
    return;
  }
  box.innerHTML = tutors.map((t, i) => `
    <article class="tutor-card">
      <div class="tutor-body">
        <div class="tutor-top">
          <span class="tutor-num">${String(i + 1).padStart(2, "0")}</span>
          <span class="eyebrow">${esc(t.locality)}</span>
        </div>
        <div>
          <h3 class="tutor-name">${esc(t.name)}</h3>
          ${resumeHtml(t.resume)}
        </div>
        <div>
          <p class="eyebrow">Subjects</p>
          <div class="chips">${(t.subjects || []).map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>
        </div>
        <div>
          <p class="eyebrow">Available slots</p>
          <div class="chips">${(t.availableSlots || []).map((s) => `<span class="chip chip-slot">${esc(s)}</span>`).join("")}</div>
        </div>
      </div>
      <button class="card-action" onclick="openHireModal('${esc(t._id)}')">Request tutor <span>↗</span></button>
    </article>`).join("");
}

// ── Hire modal ──
function openHireModal(id) {
  if (!currentUser) { toast("Sign in as a parent to send a request"); setAuthRole("parent"); return switchTab("login"); }
  if (currentUser.role !== "parent") return toast("Only parent accounts can send requests", "error");

  const t = allTutors.find((x) => x._id === id);
  if (!t) return;
  $("modal-tutor-id").value = t._id;
  $("modal-tutor-name").textContent = t.name;
  $("modal-subject-select").innerHTML = t.subjects.map((s) => `<option>${esc(s)}</option>`).join("");
  $("modal-slot-select").innerHTML = t.availableSlots.map((s) => `<option>${esc(s)}</option>`).join("");
  $("modal-message").value = "";
  $("hire-modal").classList.add("open");
}

function closeHireModal() { $("hire-modal").classList.remove("open"); }

async function submitHireRequest() {
  const body = {
    tutor: $("modal-tutor-id").value,
    subject: $("modal-subject-select").value,
    slot: $("modal-slot-select").value,
    message: $("modal-message").value
  };
  try {
    const { res, data } = await api("/api/hire-requests", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    });
    if (!res.ok) return toast(data.message || "Couldn't send request", "error");
    closeHireModal();
    toast("Request sent — waiting for the tutor to respond");
    switchTab("requests");
  } catch (err) { toast(err.message, "error"); }
}

// ── Requests ──
async function loadMyRequests() {
  const list = $("requests-list");
  if (!currentUser) return;
  list.innerHTML = `<p class="empty">Loading…</p>`;
  try {
    const { res, data: reqs } = await api("/api/hire-requests/my-requests", { headers: authHeaders() });
    if (res.status === 401) { logout(); return toast("Session expired — please sign in again", "error"); }
    if (!Array.isArray(reqs) || !reqs.length) {
      list.innerHTML = `<p class="empty">No requests yet.</p>`;
      return;
    }
    const tutorView = isTutor();
    list.innerHTML = reqs.map((r, i) => {
      const canRespond = tutorView && r.tutor && r.tutor._id === currentUser.id && r.status === "pending";
      const who = tutorView
        ? `From ${esc(r.parent?.name || "Parent")}${r.parent?.email ? ` · ${esc(r.parent.email)}` : ""}`
        : `With ${esc(r.tutor?.name || "Tutor")}`;
      return `
        <div class="request">
          <span class="tutor-num">${String(i + 1).padStart(2, "0")}</span>
          <div>
            <div class="request-title">${esc(r.subject)} <span class="chip chip-slot">${esc(r.slot)}</span></div>
            <div class="request-meta eyebrow">${who}</div>
            ${r.message ? `<div class="request-msg">“${esc(r.message)}”</div>` : ""}
          </div>
          <div class="request-side">
            ${canRespond
              ? `<button class="btn btn-link btn-sm" onclick="respond('${esc(r._id)}','reject')">Decline</button>
                 <button class="btn btn-accent btn-sm" onclick="respond('${esc(r._id)}','accept')">Accept</button>`
              : `<span class="status status-${esc(r.status)}">${esc(r.status)}</span>`}
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    list.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
  }
}

async function respond(id, action) {
  try {
    const { res, data } = await api(`/api/hire-requests/${id}/${action}`, {
      method: "PATCH",
      headers: authHeaders()
    });
    if (res.ok) {
      toast(action === "accept" ? "Accepted — slot confirmed" : "Request declined");
      loadMyRequests();
    } else if (res.status === 409) {
      toast(`Slot conflict: ${data.message}`, "error");
    } else {
      toast(data.message || "Something went wrong", "error");
    }
  } catch (err) { toast(err.message, "error"); }
}

// ── Toast ──
let toastTimer;
function toast(msg, type = "") {
  const el = $("toast");
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 3500);
}

// ── Start ──
window.addEventListener("DOMContentLoaded", async () => {
  renderAuthForm();
  loadSession();
  if (currentUser) {
    await afterSignIn();
  } else {
    renderChrome();
    switchTab("search");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeHireModal();
});
