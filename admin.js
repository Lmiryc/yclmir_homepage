const API_BASE = "https://yclmir.pythonanywhere.com/api/v1";
const LOGIN_ENDPOINT = `${API_BASE}/admin/login/`;
const LOGOUT_ENDPOINT = `${API_BASE}/admin/logout/`;
const SESSION_ENDPOINT = `${API_BASE}/admin/session/`;
const PENDING_ENDPOINT = `${API_BASE}/admin/comments/pending/`;
const COMMENTS_ENDPOINT = `${API_BASE}/comments/`;

const loginFormEl = document.getElementById("loginForm");
const checkSessionBtnEl = document.getElementById("checkSessionBtn");
const refreshPendingBtnEl = document.getElementById("refreshPendingBtn");
const logoutBtnEl = document.getElementById("logoutBtn");
const whoamiEl = document.getElementById("whoami");
const statusEl = document.getElementById("status");
const pendingListEl = document.getElementById("pendingList");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#c0392b" : "";
}

function parseError(payload, fallback) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  return payload.message || fallback;
}

function setAuthUi(loggedIn, username = "") {
  if (loginFormEl) {
    loginFormEl.classList.toggle("is-hidden", loggedIn);
  }

  if (logoutBtnEl) {
    logoutBtnEl.classList.toggle("is-hidden", !loggedIn);
  }

  if (loggedIn) {
    whoamiEl.textContent = `Current admin user: ${username}`;
  } else {
    whoamiEl.textContent = "Admin not logged in";
  }
}

function isLoggedInPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  return Boolean(payload.loggedIn || payload.logged_in || payload.isLoggedIn);
}

function getUsernamePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  return payload.username || payload.user?.username || payload.admin || "";
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (e) {
    payload = null;
  }

  return { response, payload };
}

async function refreshSession() {
  const { response, payload } = await requestJson(SESSION_ENDPOINT, { method: "GET" });

  if (!response.ok) {
    whoamiEl.textContent = "Admin session check failed";
    return false;
  }

  if (isLoggedInPayload(payload)) {
    setAuthUi(true, getUsernamePayload(payload) || "unknown");
    return true;
  }

  setAuthUi(false);
  return false;
}

function createPendingItem(item) {
  const li = document.createElement("li");

  const userEl = document.createElement("div");
  const strongEl = document.createElement("strong");
  strongEl.textContent = item.username;
  userEl.appendChild(strongEl);

  const commentEl = document.createElement("div");
  commentEl.textContent = item.comment;

  const timeEl = document.createElement("div");
  timeEl.className = "comment-meta";
  timeEl.textContent = item.created_at;

  const actionsEl = document.createElement("div");
  actionsEl.className = "admin-actions";

  const approveBtn = document.createElement("button");
  approveBtn.type = "button";
  approveBtn.className = "admin-action-btn";
  approveBtn.textContent = "Approve";
  approveBtn.addEventListener("click", async () => {
    const { response, payload } = await requestJson(
      `${API_BASE}/admin/comments/${item.commentid}/approve/`,
      { method: "POST" },
    );

    if (!response.ok) {
      setStatus(parseError(payload, "Approve failed"), true);
      return;
    }

    setStatus(`Approved comment #${item.commentid}`);
    await loadPending();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "admin-action-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", async () => {
    const response = await fetch(`${COMMENTS_ENDPOINT}${item.commentid}/`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch (e) {
        payload = null;
      }
      setStatus(parseError(payload, "Delete failed"), true);
      return;
    }

    setStatus(`Deleted comment #${item.commentid}`);
    await loadPending();
  });

  actionsEl.appendChild(approveBtn);
  actionsEl.appendChild(deleteBtn);

  li.appendChild(userEl);
  li.appendChild(commentEl);
  li.appendChild(timeEl);
  li.appendChild(actionsEl);

  return li;
}

function renderPending(comments) {
  pendingListEl.innerHTML = "";

  if (!comments.length) {
    const li = document.createElement("li");
    li.textContent = "No pending comments.";
    pendingListEl.appendChild(li);
    return;
  }

  for (const item of comments) {
    pendingListEl.appendChild(createPendingItem(item));
  }
}

async function loadPending() {
  const { response, payload } = await requestJson(PENDING_ENDPOINT, { method: "GET" });

  if (!response.ok) {
    setStatus(parseError(payload, "Load pending failed"), true);
    return;
  }

  renderPending(payload.comments || []);
}

loginFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const logname = document.getElementById("logname").value.trim();

  const { response, payload } = await requestJson(LOGIN_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ username, logname }),
  });

  if (!response.ok) {
    setStatus(parseError(payload, "Login failed"), true);
    await refreshSession();
    return;
  }

  setStatus("Admin login success.");
  setAuthUi(true, username || "unknown");
  await loadPending();
});

if (checkSessionBtnEl) {
  checkSessionBtnEl.addEventListener("click", async () => {
    const loggedIn = await refreshSession();
    if (loggedIn) {
      setStatus("Admin session is active.");
    } else {
      setStatus("Admin not logged in.", true);
    }
  });
}

if (refreshPendingBtnEl) {
  refreshPendingBtnEl.addEventListener("click", async () => {
    await loadPending();
  });
}

if (logoutBtnEl) {
  logoutBtnEl.addEventListener("click", async () => {
    const { response, payload } = await requestJson(LOGOUT_ENDPOINT, { method: "POST" });

    if (!response.ok) {
      setStatus(parseError(payload, "Logout failed"), true);
      return;
    }

    setStatus("Admin logged out.");
    setAuthUi(false);
    loginFormEl?.reset();
    renderPending([]);
  });
}

setAuthUi(false);

refreshSession().catch(() => {
  setStatus("Failed to initialize admin page.", true);
});
