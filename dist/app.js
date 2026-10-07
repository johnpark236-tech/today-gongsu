const DAILY_RATE_KEY = "maeil-rate";
const RECORDS_KEY = "maeil-records";
const WORKERS_KEY = "maeil-workers";
const SITES_KEY = "maeil-sites";
const CURRENT_WORKER_KEY = "maeil-current-worker";
const ACCESS_HASH = "41c8fa7d060badc5618a28326dc00cf07e1ce22a79a94a1fed94f271d3127447";
const AUTH_SESSION_KEY = "today-gongsu-auth";
const today = new Date();
today.setHours(0, 0, 0, 0);
let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
// 새 근무자를 추가할 때 기본으로 들어가는 1공수 단가
let dailyRate = Number(localStorage.getItem(DAILY_RATE_KEY)) || 200000;
let hideMoney = false;
// 일괄 수정 모드 상태 (선택한 날짜들)
const bulk = { active: false, dates: new Set() };
let installPrompt = null;
// 카카오 디벨로퍼스에서 발급받은 JavaScript 키를 넣으면 카카오톡 공유창이 바로 열립니다.
// 비워두면 휴대폰 기본 공유창(카카오톡 포함)이 열립니다.
const KAKAO_JS_KEY = "";
const APP_URL = new URL("./", location.href).href;

const loadJson = (key, fallback) => {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
};
const newId = () => `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ── 근무자 · 현장 ──
let workers = loadJson(WORKERS_KEY, null);
if (!Array.isArray(workers) || !workers.length) workers = [{ id: "w1", name: "근무자 1", rate: dailyRate }];

let sites = loadJson(SITES_KEY, null);
if (!Array.isArray(sites)) sites = [];

// 예전 버전에 미리 들어 있던 예시 기록 (휴대폰에 저장돼 있으면 한 번 지움)
const SAMPLE_RECORDS = [
  ["2026-10-01", 1, "반포 재건축 현장", "형틀 작업"], ["2026-10-02", 1.5, "반포 재건축 현장", "연장 근무"],
  ["2026-10-05", 1, "성수 오피스 현장", "배관 보조"], ["2026-10-06", 2, "마곡 물류센터", "야간 작업"],
  ["2026-10-07", 1, "반포 재건축 현장", "철근 작업"], ["2026-10-08", 1, "반포 재건축 현장", ""],
  ["2026-10-09", .5, "성수 오피스 현장", "오전 작업"], ["2026-10-12", 1.5, "마곡 물류센터", "연장 근무"],
  ["2026-10-13", 1, "반포 재건축 현장", ""], ["2026-10-14", 1, "반포 재건축 현장", ""],
  ["2026-10-15", 1.5, "성수 오피스 현장", "연장 근무"], ["2026-10-16", 1, "마곡 물류센터", ""],
  ["2026-10-19", 2, "반포 재건축 현장", "야간 작업"], ["2026-10-20", 1.5, "성수 오피스 현장", "연장 근무"]
];
const SAMPLE_SITES = [["반포 재건축 현장", "서울 서초구"], ["성수 오피스 현장", "서울 성동구"], ["마곡 물류센터", "서울 강서구"]];
const SAMPLE_PURGE_KEY = "maeil-sample-purged";

let records = loadJson(RECORDS_KEY, null);
if (!Array.isArray(records)) records = [];
if (!localStorage.getItem(SAMPLE_PURGE_KEY)) {
  const isSample = (r) => SAMPLE_RECORDS.some(([date, work, site, memo]) => r.date === date && Number(r.work) === work && r.site === site && (r.memo || "") === memo);
  records = records.filter((r) => !isSample(r));
  // 예시 현장은 기록에 쓰이지 않고 손대지 않은 경우에만 지움
  sites = sites.filter((s) => !SAMPLE_SITES.some(([name, area]) => s.name === name && s.area === area) || records.some((r) => r.site === s.name));
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  localStorage.setItem(SITES_KEY, JSON.stringify(sites));
  localStorage.setItem(SAMPLE_PURGE_KEY, "1");
}
// 예전 기록(근무자 정보 없음)은 첫 번째 근무자 기록으로 옮김
records.forEach((item) => { if (!item.worker || !workers.some((w) => w.id === item.worker)) item.worker = workers[0].id; item.work = Number(item.work); });

let currentWorker = localStorage.getItem(CURRENT_WORKER_KEY) || "all";
if (currentWorker !== "all" && !workers.some((w) => w.id === currentWorker)) currentWorker = "all";

const $ = (selector) => document.querySelector(selector);
const formatWon = (value) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const formatNum = (value) => Math.round(value).toLocaleString("ko-KR");
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const saveRecords = () => localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
const saveWorkers = () => localStorage.setItem(WORKERS_KEY, JSON.stringify(workers));
const saveSites = () => localStorage.setItem(SITES_KEY, JSON.stringify(sites));
const koreanDate = (date) => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(date);
const workerById = (id) => workers.find((w) => w.id === id);
const workerName = (id) => workerById(id)?.name || "근무자";
const rateOf = (record) => workerById(record.worker)?.rate ?? dailyRate;
const payOf = (record) => Number(record.work) * rateOf(record);
const findRecord = (date, worker) => records.find((item) => item.date === date && item.worker === worker);
const visibleRecords = () => (currentWorker === "all" ? records : records.filter((item) => item.worker === currentWorker));
const monthPrefix = () => `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;

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
  const prefix = monthPrefix();
  return visibleRecords().filter((item) => item.date.startsWith(prefix));
}

// ── 근무자 선택 탭 ──
function renderWorkerTabs() {
  const tabs = $("#workerTabs");
  const options = [{ id: "all", name: "전체" }, ...workers];
  tabs.innerHTML = options.map((w) => `<button type="button" class="worker-tab${currentWorker === w.id ? " active" : ""}" data-worker="${w.id}">${escapeHtml(w.name)}</button>`).join("")
    + `<button type="button" class="worker-tab add" id="addWorkerTab" aria-label="근무자 추가">+ 근무자</button>`;
  tabs.querySelectorAll("[data-worker]").forEach((button) => button.addEventListener("click", () => {
    currentWorker = button.dataset.worker;
    localStorage.setItem(CURRENT_WORKER_KEY, currentWorker);
    renderCalendar();
  }));
  $("#addWorkerTab").addEventListener("click", () => openItemDialog("worker"));
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  $("#monthTitle").textContent = `${year}년 ${month + 1}월`;
  const start = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - start.getDay());
  const calendar = $("#calendar");
  calendar.innerHTML = "";
  const visible = visibleRecords();

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const key = dateKey(date);
    const dayRecords = visible.filter((item) => item.date === key);
    const work = dayRecords.reduce((sum, item) => sum + item.work, 0);
    const pay = dayRecords.reduce((sum, item) => sum + payOf(item), 0);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `calendar-day${bulk.dates.has(key) ? " selected" : ""}${date.getMonth() !== month ? " outside" : ""}${date.getDay() === 0 ? " sunday" : ""}${date.getDay() === 6 ? " saturday" : ""}${key === dateKey(today) ? " today" : ""}`;
    button.setAttribute("aria-label", `${koreanDate(date)}${dayRecords.length ? `, ${work} 공수, ${formatWon(pay)}` : ", 기록 없음"}`);
    let badge = "";
    if (dayRecords.length) {
      const level = dayRecords.length > 1 ? "work-multi" : `work-${String(work).replace(".", "")}`;
      const label = hideMoney ? work.toFixed(1) : formatNum(pay);
      badge = `<span class="work-badge ${level}">${label}</span>${dayRecords.length > 1 ? `<span class="people-count">${dayRecords.length}명</span>` : ""}`;
    }
    button.innerHTML = `<span class="day-number">${date.getDate()}</span>${badge}`;
    button.addEventListener("click", () => (bulk.active ? toggleBulkDate(key) : openWorkDialog(date, dayRecords[0]?.worker)));
    calendar.appendChild(button);
  }
  $("#legendMulti").hidden = currentWorker !== "all" || workers.length < 2;
  renderWorkerTabs();
  renderBulkBar();
  renderSummary();
  renderRecent($("#viewAllButton").dataset.expanded === "true");
}

function renderSummary() {
  const monthRecords = getMonthRecords();
  const total = monthRecords.reduce((sum, item) => sum + item.work, 0);
  const pay = monthRecords.reduce((sum, item) => sum + payOf(item), 0);
  const sitesUsed = new Set(monthRecords.map((item) => item.site));
  const days = new Set(monthRecords.map((item) => item.date));
  $("#summaryLabel").textContent = currentWorker === "all"
    ? (workers.length > 1 ? `${viewDate.getMonth() + 1}월 예상 급여 · 전체 ${workers.length}명` : `${viewDate.getMonth() + 1}월 예상 급여`)
    : `${viewDate.getMonth() + 1}월 예상 급여 · ${workerName(currentWorker)}`;
  $("#salaryTotal").textContent = hideMoney ? "•••••••" : formatNum(pay);
  $("#daysTotal").textContent = `${days.size}일`;
  $("#workTotal").textContent = total.toFixed(1);
  $("#siteTotal").textContent = `${sitesUsed.size}곳`;
}

function renderRecent(showAll = false) {
  const items = getMonthRecords().slice().sort((a, b) => b.date.localeCompare(a.date) || workerName(a.worker).localeCompare(workerName(b.worker)));
  const recordList = $("#recordList");
  recordList.innerHTML = "";
  items.slice(0, showAll ? items.length : 3).forEach((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    const row = document.createElement("div");
    row.className = "record-item";
    row.innerHTML = `
      <span class="record-date"><strong>${date.getDate()}</strong><span>${new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date)}</span></span>
      <span class="record-info"><strong><em class="record-worker">${escapeHtml(workerName(item.worker))}</em>${escapeHtml(item.site)}</strong><span>${escapeHtml(item.memo) || "메모 없음"}</span></span>
      <span class="record-work"><strong>${item.work.toFixed(1)} 공수</strong><span>${hideMoney ? "금액 숨김" : formatWon(payOf(item))}</span></span>
      <span class="record-actions">
        <button class="record-edit" type="button" aria-label="${koreanDate(date)} 기록 수정">수정</button>
        <button class="record-delete" type="button" aria-label="${koreanDate(date)} 기록 삭제">삭제</button>
      </span>`;
    row.addEventListener("click", (event) => { if (!event.target.closest(".record-delete")) openWorkDialog(date, item.worker); });
    row.querySelector(".record-delete").addEventListener("click", () => deleteRecord(item.date, item.worker));
    recordList.appendChild(row);
  });
  if (!items.length) recordList.innerHTML = `<div class="panel-card"><div><strong>아직 기록이 없습니다</strong><span>달력에서 날짜를 눌러 첫 공수를 기록해보세요.</span></div></div>`;
}

// ── 공수 입력/수정 창 ──
function fillSelect(select, list, selected) {
  const names = list.map((item) => item.name);
  if (selected && !names.includes(selected)) names.push(selected);
  select.innerHTML = (names.length ? "" : `<option value="" disabled>현장을 추가해 주세요</option>`)
    + names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")
    + `<option value="__new__">+ 새 현장 추가</option>`;
  select.value = selected && names.includes(selected) ? selected : (names[0] ?? "");
  select.dataset.prev = select.value;
}

function openWorkDialog(date, workerId) {
  const key = dateKey(date);
  let worker = workerId || (currentWorker !== "all" ? currentWorker : null);
  if (!worker) worker = (workers.find((w) => !findRecord(key, w.id)) || workers[0]).id;
  $("#selectedDate").value = key;
  $("#dialogDate").textContent = koreanDate(date);
  $("#workerInput").innerHTML = workers.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");
  $("#workerInput").value = worker;
  loadWorkForm();
  if (!$("#workDialog").open) $("#workDialog").showModal();
}

// 선택한 날짜 + 근무자의 기록을 창에 채움 (없으면 새 기록)
function loadWorkForm() {
  const key = $("#selectedDate").value;
  const worker = $("#workerInput").value;
  const record = findRecord(key, worker);
  const editing = Boolean(record);
  $("#dialogEyebrow").textContent = editing ? "기록 수정" : "공수 기록";
  $("#saveRecordButton").textContent = editing ? "수정 저장" : "기록 저장";
  $("#deleteRecordButton").hidden = !editing;
  fillSelect($("#siteInput"), sites, record?.site || sites[0]?.name);
  $("#memoInput").value = record?.memo || "";
  const work = record?.work || 1;
  document.querySelectorAll('input[name="work"]').forEach((input) => { input.checked = Number(input.value) === work; });
  updateDayPay();
}

function updateDayPay() {
  const work = Number(document.querySelector('input[name="work"]:checked').value);
  const rate = workerById($("#workerInput").value)?.rate ?? dailyRate;
  $("#dayPay").textContent = formatWon(work * rate);
}

async function saveRecord(event) {
  event.preventDefault();
  const date = $("#selectedDate").value;
  const worker = $("#workerInput").value;
  if (!$("#siteInput").value) { showToast("설정에서 작업 현장을 먼저 추가해 주세요"); return; }
  const next = {
    date,
    worker,
    work: Number(document.querySelector('input[name="work"]:checked').value),
    site: $("#siteInput").value,
    memo: $("#memoInput").value.trim()
  };
  const index = records.findIndex((item) => item.date === date && item.worker === worker);
  if (index >= 0) {
    records[index] = next;
  } else {
    records.push(next);
  }
  saveRecords();
  $("#workDialog").close();
  renderCalendar();
  showToast(index >= 0 ? "기록을 수정했습니다" : "공수 기록을 저장했습니다");
}

async function deleteRecord(date, worker) {
  const label = koreanDate(new Date(`${date}T00:00:00`));
  const ok = await askPasscode({ title: "기록 삭제", message: `${workerName(worker)}님 ${label} 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요.`, confirm: "삭제", danger: true, requirePin: false });
  if (!ok) return;
  records = records.filter((item) => !(item.date === date && item.worker === worker));
  saveRecords();
  if ($("#workDialog").open) $("#workDialog").close();
  renderCalendar();
  showToast("기록을 삭제했습니다");
}

// 수정·삭제 전에 비밀번호를 확인하는 팝업. 맞으면 true, 취소하면 false.
let pinResolve = null;
// requirePin: false 이면 비밀번호 없이 확인만 받음
let pinRequired = true;
function askPasscode({ title, message, confirm = "확인", danger = false, requirePin = true }) {
  if (pinResolve) pinResolve(false);
  pinRequired = requirePin;
  $("#pinEyebrow").textContent = requirePin ? "비밀번호 확인" : "확인";
  $("#pinInput").hidden = !requirePin;
  $("#pinTitle").textContent = title;
  $("#pinMessage").textContent = message;
  $("#pinSubmit").textContent = confirm;
  $("#pinSubmit").classList.toggle("danger", danger);
  $("#pinError").textContent = "";
  $("#pinInput").value = "";
  $("#pinDialog").showModal();
  if (requirePin) setTimeout(() => $("#pinInput").focus(), 50);
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
  if (!pinRequired || await hashText(input.value) === ACCESS_HASH) { finishPasscode(true); return; }
  $("#pinError").textContent = "비밀번호가 맞지 않습니다.";
  input.value = "";
  input.focus();
  const dialog = $("#pinDialog");
  dialog.classList.remove("shake");
  requestAnimationFrame(() => dialog.classList.add("shake"));
}

// ── 근무자 · 현장 추가/수정 창 ──
let itemEditing = null; // { kind: "worker" | "site", index: number | -1 }
function openItemDialog(kind, index = -1) {
  itemEditing = { kind, index };
  const isWorker = kind === "worker";
  const item = index >= 0 ? (isWorker ? workers[index] : sites[index]) : null;
  $("#itemEyebrow").textContent = isWorker ? "근무자" : "작업 현장";
  $("#itemTitle").textContent = `${isWorker ? "근무자" : "현장"} ${item ? "수정" : "추가"}`;
  $("#itemNameLabel").textContent = isWorker ? "이름" : "현장 이름";
  $("#itemNameInput").placeholder = isWorker ? "예: 홍길동" : "예: 천안 아파트 신축 현장";
  $("#itemNameInput").value = item?.name || "";
  $("#itemExtraLabel").textContent = isWorker ? "1공수 단가 (원)" : "위치 (선택)";
  const extra = $("#itemExtraInput");
  extra.inputMode = isWorker ? "numeric" : "text";
  extra.placeholder = isWorker ? "예: 170000" : "예: 충남 천안시";
  extra.value = isWorker ? String(item?.rate ?? dailyRate) : (item?.area || "");
  $("#itemError").textContent = "";
  const inUse = item && records.some((r) => (isWorker ? r.worker === item.id : r.site === item.name));
  $("#itemDelete").hidden = !item || inUse || (isWorker && workers.length < 2);
  $("#itemDialog").showModal();
  setTimeout(() => $("#itemNameInput").focus(), 50);
}

function saveItem(event) {
  event.preventDefault();
  const { kind, index } = itemEditing;
  const isWorker = kind === "worker";
  const name = $("#itemNameInput").value.trim();
  const extra = $("#itemExtraInput").value.trim();
  const list = isWorker ? workers : sites;
  if (!name) { $("#itemError").textContent = `${isWorker ? "이름" : "현장 이름"}을 입력해 주세요.`; return; }
  if (list.some((item, i) => i !== index && item.name === name)) { $("#itemError").textContent = "같은 이름이 이미 있어요."; return; }
  if (isWorker) {
    const rate = Number(extra.replace(/[^0-9]/g, ""));
    if (!rate) { $("#itemError").textContent = "1공수 단가를 숫자로 입력해 주세요."; return; }
    if (index >= 0) Object.assign(workers[index], { name, rate });
    else workers.push({ id: newId(), name, rate });
    saveWorkers();
  } else {
    if (index >= 0) {
      const oldName = sites[index].name;
      sites[index] = { name, area: extra };
      // 현장 이름을 바꾸면 이미 입력된 기록도 새 이름으로 바꿈
      if (oldName !== name) { records.forEach((r) => { if (r.site === oldName) r.site = name; }); saveRecords(); }
    } else {
      sites.push({ name, area: extra });
    }
    saveSites();
  }
  $("#itemDialog").close();
  renderCalendar();
  refreshOpenPanel();
  refreshSiteSelects(isWorker ? null : name);
  showToast(`${name} ${index >= 0 ? "수정" : "추가"} 완료`);
}

function deleteItem() {
  const { kind, index } = itemEditing;
  const list = kind === "worker" ? workers : sites;
  const [removed] = list.splice(index, 1);
  if (kind === "worker") {
    saveWorkers();
    if (currentWorker === removed.id) { currentWorker = "all"; localStorage.setItem(CURRENT_WORKER_KEY, "all"); }
  } else {
    saveSites();
  }
  $("#itemDialog").close();
  renderCalendar();
  refreshOpenPanel();
  showToast(`${removed.name} 삭제 완료`);
}

// ── 카카오톡 공유 ──
function buildMonthReport() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;
  const items = getMonthRecords().slice().sort((a, b) => a.date.localeCompare(b.date) || workerName(a.worker).localeCompare(workerName(b.worker)));
  const total = items.reduce((sum, item) => sum + item.work, 0);
  const pay = items.reduce((sum, item) => sum + payOf(item), 0);
  const sitesUsed = new Set(items.map((item) => item.site));
  const days = new Set(items.map((item) => item.date));
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" });
  const multi = currentWorker === "all" && workers.length > 1;
  const who = currentWorker === "all" ? (multi ? " (전체)" : "") : ` · ${workerName(currentWorker)}`;
  const summary = `근무 ${days.size}일 · 총 ${total.toFixed(1)}공수 · 현장 ${sitesUsed.size}곳`;
  const payLine = hideMoney ? "" : `예상 급여 ${formatWon(pay)}`;
  const perWorker = multi ? workers.map((w) => {
    const mine = items.filter((item) => item.worker === w.id);
    if (!mine.length) return "";
    const t = mine.reduce((s, item) => s + item.work, 0);
    return `- ${w.name}: ${t.toFixed(1)}공수${hideMoney ? "" : ` / ${formatWon(mine.reduce((s, item) => s + payOf(item), 0))}`}`;
  }).filter(Boolean) : [];
  const lines = items.map((item) => {
    const d = new Date(`${item.date}T00:00:00`);
    return `${month}/${d.getDate()}(${weekday.format(d)})${multi ? ` ${workerName(item.worker)}` : ""} ${item.work.toFixed(1)}공수${hideMoney ? "" : ` ${formatNum(payOf(item))}원`} · ${item.site}${item.memo ? ` · ${item.memo}` : ""}`;
  });
  const title = `[매일공수대장] ${year}년 ${month}월 공수${who}`;
  const full = [title, summary, payLine, ...perWorker, "", ...(lines.length ? lines : ["입력된 기록이 없습니다."]), "", APP_URL].filter((line, i, arr) => line !== "" || arr[i - 1] !== "").join("\n");
  const short = [title, summary, payLine].filter(Boolean).join("\n");
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

let currentPanel = null;
function refreshOpenPanel() {
  if ($("#panelDialog").open && currentPanel) openPanel(currentPanel);
}

function openPanel(page) {
  currentPanel = page;
  const panel = $("#panelContent");
  const monthLabel = `${viewDate.getMonth() + 1}월`;
  if (page === "payroll") {
    $("#panelEyebrow").textContent = `${monthLabel} 정산`;
    $("#panelTitle").textContent = "급여 정산";
    const monthRecords = getMonthRecords();
    const shown = currentWorker === "all" ? workers : workers.filter((w) => w.id === currentWorker);
    const rows = shown.map((w) => {
      const mine = monthRecords.filter((r) => r.worker === w.id);
      const t = mine.reduce((s, r) => s + r.work, 0);
      return `<div class="panel-card"><div><strong>${escapeHtml(w.name)}</strong><span>${t.toFixed(1)} 공수 × ${formatWon(w.rate)}</span></div><b>${formatWon(t * w.rate)}</b></div>`;
    }).join("");
    const total = monthRecords.reduce((s, r) => s + payOf(r), 0);
    panel.innerHTML = `<div class="panel-stack">${rows}
      <div class="panel-card total"><div><strong>공제 전 예상 합계</strong><span>실제 지급액은 현장 정산에 따라 달라질 수 있어요.</span></div><b>${formatWon(total)}</b></div>
    </div>`;
  } else if (page === "sites") {
    $("#panelEyebrow").textContent = "작업 현장";
    $("#panelTitle").textContent = "현장 관리";
    const monthRecords = getMonthRecords();
    panel.innerHTML = `<div class="panel-stack">${sites.map((site, index) => `
      <button type="button" class="panel-card panel-edit" data-site="${index}"><div><strong>${escapeHtml(site.name)}</strong><span>${escapeHtml(site.area) || "위치 미입력"} · ${monthLabel} ${new Set(monthRecords.filter((r) => r.site === site.name).map((r) => r.date)).size}일</span></div><b class="edit-chip">수정</b></button>`).join("")}
      <button type="button" class="add-row" id="panelAddSite">+ 작업 현장 추가</button></div>`;
    panel.querySelectorAll("[data-site]").forEach((b) => b.addEventListener("click", () => openItemDialog("site", Number(b.dataset.site))));
    $("#panelAddSite").addEventListener("click", () => openItemDialog("site"));
  } else {
    $("#panelEyebrow").textContent = "나에게 맞게";
    $("#panelTitle").textContent = "설정";
    panel.innerHTML = `<div class="panel-stack">
      <h3 class="settings-heading">근무자 <small>${workers.length}명</small></h3>
      ${workers.map((w, index) => `<button type="button" class="panel-card panel-edit" data-worker-index="${index}"><div><strong>${escapeHtml(w.name)}</strong><span>1공수 ${formatWon(w.rate)}</span></div><b class="edit-chip">수정</b></button>`).join("")}
      <button type="button" class="add-row" id="settingsAddWorker">+ 근무자 추가</button>

      <h3 class="settings-heading">작업 현장 <small>${sites.length}곳</small></h3>
      ${sites.map((s, index) => `<button type="button" class="panel-card panel-edit" data-site-index="${index}"><div><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.area) || "위치 미입력"}</span></div><b class="edit-chip">수정</b></button>`).join("")}
      <button type="button" class="add-row" id="settingsAddSite">+ 작업 현장 추가</button>

      <h3 class="settings-heading">새 근무자 기본 단가</h3>
      <label class="panel-card"><div><strong>1공수 기본 단가</strong><span>근무자를 새로 추가할 때 먼저 채워져요.</span></div><input class="settings-rate" id="rateInput" inputmode="numeric" value="${dailyRate}" aria-label="1공수 기본 단가" /></label>
      <button class="primary-button" id="saveRate" type="button">기본 단가 저장</button>
    </div>`;
    panel.querySelectorAll("[data-worker-index]").forEach((b) => b.addEventListener("click", () => openItemDialog("worker", Number(b.dataset.workerIndex))));
    panel.querySelectorAll("[data-site-index]").forEach((b) => b.addEventListener("click", () => openItemDialog("site", Number(b.dataset.siteIndex))));
    $("#settingsAddWorker").addEventListener("click", () => openItemDialog("worker"));
    $("#settingsAddSite").addEventListener("click", () => openItemDialog("site"));
    $("#saveRate").addEventListener("click", () => {
      dailyRate = Math.max(0, Number($("#rateInput").value.replace(/[^0-9]/g, "")) || 0);
      localStorage.setItem(DAILY_RATE_KEY, String(dailyRate));
      showToast("기본 단가를 저장했습니다");
    });
  }
  if (!$("#panelDialog").open) $("#panelDialog").showModal();
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
$("#todayButton").addEventListener("click", () => { viewDate = new Date(today.getFullYear(), today.getMonth(), 1); renderCalendar(); openWorkDialog(today); });
$("#addWorkButton").addEventListener("click", () => openWorkDialog(today));
$("#workerInput").addEventListener("change", loadWorkForm);
$("#itemForm").addEventListener("submit", saveItem);
$("#itemClose").addEventListener("click", () => $("#itemDialog").close());
$("#itemDelete").addEventListener("click", deleteItem);
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
$("#deleteRecordButton").addEventListener("click", () => deleteRecord($("#selectedDate").value, $("#workerInput").value));
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
    openWorkDialog(today);
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
  for (const id of ["#itemDialog", "#bulkDialog", "#workDialog", "#installDialog", "#panelDialog", "#menuDialog"]) {
    if ($(id).open) { $(id).close(); return true; }
  }
  if (document.body.classList.contains("locked")) return false;
  if (bulk.active) { exitBulkMode(); return true; }
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

// ── 새 현장 추가 (입력창의 현장 선택에서) ──
function refreshSiteSelects(selectName) {
  for (const id of ["#siteInput", "#bulkSiteInput"]) {
    const select = $(id);
    const dialog = select.closest("dialog");
    if (!dialog.open) continue;
    const keep = select.value === "__new__" ? select.dataset.prev : select.value;
    fillSelect(select, sites, selectName && select.dataset.wantsNew === "1" ? selectName : keep);
    select.dataset.wantsNew = "";
  }
}
for (const id of ["#siteInput", "#bulkSiteInput"]) {
  $(id).addEventListener("change", (event) => {
    const select = event.target;
    if (select.value === "__new__") {
      select.dataset.wantsNew = "1";
      select.value = select.dataset.prev || "";
      openItemDialog("site");
    } else {
      select.dataset.prev = select.value;
    }
  });
}

// ── 일괄 수정 ──
// 달력에서 여러 날짜를 골라 같은 공수·현장으로 한꺼번에 입력/수정하거나 삭제합니다.

function enterBulkMode() {
  bulk.active = true;
  bulk.dates.clear();
  document.body.classList.add("bulk-mode");
  renderCalendar();
  $(".calendar-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitBulkMode() {
  bulk.active = false;
  bulk.dates.clear();
  document.body.classList.remove("bulk-mode");
  renderCalendar();
}

function toggleBulkDate(key) {
  if (bulk.dates.has(key)) bulk.dates.delete(key); else bulk.dates.add(key);
  renderCalendar();
}

function selectRecordedDays() {
  const prefix = monthPrefix();
  getMonthRecords().forEach((r) => { if (r.date.startsWith(prefix)) bulk.dates.add(r.date); });
  renderCalendar();
}

function renderBulkBar() {
  const n = bulk.dates.size;
  $("#bulkCount").textContent = n ? `${n}일 선택됨` : "날짜를 눌러 선택하세요";
  $("#bulkEdit").disabled = !n;
  $("#bulkDelete").disabled = !n || !records.some((r) => bulk.dates.has(r.date) && (currentWorker === "all" || r.worker === currentWorker));
}

function openBulkDialog() {
  const dates = [...bulk.dates].sort();
  const worker = currentWorker !== "all" ? currentWorker : workers[0].id;
  $("#bulkWorkerInput").innerHTML = workers.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");
  $("#bulkWorkerInput").value = worker;
  $("#bulkDates").textContent = dates.map((d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`).join(", ");
  $("#bulkDialogCount").textContent = `${dates.length}일`;
  fillSelect($("#bulkSiteInput"), sites, sites[0]?.name);
  $("#bulkMemoInput").value = "";
  document.querySelectorAll('input[name="bulkWork"]').forEach((input) => { input.checked = input.value === "1"; });
  updateBulkPreview();
  $("#bulkDialog").showModal();
}

function updateBulkPreview() {
  const worker = $("#bulkWorkerInput").value;
  const work = Number(document.querySelector('input[name="bulkWork"]:checked').value);
  const dates = [...bulk.dates];
  const existing = dates.filter((d) => findRecord(d, worker)).length;
  const rate = workerById(worker)?.rate ?? dailyRate;
  $("#bulkPreview").textContent = `새로 입력 ${dates.length - existing}일 · 덮어쓰기 ${existing}일 · 합계 ${formatWon(dates.length * work * rate)}`;
}

async function applyBulk(event) {
  event.preventDefault();
  const worker = $("#bulkWorkerInput").value;
  const site = $("#bulkSiteInput").value;
  if (!site || site === "__new__") { showToast("작업 현장을 선택해 주세요"); return; }
  const work = Number(document.querySelector('input[name="bulkWork"]:checked').value);
  const memo = $("#bulkMemoInput").value.trim();
  const dates = [...bulk.dates].sort();
  const ok = await askPasscode({ title: "일괄 수정", message: `${workerName(worker)}님 ${dates.length}일을 ${work.toFixed(1)}공수 · ${site}(으)로 저장할까요? 비밀번호를 입력해 주세요.`, confirm: "일괄 저장" });
  if (!ok) return;
  dates.forEach((date) => {
    const index = records.findIndex((r) => r.date === date && r.worker === worker);
    const prevMemo = index >= 0 ? records[index].memo : "";
    const next = { date, worker, work, site, memo: memo || prevMemo || "" };
    if (index >= 0) records[index] = next; else records.push(next);
  });
  saveRecords();
  $("#bulkDialog").close();
  exitBulkMode();
  showToast(`${dates.length}일 일괄 저장했습니다`);
}

async function bulkDelete() {
  const targets = records.filter((r) => bulk.dates.has(r.date) && (currentWorker === "all" || r.worker === currentWorker));
  if (!targets.length) return;
  const who = currentWorker === "all" ? "모든 근무자" : `${workerName(currentWorker)}님`;
  const ok = await askPasscode({ title: "일괄 삭제", message: `선택한 ${bulk.dates.size}일의 ${who} 기록 ${targets.length}건을 삭제할까요? 되돌릴 수 없어요. 비밀번호를 입력해 주세요.`, confirm: "삭제", danger: true });
  if (!ok) return;
  records = records.filter((r) => !targets.includes(r));
  saveRecords();
  exitBulkMode();
  showToast(`${targets.length}건 삭제했습니다`);
}

$("#bulkButton").addEventListener("click", enterBulkMode);
$("#bulkCancel").addEventListener("click", exitBulkMode);
$("#bulkSelectRecorded").addEventListener("click", selectRecordedDays);
$("#bulkClear").addEventListener("click", () => { bulk.dates.clear(); renderCalendar(); });
$("#bulkEdit").addEventListener("click", openBulkDialog);
$("#bulkDelete").addEventListener("click", bulkDelete);
$("#bulkForm").addEventListener("submit", applyBulk);
$("#bulkClose").addEventListener("click", () => $("#bulkDialog").close());
$("#bulkWorkerInput").addEventListener("change", updateBulkPreview);
document.querySelectorAll('input[name="bulkWork"]').forEach((input) => input.addEventListener("change", updateBulkPreview));
renderBulkBar();
$("#itemDialog").addEventListener("close", () => { document.querySelectorAll("#siteInput, #bulkSiteInput").forEach((el) => { el.dataset.wantsNew = ""; }); });
