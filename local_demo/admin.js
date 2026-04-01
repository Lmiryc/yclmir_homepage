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
  statusEl.style.color = isError ? "#c0392b" : "#2c3e50";
}

function parseError(payload, fallback) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  return payload.message || fallback;
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
  if (payload.loggedIn) {
    whoamiEl.textContent = `Admin logged in as: ${payload.username}`;
    return true;
  }
  whoamiEl.textContent = "Admin not logged in";
  return false;
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
    const li = document.createElement("li");
    li.innerHTML = `
      <div><strong>${item.username}</strong></div>
      <div>${item.comment}</div>
      <div>${item.created_at}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
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

    actions.appendChild(approveBtn);
    actions.appendChild(deleteBtn);
    li.appendChild(actions);
    pendingListEl.appendChild(li);
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
  await refreshSession();
  await loadPending();
});

checkSessionBtnEl.addEventListener("click", async () => {
  const loggedIn = await refreshSession();
  if (loggedIn) {
    setStatus("Admin session is active.");
  } else {
    setStatus("Admin not logged in.", true);
  }
});

refreshPendingBtnEl.addEventListener("click", async () => {
  await loadPending();
});

logoutBtnEl.addEventListener("click", async () => {
  const { response, payload } = await requestJson(LOGOUT_ENDPOINT, { method: "POST" });
  if (!response.ok) {
    setStatus(parseError(payload, "Logout failed"), true);
    return;
  }
  setStatus("Admin logged out.");
  await refreshSession();
  renderPending([]);
});

refreshSession().catch(() => {
  setStatus("Failed to initialize admin page.", true);
});