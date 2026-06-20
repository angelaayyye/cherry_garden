const activities = {
  watch: ["watch together", "movie couch", "synced"],
  read: ["read together", "shared reader", "same page"],
  games: ["play together", "game room", "live moves"],
  solve: ["solve together", "case file", "hard mode"],
  call: ["call together", "live call", "camera ready"],
  draw: ["draw together", "studio", "live canvas"],
};

const room = new BroadcastChannel("cherry-garden-room");
const state = {
  profile: localStorage.getItem("cherry-garden-profile") || "angela",
  presence: {
    angela: { lastSeen: 0, location: "location off", battery: "battery unknown", online: false },
    eric: { lastSeen: 0, location: "location off", battery: "battery unknown", online: false },
  },
  book: "little women",
  page: 0,
  note: "",
  tic: Array(9).fill(""),
  ticTurn: "x",
  memory: [],
  memoryOpen: [],
  memoryMatched: [],
  board: { one: 0, two: 8, turn: "one" },
  chat: [],
  drawTheme: "free draw",
};

const books = {
  "little women": [
    "meg, jo, beth, and amy sat together in the small room, each busy with her own hopes for the evening.",
    "the sisters talked over their plans, laughing softly when one idea became too grand and another too practical.",
    "jo wanted adventure, meg wanted grace, beth wanted peace, and amy wanted something beautiful enough to remember.",
    "by the fire, the night felt smaller and kinder, as if the whole world could wait until morning.",
  ],
  "anne of green gables": [
    "anne looked at the road ahead as if it had been made especially for imagining.",
    "every tree seemed to have a secret name, and every turn seemed to promise a new beginning.",
    "she spoke quickly, then stopped, worried she had said too much, but the quiet only made the place feel gentler.",
    "green gables waited in the distance, soft and strange and almost too lovely to be real.",
  ],
  "the secret garden": [
    "the garden door was hidden by ivy, and the key felt cold and important in mary's hand.",
    "inside, the earth looked asleep, but small green things were already trying to wake.",
    "each day brought another clue: a bird, a sound, a path under old leaves.",
    "the secret was not just the garden. it was what changed when someone cared for it.",
  ],
  "where the red fern grows note": [
    "where the red fern grows is still under copyright, so cherry garden cannot include the full text from an unauthorized source.",
    "you can still read it together by using a legal ebook, library copy, audiobook, or your own licensed file beside this shared page tracker.",
    "paste a legal reader link above, open it, then use cherry garden to sync page, notes, chat, and reactions.",
    "for built-in text, choose one of the public-domain classics in this menu.",
  ],
};

const evidence = {
  texts: [
    "<div class='message-bubble'><strong>8:42 pm · lana</strong><br>did you send kai the blue heart too?</div>",
    "<div class='message-bubble'><strong>8:44 pm · jo</strong><br>no, i was at the cafe with bea.</div>",
    "<div class='message-bubble'><strong>9:18 pm · kai</strong><br>why does your screenshot say 9:11 when my phone says 9:07?</div>",
  ].join(""),
  shots: [
    "<p><strong>screenshot a</strong>: blue heart, cropped top bar, battery at 18%.</p>",
    "<p><strong>screenshot b</strong>: same blue heart, full top bar, battery at 31%.</p>",
    "<p><strong>oddity</strong>: the cafe reflection appears in both screenshots, but only jo posted from that cafe.</p>",
  ].join(""),
  timeline: [
    "<p><strong>8:40</strong> bea leaves group call.</p>",
    "<p><strong>8:42</strong> lana asks about the blue heart.</p>",
    "<p><strong>9:07</strong> kai receives the original message.</p>",
    "<p><strong>9:11</strong> forged screenshot timestamp appears.</p>",
    "<p><strong>9:18</strong> kai notices the mismatch.</p>",
  ].join(""),
  suspects: [
    "<p><strong>bea</strong>: offline during the message window.</p>",
    "<p><strong>kai</strong>: received, did not send, the original.</p>",
    "<p><strong>jo</strong>: had the cafe reflection, wrong timestamp, and deleted thread.</p>",
  ].join(""),
};

const themes = ["moon bakery", "lost ring", "rainy bus stop", "secret picnic", "tiny haunted cafe", "airport reunion"];
const memorySymbols = ["m", "m", "r", "r", "s", "s", "b", "b", "d", "d", "c", "c"];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function sync(type, payload) {
  room.postMessage({ type, payload });
  localStorage.setItem("cherry-garden-last", JSON.stringify({ type, payload, stamp: Date.now() }));
}

room.addEventListener("message", (event) => {
  applyRemote(event.data.type, event.data.payload);
});

window.addEventListener("storage", (event) => {
  if (event.key !== "cherry-garden-last" || !event.newValue) return;
  const message = JSON.parse(event.newValue);
  applyRemote(message.type, message.payload);
});

function applyRemote(type, payload) {
  if (type === "chat") addMessage(payload.name, payload.text, false);
  if (type === "watch-chat") addWatchMessage(payload.name, payload.text, false);
  if (type === "movie") applyMovie(payload);
  if (type === "call") applyCall(payload);
  if (type === "book") applyBook(payload);
  if (type === "note") $("#sharedBookNote").value = payload;
  if (type === "tic") applyTic(payload);
  if (type === "memory") applyMemory(payload);
  if (type === "board") applyBoard(payload);
  if (type === "draw") drawLine(payload, false);
  if (type === "clear-canvas") clearCanvas(false);
  if (type === "theme") setTheme(payload, false);
  if (type === "evidence") showEvidence(payload, false);
  if (type === "presence") applyPresence(payload);
}

function showToast(text) {
  const toast = $("#toast");
  toast.textContent = text.toLowerCase();
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 1300);
}

$$(".activity").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.activity;
    $$(".activity").forEach((item) => {
      item.classList.toggle("is-active", item === button);
      item.setAttribute("aria-selected", item === button ? "true" : "false");
    });
    $$(".mode-view").forEach((view) => view.classList.toggle("is-visible", view.id === key));
    $("#modeType").textContent = activities[key][0];
    $("#modeTitle").textContent = activities[key][1];
    $("#modeStatus").textContent = activities[key][2];
    if (key === "draw") resizeCanvas();
    if (key === "call") updateCallLink();
  });
});

$("#inviteButton").addEventListener("click", async () => {
  const invite = location.href;
  try {
    await navigator.clipboard.writeText(invite);
    showToast("invite copied");
  } catch {
    showToast("copy this page link");
  }
});

const profileSelect = $("#profileSelect");
const homeProfile = $("#homeProfile");
const welcomeName = $("#welcomeName");
profileSelect.value = state.profile;
homeProfile.value = state.profile;
welcomeName.textContent = state.profile;

homeProfile.addEventListener("change", () => {
  state.profile = homeProfile.value;
  profileSelect.value = state.profile;
  welcomeName.textContent = state.profile;
  localStorage.setItem("cherry-garden-profile", state.profile);
});

$("#enterGarden").addEventListener("click", () => {
  state.profile = homeProfile.value;
  profileSelect.value = state.profile;
  localStorage.setItem("cherry-garden-profile", state.profile);
  document.body.classList.remove("before-room");
  document.body.classList.add("in-room");
  playWelcomeChatter();
  updatePresence({ online: true });
});

profileSelect.addEventListener("change", () => {
  state.profile = profileSelect.value;
  homeProfile.value = state.profile;
  welcomeName.textContent = state.profile;
  localStorage.setItem("cherry-garden-profile", state.profile);
  updatePresence({ online: true });
  renderPresence();
  showToast(`this device is ${state.profile}`);
});

function playWelcomeChatter() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const audio = new AudioContextClass();
  const notes = [620, 780, 700, 920, 760, 680, 860, 720, 980, 800, 660, 880];
  notes.forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(audio.destination);
    const start = audio.currentTime + index * 0.035;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.06, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.03);
    oscillator.start(start);
    oscillator.stop(start + 0.034);
  });
}

function updatePresence(patch = {}) {
  const person = state.profile;
  state.presence[person] = {
    ...state.presence[person],
    ...patch,
    online: patch.online ?? document.visibilityState === "visible",
    lastSeen: Date.now(),
  };
  renderPresence();
  sync("presence", { person, data: state.presence[person] });
}

function applyPresence(payload) {
  state.presence[payload.person] = {
    ...state.presence[payload.person],
    ...payload.data,
  };
  renderPresence();
}

function renderPresence() {
  ["angela", "eric"].forEach((person) => {
    const data = state.presence[person];
    const activeText = data.online ? "online now" : `last active ${relativeTime(data.lastSeen)}`;
    $(`#${person}Status`).textContent = activeText;
    $(`#${person}Meta`).textContent = `${data.location} · ${data.battery}`;
    $(`#banner${person[0].toUpperCase()}${person.slice(1)}`).textContent = `${data.location} · ${data.battery} · ${activeText}`;
    $(`[data-person-card="${person}"]`).classList.toggle("is-self", person === state.profile);
  });
}

function relativeTime(stamp) {
  if (!stamp) return "not synced yet";
  const seconds = Math.max(1, Math.round((Date.now() - stamp) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function formatLocation(position) {
  const lat = position.coords.latitude.toFixed(3);
  const lon = position.coords.longitude.toFixed(3);
  return `${lat}, ${lon}`;
}

function requestLocationSync() {
  if (!navigator.geolocation) {
    $("#presenceNote").textContent = "location is not available in this browser.";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      updatePresence({ location: formatLocation(position) });
      $("#presenceNote").textContent = "location synced.";
      showToast("location synced");
    },
    () => {
      $("#presenceNote").textContent = "location permission was not shared.";
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
  );
}

$("#syncLocation").addEventListener("click", requestLocationSync);
$("#syncLocationBanner").addEventListener("click", requestLocationSync);

async function watchBattery() {
  if (!navigator.getBattery) {
    updatePresence({ battery: "battery unavailable" });
    return;
  }
  const battery = await navigator.getBattery();
  const publish = () => {
    const level = Math.round(battery.level * 100);
    const charging = battery.charging ? "charging" : "not charging";
    updatePresence({ battery: `${level}% · ${charging}` });
  };
  battery.addEventListener("levelchange", publish);
  battery.addEventListener("chargingchange", publish);
  publish();
}

document.addEventListener("visibilitychange", () => updatePresence());
window.addEventListener("focus", () => updatePresence({ online: true }));
window.addEventListener("beforeunload", () => updatePresence({ online: false }));
window.setInterval(() => {
  if (document.visibilityState === "visible") {
    updatePresence({ online: true });
    return;
  }
  renderPresence();
}, 30000);

const moviePlayer = $("#moviePlayer");

$("#loadMovie").addEventListener("click", () => {
  const url = $("#movieUrl").value.trim();
  if (!url) return showToast("add a movie url");
  moviePlayer.src = url;
  sync("movie", { action: "load", src: url });
  $("#movieState").textContent = "movie loaded for the room.";
});

$("#movieFile").addEventListener("change", () => {
  const file = $("#movieFile").files[0];
  if (!file) return;
  moviePlayer.src = URL.createObjectURL(file);
  $("#movieState").textContent = "local file loaded here. for distance sync, both people need the same legal file or a shared url.";
});

$("#moviePlay").addEventListener("click", () => {
  moviePlayer.play();
  sync("movie", { action: "play", time: moviePlayer.currentTime });
});

$("#moviePause").addEventListener("click", () => {
  moviePlayer.pause();
  sync("movie", { action: "pause", time: moviePlayer.currentTime });
});

$("#movieSync").addEventListener("click", () => {
  sync("movie", { action: "time", time: moviePlayer.currentTime });
  showToast("movie time synced");
});

function applyMovie(payload) {
  if (payload.action === "load") moviePlayer.src = payload.src;
  if (Number.isFinite(payload.time)) moviePlayer.currentTime = payload.time;
  if (payload.action === "play") moviePlayer.play().catch(() => {});
  if (payload.action === "pause") moviePlayer.pause();
  if (payload.action === "time") $("#movieState").textContent = "movie time synced from partner.";
}

const watchForm = $("#watchForm");
const watchInput = $("#watchInput");
const watchMessages = $("#watchMessages");

watchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = watchInput.value.trim().toLowerCase();
  if (!text) return;
  addWatchMessage(state.profile, text);
  sync("watch-chat", { name: state.profile, text });
  watchInput.value = "";
});

function addWatchMessage(name, text, shouldScroll = true) {
  const message = document.createElement("p");
  message.innerHTML = `<strong>${escapeHtml(name)}</strong> ${escapeHtml(text)}`;
  watchMessages.append(message);
  if (shouldScroll) watchMessages.scrollTop = watchMessages.scrollHeight;
}

const localCallVideo = $("#localCallVideo");
let callStream = null;
let micMuted = false;
let callFilter = "none";

function updateCallLink() {
  $("#facetimeLink").href = "facetime://";
}

$("#startCall").addEventListener("click", async () => {
  try {
    callStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localCallVideo.srcObject = callStream;
    $("#callState").textContent = "camera on. open facetime for the real two-person call.";
    sync("call", { person: state.profile, status: `${state.profile} has camera on` });
  } catch {
    $("#callState").textContent = "camera or mic permission was not shared.";
  }
});

$("#muteCall").addEventListener("click", () => {
  if (!callStream) return showToast("start camera first");
  micMuted = !micMuted;
  callStream.getAudioTracks().forEach((track) => {
    track.enabled = !micMuted;
  });
  $("#muteCall").textContent = micMuted ? "unmute mic" : "mute mic";
  sync("call", { person: state.profile, status: micMuted ? `${state.profile} muted` : `${state.profile} unmuted` });
});

$("#closeCamera").addEventListener("click", () => {
  if (!callStream) return showToast("camera already closed");
  callStream.getVideoTracks().forEach((track) => track.stop());
  localCallVideo.srcObject = null;
  $("#callState").textContent = "camera closed. mic can stay connected if it is still on.";
  sync("call", { person: state.profile, status: `${state.profile} closed camera` });
});

$("#stopCall").addEventListener("click", () => {
  if (callStream) {
    callStream.getTracks().forEach((track) => track.stop());
    callStream = null;
  }
  localCallVideo.srcObject = null;
  $("#callState").textContent = "call ended on this device.";
  sync("call", { person: state.profile, status: `${state.profile} ended camera` });
});

function applyCall(payload) {
  $("#partnerCallStatus").textContent = payload.status;
}

$$("[data-call-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    callFilter = button.dataset.callFilter;
    $$("[data-call-filter]").forEach((item) => item.classList.toggle("is-picked", item === button));
    localCallVideo.classList.remove("filter-warm", "filter-dream", "filter-mono");
    if (callFilter !== "none") localCallVideo.classList.add(`filter-${callFilter}`);
    sendRemote({ type: "call-filter", person: state.profile, filter: callFilter });
  });
});

$("#takePhoto").addEventListener("click", () => {
  if (!localCallVideo.srcObject) return showToast("start camera first");
  const canvas = $("#photoCanvas");
  const context = canvas.getContext("2d");
  context.filter = getCanvasFilter(callFilter);
  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(localCallVideo, 0, 0, canvas.width, canvas.height);
  context.restore();
  const dataUrl = canvas.toDataURL("image/png");
  renderPhoto(dataUrl, "self");
  sendRemote({ type: "photo", dataUrl });
  showToast("photo snapped");
});

function getCanvasFilter(filterName) {
  if (filterName === "warm") return "sepia(28%) saturate(120%) brightness(105%)";
  if (filterName === "dream") return "saturate(90%) brightness(112%) contrast(88%) blur(0.4px)";
  if (filterName === "mono") return "grayscale(100%) contrast(95%) brightness(105%)";
  return "none";
}

function renderPhoto(dataUrl, owner) {
  const slots = $("#photoStrip").querySelectorAll(".photo-slot");
  const slot = owner === "self" ? slots[0] : slots[1];
  slot.innerHTML = "";
  const image = document.createElement("img");
  image.alt = owner === "self" ? "your photobooth picture" : "partner photobooth picture";
  image.src = dataUrl;
  slot.append(image);
}

Object.keys(books).forEach((title) => {
  const option = document.createElement("option");
  option.value = title;
  option.textContent = title;
  $("#bookSelect").append(option);
});

function renderBook() {
  const pages = books[state.book];
  $("#bookTitle").textContent = state.book;
  $("#readPage").textContent = `page ${state.page + 1} of ${pages.length}`;
  $("#readerText").textContent = pages[state.page];
}

$("#bookSelect").addEventListener("change", () => {
  state.book = $("#bookSelect").value;
  state.page = 0;
  renderBook();
  sync("book", { book: state.book, page: state.page });
});

$("#prevPage").addEventListener("click", () => {
  state.page = Math.max(0, state.page - 1);
  renderBook();
  sync("book", { book: state.book, page: state.page });
});

$("#nextPage").addEventListener("click", () => {
  state.page = Math.min(books[state.book].length - 1, state.page + 1);
  renderBook();
  sync("book", { book: state.book, page: state.page });
});

$("#openBookUrl").addEventListener("click", () => {
  const url = $("#bookUrl").value.trim();
  if (!url) return showToast("paste a legal book url");
  window.open(url, "_blank", "noopener");
});

$("#sharedBookNote").addEventListener("input", () => {
  sync("note", $("#sharedBookNote").value);
});

function applyBook(payload) {
  state.book = payload.book;
  state.page = payload.page;
  $("#bookSelect").value = state.book;
  renderBook();
}

$$("[data-game-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.gameMode;
    $$("[data-game-mode]").forEach((item) => item.classList.toggle("is-picked", item === button));
    $$(".game-pane").forEach((pane) => pane.classList.toggle("is-visible", pane.id === `${mode}Game`));
  });
});

function renderTic() {
  $("#ticGrid").innerHTML = "";
  state.tic.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = value;
    button.addEventListener("click", () => playTic(index));
    $("#ticGrid").append(button);
  });
  const winner = ticWinner();
  $("#ticStatus").textContent = winner ? `${winner} wins` : `${state.ticTurn} turn`;
}

function playTic(index) {
  if (state.tic[index] || ticWinner()) return;
  state.tic[index] = state.ticTurn;
  state.ticTurn = state.ticTurn === "x" ? "o" : "x";
  renderTic();
  sync("tic", { board: state.tic, turn: state.ticTurn });
}

function ticWinner() {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const line = lines.find(([a, b, c]) => state.tic[a] && state.tic[a] === state.tic[b] && state.tic[a] === state.tic[c]);
  return line ? state.tic[line[0]] : "";
}

function applyTic(payload) {
  state.tic = payload.board;
  state.ticTurn = payload.turn;
  renderTic();
}

$("#resetTic").addEventListener("click", () => {
  applyTic({ board: Array(9).fill(""), turn: "x" });
  sync("tic", { board: state.tic, turn: state.ticTurn });
});

function shuffleMemory() {
  state.memory = [...memorySymbols].sort(() => Math.random() - 0.5);
  state.memoryOpen = [];
  state.memoryMatched = [];
  renderMemory();
  sync("memory", state);
}

function renderMemory() {
  $("#memoryGrid").innerHTML = "";
  state.memory.forEach((symbol, index) => {
    const button = document.createElement("button");
    button.type = "button";
    const visible = state.memoryOpen.includes(index) || state.memoryMatched.includes(index);
    button.textContent = visible ? symbol : "";
    button.classList.toggle("matched", state.memoryMatched.includes(index));
    button.addEventListener("click", () => flipMemory(index));
    $("#memoryGrid").append(button);
  });
  $("#memoryStatus").textContent = `${state.memoryMatched.length / 2} pairs found`;
}

function flipMemory(index) {
  if (state.memoryMatched.includes(index) || state.memoryOpen.includes(index)) return;
  state.memoryOpen.push(index);
  if (state.memoryOpen.length === 2) {
    const [a, b] = state.memoryOpen;
    if (state.memory[a] === state.memory[b]) state.memoryMatched.push(a, b);
    window.setTimeout(() => {
      state.memoryOpen = [];
      renderMemory();
      sync("memory", state);
    }, 650);
  }
  renderMemory();
  sync("memory", state);
}

function applyMemory(payload) {
  state.memory = payload.memory;
  state.memoryOpen = payload.memoryOpen;
  state.memoryMatched = payload.memoryMatched;
  renderMemory();
}

$("#resetMemory").addEventListener("click", shuffleMemory);

let reactionStart = 0;
let reactionTimer;
$("#reactionPad").addEventListener("click", () => {
  const pad = $("#reactionPad");
  if (pad.classList.contains("go")) {
    const result = Date.now() - reactionStart;
    pad.classList.remove("go");
    pad.textContent = "start";
    $("#reactionStatus").textContent = `${result} ms reaction`;
    sync("chat", { name: "game", text: `reaction time: ${result} ms` });
    return;
  }
  pad.textContent = "wait...";
  $("#reactionStatus").textContent = "do not tap yet.";
  clearTimeout(reactionTimer);
  reactionTimer = setTimeout(() => {
    reactionStart = Date.now();
    pad.classList.add("go");
    pad.textContent = "tap now";
  }, 900 + Math.random() * 1700);
});

$$("[data-local-game]").forEach((card) => {
  card.addEventListener("click", (event) => {
    event.preventDefault();
    const title = card.querySelector("strong").textContent;
    loadRemoteGame(card.dataset.localGame, title);
    sendRemote({ type: "game", src: card.dataset.localGame, title });
    showToast(`${title} opened`);
  });
});

function loadRemoteGame(src, title) {
  $("#webGameFrame").removeAttribute("srcdoc");
  $("#webGameFrame").src = src;
  $("#webGameStatus").textContent = `loaded: ${title} from the offline html games pack.`;
}

let gameMuted = false;
let gameVolume = 0.7;

function applyGameAudio() {
  const frame = $("#webGameFrame");
  try {
    const media = frame.contentDocument.querySelectorAll("audio, video");
    media.forEach((item) => {
      item.muted = gameMuted;
      item.volume = gameMuted ? 0 : gameVolume;
    });
    $("#webGameStatus").textContent = gameMuted
      ? "game audio muted."
      : `game volume set to ${Math.round(gameVolume * 100)}%.`;
  } catch {
    $("#webGameStatus").textContent = "this game controls audio internally, so browser volume may not apply.";
  }
}

$("#webGameFrame").addEventListener("load", () => {
  window.setTimeout(applyGameAudio, 350);
});

$("#muteGame").addEventListener("click", () => {
  gameMuted = !gameMuted;
  $("#muteGame").textContent = gameMuted ? "unmute game" : "mute game";
  applyGameAudio();
});

$("#gameVolume").addEventListener("input", () => {
  gameVolume = Number($("#gameVolume").value) / 100;
  if (gameVolume > 0) {
    gameMuted = false;
    $("#muteGame").textContent = "mute game";
  }
  applyGameAudio();
});

$("#fullscreenGame").addEventListener("click", () => {
  const frame = $("#webGameFrame");
  if (frame.requestFullscreen) {
    frame.requestFullscreen();
  }
});

let peerConnection = null;
let remoteChannel = null;

function makePeer() {
  if (!window.RTCPeerConnection) {
    $("#remoteStatus").textContent = "not supported";
    throw new Error("webrtc unavailable");
  }
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  peerConnection.addEventListener("connectionstatechange", () => {
    $("#remoteStatus").textContent = peerConnection.connectionState;
  });
  peerConnection.addEventListener("datachannel", (event) => setupRemoteChannel(event.channel));
}

function setupRemoteChannel(channel) {
  remoteChannel = channel;
  remoteChannel.addEventListener("open", () => {
    $("#remoteStatus").textContent = "connected";
  });
  remoteChannel.addEventListener("close", () => {
    $("#remoteStatus").textContent = "closed";
  });
  remoteChannel.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "game") loadRemoteGame(message.src, message.title);
    if (message.type === "key") pressGameKey(message.key);
    if (message.type === "photo") renderPhoto(message.dataUrl, "partner");
    if (message.type === "call-filter") $("#partnerCallStatus").textContent = `${message.person} chose ${message.filter} filter`;
  });
}

function sendRemote(message) {
  if (remoteChannel?.readyState === "open") {
    remoteChannel.send(JSON.stringify(message));
  }
}

async function waitForIceGathering() {
  if (peerConnection.iceGatheringState === "complete") return;
  await new Promise((resolve) => {
    peerConnection.addEventListener("icegatheringstatechange", () => {
      if (peerConnection.iceGatheringState === "complete") resolve();
    });
    window.setTimeout(resolve, 1800);
  });
}

$("#createOffer").addEventListener("click", async () => {
  makePeer();
  setupRemoteChannel(peerConnection.createDataChannel("cherry-game"));
  await peerConnection.setLocalDescription(await peerConnection.createOffer());
  await waitForIceGathering();
  $("#localSignal").value = JSON.stringify(peerConnection.localDescription);
  $("#remoteStatus").textContent = "send invite code";
});

$("#acceptOffer").addEventListener("click", async () => {
  makePeer();
  const offer = JSON.parse($("#remoteSignal").value);
  await peerConnection.setRemoteDescription(offer);
  await peerConnection.setLocalDescription(await peerConnection.createAnswer());
  await waitForIceGathering();
  $("#localSignal").value = JSON.stringify(peerConnection.localDescription);
  $("#remoteStatus").textContent = "send answer code";
});

$("#acceptAnswer").addEventListener("click", async () => {
  const answer = JSON.parse($("#remoteSignal").value);
  await peerConnection.setRemoteDescription(answer);
  $("#remoteStatus").textContent = "connecting";
});

function pressGameKey(key) {
  const frame = $("#webGameFrame").contentWindow;
  const code = key === " " ? "Space" : key;
  ["keydown", "keyup"].forEach((type) => {
    frame.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }));
  });
}

document.addEventListener("keydown", (event) => {
  if (!$("#webGame").classList.contains("is-visible")) return;
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) return;
  sendRemote({ type: "key", key: event.key });
});

$$("[data-remote-key]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.remoteKey;
    pressGameKey(key);
    sendRemote({ type: "key", key });
  });
});

function showEvidence(kind, shouldSync = true) {
  $$(".evidence-tabs button").forEach((button) => button.classList.toggle("is-picked", button.dataset.evidence === kind));
  $("#evidenceCard").innerHTML = evidence[kind];
  if (shouldSync) sync("evidence", kind);
}

$$("[data-evidence]").forEach((button) => {
  button.addEventListener("click", () => showEvidence(button.dataset.evidence));
});

$("#checkCase").addEventListener("click", () => {
  const time = $("#solveTime").value.trim();
  const fake = $("#solveFake").value.trim().toLowerCase();
  const culprit = $("#solveCulprit").value.trim().toLowerCase();
  const solved = time === "9:11" && fake === "jo" && culprit === "jo";
  $("#caseResult").textContent = solved
    ? "solved: jo forged the 9:11 screenshot after deleting the original thread."
    : "not yet. compare the timestamp, cafe reflection, and deleted thread.";
});

const boardCells = $$("[data-cell]");
function placeTokens() {
  if (!boardCells.length || !$(".board-game")) return;
  const board = $(".board-game").getBoundingClientRect();
  const oneCell = boardCells[state.board.one].getBoundingClientRect();
  const twoCell = boardCells[state.board.two].getBoundingClientRect();
  $("#tokenOne").style.left = `${oneCell.left - board.left + 10}px`;
  $("#tokenOne").style.top = `${oneCell.top - board.top + 10}px`;
  $("#tokenTwo").style.left = `${twoCell.left - board.left + twoCell.width - 34}px`;
  $("#tokenTwo").style.top = `${twoCell.top - board.top + twoCell.height - 34}px`;
}

function applyBoard(payload) {
  if (!boardCells.length) return;
  state.board = payload;
  $("#diceReadout").textContent = state.board.turn === "one" ? "your turn" : "their turn";
  placeTokens();
}

boardCells.forEach((cell) => {
  cell.addEventListener("click", () => {
    state.board[state.board.turn] = Number(cell.dataset.cell);
    placeTokens();
    sync("board", state.board);
  });
});

if ($("#rollButton")) {
  $("#rollButton").addEventListener("click", () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    state.board[state.board.turn] = Math.min(8, state.board[state.board.turn] + roll);
    $("#diceReadout").textContent = `${state.board.turn === "one" ? "you" : "them"} rolled ${roll}`;
    placeTokens();
    sync("board", state.board);
  });
}

if ($("#passTurn")) {
  $("#passTurn").addEventListener("click", () => {
    state.board.turn = state.board.turn === "one" ? "two" : "one";
    applyBoard(state.board);
    sync("board", state.board);
  });
}

const canvas = $("#drawCanvas");
const context = canvas.getContext("2d");
let drawing = false;
let drawColor = "#818263";
let lastPoint = null;
let duelTimer;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const snapshot = document.createElement("canvas");
  snapshot.width = canvas.width;
  snapshot.height = canvas.height;
  snapshot.getContext("2d").drawImage(canvas, 0, 0);
  canvas.width = Math.max(320, Math.floor(rect.width * devicePixelRatio));
  canvas.height = Math.max(160, Math.floor(rect.height * devicePixelRatio));
  context.drawImage(snapshot, 0, 0, canvas.width, canvas.height);
  context.lineCap = "round";
  context.lineJoin = "round";
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * devicePixelRatio,
    y: (event.clientY - rect.top) * devicePixelRatio,
  };
}

function drawLine(payload, shouldSync = true) {
  context.strokeStyle = payload.color;
  context.lineWidth = 6 * devicePixelRatio;
  context.beginPath();
  context.moveTo(payload.from.x, payload.from.y);
  context.lineTo(payload.to.x, payload.to.y);
  context.stroke();
  if (shouldSync) sync("draw", payload);
}

canvas.addEventListener("pointerdown", (event) => {
  drawing = true;
  lastPoint = canvasPoint(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (!drawing) return;
  const nextPoint = canvasPoint(event);
  drawLine({ from: lastPoint, to: nextPoint, color: drawColor });
  lastPoint = nextPoint;
});

window.addEventListener("pointerup", () => {
  drawing = false;
});

$$(".swatch").forEach((swatch) => {
  swatch.addEventListener("click", () => {
    drawColor = swatch.dataset.color;
    $$(".swatch").forEach((item) => item.classList.toggle("is-picked", item === swatch));
  });
});

function clearCanvas(shouldSync = true) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (shouldSync) sync("clear-canvas", true);
}

$("#clearCanvas").addEventListener("click", () => clearCanvas());

function setTheme(theme, shouldSync = true) {
  state.drawTheme = theme;
  $("#drawTheme").value = theme;
  $("#drawStatus").textContent = `theme is ${theme}. partner guesses in the box.`;
  if (shouldSync) sync("theme", theme);
}

$("#newTheme").addEventListener("click", () => {
  setTheme(themes[Math.floor(Math.random() * themes.length)]);
});

$$("[data-draw-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.drawMode;
    $$("[data-draw-mode]").forEach((item) => item.classList.toggle("is-picked", item === button));
    if (mode === "free") {
      clearInterval(duelTimer);
      $("#drawTimer").textContent = "free";
      setTheme("free draw");
      return;
    }
    setTheme(themes[Math.floor(Math.random() * themes.length)]);
    let seconds = 60;
    $("#drawTimer").textContent = "60s";
    clearInterval(duelTimer);
    duelTimer = setInterval(() => {
      seconds -= 1;
      $("#drawTimer").textContent = `${seconds}s`;
      if (seconds <= 0) {
        clearInterval(duelTimer);
        $("#drawStatus").textContent = "time. reveal the theme and compare guesses.";
      }
    }, 1000);
  });
});

$("#drawGuess").addEventListener("change", () => {
  const guess = $("#drawGuess").value.trim().toLowerCase();
  if (!guess) return;
  sync("chat", { name: "guess", text: guess });
});

const chatForm = $("#chatForm");
const chatInput = $("#chatInput");
const messages = $("#messages");

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim().toLowerCase();
  if (!text) return;
  addMessage(state.profile, text);
  sync("chat", { name: state.profile, text });
  chatInput.value = "";
});

function addMessage(name, text, shouldScroll = true) {
  const message = document.createElement("p");
  message.innerHTML = `<strong>${escapeHtml(name)}</strong> ${escapeHtml(text)}`;
  messages.append(message);
  if (shouldScroll) messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.addEventListener("resize", () => {
  resizeCanvas();
  placeTokens();
});

renderBook();
renderTic();
shuffleMemory();
showEvidence("texts", false);
resizeCanvas();
placeTokens();
renderPresence();
updatePresence({ online: true });
watchBattery();
