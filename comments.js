const ENDPOINT = "https://yclmir.pythonanywhere.com/api/v1/comments/";

const formEl = document.getElementById("commentForm");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("commentList");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#c0392b" : "";
}

function createCommentItem(item) {
  const li = document.createElement("li");

  const nameEl = document.createElement("div");
  const strongEl = document.createElement("strong");
  strongEl.textContent = item.username;
  nameEl.appendChild(strongEl);

  const textEl = document.createElement("div");
  textEl.textContent = item.comment;

  const timeEl = document.createElement("div");
  timeEl.className = "comment-meta";
  timeEl.textContent = item.created_at;

  li.appendChild(nameEl);
  li.appendChild(textEl);
  li.appendChild(timeEl);
  return li;
}

function renderComments(comments) {
  listEl.innerHTML = "";
  if (!comments.length) {
    const emptyLi = document.createElement("li");
    emptyLi.textContent = "No approved comments yet.";
    listEl.appendChild(emptyLi);
    return;
  }

  for (const item of comments) {
    listEl.appendChild(createCommentItem(item));
  }
}

async function loadComments() {
  const response = await fetch(ENDPOINT);
  if (!response.ok) {
    throw new Error("Failed to load comments");
  }

  const payload = await response.json();
  renderComments(payload.comments || []);
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const comment = document.getElementById("comment").value.trim();

  if (!username || !comment) {
    setStatus("Username and comment are required.", true);
    return;
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, comment }),
  });

  if (!response.ok) {
    let errorMessage = "Submit failed";
    try {
      const payload = await response.json();
      errorMessage = payload.message || errorMessage;
    } catch (e) {
      // no-op
    }
    setStatus(errorMessage, true);
    return;
  }

  setStatus("Submitted. Waiting for admin approval before display.");
  document.getElementById("comment").value = "";
  await loadComments();
});

loadComments().catch(() => setStatus("Failed to load comments.", true));
