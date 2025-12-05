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

const showAllBtn = document.getElementById("showAllBtn");
const showLikedBtn = document.getElementById("showLikedBtn");
const likedSongsListEl = document.getElementById("likedSongsList");
const versionsBarEl = document.getElementById("versionsBar");

let currentSession = null;
let hasPlaylist = false;
let currentFilter = { onlyLiked: false };

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

function prepareSongsForSession(sessionId, iterationIndex, songs) {
  return (songs || []).map((s, idx) => ({
    id: s.id || `${sessionId}-${iterationIndex}-${idx}`,
    title: s.title || "",
    artist: s.artist || "",
    reason: s.reason || "",
    liked: !!s.liked
  }));
}

function getCurrentSongs() {
  if (!currentSession || !currentSession.iterations.length) return [];
  const lastIteration =
    currentSession.iterations[currentSession.iterations.length - 1];
  return lastIteration.songs || [];
}

function renderSongs(songsInput, options = {}) {
  const songs = songsInput || [];
  const showOnlyLiked = !!options.showOnlyLiked;

  songsListEl.innerHTML = "";

  const visibleSongs = showOnlyLiked ? songs.filter((s) => s.liked) : songs;

  if (!visibleSongs.length) {
    const li = document.createElement("li");
    li.textContent = showOnlyLiked ? "(no liked songs yet)" : "(no songs yet)";
    li.style.opacity = "0.7";
    songsListEl.appendChild(li);
    return;
  }

  visibleSongs.forEach((song) => {
    const li = document.createElement("li");

    const card = document.createElement("div");
    card.className = "song-item";
    if (song.liked) card.classList.add("song-item--liked");

    const headerRow = document.createElement("div");
    headerRow.className = "row";

    const textBox = document.createElement("div");
    textBox.style.flex = "1";

    const title = document.createElement("div");
    title.className = "song-title";
    title.textContent = song.title || "(untitled)";

    const artist = document.createElement("div");
    artist.className = "song-artist";
    artist.textContent = song.artist ? song.artist : "Unknown artist";

    textBox.appendChild(title);
    textBox.appendChild(artist);

    const likeBtn = document.createElement("button");
    likeBtn.className = "ghost small song-like-btn";
    likeBtn.textContent = song.liked ? "♥" : "♡";
    likeBtn.setAttribute("aria-pressed", song.liked ? "true" : "false");
    likeBtn.title = song.liked ? "Unlike" : "Like";

    likeBtn.addEventListener("click", () => toggleSongLiked(song));

    headerRow.appendChild(textBox);
    headerRow.appendChild(likeBtn);

    card.appendChild(headerRow);

    if (song.reason) {
      const reason = document.createElement("p");
      reason.className = "song-reason";
      reason.textContent = song.reason;
      card.appendChild(reason);
    }

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
      info.className = "session-info";

      const title = document.createElement("div");
      title.className = "session-title";
      title.textContent = truncateForLabel(session.initialPrompt);

      const meta = document.createElement("div");
      meta.className = "session-meta";
      meta.textContent = `${
        session.iterations.length
      } playlist version${session.iterations.length === 1 ? "" : "s"}`;

      info.appendChild(title);
      info.appendChild(meta);

      info.addEventListener("click", () => loadSessionAsCurrent(session.id));

      const actions = document.createElement("div");
      actions.className = "session-actions";

      const downloadBtn = document.createElement("button");
      downloadBtn.className = "ghost";
      downloadBtn.textContent = "download";
      downloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        downloadSession(session);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "ghost danger";
      deleteBtn.textContent = "x";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteSession(session.id);
      });

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
    "You are a new music discovery assistant. Take the user's description as inspiration for a playlist. No matter whether they input songs or a simple descriptive words try to expand the users music taste by recommending music across many different artists with the understanding that they will come back and tell you which they liked and didnt like. Only respond with a JSON array of song objects. Each object must have keys 'title', 'artist', and 'reason'. 'reason' is 1–2 short sentences about why the song belongs in this playlist. Do not include any text outside the JSON.";
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
      const preparedSongs = prepareSongsForSession(session.id, 0, songs);

      session.iterations.push({
        feedback: "",
        songs: preparedSongs
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

      currentFilter.onlyLiked = false;
      renderSongs(preparedSongs, { showOnlyLiked: false });
      renderVersionsBar();
      srAnnouncer.textContent = `Playlist created with ${preparedSongs.length} songs.`;
      promptInputEl.value = "";
      renderSessions();
      renderLikedSongs();
      return;
    } else {
      if (!currentSession) return;
      const feedback = text;
      songs = await requestPlaylistUpdate(currentSession, feedback);

      const iterationIndex = currentSession.iterations.length;
      const preparedSongs = prepareSongsForSession(
        currentSession.id,
        iterationIndex,
        songs
      );

      currentSession.iterations.push({
        feedback,
        songs: preparedSongs
      });

      const sessions = loadSessions();
      const idx = findSessionIndex(sessions, currentSession.id);
      if (idx !== -1) {
        sessions[idx] = currentSession;
        saveSessions(sessions);
      }

      currentFilter.onlyLiked = false;
      renderSongs(preparedSongs, { showOnlyLiked: false });
      renderVersionsBar();
      srAnnouncer.textContent = `Playlist updated with ${preparedSongs.length} songs.`;
      promptInputEl.value = "";
      renderSessions();
      renderLikedSongs();
    }
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
  currentFilter.onlyLiked = false;

  promptLabelEl.textContent =
    "Tell me songs, moods, or genres to inspire a new playlist.";
  promptInputEl.placeholder =
    "Type songs, vibes, or genres you want this playlist inspired by…";
  promptInputEl.value = "";
  renderSongs([], { showOnlyLiked: false });
  renderVersionsBar();
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

  const deleted = sessions[idx];

  sessions.splice(idx, 1);
  saveSessions(sessions);
  renderSessions();
  renderLikedSongs();

  if (currentSession && deleted && currentSession.id === deleted.id) {
    resetSearch();
  }
}

function clearSessions() {
  if (!confirm("Clear all saved searches?")) return;
  localStorage.removeItem(LS_KEY);
  renderSessions();
  renderLikedSongs();
  resetSearch();
}

function toggleSongLiked(song) {
  song.liked = !song.liked;

  if (currentSession) {
    const sessions = loadSessions();
    const idx = findSessionIndex(sessions, currentSession.id);
    if (idx !== -1) {
      sessions[idx] = currentSession;
      saveSessions(sessions);
    }
  }

  renderSongs(getCurrentSongs(), {
    showOnlyLiked: currentFilter.onlyLiked
  });

  renderLikedSongs();

  srAnnouncer.textContent = song.liked
    ? `Liked ${song.title || "song"}.`
    : `Unliked ${song.title || "song"}.`;
}

function collectAllLikedSongs() {
  const sessions = loadSessions();
  const all = [];

  sessions.forEach((session) => {
    session.iterations.forEach((iter, iterIdx) => {
      (iter.songs || []).forEach((song) => {
        if (song.liked) {
          all.push({
            ...song,
            sourceSessionId: session.id,
            sourcePrompt: session.initialPrompt,
            version: iterIdx + 1
          });
        }
      });
    });
  });

  return all;
}

function renderLikedSongs() {
  likedSongsListEl.innerHTML = "";

  const likedSongs = collectAllLikedSongs();

  if (!likedSongs.length) {
    const li = document.createElement("li");
    li.textContent = "(no liked songs yet)";
    li.style.opacity = "0.7";
    likedSongsListEl.appendChild(li);
    return;
  }

  likedSongs.forEach((song) => {
    const li = document.createElement("li");
    const card = document.createElement("div");
    card.className = "song-item song-item--liked";

    const title = document.createElement("div");
    title.className = "song-title";
    title.textContent = song.title || "(untitled)";

    const artist = document.createElement("div");
    artist.className = "song-artist";
    artist.textContent = song.artist || "Unknown artist";

    const meta = document.createElement("div");
    meta.className = "song-meta";
    meta.textContent = `${truncateForLabel(
      song.sourcePrompt
    )} • v${song.version}`;

    card.appendChild(title);
    card.appendChild(artist);
    card.appendChild(meta);

    if (song.reason) {
      const reason = document.createElement("p");
      reason.className = "song-reason";
      reason.textContent = song.reason;
      card.appendChild(reason);
    }

    li.appendChild(card);
    likedSongsListEl.appendChild(li);
  });
}

function renderVersionsBar() {
  versionsBarEl.innerHTML = "";

  if (!currentSession || !currentSession.iterations || !currentSession.iterations.length) {
    return;
  }

  currentSession.iterations.forEach((iter, idx) => {
    const btn = document.createElement("button");
    btn.className = "version-btn";
    btn.textContent = `v${idx + 1}`;
    btn.setAttribute("data-version", idx);

    if (idx === currentSession.iterations.length - 1) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      document.querySelectorAll(".version-btn").forEach((b) =>
        b.classList.remove("active")
      );
      btn.classList.add("active");

      const songs = currentSession.iterations[idx].songs || [];
      currentFilter.onlyLiked = false;
      showAllBtn.classList.add("active");
      showLikedBtn.classList.remove("active");
      renderSongs(songs, { showOnlyLiked: false });
    });

    versionsBarEl.appendChild(btn);
  });
}

function loadSessionAsCurrent(id) {
  const sessions = loadSessions();
  const idx = findSessionIndex(sessions, id);
  if (idx === -1) return;

  currentSession = sessions[idx];
  hasPlaylist = !!(currentSession.iterations && currentSession.iterations.length);

  if (!hasPlaylist) {
    resetSearch();
    return;
  }

  promptLabelEl.textContent =
    "What did you like or dislike about these songs? What would you like to hear more of next?";
  promptInputEl.placeholder =
    "Share what worked, what didn’t, and what you’d like the next version to lean into…";

  generateBtn.textContent = "Update per my notes";
  resetBtn.disabled = false;

  currentFilter.onlyLiked = false;
  renderSongs(getCurrentSongs(), { showOnlyLiked: false });
  renderVersionsBar();

  srAnnouncer.textContent = "Loaded previous search.";
}

showAllBtn.addEventListener("click", () => {
  currentFilter.onlyLiked = false;
  showAllBtn.classList.add("active");
  showLikedBtn.classList.remove("active");
  renderSongs(getCurrentSongs(), { showOnlyLiked: false });
});

showLikedBtn.addEventListener("click", () => {
  currentFilter.onlyLiked = true;
  showLikedBtn.classList.add("active");
  showAllBtn.classList.remove("active");
  renderSongs(getCurrentSongs(), { showOnlyLiked: true });
});

generateBtn.addEventListener("click", handleGenerateClick);
resetBtn.addEventListener("click", resetSearch);
clearSessionsBtn.addEventListener("click", clearSessions);

window.addEventListener("DOMContentLoaded", () => {
  renderSessions();
  renderSongs([], { showOnlyLiked: false });
  renderVersionsBar();
  renderLikedSongs();
});
