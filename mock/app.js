const screens = [...document.querySelectorAll(".screen")];
const screenName = document.querySelector("#screenName");
const statusTime = document.querySelector("#statusTime");
const navButtons = [...document.querySelectorAll("[data-screen]")];
const goButtons = [...document.querySelectorAll("[data-go]")];
const askQuestionButtons = [...document.querySelectorAll('[data-action="ask-question"]')];
const screenGroupMap = {
  login: null,
  signup: null,
  forgotpassword: null,
  feed: "feed",
  entry_detail: "feed",
  entry_write: "entry_write",
  mentor_top: "mentor_top",
  mentor_add: "mentor_top",
  mentor_thread: "mentor_top",
  discover_top: "discover_top",
  discover_detail: "discover_top",
  setting: "setting",
};

function formatScreenName(name) {
  return name.replace(/_/g, " ");
}

function tickTime() {
  if (!statusTime) return;
  const now = new Date();
  statusTime.textContent = now.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function showScreen(target) {
  const groupTarget = screenGroupMap[target] ?? target;

  screens.forEach((screen) => {
    const visible = screen.dataset.name === target;
    screen.classList.toggle("is-visible", visible);
  });

  navButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.screen === target || btn.dataset.screen === groupTarget);
  });

  screenName.textContent = formatScreenName(target);

  if (target === "entry_write") {
    const entryWriteScreen = document.querySelector('.screen[data-name="entry_write"]');
    const promptCard = entryWriteScreen?.querySelector(".assistant-prompt");
    if (promptCard) promptCard.classList.remove("is-open");
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => showScreen(btn.dataset.screen));
});

goButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.go;
    if (target) showScreen(target);
  });
});

askQuestionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const screen = btn.closest(".screen");
    const promptCard = screen?.querySelector(".assistant-prompt");
    if (!promptCard) return;

    promptCard.classList.add("is-open");
    promptCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

tickTime();
setInterval(tickTime, 1000 * 30);
