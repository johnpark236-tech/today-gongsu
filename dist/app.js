const DAILY_RATE_KEY = "maeil-rate";
const RECORDS_KEY = "maeil-records";
const today = new Date(2026, 9, 7);
let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
let dailyRate = Number(localStorage.getItem(DAILY_RATE_KEY)) || 200000;
let hideMoney = false;

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
const koreanDate = (date) => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(date);

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
  renderRecent();
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
    const row = document.createElement("button");
    row.type = "button";
    row.className = "record-item";
    row.innerHTML = `
      <span class="record-date"><strong>${date.getDate()}</strong><span>${new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date)}</span></span>
      <span class="record-info"><strong>${item.site}</strong><span>${item.memo || "메모 없음"}</span></span>
      <span class="record-work"><strong>${item.work.toFixed(1)} 공수</strong><span>${hideMoney ? "금액 숨김" : formatWon(item.work * dailyRate)}</span></span>`;
    row.addEventListener("click", () => openWorkDialog(date, item));
    recordList.appendChild(row);
  });
  if (!items.length) recordList.innerHTML = `<div class="panel-card"><div><strong>아직 기록이 없습니다</strong><span>달력에서 날짜를 눌러 첫 공수를 기록해보세요.</span></div></div>`;
}

function openWorkDialog(date, record) {
  $("#dialogDate").textContent = koreanDate(date);
  $("#selectedDate").value = dateKey(date);
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

function saveRecord(event) {
  event.preventDefault();
  const date = $("#selectedDate").value;
  const next = {
    date,
    work: Number(document.querySelector('input[name="work"]:checked').value),
    site: $("#siteInput").value,
    memo: $("#memoInput").value.trim()
  };
  const index = records.findIndex((item) => item.date === date);
  if (index >= 0) records[index] = next; else records.push(next);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  $("#workDialog").close();
  renderCalendar();
  showToast("공수 기록을 저장했습니다");
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
document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  if (button.dataset.page !== "calendar") openPanel(button.dataset.page);
}));
document.querySelectorAll("[data-toast]").forEach((button) => button.addEventListener("click", () => showToast(button.dataset.toast)));

renderCalendar();
