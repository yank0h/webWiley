const WORKER_URL = "https://shiny-union-6556.wiya8806.workers.dev/";

const btn = document.getElementById("generateBtn");
const result = document.getElementById("result");

btn.addEventListener("click", async () => {
  const promptText = "generate a really confusing quote and attribute it to a random person with a ridiculous name";

  btn.disabled = true;
  result.textContent = "Generating…";

  try {
    const payload = {
      model: "gpt-4.1-mini",
      stream: false,
      input: [
        {
          role: "system",
          content:
            "Return ONLY the quote and attribution in one line, like: “Confusing thing…” —Ridiculous Name",
        },
        { role: "user", content: promptText },
      ],
      max_output_tokens: 120,
    };

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

    result.textContent = text || "(No text returned)";
  } catch (err) {
    console.error(err);
    result.textContent = "Error: " + (err.message || String(err));
  } finally {
    btn.disabled = false;
  }
});
