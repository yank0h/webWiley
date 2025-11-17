const WORKER_URL = "https://shiny-union-6556.wiya8806.workers.dev/";
const MODEL = "gpt-4.1-mini";
const LS_KEY = "nmdSessions";

const srAnnouncer = document.getElementById("srAnnouncer");
const promptLabelEl = document.getElementById("promptLabel");
const promptInputEl = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const resetBtn = document.getElementById("resetBtn");
const songsListEl = document.getElementById("songsList");
const sessionListEl = document.getElementById("sessionList");
const clearSessionsBtn = document.getElementById("clearSessionsBtn");

let currentSession = null;
let hasPlaylist = false;

function loadSessions() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

function findSessionIndex(sessions, id) {
  return sessions.findIndex((s) => s.id === id);
}

function truncateForLabel(text) {
  if (!text) return "(empty prompt)";
  const words = text.trim().split(/\s+/);
  const firstTen = words.slice(0, 10);
  const base = firstTen.join(" ");
  const suffix = words.length > 10 ? "…" : "";
  return base + suffix;
}

function makeFilenameFromPrompt(text) {
  const label = truncateForLabel(text);
  const safe = label
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_…]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return (safe || "playlist") + ".json";
}

function renderSongs(songs) {
  songsListEl.innerHTML = "";
  if (!songs.length) {
    const li = document.createElement("li");
    li.textContent = "(no songs yet)";
    li.style.opacity = "0.7";
    songsListEl.appendChild(li);
    return;
  }
  songs.forEach((song) => {
    const li = document.createElement("li");
    const card = document.createElement("div");
    card.className = "song-item";

    const title = document.createElement("div");
    title.className = "song-title";
    title.textContent = song.title || "(untitled)";

    const artist = document.createElement("div");
    artist.className = "song-artist";
    artist.textContent = song.artist ? song.artist : "Unknown artist";

    const reason = document.createElement("p");
    reason.className = "song-reason";
    reason.textContent = song.reason || "";

    card.appendChild(title);
    card.appendChild(artist);
    if (song.reason) card.appendChild(reason);

    li.appendChild(card);
    songsListEl.appendChild(li);
  });
}

function renderSessions() {
  const sessions = loadSessions();
  sessionListEl.innerHTML = "";
  if (!sessions.length) {
    const li = document.createElement("li");
    li.textContent = "(no past searches yet)";
    li.style.opacity = "0.7";
    sessionListEl.appendChild(li);
    return;
  }

  sessions
    .slice()
    .reverse()
    .forEach((session) => {
      const li = document.createElement("li");

      const info = document.createElement("div");
      const title = document.createElement("div");
      title.className = "session-title";
      title.textContent = truncateForLabel(session.initialPrompt);

      const meta = document.createElement("div");
      meta.className = "session-meta";
      meta.textContent = `${session.iterations.length} playlist version${session.iterations.length === 1 ? "" : "s"}`;

      info.appendChild(title);
      info.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "session-actions";

      const downloadBtn = document.createElement("button");
      downloadBtn.className = "ghost";
      downloadBtn.textContent = "download";
      downloadBtn.addEventListener("click", () => downloadSession(session));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "ghost danger";
      deleteBtn.textContent = "x";
      deleteBtn.addEventListener("click", () => deleteSession(session.id));

      actions.appendChild(downloadBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(info);
      li.appendChild(actions);
      sessionListEl.appendChild(li);
    });
}

function normalizeSongArray(arr) {
  return arr
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const title = (item.title || item.name || "").toString().trim();
      const artist = (item.artist || "").toString().trim();
      const reason = (item.reason || item.why || "").toString().trim();
      if (!title && !artist && !reason) return null;
      return { title, artist, reason };
    })
    .filter(Boolean);
}

function parseSongsFromText(raw) {
  if (!raw) return [];
  let t = String(raw).trim();
  t = t.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return normalizeSongArray(parsed);
    if (Array.isArray(parsed.songs)) return normalizeSongArray(parsed.songs);
  } catch {}
  const match = t.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return normalizeSongArray(parsed);
    } catch {}
  }
  return [];
}

async function requestPlaylistInitial(inspiration) {
  const systemMsg =
    "You are a new music discovery assistant. Take the user's description as inspiration for a playlist. Only respond with a JSON array of song objects. Each object must have keys 'title', 'artist', and 'reason'. 'reason' is 1–2 short sentences about why the song belongs in this playlist. Do not include any text outside the JSON.";
  const userMsg = inspiration;

  const payload = {
    model: MODEL,
    stream: false,
    input: [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg }
    ],
    max_output_tokens: 512
  };

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}). ${errText}`);
  }

  const data = await res.json();
  let text = "";

  if (typeof data.output_text === "string") {
    text = data.output_text;
  } else if (Array.isArray(data.output)) {
    const blocks = [];
    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c && (c.text || c.output_text)) blocks.push(c.text || c.output_text);
        }
      }
    }
    text = blocks.filter(Boolean).join(" ").trim();
  } else if (data.choices?.[0]?.message?.content) {
    text = data.choices[0].message.content;
  }

  return parseSongsFromText(text);
}

async function requestPlaylistUpdate(session, feedback) {
  const lastIteration = session.iterations[session.iterations.length - 1];
  const songs = lastIteration?.songs || [];

  const previousList = songs
    .map((s, idx) => `${idx + 1}. ${s.title || "?"} – ${s.artist || "?"}`)
    .join("\n");

  const systemMsg =
    "You are a new music discovery assistant refining a playlist over multiple passes. Use the original inspiration, the previous playlist, and the user's feedback to create a new set of songs. Only respond with a JSON array of song objects with keys 'title', 'artist', and 'reason'. 'reason' is 1–2 short sentences about why the song belongs in this playlist. Do not include any text outside the JSON.";
  const userMsg =
    `Original inspiration:\n${session.initialPrompt}\n\n` +
    `Previous playlist:\n${previousList || "(none)"}\n\n` +
    `User feedback on this playlist:\n${feedback || "none"}`;

  const payload = {
    model: MODEL,
    stream: false,
    input: [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg }
    ],
    max_output_tokens: 640
  };

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}). ${errText}`);
  }

  const data = await res.json();
  let text = "";

  if (typeof data.output_text === "string") {
    text = data.output_text;
  } else if (Array.isArray(data.output)) {
    const blocks = [];
    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c && (c.text || c.output_text)) blocks.push(c.text || c.output_text);
        }
      }
    }
    text = blocks.filter(Boolean).join(" ").trim();
  } else if (data.choices?.[0]?.message?.content) {
    text = data.choices[0].message.content;
  }

  return parseSongsFromText(text);
}

async function handleGenerateClick() {
  const text = promptInputEl.value.trim();

  if (!hasPlaylist && !text) {
    promptInputEl.focus();
    return;
  }

  try {
    generateBtn.disabled = true;
    resetBtn.disabled = true;
    generateBtn.textContent = hasPlaylist ? "Updating…" : "Generating…";
    srAnnouncer.textContent = hasPlaylist ? "Updating playlist" : "Generating playlist";

    let songs;

    if (!hasPlaylist) {
      const inspiration = text;
      const session = {
        id: String(Date.now()),
        initialPrompt: inspiration,
        createdAt: new Date().toISOString(),
        iterations: []
      };
      songs = await requestPlaylistInitial(inspiration);
      session.iterations.push({
        feedback: "",
        songs
      });
      currentSession = session;
      const sessions = loadSessions();
      sessions.push(currentSession);
      saveSessions(sessions);
      hasPlaylist = true;
      promptLabelEl.textContent =
        "What did you like or dislike about these songs? What would you like to hear more of next?";
      promptInputEl.placeholder =
        "Share what worked, what didn’t, and what you’d like the next version to lean into…";
      generateBtn.textContent = "Update per my notes";
      resetBtn.disabled = false;
    } else {
      if (!currentSession) return;
      const feedback = text;
      songs = await requestPlaylistUpdate(currentSession, feedback);
      currentSession.iterations.push({
        feedback,
        songs
      });
      const sessions = loadSessions();
      const idx = findSessionIndex(sessions, currentSession.id);
      if (idx !== -1) {
        sessions[idx] = currentSession;
        saveSessions(sessions);
      }
    }

    renderSongs(songs);
    srAnnouncer.textContent = `Playlist updated with ${songs.length} songs.`;
    promptInputEl.value = "";
    renderSessions();
  } catch (err) {
    console.error(err);
    srAnnouncer.textContent = "Error generating playlist.";
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = hasPlaylist ? "Update per my notes" : "Generate playlist";
    resetBtn.disabled = !hasPlaylist;
  }
}

function resetSearch() {
  currentSession = null;
  hasPlaylist = false;
  promptLabelEl.textContent =
    "Tell me songs, moods, or genres to inspire a new playlist.";
  promptInputEl.placeholder =
    "Type songs, vibes, or genres you want this playlist inspired by…";
  promptInputEl.value = "";
  songsListEl.innerHTML = "";
  const li = document.createElement("li");
  li.textContent = "(no songs yet)";
  li.style.opacity = "0.7";
  songsListEl.appendChild(li);
  generateBtn.textContent = "Generate playlist";
  resetBtn.disabled = true;
  srAnnouncer.textContent = "Started a fresh search.";
}

function downloadSession(session) {
  const data = JSON.stringify(session, null, 2);
  const blob = new Blob([data], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = makeFilenameFromPrompt(session.initialPrompt);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function deleteSession(id) {
  const sessions = loadSessions();
  const idx = findSessionIndex(sessions, id);
  if (idx === -1) return;
  sessions.splice(idx, 1);
  saveSessions(sessions);
  renderSessions();
}

function clearSessions() {
  if (!confirm("Clear all saved searches?")) return;
  localStorage.removeItem(LS_KEY);
  renderSessions();
}

generateBtn.addEventListener("click", handleGenerateClick);
resetBtn.addEventListener("click", resetSearch);
clearSessionsBtn.addEventListener("click", clearSessions);

window.addEventListener("DOMContentLoaded", () => {
  renderSessions();
  renderSongs([]);
});
