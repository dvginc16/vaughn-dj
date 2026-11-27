const byId = id => document.getElementById(id);

function setupMusic() {
  const preview = byId("preview");
  const time = byId("cue-time");
  const cueMs = Number(preview.dataset.cueSeconds) * 1000;
  const cueLabel = time.textContent;
  const script = document.createElement("script");
  script.src = "https://w.soundcloud.com/player/api.js";
  script.onload = () => {
    const widget = window.SC.Widget(byId("widget"));
    let playing = false;
    let ready = false;
    let needsCue = true;
    let pending = 0;
    let externalFallback = false;
    let position = cueMs;
    let interacted = false;
    function startOnInteraction(event) {
      if (interacted || playing || !ready || event.target.closest("#preview,[data-jump]")) return;
      widget.play();
    }
    window.addEventListener("click", startOnInteraction);
    window.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") startOnInteraction(event);
    });

    document.querySelectorAll("[data-jump]").forEach(link => {
      link.addEventListener("click", event => {
        if (!ready || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        needsCue = false;
        widget.seekTo(Number(link.dataset.jump) * 1000);
        widget.play();
      });
    });

    function publishPosition(next = position) {
      if (!Number.isFinite(next)) return;
      position = next;
      window.dispatchEvent(new CustomEvent("vaughn:transport", {
        detail: { position, playing }
      }));
    }

    function setPlayback(active) {
      clearTimeout(pending);
      externalFallback = false;
      playing = active;
      publishPosition();
      document.body.classList.toggle("playing", active);
      byId("preview-label").textContent = active ? "Pause the mix" : "Tap for sound";
    }

    widget.bind(SC.Widget.Events.READY, () => {
      if (ready) return;
      ready = true;
      widget.setVolume(85);
      widget.seekTo(cueMs);
      widget.play();
    });
    widget.bind(SC.Widget.Events.PLAY, () => {
      interacted = true;
      if (needsCue) {
        needsCue = false;
        widget.seekTo(cueMs);
      }
      setPlayback(true);
    });
    function progress(event) {
      publishPosition(event.currentPosition);
      const seconds = Math.floor(event.currentPosition / 1000);
      time.textContent = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
    }
    widget.bind(SC.Widget.Events.PLAY_PROGRESS, progress);
    widget.bind(SC.Widget.Events.SEEK, progress);
    widget.bind(SC.Widget.Events.PAUSE, () => setPlayback(false));
    widget.bind(SC.Widget.Events.FINISH, () => {
      setPlayback(false);
      needsCue = true;
      byId("preview-label").textContent = "Replay the break";
      position = cueMs;
      time.textContent = cueLabel;
    });
    preview.addEventListener("click", event => {
      if (!ready || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (playing) { widget.pause(); return; }
      if (needsCue) widget.seekTo(cueMs);
      widget.play();
      clearTimeout(pending);
      pending = setTimeout(() => {
        externalFallback = true;
        byId("preview-label").textContent = "Play on SoundCloud ↗";
      }, 4500);
    });
  };
  document.head.append(script);
}

function setupLove() {
  const key = "vaughn-love-v2";
  const base = "https://abacus.jasoncameron.dev";
  const path = "/vaughn-dj-support/love-2026";
  const button = byId("loveButton");
  const label = byId("love-label");
  const number = byId("loveNumber");
  const status = byId("love-status");
  const format = new Intl.NumberFormat("en-ZA");
  let busy = false;
  let latest = -1;
  let refreshing = false;

  function saved() { return localStorage.getItem(key) === "1"; }
  function updateButton() {
    button.disabled = busy || saved();
    label.textContent = saved() ? "Love received" : busy ? "Sending…" : "Show love";
  }
  function render(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw Error("Invalid total");
    latest = Math.max(latest, value);
    number.textContent = format.format(latest);
  }
  async function count(action) {
    const response = await fetch(base + "/" + action + path, {
      cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(10000)
    });
    if (action === "info" && response.status === 404) return 0;
    if (!response.ok) throw Error("Counter unavailable");
    return (await response.json()).value;
  }
  async function refresh() {
    if (refreshing || document.hidden) return;
    refreshing = true;
    try { render(await count("info")); }
    catch { if (latest < 0) number.textContent = "—"; }
    finally { refreshing = false; }
  }
  refresh();
  setInterval(refresh, 30000);
  document.addEventListener("visibilitychange", refresh);
  try {
    const probe = "vaughn-storage-check";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    updateButton();
  } catch {
    button.disabled = true;
    status.textContent = "Allow browser storage to leave a tap.";
    return;
  }
  async function send() {
    if (saved()) return;
    if (!navigator.onLine) { status.textContent = "Reconnect to leave your tap."; return; }
    try {
      render(await count("hit"));
      localStorage.setItem(key, "1");
      status.textContent = "Thank you.";
    } catch {
      status.textContent = "Couldn’t confirm your tap. Check your connection.";
    }
  }
  button.addEventListener("click", async () => {
    if (busy || saved()) return;
    busy = true;
    updateButton();
    try {
      if (navigator.locks) await navigator.locks.request(key, send);
      else await send();
    } finally {
      busy = false;
      updateButton();
    }
  });
  window.addEventListener("storage", event => {
    if (event.key === key) { updateButton(); refresh(); }
  });
}
setupMusic();
setupLove();