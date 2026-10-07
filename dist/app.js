const DAILY_RATE_KEY = "maeil-rate";
const RECORDS_KEY = "maeil-records";
const ACCESS_HASH = "41c8fa7d060badc5618a28326dc00cf07e1ce22a79a94a1fed94f271d3127447";
const AUTH_SESSION_KEY = "today-gongsu-auth";
const today = new Date();
today.setHours(0, 0, 0, 0);
let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
let dailyRate = Number(localStorage.getItem(DAILY_RATE_KEY)) || 200000;
let hideMoney = false;
let installPrompt = null;
// 카카오 디벨로퍼스에서 발급받은 JavaScript 키를 넣으면 카카오톡 공유창이 바로 열립니다.
// 비워두면 휴대폰 기본 공유창(카카오톡 포함)이 열립니다.
const KAKAO_JS_KEY = "";
const APP_URL = new URL("./", location.href).href;

const seedRecords = [
  ["2026-10-01", 1, "반포 재건축 현장", "형틀 작업"],
  ["2026-10-02", 1.5, "반포 재건축 현장", "연장 근무"],
  ["2026-10-05", 1, "성수 오피스 현장", "배관 보조"],
  ["2026-10-06", 2, "마곡 물류센터", "야간 작업"],
  ["2026-10-07", 1, "반포 재건축 현장", "철근 작업"],
  ["2026-10-08", 1, "반포 재건축 현장", ""],
  ["2026-10-09", .5, "성수 오피스 현장", "오전 작업"],
  ["2026-10-12", 1.5, "마곡 물류센터", "연장 근무"],
  ["2026-10-13", 1, "반포 재건축 현장", ""],
  ["2026-10-14", 1, "반포 재건축 현장", ""],
  ["2026-10-15", 1.5, "성수 오피스 현장", "연장 근무"],
  ["2026-10-16", 1, "마곡 물류센터", ""],
  ["2026-10-19", 2, "반포 재건축 현장", "야간 작업"],
  ["2026-10-20", 1.5, "성수 오피스 현장", "연장 근무"]
].map(([date, work, site, memo]) => ({ date, work, site, memo }));

let records = (() => {
  try { return JSON.parse(localStorage.getItem(RECORDS_KEY)) || seedRecords; }
  catch { return seedRecords; }
})();

const $ = (selector) => document.querySelector(selector);
const formatWon = (value) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const saveRecords = () => localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
const koreanDate = (date) => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(date);

async function hashText(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function unlockApp() {
  sessionStorage.setItem(AUTH_SESSION_KEY, "unlocked");
  document.body.classList.remove("locked");
  $("#authScreen").classList.add("hidden");
  handleShortcut();
}

async function submitPasscode(event) {
  event.preventDefault();
  const input = $("#passcodeInput");
  const error = $("#authError");
  if (await hashText(input.value) === ACCESS_HASH) {
    error.textContent = "";
    unlockApp();
    return;
  }
  error.textContent = "비밀번호가 맞지 않습니다.";
  input.value = "";
  input.focus();
  const card = document.querySelector(".auth-card");
  card.classList.remove("shake");
  requestAnimationFrame(() => card.classList.add("shake"));
}

function getMonthRecords() {
  const prefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;
  return records.filter((item) => item.date.startsWith(prefix));
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  $("#monthTitle").textContent = `${year}년 ${month + 1}월`;
  const start = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - start.getDay());
  const calendar = $("#calendar");
  calendar.innerHTML = "";

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const key = dateKey(date);
    const record = records.find((item) => item.date === key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `calendar-day${date.getMonth() !== month ? " outside" : ""}${date.getDay() === 0 ? " sunday" : ""}${date.getDay() === 6 ? " saturday" : ""}${key === dateKey(today) ? " today" : ""}`;
    button.setAttribute("aria-label", `${koreanDate(date)}${record ? `, ${record.work} 공수` : ", 기록 없음"}`);
    button.innerHTML = `<span class="day-number">${date.getDate()}</span>${record ? `<span class="work-badge work-${String(record.work).replace(".", "")}">${record.work.toFixed(1)}</span>` : ""}`;
    button.addEventListener("click", () => openWorkDialog(date, record));
    calendar.appendChild(button);
  }
  renderSummary();
  renderRecent($("#viewAllButton").dataset.expanded === "true");
}

function renderSummary() {
  const monthRecords = getMonthRecords();
  const total = monthRecords.reduce((sum, item) => sum + Number(item.work), 0);
  const sites = new Set(monthRecords.map((item) => item.site));
  $("#salaryTotal").textContent = hideMoney ? "•••••••" : Math.round(total * dailyRate).toLocaleString("ko-KR");
  $("#daysTotal").textContent = `${monthRecords.length}일`;
  $("#workTotal").textContent = total.toFixed(1);
  $("#siteTotal").textContent = `${sites.size}곳`;
}

function renderRecent(showAll = false) {
  const items = getMonthRecords().slice().sort((a, b) => b.date.localeCompare(a.date));
  const recordList = $("#recordList");
  recordList.innerHTML = "";
  items.slice(0, showAll ? items.length : 3).forEach((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    const row = document.createElement("div");
    row.className = "record-item";
    row.innerHTML = `
      <span class="record-date"><strong>${date.getDate()}</strong><span>${new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date)}</span></span>
      <span class="record-info"><strong>${escapeHtml(item.site)}</strong><span>${escapeHtml(item.memo) || "메모 없음"}</span></span>
      <span class="record-work"><strong>${item.work.toFixed(1)} 공수</strong><span>${hideMoney ? "금액 숨김" : formatWon(item.work * dailyRate)}</span></span>
      <span class="record-actions">
        <button class="record-edit" type="button" aria-label="${koreanDate(date)} 기록 수정">수정</button>
        <button class="record-delete" type="button" aria-label="${koreanDate(date)} 기록 삭제">삭제</button>
      </span>`;
    row.addEventListener("click", (event) => { if (!event.target.closest(".record-delete")) openWorkDialog(date, item); });
    row.querySelector(".record-delete").addEventListener("click", () => deleteRecord(item.date));
    recordList.appendChild(row);
  });
  if (!items.length) recordList.innerHTML = `<div class="panel-card"><div><strong>아직 기록이 없습니다</strong><span>달력에서 날짜를 눌러 첫 공수를 기록해보세요.</span></div></div>`;
}

function openWorkDialog(date, record) {
  $("#dialogDate").textContent = koreanDate(date);
  $("#selectedDate").value = dateKey(date);
  const editing = Boolean(record);
  $("#dialogEyebrow").textContent = editing ? "기록 수정" : "공수 기록";
  $("#saveRecordButton").textContent = editing ? "수정 저장" : "기록 저장";
  $("#deleteRecordButton").hidden = !editing;
  $("#siteInput").value = record?.site || "반포 재건축 현장";
  $("#memoInput").value = record?.memo || "";
  const work = record?.work || 1;
  document.querySelectorAll('input[name="work"]').forEach((input) => { input.checked = Number(input.value) === work; });
  updateDayPay();
  $("#workDialog").showModal();
}

function updateDayPay() {
  const work = Number(document.querySelector('input[name="work"]:checked').value);
  $("#dayPay").textContent = formatWon(work * dailyRate);
}

async function saveRecord(event) {
  event.preventDefault();
  const date = $("#selectedDate").value;
  const next = {
    date,
    work: Number(document.querySelector('input[name="work"]:checked').value),
    site: $("#siteInput").value,
    memo: $("#memoInput").value.trim()
  };
  const index = records.findIndex((item) => item.date === date);
  if (index >= 0) {
    const ok = await askPasscode({ title: "기록 수정", message: `${koreanDate(new Date(`${date}T00:00:00`))} 기록을 수정하려면 비밀번호를 입력해 주세요.`, confirm: "수정" });
    if (!ok) return;
    records[index] = next;
  } else {
    records.push(next);
  }
  saveRecords();
  $("#workDialog").close();
  renderCalendar();
  showToast(index >= 0 ? "기록을 수정했습니다" : "공수 기록을 저장했습니다");
}

async function deleteRecord(date) {
  const label = koreanDate(new Date(`${date}T00:00:00`));
  const ok = await askPasscode({ title: "기록 삭제", message: `${label} 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요. 비밀번호를 입력해 주세요.`, confirm: "삭제", danger: true });
  if (!ok) return;
  records = records.filter((item) => item.date !== date);
  saveRecords();
  if ($("#workDialog").open) $("#workDialog").close();
  renderCalendar();
  showToast("기록을 삭제했습니다");
}

// 수정·삭제 전에 비밀번호를 확인하는 팝업. 맞으면 true, 취소하면 false.
let pinResolve = null;
function askPasscode({ title, message, confirm = "확인", danger = false }) {
  if (pinResolve) pinResolve(false);
  $("#pinTitle").textContent = title;
  $("#pinMessage").textContent = message;
  $("#pinSubmit").textContent = confirm;
  $("#pinSubmit").classList.toggle("danger", danger);
  $("#pinError").textContent = "";
  $("#pinInput").value = "";
  $("#pinDialog").showModal();
  setTimeout(() => $("#pinInput").focus(), 50);
  return new Promise((resolve) => { pinResolve = resolve; });
}

function finishPasscode(result) {
  const resolve = pinResolve;
  pinResolve = null;
  if ($("#pinDialog").open) $("#pinDialog").close();
  if (resolve) resolve(result);
}

async function submitPin(event) {
  event.preventDefault();
  const input = $("#pinInput");
  if (await hashText(input.value) === ACCESS_HASH) { finishPasscode(true); return; }
  $("#pinError").textContent = "비밀번호가 맞지 않습니다.";
  input.value = "";
  input.focus();
  const dialog = $("#pinDialog");
  dialog.classList.remove("shake");
  requestAnimationFrame(() => dialog.classList.add("shake"));
}

// ── 카카오톡 공유 ──
function buildMonthReport() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;
  const items = getMonthRecords().slice().sort((a, b) => a.date.localeCompare(b.date));
  const total = items.reduce((sum, item) => sum + Number(item.work), 0);
  const sites = new Set(items.map((item) => item.site));
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" });
  const summary = `근무 ${items.length}일 · 총 ${total.toFixed(1)}공수 · 현장 ${sites.size}곳`;
  const pay = hideMoney ? "" : `예상 급여 ${formatWon(total * dailyRate)}`;
  const lines = items.map((item) => {
    const d = new Date(`${item.date}T00:00:00`);
    return `${month}/${d.getDate()}(${weekday.format(d)}) ${item.work.toFixed(1)}공수 · ${item.site}${item.memo ? ` · ${item.memo}` : ""}`;
  });
  const title = `[매일공수대장] ${year}년 ${month}월 공수`;
  const full = [title, summary, pay, "", ...(lines.length ? lines : ["입력된 기록이 없습니다."]), "", APP_URL].filter((line, i, arr) => line !== "" || arr[i - 1] !== "").join("\n");
  const short = [title, summary, pay].filter(Boolean).join("\n");
  return { title, full, short };
}

let kakaoReady = null;
function loadKakao() {
  if (!KAKAO_JS_KEY) return Promise.resolve(false);
  if (kakaoReady) return kakaoReady;
  kakaoReady = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      try { if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY); resolve(true); }
      catch { resolve(false); }
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return kakaoReady;
}

async function shareMonth() {
  const report = buildMonthReport();
  if (await loadKakao()) {
    try {
      window.Kakao.Share.sendDefault({
        objectType: "text",
        text: report.short.slice(0, 200),
        link: { mobileWebUrl: APP_URL, webUrl: APP_URL },
        buttonTitle: "매일공수대장 열기"
      });
      return;
    } catch { /* 아래 기본 공유로 넘어감 */ }
  }
  if (navigator.share) {
    try { await navigator.share({ title: report.title, text: report.full }); return; }
    catch (error) { if (error.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(report.full);
    showToast("이번 달 기록을 복사했어요. 카톡에 붙여넣기 하세요");
  } catch {
    showToast("공유를 지원하지 않는 브라우저입니다");
  }
}

function openPanel(page) {
  const panel = $("#panelContent");
  if (page === "payroll") {
    $("#panelEyebrow").textContent = "이번 달 정산";
    $("#panelTitle").textContent = "급여 정산";
    const total = getMonthRecords().reduce((sum, item) => sum + item.work, 0);
    panel.innerHTML = `<div class="panel-stack">
      <div class="panel-card"><div><strong>기본 급여</strong><span>${total.toFixed(1)} 공수 × ${formatWon(dailyRate)}</span></div><b>${formatWon(total * dailyRate)}</b></div>
      <div class="panel-card"><div><strong>공제 전 예상 금액</strong><span>실제 지급액은 현장 정산에 따라 달라질 수 있어요.</span></div><b>${formatWon(total * dailyRate)}</b></div>
    </div>`;
  } else if (page === "sites") {
    $("#panelEyebrow").textContent = "내 작업 현장";
    $("#panelTitle").textContent = "현장 관리";
    panel.innerHTML = `<div class="panel-stack">${["반포 재건축 현장","성수 오피스 현장","마곡 물류센터"].map((site, index) => `<div class="panel-card"><div><strong>${site}</strong><span>${["서울 서초구","서울 성동구","서울 강서구"][index]}</span></div><b>${records.filter((r) => r.site === site).length}일</b></div>`).join("")}</div>`;
  } else {
    $("#panelEyebrow").textContent = "나에게 맞게";
    $("#panelTitle").textContent = "급여 설정";
    panel.innerHTML = `<div class="panel-stack"><label class="panel-card"><div><strong>1공수 기본 단가</strong><span>모든 예상 급여에 적용됩니다.</span></div><input class="settings-rate" id="rateInput" inputmode="numeric" value="${dailyRate}" aria-label="1공수 기본 단가" /></label><button class="primary-button" id="saveRate" type="button">단가 저장</button></div>`;
    setTimeout(() => $("#saveRate").addEventListener("click", () => {
      dailyRate = Math.max(0, Number($("#rateInput").value) || 0);
      localStorage.setItem(DAILY_RATE_KEY, String(dailyRate));
      renderCalendar();
      $("#panelDialog").close();
      showToast("기본 단가를 저장했습니다");
    }), 0);
  }
  $("#panelDialog").showModal();
}

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

$("#prevMonth").addEventListener("click", () => { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); });
$("#nextMonth").addEventListener("click", () => { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); });
$("#monthTitle").addEventListener("click", () => { viewDate = new Date(today.getFullYear(), today.getMonth(), 1); renderCalendar(); });
$("#todayButton").addEventListener("click", () => { viewDate = new Date(today.getFullYear(), today.getMonth(), 1); renderCalendar(); openWorkDialog(today, records.find((item) => item.date === dateKey(today))); });
$("#addWorkButton").addEventListener("click", () => openWorkDialog(today, records.find((item) => item.date === dateKey(today))));
$("#privacyButton").addEventListener("click", () => { hideMoney = !hideMoney; renderCalendar(); });
$("#viewAllButton").addEventListener("click", () => {
  const expanded = $("#viewAllButton").dataset.expanded === "true";
  $("#viewAllButton").dataset.expanded = String(!expanded);
  $("#viewAllButton").textContent = expanded ? "전체 보기" : "접기";
  renderRecent(!expanded);
});
$("#workForm").addEventListener("submit", saveRecord);
$("#workClose").addEventListener("click", () => $("#workDialog").close());
document.querySelectorAll('input[name="work"]').forEach((input) => input.addEventListener("change", updateDayPay));
$("#panelClose").addEventListener("click", () => $("#panelDialog").close());
$("#menuButton").addEventListener("click", openMenu);
$("#menuClose").addEventListener("click", () => $("#menuDialog").close());
$("#menuInstall").addEventListener("click", () => { $("#menuDialog").close(); addToHomeScreen(); });
$("#menuShare").addEventListener("click", () => { $("#menuDialog").close(); shareMonth(); });
$("#menuRecords").addEventListener("click", () => { $("#menuDialog").close(); showAllRecords(); });
$("#shareButton").addEventListener("click", shareMonth);
$("#deleteRecordButton").addEventListener("click", () => deleteRecord($("#selectedDate").value));
$("#pinForm").addEventListener("submit", submitPin);
$("#pinCancel").addEventListener("click", () => finishPasscode(false));
$("#pinClose").addEventListener("click", () => finishPasscode(false));
$("#pinDialog").addEventListener("cancel", (event) => { event.preventDefault(); finishPasscode(false); });
$("#panelDialog").addEventListener("close", resetNav);
$("#exitCancel").addEventListener("click", () => $("#exitDialog").close());
$("#exitConfirm").addEventListener("click", exitApp);
$("#installClose").addEventListener("click", () => $("#installDialog").close());
$("#installButton").addEventListener("click", installApp);
$("#authForm").addEventListener("submit", submitPasscode);
document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  if (button.dataset.page !== "calendar") openPanel(button.dataset.page);
}));
renderCalendar();

function openMenu() {
  $("#menuShareMonth").textContent = `${viewDate.getMonth() + 1}월`;
  $("#menuDialog").showModal();
}

function showAllRecords() {
  const button = $("#viewAllButton");
  button.dataset.expanded = "true";
  button.textContent = "접기";
  renderRecent(true);
  $(".recent-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

const isKakaoInApp = () => /KAKAOTALK/i.test(navigator.userAgent);

// 메뉴의 "홈 화면에 추가" 버튼
function addToHomeScreen() {
  if (isInstalled()) { showToast("이미 홈 화면 앱으로 실행 중이에요"); return; }
  if (installPrompt) { installApp(); return; }
  if (isKakaoInApp()) {
    // 카카오톡 안의 브라우저는 홈 화면 추가를 지원하지 않아 기본 브라우저로 엽니다.
    const target = new URL(APP_URL);
    target.searchParams.set("action", "install");
    showToast("기본 브라우저에서 열고 있어요");
    location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(target.href)}`;
    return;
  }
  openInstallDialog();
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function openInstallDialog() {
  const button = $("#installButton");
  const status = $("#installStatus");
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  $("#iosSteps").hidden = !ios || isInstalled();

  if (isInstalled()) {
    button.textContent = "앱으로 설치됨";
    button.disabled = true;
    status.textContent = "현재 홈 화면 앱으로 실행 중입니다.";
  } else if (installPrompt) {
    button.textContent = "홈 화면에 앱 설치";
    button.disabled = false;
    status.textContent = "한 번 설치하면 일반 앱처럼 바로 열 수 있어요.";
  } else if (isKakaoInApp()) {
    button.textContent = "기본 브라우저에서 열기";
    button.disabled = false;
    status.textContent = "카카오톡 안에서는 설치가 안 돼요. 브라우저에서 연 뒤 설치하세요.";
  } else if (ios) {
    button.textContent = "아래 순서대로 설치하세요";
    button.disabled = true;
    status.textContent = "Safari의 홈 화면 추가 기능으로 설치할 수 있어요.";
  } else {
    button.textContent = "브라우저 메뉴에서 앱 설치";
    button.disabled = true;
    status.textContent = "브라우저 메뉴의 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.";
  }
  $("#installDialog").showModal();
}

async function installApp() {
  if (!installPrompt) { if (isKakaoInApp()) { $("#installDialog").close(); addToHomeScreen(); } return; }
  if ($("#installDialog").open) $("#installDialog").close();
  installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  installPrompt = null;
  showToast(choice.outcome === "accepted" ? "홈 화면에 앱을 설치했습니다" : "설치를 취소했습니다");
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  if ($("#installDialog").open) openInstallDialog();
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  showToast("매일공수대장 설치가 완료됐습니다");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

function handleShortcut() {
  const action = new URLSearchParams(location.search).get("action");
  if (action === "install" && !isInstalled()) { openInstallDialog(); return; }
  if (action === "add" && !$("#workDialog").open) {
    openWorkDialog(today, records.find((item) => item.date === dateKey(today)));
  }
}

// ── 휴대폰 뒤로가기 ──
// 뒤로가기를 누르면 열린 창 → 펼친 목록 → 다른 달 → 스크롤 순서로 하나씩 닫으며 홈 화면으로 돌아오고,
// 홈 화면에서 누르면 바로 닫지 않고 "종료할까요?" 팝업을 띄웁니다.
function resetNav() {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === "calendar"));
}

let guardActive = false;
function pushBackGuard() {
  history.pushState({ gongsuGuard: Date.now() }, "");
  guardActive = true;
}

function stepBack() {
  if ($("#pinDialog").open) { finishPasscode(false); return true; }
  if ($("#exitDialog").open) { $("#exitDialog").close(); return true; }
  for (const id of ["#workDialog", "#installDialog", "#panelDialog", "#menuDialog"]) {
    if ($(id).open) { $(id).close(); return true; }
  }
  if (document.body.classList.contains("locked")) return false;
  const viewAll = $("#viewAllButton");
  if (viewAll.dataset.expanded === "true") {
    viewAll.dataset.expanded = "false";
    viewAll.textContent = "전체 보기";
    renderRecent(false);
    return true;
  }
  if (viewDate.getFullYear() !== today.getFullYear() || viewDate.getMonth() !== today.getMonth()) {
    viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCalendar();
    showToast("이번 달로 돌아왔어요");
    return true;
  }
  if (window.scrollY > 40) { window.scrollTo({ top: 0, behavior: "smooth" }); return true; }
  return false;
}

window.addEventListener("popstate", () => {
  guardActive = false;
  if (exiting) return;
  pushBackGuard();
  if (!stepBack()) $("#exitDialog").showModal();
});

let exiting = false;
function exitApp() {
  $("#exitDialog").close();
  exiting = true;
  if (isKakaoInApp()) { location.href = "kakaotalk://inappbrowser/close"; }
  else { window.close(); }
  // 브라우저가 스크립트로 창 닫기를 막는 경우: 가드를 빼서 다음 뒤로가기에 바로 나가지도록 함
  setTimeout(() => {
    if (document.visibilityState === "hidden") return;
    history.back();
    setTimeout(() => { exiting = false; showToast("뒤로가기를 한 번 더 누르면 종료돼요"); }, 150);
  }, 400);
}

// 새로고침해도 기록이 쌓이지 않게, 이미 가드 위에 있으면 다시 넣지 않음
if (history.state && history.state.gongsuGuard) guardActive = true; else pushBackGuard();
// "한 번 더 누르면 종료" 상태에서 다시 앱을 쓰기 시작하면 가드를 복구
document.addEventListener("pointerdown", () => { if (!guardActive && !exiting) pushBackGuard(); }, true);

if (sessionStorage.getItem(AUTH_SESSION_KEY) === "unlocked") {
  unlockApp();
}
