const WORKER_URL = "https://shiny-union-6556.wiya8806.workers.dev/";
const MODEL = "gpt-4.1-mini";
const LS_KEY = "babyNamesHistory";
const srAnnouncer = document.getElementById("srAnnouncer");


const currentNameEl = document.getElementById("currentName");
const feedbackEl     = document.getElementById("feedback");
const generateBtn    = document.getElementById("generateBtn");
const historyListEl  = document.getElementById("historyList");
const exportBtn      = document.getElementById("exportBtn");
const clearBtn       = document.getElementById("clearBtn");

function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}
function lastName(history) {
  return history.length ? history[history.length - 1] : null;
}
function renderHistory() {
  const history = loadHistory();
  historyListEl.innerHTML = "";
  if (!history.length) {
    const li = document.createElement("li");
    li.textContent = "(no names yet)";
    li.style.opacity = "0.7";
    historyListEl.appendChild(li);
    return;
  }
  history.slice().reverse().forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    historyListEl.appendChild(li);
  });
}

function cleanToName(text) {
  if (!text) return "";
  let t = String(text).trim();
  t = t.split("\n")[0].trim();
  t = t.replace(/^["'“”‘’\[\(]+|["'“”‘’\]\)]+$/g, "").trim();
  const words = t.split(/\s+/);
  if (words.length > 4) t = words.slice(0, 3).join(" ");
  return t;
}

async function requestName(last, feedback) {
  const systemMsg =
    "you are a baby name generator, you will only return a baby name no extra text. If the user has any feedback on past baby names it will be put in the user prompt";
  const userMsg =
    `Last Baby Name: ${last ?? "none"}\nFeedback: ${feedback?.trim() || "none"}`;

  const payload = {
    model: MODEL,
    stream: false,
    input: [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg }
    ],
    max_output_tokens: 30
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

  return cleanToName(text) || "(no name returned)";
}

async function generateName() {
  const history = loadHistory();
  const prev = lastName(history);
  const feedback = feedbackEl.value;

  try {
    generateBtn.disabled = true;
    generateBtn.textContent = "generating…";
    currentNameEl.textContent = "Generating…";

    const name = await requestName(prev, feedback);
    currentNameEl.textContent = name;
    srAnnouncer.textContent = `New baby name: ${name}`;


    if (name && name !== "(no name returned)") {
      history.push(name);
      saveHistory(history);
      renderHistory();
    }
  } catch (err) {
    console.error(err);
    currentNameEl.textContent = "Error generating name.";
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "generate";
  }
}

function exportHistory() {
  const history = loadHistory();
  const text = history.join("\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "baby_names_history.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  if (!confirm("Clear all saved baby names?")) return;
  localStorage.removeItem(LS_KEY);
  renderHistory();
  currentNameEl.textContent = "(cleared)";
}

generateBtn.addEventListener("click", generateName);
exportBtn.addEventListener("click", exportHistory);
clearBtn.addEventListener("click", clearHistory);

renderHistory();
window.addEventListener("DOMContentLoaded", () => {
  const history = loadHistory();
  if (history.length) {
    currentNameEl.textContent = history[history.length - 1];
  } else {
    generateName();
  }
});
