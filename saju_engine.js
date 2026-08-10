// ═══════════════════════════════════════════════════════════════
// 사주 엔진 — 계산층 + 판정층 (런타임 AI 0, 전부 결정론)
// 검증 게이트: 장선미·김태우·김영우 3케이스 + 포스텔러 신살 대조
// Node(테스트)와 브라우저(앱) 양쪽에서 동작
// ═══════════════════════════════════════════════════════════════
(function (global) {
'use strict';

const STEMS = ['갑','을','병','정','무','기','경','신','임','계'];
const STEMS_H = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const BRANCHES_H = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const STEM_ELEM = ['목','목','화','화','토','토','금','금','수','수'];
const STEM_YANG = [1,0,1,0,1,0,1,0,1,0];
const BRANCH_ELEM = ['수','토','목','목','토','화','화','토','금','금','토','수'];
const BRANCH_YANG = [1,0,1,0,1,0,1,0,1,0,1,0];
// 지장간 (여기/중기/정기 — 정기 마지막)
const HIDDEN = [
  ['임','계'],['계','신','기'],['무','병','갑'],['갑','을'],['을','계','무'],['무','경','병'],
  ['병','기','정'],['정','을','기'],['무','임','경'],['경','신'],['신','정','무'],['무','갑','임']
];
const ELEM_GEN = {목:'화',화:'토',토:'금',금:'수',수:'목'}; // 생
const ELEM_CTRL = {목:'토',토:'수',수:'화',화:'금',금:'목'}; // 극

function gz(n){ n=((n%60)+60)%60; return { idx:n, stem:n%10, branch:n%12,
  str:STEMS[n%10]+BRANCHES[n%12], han:STEMS_H[n%10]+BRANCHES_H[n%12] }; }

// ── 십성 ──
function tenGod(dayStem, stem){
  const de = STEM_ELEM[dayStem], se = STEM_ELEM[stem];
  const same = STEM_YANG[dayStem] === STEM_YANG[stem];
  if (se === de) return same ? '비견' : '겁재';
  if (ELEM_GEN[de] === se) return same ? '식신' : '상관';
  if (ELEM_CTRL[de] === se) return same ? '편재' : '정재';
  if (ELEM_CTRL[se] === de) return same ? '편관' : '정관';
  if (ELEM_GEN[se] === de) return same ? '편인' : '정인';
  return '?';
}
function tenGodBranch(dayStem, branch){
  // 지지 십성 = 정기(본기) 천간 기준
  const main = HIDDEN[branch][HIDDEN[branch].length-1];
  return tenGod(dayStem, STEMS.indexOf(main));
}

// ── 계산층 ──
// ★한국 표준시 변경 이력 (IANA tz: Asia/Seoul). 이 시기 출생자는 시주가 통째로 달라진다.
//   1908-04-01~1911-12-31 = UTC+8:30 / 1912-01-01~1954-03-20 = +9:00
//   1954-03-21~1961-08-09 = UTC+8:30 / 1961-08-10~ = +9:00
const STD_EPOCHS = [
  { y:1908, m:4,  d:1,  off:510 },
  { y:1912, m:1,  d:1,  off:540 },
  { y:1954, m:3,  d:21, off:510 },
  { y:1961, m:8,  d:10, off:540 },
];
function stdOffsetMin(y, m, d) {
  const k = (y*12 + (m-1))*31 + (d-1);
  let off = 540;
  for (const e of STD_EPOCHS) {
    if (k >= (e.y*12 + (e.m-1))*31 + (e.d-1)) off = e.off; else break;
  }
  return off;
}
// ★균시차(Equation of Time) — 지구 궤도 이심률·자전축 기울기로 진태양시가 ±16분 어긋남
function equationOfTimeMin(y, m, d) {
  const start = Date.UTC(y, 0, 1);
  const n = Math.floor((Date.UTC(y, m-1, d) - start) / 86400000) + 1; // 연중 일수
  const B = 2 * Math.PI * (n - 81) / 364;
  return 9.87 * Math.sin(2*B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

// 서머타임 (KST 기준 실제 시행 기간, 시계가 1시간 빠름 → 출생 시각에서 -1h)
const DST = [
  ['1948-06-01','1948-09-13'],['1949-04-03','1949-09-11'],['1950-04-01','1950-09-10'],
  ['1951-05-06','1951-09-09'],['1955-05-05','1955-09-09'],['1956-05-20','1956-09-30'],
  ['1957-05-05','1957-09-22'],['1958-05-04','1958-09-21'],['1959-05-03','1959-09-20'],
  ['1960-05-01','1960-09-18'],['1987-05-10','1987-10-11'],['1988-05-08','1988-10-09']
];
function inDST(iso){ return DST.some(([a,b]) => iso >= a && iso <= b); }

function calcPillars(y, m, d, hh, mm, opts = {}) {
  const terms = opts.terms; // solar_terms JSON 필수
  const lonCorr = opts.lonMinutes ?? -32; // 서울 진태양시 보정(분)
  const useDST = opts.autoDST ?? true;

  // 1) 시각 보정: 서머타임 → 표준시 이력 → 경도 → 균시차
  const dateISO = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  let t = new Date(Date.UTC(y, m-1, d, hh, mm)); // 벽시계를 UTC슬롯에 담아 산술만 사용
  const dstApplied = useDST && inDST(dateISO);
  if (dstApplied) t = new Date(t.getTime() - 3600000);
  // ★표준시 이력 보정: 그 시대 표준자오선이 127.5°(+8:30)였다면 경도보정을 그만큼 덜 해야 함
  const stdOff = stdOffsetMin(y, m, d);
  const stdAdjust = 540 - stdOff;          // +8:30 시기면 30분
  // ★균시차: 기본 OFF. 근거 = 포스텔러 PDF 헤더 실측 "05:50 → 05:18(지역시 -32분)"으로
  //   경도 보정만 적용됨이 확인됨(균시차를 쓰면 05:22). 사장님 룰 = 만세력 기준 우선.
  const eot = (opts.applyEoT === true) ? equationOfTimeMin(y, m, d) : 0;
  const tTrue = new Date(t.getTime() + (lonCorr + stdAdjust + eot) * 60000); // 진태양시(시주 판정용)

  // 2) 일주 경계 — 학파 옵션
  //    'standard'(기본): 표준시(벽시계) 자정 기준. 한국 만세력 통용.
  //    'truesolar': 진태양시 자정 기준(경도 보정 후 날짜가 바뀌면 따라감).
  //    'jasi': 정자시설 — 23:00부터 다음 날 일주로 넘김.
  const dayRule = opts.dayBoundary || 'standard';
  let civil = t;
  if (dayRule === 'truesolar') civil = tTrue;
  else if (dayRule === 'jasi') {
    const hhm = t.getUTCHours() * 60 + t.getUTCMinutes();
    if (hhm >= 23 * 60) civil = new Date(t.getTime() + 3600000); // 23시 이후 → 익일
  }
  const refUTC = Date.UTC(1949, 9, 1);
  const dayN = Math.floor((Date.UTC(civil.getUTCFullYear(), civil.getUTCMonth(), civil.getUTCDate()) - refUTC) / 86400000);
  let dayGZ = gz(dayN);

  // 3) 년주 — 입춘 시각 기준
  //    ★절기는 천문학적 절대 순간이므로 "표준시 벽시계"(서머타임만 보정)로 판정한다.
  //      진태양시(경도·균시차 보정)로 판정하면 절기 경계 출생자의 년·월주가 틀린다.
  const termBasis = t;                       // 서머타임 보정 후 표준시
  const yr = termBasis.getUTCFullYear();
  const lichun = terms[String(yr)]['입춘']; // 'YYYY-MM-DDTHH:MM' KST
  const civilISO = isoOf(termBasis);
  const sajuYear = civilISO >= lichun ? yr : yr - 1;
  const yearGZ = gz(sajuYear - 1984); // 1984 = 갑자년

  // 4) 월주 — 12절 경계. 해당 사주년의 입춘부터 순서대로.
  const TERM_ORDER = ['입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설','소한'];
  // 사주년 y의 월 경계: y년 입춘~소한(익년 1월) — 소한은 y+1년 1월에 위치
  const bounds = [];
  for (let i = 0; i < 12; i++) {
    const tn = TERM_ORDER[i];
    const ty = (tn === '소한') ? sajuYear + 1 : sajuYear;
    bounds.push(terms[String(ty)][tn]);
  }
  let monthIdx = 0; // 0=인월
  for (let i = 11; i >= 0; i--) { if (civilISO >= bounds[i]) { monthIdx = i; break; } }
  // 월지: 인(2)부터 순행
  const monthBranch = (2 + monthIdx) % 12;
  // 월두법: 갑기→병인, 을경→무인, 병신→경인, 정임→임인, 무계→갑인
  const YIN_STEM = {0:2,5:2,1:4,6:4,2:6,7:6,3:8,8:8,4:0,9:0};
  const monthStem = (YIN_STEM[yearGZ.stem] + monthIdx) % 10;

  // 5) 시주 — 진태양시 기준 12시진
  const tm = tTrue.getUTCHours() * 60 + tTrue.getUTCMinutes();
  // 자시 23:00~01:00, 축 01~03, ... (경계: 홀수시 정각)
  let hourBranch = Math.floor(((tm + 60) % 1440) / 120); // 23:00→0(자)
  // 시두법: 갑기→갑자시, 을경→병자시, 병신→무자시, 정임→경자시, 무계→임자시
  const ZI_STEM = {0:0,5:0,1:2,6:2,2:4,7:4,3:6,8:6,4:8,9:8};
  const hourStem = (ZI_STEM[dayGZ.stem] + hourBranch) % 10;

  return {
    year: yearGZ, month: gz2(monthStem, monthBranch), day: dayGZ, hour: gz2(hourStem, hourBranch),
    meta: { sajuYear, monthIdx, dstApplied, stdOffsetMin: stdOff,
      eotMin: Math.round(eot*10)/10, trueTime: isoOf(tTrue), civilTime: isoOf(civil) }
  };
}
function gz2(s, b){ return { stem:s, branch:b, str:STEMS[s]+BRANCHES[b], han:STEMS_H[s]+BRANCHES_H[b] }; }
function isoOf(dt){
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}T${String(dt.getUTCHours()).padStart(2,'0')}:${String(dt.getUTCMinutes()).padStart(2,'0')}`;
}

// ── 대운 간지의 결합 상태: 개두(蓋頭)·절각(截脚) ──
// 임철초 적천수천미: 한 대운은 10년을 함께 관장하므로 기계적으로 5년씩 쪼개지 말 것.
// 단 천간·지지가 서로 극하면(개두·절각) 성질이 갈리므로 그때만 전·후반을 나눠 본다.
function daewoonBond(stem, branch) {
  const se = STEM_ELEM[stem], be = BRANCH_ELEM[branch];
  if (se === be) return { type:'전일', desc:'천간과 지지가 같은 기운이라 10년이 한 방향으로 몰립니다' };
  if (ELEM_CTRL[se] === be) return { type:'개두', desc:'위 글자가 아래 글자를 누르는 모양이라, 겉과 속이 다르게 흐르는 10년입니다' };
  if (ELEM_CTRL[be] === se) return { type:'절각', desc:'아래 글자가 위 글자의 뿌리를 자르는 모양이라, 뜻은 있어도 발이 묶이기 쉬운 10년입니다' };
  if (ELEM_GEN[se] === be || ELEM_GEN[be] === se) return { type:'상생', desc:'천간과 지지가 서로 도와 기운이 순하게 이어지는 10년입니다' };
  return { type:'무관', desc:null };
}

// ── 합충 상쇄 게이트 — 충 경보 과잉 방지 ──
// 원국·운에 육합/삼합이 있으면 충이 풀린다(합해충). 용신운이면 충도 역동으로 읽는다.
const YUKHAP = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
const SAMHAP = [[8,0,4],[11,3,7],[2,6,10],[5,9,1]]; // 신자진 해묘미 인오술 사유축
function clashLevel(targetBranch, runBranch, allBranches, isYongshin) {
  if ((targetBranch + 6) % 12 !== runBranch) return { level:0, note:null };
  let level = 2; const relief = [];
  // ① 육합으로 묶여 있으면 완화
  if (allBranches.some(b => YUKHAP.some(([x,y]) => (x===b&&y===runBranch)||(y===b&&x===runBranch)))) {
    level--; relief.push('합이 들어 충을 눅여줍니다');
  }
  // ② 삼합국을 이루면 완화
  if (SAMHAP.some(g => g.includes(runBranch) && g.filter(x => allBranches.includes(x)).length >= 2)) {
    level--; relief.push('삼합이 이뤄져 흔들림이 방향을 얻습니다');
  }
  // ③ 용신운이면 충도 역동으로
  if (isYongshin) { level--; relief.push('필요한 기운이 함께 들어오는 시기라 변화가 기회 쪽으로 기웁니다'); }
  return { level: Math.max(0, level), relief };
}

// ── 대운 ──
function calcDaewoon(pillars, gender, terms) {
  // 순행: 양남음녀 / 역행: 음남양녀 (년간 음양 기준)
  const yang = STEM_YANG[pillars.year.stem] === 1;
  const forward = (yang && gender === 'M') || (!yang && gender === 'F');
  // 대운수: 생일~다음(순행)/이전(역행) 절입일까지 일수 / 3 (반올림, 최소 1)
  const civil = pillars.meta.civilTime;
  const TERM_ORDER = ['입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설','소한'];
  const sy = pillars.meta.sajuYear;
  const all = [];
  for (let y = sy - 1; y <= sy + 1; y++) {
    for (const tn of TERM_ORDER) {
      const ty = (tn === '소한') ? y + 1 : y;
      if (terms[String(ty)]) all.push(terms[String(ty)][tn]);
    }
  }
  all.sort();
  let daysGap;
  if (forward) {
    const next = all.find(t => t > civil);
    daysGap = (parse(next) - parse(civil)) / 86400000;
  } else {
    const prev = [...all].reverse().find(t => t <= civil);
    daysGap = (parse(civil) - parse(prev)) / 86400000;
  }
  let start = Math.round(daysGap / 3); if (start < 1) start = 1;
  const list = [];
  let mIdx = pillars.month.stem * 6 % 60; // 월주 60갑자 idx 계산
  // 월주 idx 정확 계산
  for (let i = 0; i < 60; i++) { const g = gz(i); if (g.stem === pillars.month.stem && g.branch === pillars.month.branch) { mIdx = i; break; } }
  // 전 생애 표가 80대에서 끊기지 않도록 10대운(약 100년)을 계산한다.
  for (let i = 1; i <= 10; i++) {
    const g = gz(forward ? mIdx + i : mIdx - i);
    list.push({ age: start + (i-1)*10, ...g });
  }
  return { forward, start, list };
}
function parse(iso){ const [d, t] = iso.split('T'); const [y,m,dd] = d.split('-').map(Number); const [h,mi] = t.split(':').map(Number); return Date.UTC(y, m-1, dd, h, mi); }

// ── 판정층 ──
// opts.knowTime === false → 시주를 판정에서 통째로 제외 (3주만으로 해석)
function analyze(pillars, opts = {}) {
  const knowTime = opts.knowTime !== false;
  const P = knowTime ? [pillars.year, pillars.month, pillars.day, pillars.hour]
                     : [pillars.year, pillars.month, pillars.day];
  const dayStem = pillars.day.stem;
  const dayElem = STEM_ELEM[dayStem];

  // 오행 분포 (본기 8자)
  const elem = {목:0,화:0,토:0,금:0,수:0};
  P.forEach(p => { elem[STEM_ELEM[p.stem]]++; elem[BRANCH_ELEM[p.branch]]++; });
  const missing = Object.keys(elem).filter(k => elem[k] === 0);
  const excess = Object.keys(elem).filter(k => elem[k] >= 4);

  // 십성 분포
  const tg = {};
  P.forEach((p, i) => {
    if (i !== 2) { const g = tenGod(dayStem, p.stem); tg[g] = (tg[g]||0)+1; }
    const gb = tenGodBranch(dayStem, p.branch); tg[gb] = (tg[gb]||0)+1;
  });
  const grp = { 비겁:(tg['비견']||0)+(tg['겁재']||0), 식상:(tg['식신']||0)+(tg['상관']||0),
    재성:(tg['편재']||0)+(tg['정재']||0), 관성:(tg['편관']||0)+(tg['정관']||0), 인성:(tg['편인']||0)+(tg['정인']||0) };

  // 왕상휴수사 (월령 대비 일간 상태)
  const ws = wangsang(dayElem, BRANCH_ELEM[pillars.month.branch]);

  // ── 신강약 v2: 득령(왕상휴수사) + 득지·득세(지장간 통근) + 투간 ──
  // 문헌 공통분모: 왕상휴수사표·지장간 월률분야표는 원전 일치.
  // ※ 가중치 상수는 원전에 없음(현대 창작 영역) → CONFIG로 분리해 캘리브레이션 가능하게.
  const SCONF = analyze.CONFIG || DEFAULT_STRENGTH_CONFIG;
  const isAlly = e => (e === dayElem) || (ELEM_GEN[e] === dayElem); // 비겁 or 인성
  let help = 0, enemy = 0;
  // ① 득령: 월지 왕상휴수사
  const monthAlly = isAlly(BRANCH_ELEM[pillars.month.branch]);
  // ② 득지·득세: 4지지의 지장간 레이어별 통근 (먼저 계산 — 실령 상쇄 판정에 필요)
  const POS_W = SCONF.POS_W; // 년/월/일/시
  let jeonggiAllyRoots = 0;
  P.forEach((p, i) => {
    const layers = JIJANGGAN_DAYS[p.branch];
    layers.forEach(([stemName, days], li) => {
      const e = STEM_ELEM[STEMS.indexOf(stemName)];
      const role = (li === layers.length - 1) ? '정기' : (li === 0 ? '여기' : '중기');
      const w = SCONF.ROOT_W[role] * POS_W[i];
      if (isAlly(e)) {
        help += w;
        if (role === '정기') jeonggiAllyRoots++;
        // 인성(나를 생하는 오행)은 생조가 지속되므로 별도 가산
        if (ELEM_GEN[e] === dayElem) help += SCONF.W_INSUNG;
      } else enemy += w;
    });
  });
  // ① 득령: 월지 왕상휴수사. 실령이어도 정기 아군 뿌리 2곳 이상이면 페널티 완화(약변강)
  if (monthAlly) help += ws.score * SCONF.W_MONTH;
  else {
    const damp = (jeonggiAllyRoots >= 2) ? SCONF.SILRYEONG_OFFSET : 1;
    enemy += (1 - ws.score) * SCONF.W_MONTH * damp;
  }
  // ③ 투간: 일간 외 천간 3개. 뿌리 깊이별 차등 + 일간과 합한 적 천간은 작용 감쇠(합거)
  P.forEach((p, i) => {
    if (i === 2) return; // 일간 제외
    const e = STEM_ELEM[p.stem];
    let deep = false, shallow = false;
    P.forEach(q => JIJANGGAN_DAYS[q.branch].forEach(([sn], li) => {
      if (STEM_ELEM[STEMS.indexOf(sn)] !== e) return;
      const layers = JIJANGGAN_DAYS[q.branch];
      const role = (li === layers.length - 1) ? '정기' : (li === 0 ? '여기' : '중기');
      if (role === '여기') shallow = true; else deep = true;
    }));
    let w = SCONF.W_STEM * (deep ? SCONF.ROOT_BONUS_DEEP : shallow ? SCONF.ROOT_BONUS_SHALLOW : 1);
    const ally = isAlly(e);
    // 일간과 천간합(차이 5)이면 그 글자의 극·설 작용이 묶인다
    if (!ally && Math.abs(p.stem - dayStem) === 5) w *= SCONF.HAP_DAMP;
    if (ally) help += w; else enemy += w;
  });
  const ratio = help / (help + enemy);
  let strength;
  if (ratio >= SCONF.BANDS.태강) strength = '태강';
  else if (ratio >= SCONF.BANDS.신강) strength = '신강';
  else if (ratio > SCONF.BANDS.중화) strength = '중화';
  else if (ratio > SCONF.BANDS.신약) strength = '신약';
  else strength = '태약';
  const monthSupport = monthAlly;
  const strengthDetail = { help: Math.round(help*100)/100, enemy: Math.round(enemy*100)/100,
    ratio: Math.round(ratio*1000)/1000, deukryeong: monthAlly && ws.score >= 0.8,
    deukji: isAlly(BRANCH_ELEM[pillars.day.branch]), wangsang: ws.state };
  // 조후용신 (궁통보감) + 한난조습
  const johu = johuYongshin(dayStem, pillars.month.branch);
  const temp = hannan(elem, pillars.month.branch);

  // 용신 (억부): 원국에 실제로 작동하는 글자를 먼저 취한다.
  // 종전 코드는 신강할수록 원국에 0개인 오행을 최우선으로 골랐다. 그 값은
  // '필요한 기운'일 수는 있어도 원국의 용신처럼 말할 수 없다. 이제는
  // ① 원국에 있는 후보를 우선하고 ② 전부 없을 때만 운에서 기다리는 기운으로 표시한다.
  let yongshin, yongshinMode = '균형', yongshinRole = null;
  if (strength === '태강' || strength === '신강') {
    const cands = [['식상', ELEM_GEN[dayElem]], ['재성', ELEM_CTRL[dayElem]], ['관성', Object.keys(ELEM_CTRL).find(k=>ELEM_CTRL[k]===dayElem)]];
    const present = cands.filter(([, e]) => elem[e] > 0);
    const picked = present[0] || cands[0]; // 태강·신강은 먼저 설기(식상), 다음 재성·관성
    [yongshinRole, yongshin] = picked;
    yongshinMode = present.length ? '원국취용' : '운대기';
  } else if (strength === '신약' || strength === '태약') {
    const ins = Object.keys(ELEM_GEN).find(k => ELEM_GEN[k] === dayElem);
    const cands = [['인성', ins], ['비겁', dayElem]];
    const present = cands.filter(([, e]) => elem[e] > 0);
    const picked = present[0] || cands[0]; // 신약·태약은 먼저 생조(인성), 다음 비겁
    [yongshinRole, yongshin] = picked;
    yongshinMode = present.length ? '원국취용' : '운대기';
  } else {
    yongshin = null;
    yongshinMode = '중화';
  }

  // 조후 우선 판정: 한/난이 극단이고 조후용신 오행이 원국에 부족하면 조후를 최종 용신으로
  let finalYongshin = yongshin, yongshinBasis = '억부';
  if (johu && (temp.label === '한(寒)' || temp.label === '난조(暖燥)')) {
    if (elem[johu.mainElem] <= 1) {
      finalYongshin = johu.mainElem;
      yongshinBasis = '조후';
      yongshinRole = '조후';
      yongshinMode = elem[finalYongshin] > 0 ? '원국취용' : '운대기';
    }
  }
  if (johu && finalYongshin === johu.mainElem && yongshinBasis === '억부') yongshinBasis = '억부·조후 일치';
  let yongshinInChart = !!(finalYongshin && elem[finalYongshin] > 0);

  // ── 격국 (자평진전 계열: 월지에서 격을 정한다) ──
  // 절차: ①월지 지장간 중 천간에 투출한 것이 있으면 그 십성으로 격
  //      ②복수 투출이면 정기 우선, 정기 미투출이면 세력 강한 쪽
  //      ③아무것도 투출 안 하면 월지 정기의 십성으로
  //      ④월지가 비겁이면 격으로 삼지 않고 건록격(비견)·양인격(겁재)
  const mb = pillars.month.branch;
  const monthHidden = JIJANGGAN_DAYS[mb].map(([sn]) => STEMS.indexOf(sn));
  const otherStems = knowTime ? [pillars.year.stem, pillars.month.stem, pillars.hour.stem]
                              : [pillars.year.stem, pillars.month.stem]; // 일간 제외
  const tuchul = monthHidden.filter(hs => otherStems.includes(hs));
  const jeonggi = monthHidden[monthHidden.length - 1];
  const isBigeop = hs => ['비견','겁재'].includes(tenGod(dayStem, hs));
  // 건록지: 갑인 을묘 병무사 정기오 경신 신유 임해 계자
  const ROKJI = {0:2,1:3,2:5,4:5,3:6,5:6,6:8,7:9,8:11,9:0};
  const WANGJI = [0,3,6,9]; // 자묘유오
  let gyeok;
  if (ROKJI[dayStem] === mb) {
    // 월지가 일간의 건록지 → 건록격 (정기가 비견)
    gyeok = { name:'건록격', stem: STEMS[jeonggi], basis:'월지가 일간의 록(祿)', tuchul: tuchul.map(s=>STEMS[s]) };
  } else if (WANGJI.includes(mb) && STEM_YANG[dayStem] && tenGod(dayStem, jeonggi) === '겁재') {
    // 양간 + 왕지 + 정기가 겁재 → 양인격 (갑묘 병무오 경유 임자)
    gyeok = { name:'양인격', stem: STEMS[jeonggi], basis:'양간이 왕지의 겁재를 봄 — 양인', tuchul: tuchul.map(s=>STEMS[s]) };
  } else {
    // ★비겁은 격 후보에서 제외 — 잡기월(진술축미)에서 정기토가 일간과 같아도 격으로 안 삼는다
    const cands = [jeonggi, ...(monthHidden.length===3?[monthHidden[1]]:[]), monthHidden[0]]
      .filter(hs => hs !== undefined && !isBigeop(hs) && tuchul.includes(hs));
    let gyeokStem, gyeokBasis;
    if (cands.length) {
      gyeokStem = cands[0];
      gyeokBasis = (gyeokStem === jeonggi) ? '정기 투출' : '잡기 투출(여기·중기)';
    } else if (!isBigeop(jeonggi)) {
      gyeokStem = jeonggi; gyeokBasis = '무투출 — 월지 정기';
    } else {
      gyeok = { name:'건록격', stem: STEMS[jeonggi], basis:'월겁(무투출)', tuchul: tuchul.map(s=>STEMS[s]) };
      gyeokStem = null;
    }
    if (gyeokStem !== null && gyeokStem !== undefined) {
      gyeok = { name: tenGod(dayStem, gyeokStem) + '격', stem: STEMS[gyeokStem],
        basis: gyeokBasis, tuchul: tuchul.map(s=>STEMS[s]) };
    }
  }

  // ── 성격(成格)/파격(破格) — 격과 일간 힘의 정합성 (자평진전: 길신 순용·흉신 역용) ──
  // 길신격(정관·정재·정인·식신)은 일간이 감당할 힘이 있어야 성격.
  // 흉신격(편관·상관·편인·양인)은 제화(制化)해줄 글자가 있어야 성격.
  const strong = ['태강','신강'].includes(strength);
  const midOrUp = ['중화','신강','태강'].includes(strength);
  // 격은 월령에서 나오므로, 월지가 충을 맞았는지가 자평진전 파격 조건의 하나(刑沖)
  // [8/6 수정] 시간 모름이면 내부 가정 시지(12:00=午)가 섞여 없는 시주가 파격을 만들었다(1차 치명-5 재발)
  const _clashSrc = [pillars.year.branch, pillars.day.branch]
    .concat(opts && opts.knowTime === false ? [] : [pillars.hour.branch]);
  const monthClashed = _clashSrc.some(b => (b + 6) % 12 === pillars.month.branch);
  const GIL = ['정관격','정재격','정인격','식신격'];
  const HYUNG = ['편관격','상관격','편인격','양인격'];
  let seonggyeok = null;
  if (gyeok) {
    if (GIL.includes(gyeok.name)) {
      seonggyeok = midOrUp
        ? { ok:true, axis:'힘', note:`${gyeok.name}은 일간이 감당할 힘이 있어야 빛나는 격입니다. 이 사주는 그 힘을 갖췄습니다.` }
        : { ok:false, axis:'힘', note:`${gyeok.name}이지만 일간의 힘이 약합니다. 좋은 것을 받아도 감당이 버거우니, 인성·비겁이 들어오는 시기에 비로소 제 몫을 합니다.` };
    } else if (HYUNG.includes(gyeok.name)) {
      const jehwa = gyeok.name === '편관격' ? (grp.식상 > 0 || grp.인성 > 0)
        : gyeok.name === '상관격' ? (grp.재성 > 0 || grp.인성 > 0)
        : gyeok.name === '편인격' ? (grp.재성 > 0 || grp.식상 > 0)
        : (grp.관성 > 0);
      // [8/6] 이 분기는 제화 글자의 유무만 본다(강약 무관). 화면 라벨이 이 사실과 맞도록 axis를 넘긴다.
      seonggyeok = jehwa
        ? { ok:true, axis:'제화', note:`${gyeok.name}은 다스려질 때 강한 무기가 되는 격인데, 이 사주엔 그 제어 장치가 있습니다.` }
        : { ok:false, axis:'제화', note:`${gyeok.name}은 제어해줄 글자가 있어야 힘을 씁니다. 지금은 그 장치가 약해, 운에서 들어올 때 기회가 크게 열립니다.` };
    } else {
      seonggyeok = strong
        ? { ok:true, axis:'힘', note:'스스로 서는 격이라 일간이 튼튼한 것이 그대로 강점이 됩니다. 재성·관성을 만나면 그릇이 완성됩니다.' }
        : { ok:false, axis:'힘', note:'스스로 서는 격인데 일간의 힘이 아직 여물지 않았습니다. 뿌리를 키우는 시기가 지나면 달라집니다.' };
    }
    gyeok.seonggyeok = seonggyeok;

    // ── [8/6 신설] 자평진전 「論用神成敗救應」 8격 성패·구응 ──
    // 원문: "用神專尋月令，以四柱配之，必有成敗" / "成中有敗，必是帶忌；敗中有成，全憑救應"
    // 위 seonggyeok은 일간의 힘만 보는 개략 판정이라, 자평진전의 실제 조건(재·인 유무·
    // 상관의 극·형충·효신 탈식 등)을 별도로 판정한다. 유파: 자평진전 월령 격국법.
    gyeok.jpjj = gyeokSeongpae(gyeok.name, tg, grp, monthClashed, strength, dayElem, BRANCH_ELEM[pillars.month.branch]);

    // ── [8/6 신설] 격국 고저(高低) — 자평진전 「論用神格局高低」 ──
    // 원문: "然其理之大綱，亦在有情、有力無力之間而已"
    //   = 고저를 가르는 대원칙은 유정(有情)/무정 · 유력(有力)/무력 두 축에 있다.
    //   유정 = 순용·역용이 서로 부딪히지 않고 자연스럽게 배합된 것
    //   유력 = 일간과 용신이 뿌리·통근·시령을 얻어 힘이 실린 것 (허부虛浮의 반대)
    // ※ 원문은 이어서 구체 사례로 설명하는데, 우리는 사례가 아니라 두 축의 성립 여부만 본다.
    //   따라서 이것은 등급이 아니라 "무엇이 강하고 무엇이 약한지"를 보여주는 좌표다.
    gyeok.gojeo = gyeokGojeo(gyeok, strengthDetail, monthSupport, monthClashed);
    gyeok.sangshin = findSangshin(gyeok.name, tg, grp, gyeok.jpjj && gyeok.jpjj.ok);

    // 억부가 큰 방향을 정한 뒤, 같은 방향 안에서는 격의 상신으로 구체화한다.
    // 자평진전의 월령용신(격)과 현대 억부용신을 같은 말로 섞지 않고,
    // 조후가 급한 명식은 건드리지 않으며 상신이 원국에 실제 있을 때만 채택한다.
    if (yongshinBasis !== '조후' && gyeok.sangshin && gyeok.sangshin.found) {
      const sn = gyeok.sangshin.name || '';
      const sgGroup = /식신|상관|식상/.test(sn) ? '식상' : /재/.test(sn) ? '재성'
        : /관|칠살/.test(sn) ? '관성' : /인/.test(sn) ? '인성' : /비|겁/.test(sn) ? '비겁' : null;
      const insElem = Object.keys(ELEM_GEN).find(k => ELEM_GEN[k] === dayElem);
      const groupElem = {
        식상: ELEM_GEN[dayElem], 재성: ELEM_CTRL[dayElem],
        관성: Object.keys(ELEM_CTRL).find(k => ELEM_CTRL[k] === dayElem),
        인성: insElem, 비겁: dayElem,
      };
      const sgElem = groupElem[sgGroup];
      const allowed = ['태강','신강'].includes(strength) ? ['식상','재성','관성']
        : ['신약','태약'].includes(strength) ? ['인성','비겁']
        : ['식상','재성','관성','인성','비겁'];
      if (sgElem && allowed.includes(sgGroup) && elem[sgElem] > 0) {
        const same = finalYongshin === sgElem;
        finalYongshin = sgElem;
        yongshinRole = sgGroup;
        yongshinMode = '원국취용';
        yongshinBasis = same ? '억부·격국 일치' : '격국·상신';
        yongshinInChart = true;
      }
    }
  }

  // ── [8/6 신설] 종격(從格) 판정 ──
  // 근거: 자평진전 「論從化」 / 적천수 「從象」. 두 책이 프레임을 달리하고, 진종·가종의
  //   허용 범위도 유파마다 갈린다(엄격파=인성·비겁 완전 부재 / 완화파=미약한 뿌리 허용).
  //   따라서 앱은 이를 "확정"이 아니라 "이 사주는 종격으로 읽는 유파가 있다"는 신호로 낸다.
  const jong = detectJonggyeok(tg, grp, strengthDetail, strength, monthSupport);
  // [8/6 3차수정] 종격 후보인데 화면 처방은 정격(억부·조후) 값 그대로라, 종격이 "거스른다"고 한
  //   오행이 처방으로 표시되는 모순이 93.4%였다. 경고만 붙이는 것으로는 부족해
  //   종격 기준 처방을 실제로 계산해 함께 보여준다(단정이 아니라 병기).
  if (jong) {
    const insungElem = Object.keys(ELEM_GEN).find(k => ELEM_GEN[k] === dayElem);
    const FOLLOW_ELEM = {
      관성: Object.keys(ELEM_CTRL).find(k => ELEM_CTRL[k] === dayElem),
      재성: ELEM_CTRL[dayElem],
      식상: ELEM_GEN[dayElem],
      인성: insungElem,
      비겁: dayElem,
    };
    jong.yongshin = FOLLOW_ELEM[jong.follow] || null;
    // 종격에서 거스르는 기운 = 일간을 돕는 쪽(인성·비겁). 종왕·종강은 반대로 관성·재성.
    jong.against = (jong.follow === '인성' || jong.follow === '비겁')
      ? [Object.keys(ELEM_CTRL).find(k => ELEM_CTRL[k] === dayElem), ELEM_CTRL[dayElem]].filter(Boolean)
      : [insungElem, dayElem].filter(Boolean);
    jong.conflictsWithFinal = !!(finalYongshin && jong.against.includes(finalYongshin));
  }

  // ── 십성 조합(組合) ──
  // 낱개 십성의 개수보다 '무엇이 무엇을 낳고/제어하는가'를 먼저 읽기 위한 층이다.
  // 카운트만으로 성립을 확정하지 않고, 격·상신과 맞물리면 '주요', 아니면 '후보'로 낸다.
  const patterns = detectTenGodPatterns(tg, grp, strength, gyeok);

  // ── 납음·태원·명궁·신궁 ──
  const nayinTable = {
    년: nayin(pillars.year.stem, pillars.year.branch),
    월: nayin(pillars.month.stem, pillars.month.branch),
    일: nayin(pillars.day.stem, pillars.day.branch),
  };
  if (knowTime) nayinTable.시 = nayin(pillars.hour.stem, pillars.hour.branch);
  const taewonGZ = taewon(pillars.month.stem, pillars.month.branch);
  taewonGZ.nayin = nayin(taewonGZ.stem, taewonGZ.branch);
  let myeongGZ = null, sinGZ = null;
  if (knowTime) {
    myeongGZ = myeonggung(pillars.month.branch, pillars.hour.branch, pillars.year.stem);
    myeongGZ.nayin = nayin(myeongGZ.stem, myeongGZ.branch);
    sinGZ = singung(pillars.month.branch, pillars.hour.branch, pillars.year.stem);
    sinGZ.nayin = nayin(sinGZ.stem, sinGZ.branch);
  }

  // 합충형해공망
  const rel = detectRelations(P);  // P는 이미 시주 제외 반영
  const gongmang = calcGongmang(pillars.day);

  // 신살 (만세력 기준 — 풍성하게)
  const sinsal = detectSinsal(pillars, knowTime);

  // 12운성·12신살 (기둥별)
  const POSK = ['년','월','일','시'];
  const unsungTable = {}, sinsal12Table = {};
  P.forEach((p, i) => {
    unsungTable[POSK[i]] = unsung12(dayStem, p.branch);
    // 년주 칸은 일지 기준, 나머지는 년지 기준 (포스텔러 실측 역산)
    const base = (i === 0) ? pillars.day.branch : pillars.year.branch;
    sinsal12Table[POSK[i]] = sinsal12(base, p.branch);
  });

  // 특수격 라벨
  const labels = [];
  missing.forEach(e => labels.push({ id:'missing_'+e, type:'오행결손', elem:e }));
  excess.forEach(e => labels.push({ id:'excess_'+e, type:'오행과다', elem:e }));
  if (grp.재성 >= 3 && (strength === '신약' || strength === '태약')) labels.push({ id:'jaedashinyak', type:'재다신약' });
  if (grp.재성 === 0) labels.push({ id:'mujae', type:'무재' });
  if (grp.관성 === 0) labels.push({ id:'mugwan', type:'무관' });
  if (grp.식상 === 0) labels.push({ id:'musiksang', type:'무식상' });
  if (grp.인성 >= 4) labels.push({ id:'insung_excess', type:'인성과다' });
  if (dayElem === '목' && elem['수'] >= 4) labels.push({ id:'sudamokbu', type:'수다목부' });

  return { pillars, elem, missing, excess, tenGods: tg, groups: grp, strength, monthSupport, strengthDetail, jonggyeok: jong,
    yongshin: finalYongshin, yongshinEokbu: yongshin, yongshinBasis,
    yongshinMode, yongshinRole, yongshinInChart,
    johu, temp, wangsang: ws, gyeok,
    relations: rel, gongmang, sinsal, labels, dayElem, patterns,
    unsung: unsungTable, sinsal12: sinsal12Table,
    nayin: nayinTable, taewon: taewonGZ, myeonggung: myeongGZ, singung: sinGZ,
    dayMaster: STEMS[dayStem] + dayElem.charAt(0) };
}

// 십성은 개별 별점이 아니라 생극의 흐름으로 읽는다.
// 아래 조합은 '글자가 함께 있다'는 구조 신호이며, 통근·투간·격의 성패가 받쳐줘야 완성된다.
function detectTenGodPatterns(tg, grp, strength, gyeok) {
  const n = k => tg[k] || 0;
  const out = [];
  const sangshin = gyeok && gyeok.sangshin && gyeok.sangshin.name;
  const add = (id, title, needed, reading, tension = false) => {
    const evidence = needed.map(([name, count]) => `${name} ${count}`).join(' · ');
    const names = needed.map(([name]) => name);
    const aligned = !!(sangshin && names.some(name => sangshin.includes(name) || name.includes(sangshin)));
    out.push({ id, title, grade: aligned ? '주요' : '후보', evidence, reading, tension,
      score: (aligned ? 4 : 0) + needed.reduce((s, [, count]) => s + Math.min(count, 2), 0) + (tension ? 1 : 0) });
  };

  if (n('편관') > 0 && n('식신') > 0)
    add('siksin_jesal', '식신제살의 흐름', [['편관', n('편관')], ['식신', n('식신')]],
      '압박과 경쟁의 기운을 결과물·기술·표현으로 다스리는 구조입니다. 어려운 일을 맡을수록 실력을 산출물로 증명해야 격이 맑아집니다.');
  else if (n('편관') > 0 && n('상관') > 0)
    add('sanggwan_jesal', '상관제살의 후보', [['편관', n('편관')], ['상관', n('상관')]],
      '압박에 정면으로 맞서며 돌파하는 기운이 함께 있습니다. 제어는 되지만 말과 행동이 앞서기 쉬워, 규칙 안에서 전문성으로 쓰는지가 관건입니다.');

  if (grp.관성 > 0 && grp.인성 > 0)
    add('gwanin_sangsaeng', '관인상생의 흐름', [['관성', grp.관성], ['인성', grp.인성]],
      '책임과 규율의 기운이 배움·문서·자격을 거쳐 나를 돕는 흐름입니다. 맡은 일을 공부해 자기 체계로 만들 때 힘이 이어집니다.');
  if (grp.식상 > 0 && grp.재성 > 0)
    add('siksang_saengjae', '식상생재의 흐름', [['식상', grp.식상], ['재성', grp.재성]],
      '아이디어와 기술을 밖으로 내보내 현실 성과로 바꾸는 길이 열려 있습니다. 표현만 하거나 돈만 좇기보다, 만든 것이 거래로 이어지는 구조를 갖출 때 강점이 살아납니다.');
  if (grp.재성 > 0 && grp.관성 > 0)
    add('jae_saenggwan', '재생관의 흐름', [['재성', grp.재성], ['관성', grp.관성]],
      '현실의 자원과 성과가 책임·직위·신뢰로 이어지는 흐름입니다. 규모를 키울수록 관리와 약속이 함께 커져야 오래 갑니다.');
  if (n('상관') > 0 && grp.인성 > 0)
    add('sanggwan_paein', '상관패인의 후보', [['상관', n('상관')], ['인성', grp.인성]],
      '날카로운 표현과 비판력이 배움·문서·근거로 정리될 수 있는 구조입니다. 즉흥적인 말보다 연구와 기록을 거칠 때 재능이 권위로 바뀝니다.');
  if (n('상관') > 0 && n('정관') > 0)
    add('sanggwan_gyeongwan', '상관과 정관의 긴장', [['상관', n('상관')], ['정관', n('정관')]],
      '자기 방식으로 고치려는 힘과 정해진 질서를 지키려는 힘이 함께 있습니다. 어느 하나를 없애기보다, 문제 제기를 제도 안의 개선안으로 바꾸는 것이 이 구조의 해법입니다.', true);
  if (grp.재성 > 0 && grp.인성 > 0 && ['신약','태약'].includes(strength))
    add('jae_in_tension', '재성과 인성의 긴장', [['재성', grp.재성], ['인성', grp.인성]],
      '현실 성과를 급히 좇는 힘과 배우고 축적하려는 힘이 맞섭니다. 일간이 약한 편에서는 준비를 소진해 성과를 내기보다, 배운 것을 지킬 여유를 남기는 편이 구조를 살립니다.', true);

  return out.sort((a, b) => b.score - a.score).slice(0, 4).map(({ score, ...p }) => p);
}

// ── 삼합·방합·반합 판정 ──
// 삼합: 생지+왕지+묘지 3개 → 왕지 오행으로 합화(化). 새 오행을 생성하는 "화학적 합".
// 반합: 왕지 포함 2개. 생지+왕지 > 왕지+묘지 순으로 강함. 왕지 빠진 2개 = 가합(매우 약함).
// 방합: 같은 계절·방위 3개 → 기운이 세지는 "물리적 합". 합화 아님.
// 강도 서열(통설): 삼합 > 방합 > 육합 > 반합 > 암합
const SAMHAP_SETS = [
  { name:'해묘미', gen:11, wang:3, myo:7, elem:'목' },
  { name:'인오술', gen:2,  wang:6, myo:10, elem:'화' },
  { name:'사유축', gen:5,  wang:9, myo:1,  elem:'금' },
  { name:'신자진', gen:8,  wang:0, myo:4,  elem:'수' },
];
const BANGHAP_SETS = [
  { name:'인묘진', bs:[2,3,4],   elem:'목', season:'봄' },
  { name:'사오미', bs:[5,6,7],   elem:'화', season:'여름' },
  { name:'신유술', bs:[8,9,10],  elem:'금', season:'가을' },
  { name:'해자축', bs:[11,0,1],  elem:'수', season:'겨울' },
];
function detectHapguk(branches) {
  const out = { 삼합:[], 반합:[], 방합:[] };
  const has = b => branches.includes(b);
  for (const s of SAMHAP_SETS) {
    const cnt = [s.gen, s.wang, s.myo].filter(has).length;
    if (cnt === 3) { out.삼합.push({ name:s.name, elem:s.elem, grade:'완전', desc:`세 글자가 모두 모여 ${s.elem} 기운으로 합화합니다` }); continue; }
    if (!has(s.wang)) continue;              // 왕지 없으면 반합 불성립(가합은 채택 안 함)
    if (has(s.gen)) out.반합.push({ name:BRANCHES[s.gen]+BRANCHES[s.wang], elem:s.elem, grade:'강', desc:`생지와 왕지가 만나 ${s.elem} 기운이 뭉칩니다` });
    else if (has(s.myo)) out.반합.push({ name:BRANCHES[s.wang]+BRANCHES[s.myo], elem:s.elem, grade:'약', desc:`왕지와 고지가 만나 ${s.elem} 기운이 어느 정도 모입니다` });
  }
  for (const b of BANGHAP_SETS) {
    const cnt = b.bs.filter(has).length;
    if (cnt === 3) out.방합.push({ name:b.name, elem:b.elem, grade:'완전', desc:`${b.season}의 세 글자가 모여 ${b.elem} 기운이 크게 강해집니다` });
  }
  return out;
}

function detectRelations(P) {
  const out = { 천간합:[], 지지육합:[], 지지충:[], 형:[], 삼합:[], 방합:[], 반합:[] };
  const HAP5 = {'04':'토','15':'금','26':'수','37':'목','48':'화'}; // 갑기 을경 병신 정임 무계
  const names = ['년','월','일','시'];
  const n = P.length; // 시간 모름이면 3
  for (let i = 0; i < n; i++) for (let j = i+1; j < n; j++) {
    // 천간합: 갑(0)기(5), 을(1)경(6), 병(2)신(7), 정(3)임(8), 무(4)계(9) → 차이 5
    if (Math.abs(P[i].stem - P[j].stem) === 5)
      out.천간합.push({ pos:[names[i],names[j]], pair:STEMS[P[i].stem]+STEMS[P[j].stem]+'합' });
    // 지지육합: 자축 인해 묘술 진유 사신 오미
    const LH = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
    if (LH.some(([a,b]) => (P[i].branch===a&&P[j].branch===b)||(P[i].branch===b&&P[j].branch===a)))
      out.지지육합.push({ pos:[names[i],names[j]], pair:BRANCHES[P[i].branch]+BRANCHES[P[j].branch]+'합' });
    // 지지충: 6칸 차이
    if ((P[i].branch + 6) % 12 === P[j].branch)
      out.지지충.push({ pos:[names[i],names[j]], pair:BRANCHES[P[i].branch]+BRANCHES[P[j].branch]+'충' });
    // 형: 자묘 / 인사신 / 축술미 / 자형(진진 오오 유유 해해)
    const HYUNG = [[0,3],[2,5],[5,8],[2,8],[1,10],[10,7],[1,7]];
    if (HYUNG.some(([a,b]) => (P[i].branch===a&&P[j].branch===b)||(P[i].branch===b&&P[j].branch===a)))
      out.형.push({ pos:[names[i],names[j]], pair:BRANCHES[P[i].branch]+BRANCHES[P[j].branch]+'형' });
    if (P[i].branch === P[j].branch && [4,6,9,11].includes(P[i].branch))
      // [8/6] 自刑의 '자'가 지지 子(자)와 동음이라 亥亥自刑이 '해자형'으로 읽혀
      //   존재하지 않는 형(亥子刑)이 된다(子午는 오히려 충). 지지를 두 번 적고 自刑을 병기한다.
      out.형.push({ pos:[names[i],names[j]], pair:BRANCHES[P[i].branch]+BRANCHES[P[i].branch]+' 자형(自刑)' });
  }
  // 삼합·반합·방합 병합
  const hg = detectHapguk(P.map(p => p.branch));
  out.삼합 = hg.삼합; out.반합 = hg.반합; out.방합 = hg.방합;
  return out;
}

function calcGongmang(dayGZ) {
  // 공망: 일주가 속한 순(旬)에서 빠지는 두 지지
  const xun = Math.floor(dayGZ.idx / 10) * 10;
  const b1 = (xun + 10) % 12, b2 = (xun + 11) % 12;
  return [BRANCHES[b1], BRANCHES[b2]];
}

// ── 지장간 월률분야 (사령 일수) ──
// 문헌: 생지(인신사해) 7·7·16 / 왕지(자묘유) 10·20, 오는 10·10·10 / 고지(진술축미) 9·3·18
// 출처 교차확인: sajustudy.com/133, chocosd.com 월률분야 · 8-codes 정해만세력 11강
const JIJANGGAN_DAYS = {
  0:  [['임',10],['계',20]],                 // 자
  1:  [['계',9],['신',3],['기',18]],          // 축
  2:  [['무',7],['병',7],['갑',16]],          // 인
  3:  [['갑',10],['을',20]],                 // 묘
  4:  [['을',9],['계',3],['무',18]],          // 진
  5:  [['무',7],['경',7],['병',16]],          // 사
  6:  [['병',10],['기',10],['정',10]],        // 오
  7:  [['정',9],['을',3],['기',18]],          // 미
  8:  [['무',7],['임',7],['경',16]],          // 신 (여기를 무/기로 보는 유파 차이 있음)
  9:  [['경',10],['신',20]],                 // 유
  10: [['신',9],['정',3],['무',18]],          // 술
  11: [['무',7],['갑',7],['임',16]],          // 해
};
// 절입일로부터 경과일수로 사령(당령) 천간 판정
function saryeong(branch, daysSinceTerm) {
  const table = JIJANGGAN_DAYS[branch];
  let acc = 0;
  for (const [stem, days] of table) {
    acc += days;
    if (daysSinceTerm < acc) return { stem, role: table.length === 3 ? (acc === days ? '여기' : (stem === table[table.length-1][0] ? '정기' : '중기')) : (stem === table[0][0] ? '여기' : '정기') };
  }
  return { stem: table[table.length-1][0], role: '정기' };
}

// ── 조후용신 (궁통보감 희용제요) ──
// 10일간 × 12월. [주용신, [보좌...]]  천간 index: 갑0 을1 병2 정3 무4 기5 경6 신7 임8 계9
// 월 순서: 인 묘 진 사 오 미 신 유 술 해 자 축 (index 0~11)
// 출처: 궁통보감(난강망) 희용제요 — cafe.daum.net/scholarlyname/8Duz/19 표 대조
// ※ 학파차·원문 대 희용제요 불일치가 알려진 영역(가을 갑목·인월 경금 등) — 참고용 표기
const JOHU = {
  0: [[2,[9]],[6,[2,3]],[6,[3,8]],[9,[3,6]],[9,[3,6]],[9,[3,6]],[6,[3,8]],[6,[3,2]],[6,[9,3]],[6,[3,2]],[3,[6,2]],[3,[6,2]]], // 갑
  1: [[2,[9]],[2,[9]],[9,[2,4]],[9,[6,7]],[9,[2]],[9,[2]],[2,[9,5]],[9,[2,3]],[9,[7]],[2,[4]],[2,[]],[2,[]]],                 // 을
  2: [[8,[6]],[8,[5]],[8,[0]],[8,[9]],[8,[6]],[8,[6]],[8,[4]],[8,[9]],[0,[8,9]],[0,[4,6,8]],[8,[4,5]],[8,[0]]],               // 병
  3: [[0,[6]],[6,[0]],[0,[6]],[0,[6]],[8,[6,9]],[0,[8,6]],[0,[6,2,4]],[0,[6,2,4]],[0,[6,4]],[0,[6]],[0,[6]],[0,[6]]],          // 정
  4: [[2,[0,9]],[2,[0,9]],[0,[2,9]],[0,[2,9]],[8,[0,2]],[9,[0,2]],[2,[0,9]],[2,[9]],[0,[2,9]],[0,[2]],[2,[0]],[2,[0]]],        // 무
  5: [[2,[9,0]],[0,[2,9]],[2,[0,9]],[9,[2]],[9,[2]],[9,[2]],[2,[9]],[2,[9]],[0,[2,9]],[2,[0,4]],[2,[0,4]],[2,[0,4]]],          // 기
  6: [[4,[0,8,2,3]],[3,[0,2,6]],[0,[3,8,9]],[8,[4,2,3]],[8,[9]],[3,[0]],[3,[0]],[3,[0,2]],[0,[8]],[3,[2]],[3,[0,2]],[2,[3,0]]],// 경
  7: [[5,[8,6]],[8,[0]],[8,[0]],[8,[0,9]],[8,[5,9]],[8,[6,0]],[8,[0,4]],[8,[0]],[8,[2]],[8,[2]],[2,[4,8,0]],[2,[8,4,5]]],      // 신
  8: [[6,[2,4]],[4,[7,6]],[0,[6]],[8,[6,7,9]],[9,[6,7]],[7,[0,9]],[4,[3]],[0,[6]],[0,[2]],[4,[2,6]],[4,[2]],[2,[3,0]]],        // 임
  9: [[7,[2]],[6,[7]],[2,[7,0]],[7,[6]],[6,[7,8,9]],[6,[7,8,9]],[3,[0]],[7,[2]],[7,[0,8,9]],[6,[7,4,3]],[2,[7]],[2,[3]]],      // 계
};
// 월지 branch index(자0…해11) → 조후표 월 index(인0…축11)
function johuMonthIdx(branch) { return (branch - 2 + 12) % 12; }
function johuYongshin(dayStem, monthBranch) {
  const row = JOHU[dayStem]; if (!row) return null;
  const cell = row[johuMonthIdx(monthBranch)]; if (!cell) return null;
  return { main: cell[0], mainStem: STEMS[cell[0]], mainElem: STEM_ELEM[cell[0]],
    support: cell[1].map(s => ({ stem: STEMS[s], elem: STEM_ELEM[s] })),
    // [8/6 신설] 조후표 중 판본·주석서 간 이견이 보고된 셀은 플래그를 세워 화면에 밝힌다.
    //   근거: 궁통보감 본문 ↔ 서낙오 『조화원약평주』의 희용(喜用) 제요가 갈리는 대표 셀.
    //   갈리는 셀에서 "궁통보감의 처방은 X"라고 단정하면 다른 만세력·다른 책과 어긋난다.
    disputed: DISPUTED_JOHU.some(([ds, mi]) => ds === dayStem && mi === johuMonthIdx(monthBranch)),
  };
}
// 논쟁 셀 목록 (dayStem index, 조후표 월 index — 인0…축11)
// 가을 甲木(신·유·술월) · 정월 庚金(인월)이 대표적으로 보고된 이견 구간이다.
const DISPUTED_JOHU = [
  [0, 6], [0, 7], [0, 8],   // 갑목 × 신·유·술월 (가을 甲木)
  [6, 0],                    // 경금 × 인월 (정월 庚金)
];
// 한난조습: 월지 계절 + 화/수 개수로 판정
function hannan(elem, monthBranch) {
  const WINTER = [11,0,1], SUMMER = [5,6,7];
  const cold = WINTER.includes(monthBranch), hot = SUMMER.includes(monthBranch);
  const fire = elem['화'], water = elem['수'];
  let temp = 0;
  if (cold) temp -= 2; if (hot) temp += 2;
  temp += fire * 0.7 - water * 0.7;
  let label;
  if (temp <= -2) label = '한(寒)';
  else if (temp <= -0.5) label = '서늘함';
  else if (temp < 0.5) label = '중화';
  else if (temp < 2) label = '따뜻함';
  else label = '난조(暖燥)';
  return { temp: Math.round(temp*10)/10, label, cold, hot };
}

// ── 신강약 가중치 설정 (원전에 없는 현대 창작 영역 — 캘리브레이션 대상) ──
const DEFAULT_STRENGTH_CONFIG = {
  W_MONTH: 2.2,                              // 득령(월령) 비중 (3.0→2.2, 심판 권고)
  SILRYEONG_OFFSET: 0.6,                     // 실령이어도 정기 아군 통근 2곳↑이면 월령 페널티 ×0.6 (약변강)
  ROOT_W: { 정기:1.0, 중기:0.6, 여기:0.3 },   // 지장간 뿌리 층위별 무게
  POS_W: [0.8, 1.5, 1.4, 1.0],               // 년/월/일/시 — 좌하(일지) 1.2→1.4
  W_STEM: 0.8,
  ROOT_BONUS_DEEP: 1.5,                      // 정기·중기 통근한 천간
  ROOT_BONUS_SHALLOW: 1.2,                   // 여기에만 통근한 천간
  HAP_DAMP: 0.5,                             // 일간과 천간합한 적 천간은 작용 묶임(합거)
  W_INSUNG: 0.25,                            // 인성(생조) 지장간 1개당 추가 가산 — 火生土처럼 끊임없이 생하는 힘
  BANDS: { 태강:0.70, 신강:0.55, 중화:0.45, 신약:0.30 },
};

// ── 왕상휴수사 (월지 대비 일간 상태) ──
// 왕=월지와 같은 오행(비겁월), 상=인성월, 휴=식상월, 수=재성월, 사=관살월
// 왕1.0 상0.7 휴0.5 수0.3 사0.1 (strength-research 권고 스케일)
function wangsang(dayElem, monthBranchElem) {
  if (monthBranchElem === dayElem) return { state:'왕', score:1.0 };
  if (ELEM_GEN[monthBranchElem] === dayElem) return { state:'상', score:0.7 };  // 월지가 나를 생
  if (ELEM_GEN[dayElem] === monthBranchElem) return { state:'휴', score:0.5 };  // 내가 월지를 생
  if (ELEM_CTRL[dayElem] === monthBranchElem) return { state:'수', score:0.3 }; // 내가 월지를 극
  return { state:'사', score:0.1 };                                            // 월지가 나를 극
}

// ── 납음오행 — 60갑자 2개씩 30종. 삼명통회 등 고전 조견표 ──
const NAYIN = [
  '해중금','해중금','노중화','노중화','대림목','대림목','노방토','노방토','검봉금','검봉금',
  '산두화','산두화','간하수','간하수','성두토','성두토','백랍금','백랍금','양류목','양류목',
  '천중수','천중수','옥상토','옥상토','벽력화','벽력화','송백목','송백목','장류수','장류수',
  '사중금','사중금','산하화','산하화','평지목','평지목','벽상토','벽상토','금박금','금박금',
  '복등화','복등화','천하수','천하수','대역토','대역토','차천금','차천금','상자목','상자목',
  '대계수','대계수','사중토','사중토','천상화','천상화','석류목','석류목','대해수','대해수'
];
const NAYIN_HAN = {
  '해중금':'海中金','노중화':'爐中火','대림목':'大林木','노방토':'路傍土','검봉금':'劍鋒金',
  '산두화':'山頭火','간하수':'澗下水','성두토':'城頭土','백랍금':'白蠟金','양류목':'楊柳木',
  '천중수':'泉中水','옥상토':'屋上土','벽력화':'霹靂火','송백목':'松柏木','장류수':'長流水',
  '사중금':'砂中金','산하화':'山下火','평지목':'平地木','벽상토':'壁上土','금박금':'金箔金',
  '복등화':'覆燈火','천하수':'天河水','대역토':'大驛土','차천금':'釵釧金','상자목':'桑柘木',
  '대계수':'大溪水','사중토':'沙中土','천상화':'天上火','석류목':'石榴木','대해수':'大海水'
};
function nayin(stem, branch) {
  // 간지 → 60갑자 인덱스
  let idx = -1;
  for (let i = 0; i < 60; i++) { if (i % 10 === stem && i % 12 === branch) { idx = i; break; } }
  if (idx < 0) return null;
  const name = NAYIN[idx];
  return { name, han: NAYIN_HAN[name], elem: name.slice(-1) };
}

// ── 태원(胎元) — 월주에서 천간 +1, 지지 +3. 잉태된 달의 간지 ──
function taewon(monthStem, monthBranch) {
  return gz2((monthStem + 1) % 10, (monthBranch + 3) % 12);
}
// ── 명궁(命宮) — 월지와 시지로 구하는 '평생의 자리' ──
//   자평 통법: 월지 수 + 시지 수 합이 14 이하면 14에서 빼고, 넘으면 26에서 뺀다(인월=1 기준).
// 공식 확정: 명궁 지지 = (5 - 월지 - 시지) mod 12  (6케이스 역산 100% 일치)
function myeonggung(monthBranch, hourBranch, yearStem) {
  const branch = ((5 - monthBranch - hourBranch) % 12 + 12) % 12;
  const YIN_STEM = {0:2,5:2,1:4,6:4,2:6,7:6,3:8,8:8,4:0,9:0}; // 년간 기준 오호둔
  const stem = (YIN_STEM[yearStem] + ((branch - 2 + 12) % 12)) % 10;
  return gz2(stem, branch);
}
// ── 신궁(身宮) — 공식 확정: 지지 = (월지 + 시지 + 1) mod 12 ──
function singung(monthBranch, hourBranch, yearStem) {
  const branch = (monthBranch + hourBranch + 1) % 12;
  const YIN_STEM = {0:2,5:2,1:4,6:4,2:6,7:6,3:8,8:8,4:0,9:0};
  const stem = (YIN_STEM[yearStem] + ((branch - 2 + 12) % 12)) % 10;
  return gz2(stem, branch);
}

// ── 12운성 (일간 기준 — 포스텔러 실측 3케이스 12/12 검증) ──
// 양간 순행 / 음간 역행, 각 천간의 장생지
const JANGSAENG = {0:11,1:6,2:2,3:9,4:2,5:9,6:5,7:0,8:8,9:3};
const UNSUNG_NAMES = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];
function unsung12(dayStem, branch) {
  const st = JANGSAENG[dayStem];
  const step = STEM_YANG[dayStem] ? (branch - st + 12) % 12 : (st - branch + 12) % 12;
  return UNSUNG_NAMES[step];
}

// ── 12신살 (삼합국 기준 — 포스텔러 실측 역산: 년주 칸은 일지 기준, 나머지는 년지 기준) ──
const SINSAL12_START = { 2:11,6:11,10:11,  8:5,0:5,4:5,  11:8,3:8,7:8,  5:2,9:2,1:2 };
const SINSAL12_NAMES = ['겁살','재살','천살','지살','년살','월살','망신살','장성살','반안살','역마살','육해살','화개살'];
function sinsal12(baseBranch, targetBranch) {
  return SINSAL12_NAMES[(targetBranch - SINSAL12_START[baseBranch] + 12) % 12];
}

// ── 신살 조견표 (만세력/포스텔러 기준 — 깎지 않음) ──
function detectSinsal(pillars, knowTime = true) {
  const P = knowTime ? [pillars.year, pillars.month, pillars.day, pillars.hour]
                     : [pillars.year, pillars.month, pillars.day];
  const posName = ['년지','월지','일지','시지'];
  const ds = pillars.day.stem, db = pillars.day.branch, yb = pillars.year.branch;
  const out = [];
  const add = (name, where, basis) => out.push({ name, where, basis });

  // 천을귀인 (일간 기준): 갑무경→축미 을기→자신 병정→해유 신→인오 임계→사묘
  const CHEONEUL = {0:[1,7],4:[1,7],6:[1,7], 1:[0,8],5:[0,8], 2:[11,9],3:[11,9], 7:[2,6], 8:[5,3],9:[5,3]};
  // 천의성 (월지 기준): 해당 월지의 앞 지지 (월지-1)
  const cheonui = (P[1].branch + 11) % 12;
  // 문곡귀인 (일간): 갑→해 을→자 병→인 정→묘 무→인 기→묘 경→사 신→오 임→신 계→유
  const MUNGOK = {0:11,1:0,2:2,3:3,4:2,5:3,6:5,7:6,8:8,9:9};
  // 태극귀인 (일간): 갑을→자오 병정→묘유 무기→진술축미 경신→인해 임계→사신
  const TAEGEUK = {0:[0,6],1:[0,6],2:[3,9],3:[3,9],4:[4,10,1,7],5:[4,10,1,7],6:[2,11],7:[2,11],8:[5,8],9:[5,8]};
  // 역마살 — 포스텔러 실측: 글자 자체 규칙(인신사해 = 역마지) 채택 (장선미 亥亥 둘 다 역마 표시 확인)
  const YEOKMA_SELF = [2,5,8,11];
  // 도화살 — 포스텔러 실측: 글자 자체 규칙(자오묘유 = 도화지) 채택 (子·卯 모두 도화 표시 확인)
  const DOHWA_SELF = [0,3,6,9];
  // 화개: 진술축미 글자 자체
  const HWAGAE_SELF = [1,4,7,10];
  // 천문성 — 포스텔러 실측: 亥 표시·卯 미표시 → 술해 채택 (고전 술해천문)
  const CHEONMUN = [10,11];
  // 현침살 (글자 모양): 천간 갑신, 지지 묘오미신
  // 건록/정록 (일간): 갑→인 을→묘 병무→사 정기→오 경→신 신→유 임→해 계→자
  const GEONROK = {0:2,1:3,2:5,4:5,3:6,5:6,6:8,7:9,8:11,9:0};
  // 문창귀인 (일간→식신의 건록지): 갑→사 을→오 병무→신 정기→유 경→해 신→자 임→인 계→묘
  const MUNCHANG = {0:5,1:6,2:8,4:8,3:9,5:9,6:11,7:0,8:2,9:3};
  // 학당귀인 (일간의 장생지): 갑→해 을→오 병무→인 정기→유 경→사 신→자 임→신 계→묘
  const HAKDANG = {0:11,1:6,2:2,4:2,3:9,5:9,6:5,7:0,8:8,9:3};
  // 천주귀인 (일간): 갑→사 을→오 병→사 정→오 무→신 기→유 경→해 신→자 임→인 계→묘
  const CHEONJU = {0:5,1:6,2:5,3:6,4:8,5:9,6:11,7:0,8:2,9:3};
  // 암록 (일간의 건록과 육합하는 지지): 갑→해 을→술 병무→신 정기→미 경→사 신→진 임→인 계→축
  const AMROK = {0:11,1:10,2:8,4:8,3:7,5:7,6:5,7:4,8:2,9:1};
  // 천덕귀인 (월지 기준): 인→정 묘→신 진→임 사→신 오→해 미→갑 신→계 유→인 술→병 해→을 자→사 축→경
  //   (천간 지정 = 천간에 표시, 지지 지정 = 지지에 표시)
  const CHEONDEOK = {2:{s:3},3:{b:8},4:{s:8},5:{b:8},6:{b:11},7:{s:0},8:{s:9},9:{b:2},10:{s:2},11:{s:1},0:{b:5},1:{s:6}};
  // 월덕귀인 (월지 삼합국 기준 천간): 인오술→병 신자진→임 해묘미→갑 사유축→경
  const WOLDEOK = {2:2,6:2,10:2, 8:8,0:8,4:8, 11:0,3:0,7:0, 5:6,9:6,1:6};
  // 괴강살 — ★간지(기둥) 자체 규칙: 경진·경술·임진·무술. 해당 기둥의 천간·지지 둘 다 태그
  const GOEGANG = [[6,4],[6,10],[8,4],[4,10]];
  // 금여(金輿) — 일간 기준, 건록+2칸: 갑진 을사 병미 정신 무미 기신 경술 신해 임축 계인
  const GEUMYEO = {0:4,1:5,2:7,3:8,4:7,5:8,6:10,7:11,8:1,9:2};
  // 국인귀인 — 일간 기준: 갑술 을해 병축 정인 무축 기인 경진 신사 임미 계신
  const GUKIN = {0:10,1:11,2:1,3:2,4:1,5:2,6:4,7:5,8:7,9:8};
  // 홍염살 — 일간 기준: 갑오 을오 병인 정미 무진 기진 경술 신유 임자 계신
  const HONGYEOM = {0:6,1:6,2:2,3:7,4:4,5:4,6:10,7:9,8:0,9:8};
  // 양인살 — 양간만 정식: 갑묘 병오 무오 경유 임자
  const YANGIN = {0:3,2:6,4:6,6:9,8:0};
  // 백호대살 — 간지(기둥): 갑진 을미 병술 정축 무진 임술 계축
  const BAEKHO = [[0,4],[1,7],[2,10],[3,1],[4,4],[8,10],[9,1]];
  // 귀문관살 — 지지 페어: 자유 축오 인미 묘신 진해 사술
  const GWIMUN = [[0,9],[1,6],[2,7],[3,8],[4,11],[5,10]];
  // 원진살 — 지지 페어: 자미 축오 인유 묘신 진해 사술
  const WONJIN = [[0,7],[1,6],[2,9],[3,8],[4,11],[5,10]];

  P.forEach((p, i) => {
    const b = p.branch;
    if ((CHEONEUL[ds]||[]).includes(b)) add('천을귀인', posName[i], '일간기준');
    if (b === cheonui) add('천의성', posName[i], '월지기준');
    if (MUNGOK[ds] === b) add('문곡귀인', posName[i], '일간기준');
    if ((TAEGEUK[ds]||[]).includes(b)) add('태극귀인', posName[i], '일간기준');
    if (YEOKMA_SELF.includes(b)) add('역마살', posName[i], '지지자체');
    if (DOHWA_SELF.includes(b)) add('도화살', posName[i], '지지자체');
    if (HWAGAE_SELF.includes(b)) add('화개살', posName[i], '지지자체');
    if (CHEONMUN.includes(b)) add('천문성', posName[i], '지지');
    if (GEONROK[ds] === b) add('건록(정록)', posName[i], '일간기준');
    if (MUNCHANG[ds] === b) add('문창귀인', posName[i], '일간기준');
    if (HAKDANG[ds] === b) add('학당귀인', posName[i], '일간기준');
    if (CHEONJU[ds] === b) add('천주귀인', posName[i], '일간기준');
    if (AMROK[ds] === b) add('암록', posName[i], '일간기준');
    if (GEUMYEO[ds] === b) add('금여', posName[i], '일간기준');
    // 국인귀인: 포스텔러 미표시(장선미 실측 대조) — 유파차로 보고 제외
    if (HONGYEOM[ds] === b) add('홍염살', posName[i], '일간기준');
    if (YANGIN[ds] === b) add('양인살', posName[i], '일간기준');
    // 현침살 — 포스텔러 실측 역산: 지지 卯·午·未·申 / 천간 甲·辛 (乙·酉는 미표시 확인)
    if ([3,6,7,8].includes(b)) add('현침살', posName[i], '글자형태');
    if (p.stem === 0 || p.stem === 7) add('현침살', posName[i].replace('지','간'), '글자형태');
    // 괴강살: 간지 조합 — 포스텔러 표기 기준 '천간 칸'에 표시
    if (GOEGANG.some(([s2,b2]) => p.stem === s2 && p.branch === b2)) {
      add('괴강살', posName[i].replace('지','간'), '간지조합');
      add('괴강살', posName[i], '간지조합');
    }
    if (BAEKHO.some(([s2,b2]) => p.stem === s2 && p.branch === b2)) add('백호대살', posName[i], '간지조합');
    // 천덕/월덕 (월지 기준 → 천간에 오면 표시)
    const cd = CHEONDEOK[pillars.month.branch];
    if (cd && cd.b === b) add('천덕귀인', posName[i], '월지기준');
    if (WOLDEOK[pillars.month.branch] === p.stem) add('월덕귀인', posName[i].replace('지','간'), '월지기준');
    if (cd && cd.s === p.stem) add('천덕귀인', posName[i].replace('지','간'), '월지기준');
  });
  if ([0,3,6,7].includes(STEMS.indexOf(STEMS[pillars.year.stem]))) {} // (천간 현침 갑신은 표시 생략가능)
  // 중복 제거
  const seen = new Set();
  return out.filter(s => { const k = s.name + s.where; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ── 세운 ──
function calcSewoon(analysis, fromYear, n) {
  const out = [];
  for (let y = fromYear; y < fromYear + n; y++) {
    const g = gz(y - 1984);
    const se = STEM_ELEM[g.stem], be = BRANCH_ELEM[g.branch];
    const newElems = [se, be].filter(e => analysis.elem[e] === 0);
    out.push({ year: y, ...g, elems: [se, be], newElems: [...new Set(newElems)],
      yongshinHit: [se, be].includes(analysis.yongshin) });
  }
  return out;
}

// ══════════════════════════════════════════════════════════════
// 상신(相神) — 자평진전 「論相神緊要」
//   "月令既得用神，則別位亦必有相，若君之有相，輔者是也"
//     = 월령이 용신을 얻으면 다른 자리에 반드시 상(相)이 있어, 임금에게 재상이 있듯 용신을 보좌한다.
//   "如官逢財生，則官爲用，財爲相；財旺生官，則財爲用，官爲相；煞逢食制，則煞爲用，食爲相"
//   "凡全局之格，賴此一字而成者，均謂之相也"  = 전체 국이 이 한 글자에 힘입어 이루어지면 모두 상신이다.
//   "相神無破，貴格已成；相神有傷，立敗其格"  = 상신이 상하면 그 격은 즉시 패한다.
// ★즉 상신은 "격을 완성시키는 그 한 글자"다. 우리 앱은 격을 정하고 성패까지 봤지만
//   "무엇 덕분에 이 격이 서는가"를 짚지 않았다. 그 자리를 채운다.
// ══════════════════════════════════════════════════════════════
function findSangshin(gyeokName, tg, grp, gyeokOk) {
  const n = (k) => tg[k] || 0;
  const has = (k) => n(k) > 0;
  const 정관 = n('정관'), 편관 = n('편관'), 식신 = n('식신'), 상관 = n('상관');
  const 재 = grp.재성, 인 = grp.인성, 비겁 = grp.비겁, 식상 = 식신 + 상관;

  // 각 격에서 용신을 보좌해 격을 완성시키는 글자(원문 예시 우선, 그 다음 순용·역용 원칙)
  let name = null, why = '';
  switch (gyeokName) {
    case '정관격':
      if (재 > 0) { name = '재성'; why = '정관이 재의 생을 받아 섭니다 — 원문이 든 「官逢財生, 則官爲用, 財爲相」 그대로입니다.'; }
      else if (인 > 0) { name = '인성'; why = '인성이 정관의 기운을 나에게 이어주어 격이 완성됩니다.'; }
      break;
    case '정재격': case '편재격':
      if (정관 > 0) { name = '정관'; why = '재가 왕해 관을 생하는 구조입니다 — 원문의 「財旺生官, 則財爲用, 官爲相」입니다.'; }
      else if (식상 > 0) { name = '식상'; why = '식상이 재를 생해주어 재격이 힘을 얻습니다.'; }
      // 성격 경로에 재격패인(財格透印)이 있으므로 상신 후보에도 인성을 둔다(성격인데 상신 없음 방지)
      else if (인 > 0) { name = '인성'; why = '재격에 인성이 함께 있어 서로 부딪히지 않게 균형을 잡아줍니다.'; }
      break;
    case '편관격':
      if (식신 > 0) { name = '식신'; why = '칠살을 식신이 제어해 격이 섭니다 — 원문의 「煞逢食制, 則煞爲用, 食爲相」입니다.'; }
      // [8/11] 성격 경로는 식상(식신+상관) 합계를 보므로 상관만 있는 경우도 후보에 둔다(성격인데 상신 없음 방지)
      else if (상관 > 0) { name = '상관'; why = '상관이 칠살을 제어하는 자리에 있습니다. 식신제살만큼 깨끗하지는 않으나 같은 제살의 결로 봅니다.'; }
      else if (인 > 0) { name = '인성'; why = '인성이 칠살의 기운을 받아 나에게 전달합니다(살인상생).'; }
      break;
    case '정인격': case '편인격':
      if (정관 > 0 || 편관 > 0) { name = 정관 > 0 ? '정관' : '칠살'; why = '관살이 인성을 생해 격이 완성됩니다.'; }
      else if (식상 > 0) { name = '식상'; why = '인성이 무거운 것을 식상이 덜어내어 균형이 잡힙니다.'; }
      break;
    case '식신격':
      if (재 > 0) { name = '재성'; why = '식신이 재를 생하는 흐름이 격을 완성시킵니다(식신생재).'; }
      else if (편관 > 0) { name = '칠살'; why = '식신이 칠살을 제어하는 구조로 격이 섭니다(식신제살).'; }
      break;
    case '상관격':
      if (재 > 0) { name = '재성'; why = '상관의 기운이 재로 흘러 흉이 길로 바뀝니다(상관생재).'; }
      else if (인 > 0) { name = '인성'; why = '인성이 상관을 다스려 격이 섭니다(상관패인).'; }
      // [8/6] 성격 경로에 상관대살무재·금수상관견관이 있어 상신 후보에도 칠살·정관을 둔다
      // (성격 판정인데 "상신이 뚜렷하지 않다"가 나오던 불일치 해소)
      else if (편관 > 0) { name = '칠살'; why = '상관이 칠살과 짝하되 재가 없어 깨끗한 구조를 이룹니다.'; }
      else if (정관 > 0) { name = '정관'; why = '금수상관은 관을 보아도 흉으로 보지 않아, 관이 격을 완성시키는 자리가 됩니다.'; }
      break;
    case '양인격':
      if (정관 > 0 || 편관 > 0) { name = 정관 > 0 ? '정관' : '칠살'; why = '양인의 거친 기운을 관살이 눌러 격이 섭니다.'; }
      break;
    case '건록격':
      if (정관 > 0) { name = '정관'; why = '록·겁의 힘을 정관이 통제해 쓸 자리를 만듭니다.'; }
      else if (재 > 0) { name = '재성'; why = '록·겁의 힘이 재로 흘러 결실이 됩니다.'; }
      else if (식상 > 0) { name = '식상'; why = '넘치는 기운이 식상으로 빠져나가 균형이 잡힙니다.'; }
      break;
    default: return null;
  }

  if (!name) {
    return {
      found: false,
      note: '이 사주에는 격을 완성시켜줄 상신(相神)이 뚜렷하지 않습니다. 자평진전은 「凡全局之格，賴此一字而成者，均謂之相也」 — 전체 국이 이 한 글자에 힘입어 이루어진다고 했는데, 지금은 그 한 글자가 비어 있는 상태로 봅니다. 그 글자가 운에서 들어오는 시기가 격이 서는 때입니다.',
    };
  }

  // 상신이 손상됐는가 — "相神有傷，立敗其格"
  const HURT = {
    재성: { by: '비겁', ok: () => 비겁 >= 3 && 재 <= 1, how: '비겁이 무거워 재를 다툽니다' },
    정관: { by: '상관', ok: () => 상관 > 0, how: '상관이 정관을 극합니다' },
    인성: { by: '재성', ok: () => 재 >= 2 && 인 <= 1, how: '재성이 인성을 극합니다' },
    식신: { by: '편인', ok: () => n('편인') > 0, how: '편인이 식신을 극합니다(도식)' },
    식상: { by: '편인', ok: () => n('편인') > 0 && 식상 <= 1, how: '편인이 식상을 극합니다' },
    칠살: { by: '재성', ok: () => false, how: '' },
  };
  const hurt = HURT[name];
  const damaged = hurt && hurt.ok();

  return {
    found: true, name, why,
    damaged: !!damaged,
    // [8/6 수정] 「相神無破，貴格已成」(귀격이 이미 이루어졌다)은 격이 성립했을 때만 쓸 수 있는 문장인데,
    //   종전엔 파격 판정에도 함께 나가 "깨졌다"와 "이미 이루어졌다"가 한 화면에 병존했다.
    damageNote: damaged
      ? `다만 그 상신이 손상돼 있습니다 — ${hurt.how}. 자평진전은 「相神有傷，立敗其格」 — 상신이 상하면 그 격은 즉시 패한다고 했습니다. 이 사주에서 가장 먼저 지켜야 할 글자가 바로 ${name}입니다.`
      : (gyeokOk
        ? `이 ${name}이 상하지 않는 한 격은 유지됩니다 — 「相神無破，貴格已成」. 반대로 운에서 ${name}을 극하는 기운이 오면 그때가 가장 조심할 시기입니다.`
        : `이 ${name} 자체는 손상되지 않았습니다. 다만 위 성패 판정에서 격이 서지 못한 상태라, ${name}이 제 역할을 할 조건이 아직 갖춰지지 않은 것으로 봅니다.`),
  };
}

// ══════════════════════════════════════════════════════════════
// 격국 고저(高低) — 자평진전 「論用神格局高低」
//   "八字既有用神，必有格局；有格局，必有高低 … 然其理之大綱，亦在有情、有力無力之間而已"
// 유정/유력 두 축만 본다. 등급 단정이 아니라 좌표로 제시한다.
// ══════════════════════════════════════════════════════════════
function gyeokGojeo(gyeok, sd, monthSupport, monthClashed) {
  if (!gyeok || !gyeok.jpjj || gyeok.jpjj.ok === null || !sd) return null;

  // 有情 = 격이 성립했고(순역 배합이 부딪히지 않음), 깨졌더라도 구응이 있어 이어진 경우
  const jp = gyeok.jpjj;
  const yujeong = jp.ok || !!jp.gu;

  // 有力 = 일간이 허부하지 않고(세력비), 월령의 지원 또는 통근이 있으며, 월지가 충으로 흔들리지 않은 것
  const rooted = !!(monthSupport || sd.deukji || sd.deukryeong);
  const notWeak = typeof sd.ratio === 'number' && sd.ratio >= 0.35;
  const yurok = rooted && notWeak && !monthClashed;

  const label = yujeong
    ? (yurok ? '유정·유력' : '유정하되 무력')
    : (yurok ? '유력하되 무정' : '무정·무력');

  const desc = yujeong
    ? (yurok
      ? '격이 서로 부딪히지 않게 배합됐고(有情), 일간과 격이 뿌리를 얻어 힘도 실려 있습니다(有力). 자평진전이 고저의 두 축으로 든 조건을 모두 만족하는 자리입니다.'
      : '배합은 자연스러운데(有情) 그것을 밀고 갈 힘이 아직 약합니다(無力). 방향은 맞으니, 힘을 보태는 운에서 크게 달라지는 구조입니다.')
    : (yurok
      ? '힘은 실려 있는데(有力) 글자끼리 서로 부딪힙니다(無情). 역량보다 배치가 아쉬운 경우라, 어긋난 글자를 눌러주거나 이어주는 운이 관건입니다.'
      : '배합도 어긋나고(無情) 뿌리도 약합니다(無力). 다만 자평진전은 고저를 "만 가지가 고르지 않아 말로 다 전할 수 없다(萬有不齐)"고 했습니다 — 이 두 축은 출발점이지 결론이 아닙니다.');

  return {
    yujeong, yurok, label, desc,
    basis: `유정 = ${jp.ok ? '격 성립' : (jp.gu ? '파격이나 구응 있음' : '파격·구응 없음')} · ` +
           `유력 = ${rooted ? '뿌리 있음' : '뿌리 약함'}, 세력비 ${Math.round((sd.ratio || 0) * 100)}%${monthClashed ? ', 월지 충' : ''}`,
  };
}

// ══════════════════════════════════════════════════════════════
// 종격(從格) 판정 — 자평진전 「論從化」 / 적천수 「從象」
// ★유파차가 이 앱에서 가장 큰 항목이다:
//   ①엄격파 = 인성·비겁이 전혀 없어야 진종(眞從). 뿌리가 조금이라도 있으면 불성립.
//   ②완화파 = 미약한 뿌리는 가종(假從)으로 인정하되 거스르는 운에 흉이 발생.
//   ③종아격은 다른 종격보다 뿌리 허용도가 높다는 견해가 별도로 존재.
// 그래서 이 함수는 "종격이다"라고 단정하지 않고 후보·강도만 돌려준다.
// 중요도: 종격으로 보면 인성·비겁운의 길흉 부호가 정격과 정반대가 된다.
// ══════════════════════════════════════════════════════════════
function detectJonggyeok(tg, grp, sd, strength, monthSupport) {
  if (!sd) return null;
  const help = (grp.인성 || 0) + (grp.비겁 || 0);   // 일간 편 글자 수
  const ratio = typeof sd.ratio === 'number' ? sd.ratio : null;
  if (ratio === null) return null;

  // 종왕·종강(일간이 지나치게 강해 세력을 따르는 경우)은 태강 쪽에서 본다
  if (strength === '태강' && ratio >= 0.85 && (grp.관성 || 0) === 0 && (grp.재성 || 0) === 0) {
    return {
      type: (grp.인성 || 0) > (grp.비겁 || 0) ? '종강격(從强格)' : '종왕격(從旺格)',
      grade: '후보',
      follow: (grp.인성 || 0) > (grp.비겁 || 0) ? '인성' : '비겁',
      reason: '일간의 세력이 압도적인데 이를 눌러줄 관성·재성이 전혀 없습니다.',
      reverse: '관성·재성이 들어오는 운이 오히려 격을 거스르는 운이 됩니다.',
    };
  }

  // 종살·종재·종아 — 일간이 지나치게 약하고 도울 글자가 거의 없을 때
  // ★임계값 정직 고지: 아래 숫자(0.20 / help 1 / 세력 4개)는 원전에 없다.
  //   고전은 "인성·비겁이 없어야 한다"는 정성적 서술만 하고 수치를 주지 않는다.
  //   그래서 11,520 명식 배치로 출현율을 재어 종격의 희소성(3% 내외)에 맞춘 현대 캘리브레이션이다.
  //   조건을 헐겁게(0.25·세력3) 두면 출현율이 10.5%까지 올라 종격이 흔해지는 왜곡이 생겼다.
  if (strength !== '태약') return null;
  if (ratio > 0.20) return null;          // 일간이 극단적으로 약할 때만
  if (help > 1) return null;
  if (monthSupport) return null;          // 월령의 지원을 받으면 종하지 않는다
  if (sd.deukji) return null;             // 일지(좌하)에 뿌리가 있으면 종하지 않는다

  const cand = [
    { k: '관성', name: '종살격(從殺格)' },
    { k: '재성', name: '종재격(從財格)' },
    { k: '식상', name: '종아격(從兒格)' },
  ].map((c) => ({ ...c, n: grp[c.k] || 0 })).sort((a, b) => b.n - a.n)[0];

  // 따를 세력이 사주를 "지배"해야 한다. 3개로는 지배라 보기 어려워 4개 이상으로 둔다.
  // (조건을 3·ratio 0.25로 뒀을 때 출현율이 10.5%까지 올라가 종격의 희소성과 어긋났다)
  if (!cand || cand.n < 4) return null;

  return {
    type: cand.name,
    // 엄격파 기준(인성·비겁 0) 충족이면 眞從 후보, 미약한 뿌리가 남았으면 假從 후보
    grade: help === 0 ? '진종(眞從) 후보' : '가종(假從) 후보',
    follow: cand.k,
    reason: `일간이 매우 약한데 도와줄 인성·비겁이 ${help === 0 ? '전혀 없고' : '거의 없고'}, ${cand.k}이 ${cand.n}개로 사주를 지배합니다.`,
    reverse: '인성·비겁이 들어오는 운이 오히려 격을 거스르는 운이 됩니다 — 정격으로 읽을 때와 길흉이 정반대입니다.',
  };
}

// ══════════════════════════════════════════════════════════════
// 자평진전(子平真詮) 「論用神成敗救應」 — 8격 성패·구응
// 원문 출처: 沈孝瞻《子平真詮》「論用神成敗救應」(원문 전재는 docs/research_해석심화_0806.md 참조. 권·장 번호는 미확인이라 적지 않는다)
//   "成中有敗，必是帶忌；敗中有成，全憑救應"
// ★유파 주의: 자평진전 8격에는 편인격이 없다(편인은 梟神으로 식신을 극하는 흉신 취급).
//   이 앱은 한국 통용 십정격을 쓰므로, 편인격은 인수격 조건에 준해 판정하고 그 사실을 명시한다.
// ★한계: 원문은 글자의 "힘의 경중(權輕權重)"을 저울질하라 하는데("其中權輕權重，甚是活潑"),
//   개수만으로는 그 경중을 재현할 수 없다. 따라서 이 판정은 참고 신호이지 확정이 아니다.
// ══════════════════════════════════════════════════════════════
// [8/6 3차수정] 파격 문장이 "X도 Y도 없다"고 단정하는데 실제로는 있는 경우가 9.62%였다.
//   원인 = 각 격의 마지막 else가 "조건 미충족"과 "글자 없음"을 한 덩어리로 묶어 서술한 것.
//   2차에서 편관격 하나만 고치고 나머지 4격을 안 봤다(부분 수리).
//   → 실제 개수를 보고 "없는 것"과 "있으나 조건에 못 미치는 것"을 갈라 쓴다.
function pagyeokSentence(need, reasonWhenPresent) {
  const none = need.filter(([, c]) => c === 0).map(([n]) => n);
  const have = need.filter(([, c]) => c > 0).map(([n, c]) => `${n} ${c}개`);
  const parts = [];
  if (none.length) parts.push(`${none.join('·')} — 격을 완성시켜줄 이 자리가 비어 있습니다.`);
  if (have.length) parts.push(`${have.join('·')}가 있지만 ${reasonWhenPresent}`);
  return parts.join(' ') || reasonWhenPresent;
}

function gyeokSeongpae(gyeokName, tg, grp, monthClashed, strength, dayElem, monthElem) {
  const n = (k) => tg[k] || 0;
  const 정관 = n('정관'), 편관 = n('편관'), 정인 = n('정인'), 편인 = n('편인');
  const 식신 = n('식신'), 상관 = n('상관');
  const 재 = grp.재성, 인 = 정인 + 편인, 관살 = 정관 + 편관, 식상 = 식신 + 상관, 비겁 = grp.비겁;
  const strong = ['태강', '신강'].includes(strength);
  const midUp = ['중화', '신강', '태강'].includes(strength);
  const weak = ['신약', '태약'].includes(strength);

  // 금수상관은 관을 봐도 흉이 아니라는 예외(자평진전 "傷官非金水而見官")
  const geumsu = dayElem === '금' && monthElem === '수';

  let ok = null, seong = '', pa = '', gu = '', daegi = '';

  switch (gyeokName) {
    case '정관격':
      // 成: 官逢財印，又無刑沖破害 / 敗: 官逢傷尅刑沖 / 救: 透印以解之·合煞以清之·會合解刑沖
      if (상관 > 0 || monthClashed) {
        ok = false;
        pa = 상관 > 0 ? '정관이 상관의 극을 받고 있습니다(傷官見官).' : '월지가 충을 맞아 격의 뿌리가 흔들립니다.';
        if (상관 > 0 && 인 > 0) gu = '다만 인성이 상관을 눌러주고 있어 구제가 됩니다.';
        else if (monthClashed && (재 > 0 || 인 > 0)) gu = '재·인이 받쳐주어 충의 손상을 어느 정도 덜어냅니다.';
      } else if (재 > 0 || 인 > 0) {
        ok = true; seong = '정관이 재·인의 도움을 받고 형충도 없습니다(官逢財印, 無刑沖).';
      } else {
        ok = false; pa = '정관을 받쳐줄 재성도 인성도 없어 격이 외롭습니다.';
      }
      break;

    case '정재격': case '편재격':
      // 成: 財生官旺 / 財逢食生而身强帶比 / 財格透印  敗: 財輕比重·財透七煞
      if (편관 > 0 && 식상 === 0) {
        ok = false; pa = '재성이 칠살을 생하는데 이를 제어할 식상이 없습니다(財透七煞).';
        if (비겁 > 0) gu = '비겁이 있어 살의 압박을 나눠 받습니다.';
      } else if (재 <= 1 && 비겁 >= 3) {
        ok = false; pa = '재는 가벼운데 비겁이 무거워 재물을 두고 다투는 구조입니다(財輕比重).';
        if (식상 > 0) gu = '식상이 있어 비겁의 힘을 재로 흘려보냅니다.';
        else if (정관 > 0) gu = '정관이 비겁을 눌러주어 다툼이 정리됩니다.';
      } else if (정관 > 0) { ok = true; seong = '재성이 정관을 생해 격이 섰습니다(財生官旺).'; }
      else if (식상 > 0 && midUp) { ok = true; seong = '식상이 재를 생하고 일간도 감당할 힘이 있습니다(財逢食生, 身强).'; }
      else if (인 > 0 && midUp) { ok = true; seong = '재격에 인성이 함께 있어 균형이 잡혔습니다(財格透印).'; }
      else { ok = false; pa = pagyeokSentence([['정관',정관],['식상',식상],['인성',인]], '일간의 힘이 약해 그 짝을 살려 쓰지 못하는 상태입니다.'); }
      break;

    case '정인격': case '편인격':
      // 成: 印輕逢煞·官印雙全·身印兩旺而用食傷洩氣  敗: 印輕逢財·身强印重而透煞
      if (재 > 0 && 인 <= 1) {
        ok = false; pa = '인성이 가벼운데 재성이 이를 극합니다(印輕逢財).';
        if (비겁 > 0) gu = '비겁이 재를 막아주어 인성이 보존됩니다.';
      } else if (strong && 인 >= 3 && 편관 > 0) {
        ok = false; pa = '일간도 인성도 이미 무거운데 칠살까지 더해져 넘칩니다.';
      } else if (편관 > 0 && 인 <= 2) { ok = true; seong = '인성이 가벼운 자리에 칠살이 와 살인상생을 이룹니다(印輕逢煞).'; }
      else if (정관 > 0) { ok = true; seong = '관과 인이 나란히 갖춰졌습니다(官印雙全).'; }
      else if (strong && 식상 > 0) { ok = true; seong = '일간과 인성이 모두 왕한데 식상이 기운을 흘려보냅니다(用食傷洩氣).'; }
      else { ok = false; pa = pagyeokSentence([['관살',관살],['식상',식상]], '일간과 인성의 무게가 맞지 않아 그 역할을 못 하고 있습니다.'); }
      break;

    case '식신격':
      // 成: 食神生財 / 食帶煞而無財  敗: 食神逢梟·生財露煞  救: 就煞成格·生財護食
      if (편인 > 0) {
        ok = false; pa = '편인이 식신을 극합니다(食神逢梟 — 도식).';
        if (편관 > 0) gu = '칠살이 있어 차라리 살을 쓰는 격으로 전환할 수 있습니다.';
        else if (재 > 0) gu = '재성이 있어 식신을 보호합니다.';
      } else if (재 > 0 && 편관 > 0) {
        ok = false; pa = '재를 생하는데 칠살까지 드러나 힘이 새어나갑니다(生財露煞).';
      } else if (재 > 0) { ok = true; seong = '식신이 재성을 생해 격이 섰습니다(食神生財).'; }
      else if (편관 > 0 && 재 === 0) { ok = true; seong = '식신이 칠살을 제어하는데 재가 없어 깨끗합니다(食帶煞而無財).'; }
      else { ok = false; pa = pagyeokSentence([['재성',재],['칠살',편관]], '식신이 흘러갈 곳이 뚜렷하지 않습니다.'); }
      break;

    case '편관격':
      // 成: 身强七煞逢制  敗: 七煞逢財無制  救: 印護煞 → 逢財去印存食
      if (재 > 0 && 식상 === 0 && 인 === 0) {
        ok = false; pa = '재성이 칠살을 계속 생하는데 이를 제어할 식상도 인성도 없습니다(七煞逢財無制).';
      } else if (midUp && 식상 > 0) {
        ok = true; seong = '일간이 버틸 힘이 있고 식상이 칠살을 제어합니다(身強七煞逢制). 자평진전은 살을 식신으로 제어하는 것을 上으로 칩니다.';
        // [8/6 수정] 원문은 「七煞逢食制而又逢印」을 帶忌(成中有敗)로 든다 — 제살에 인성이 겹치면 흠이다.
        // [8/6 3차수정] 帶忌(성격 속의 흠)를 gu(구응=파격의 구제)에 담아 화면이 「깨진 격이 살아나는 것」으로 감쌌다.
        if (인 > 0) daegi = '식신이 살을 제어하는데 인성까지 겹쳐 있습니다. 자평진전은 이를 대기(帶忌)로 봅니다 — 격은 섰으나 흠이 하나 있는 상태입니다.';
      }
      // ★[8/6 수정] 종전엔 인성만 있어도 살인상생으로 보아 성격 판정했으나,
      //   자평진전의 편관격 성격 조건은 「身強七煞逢制」 하나뿐이고 살인상생은 성격 목록에 없다.
      //   원문에 없는 것을 원문 형식(4자 한문)으로 적어 근거처럼 보이게 한 것이라 성격에서 제외한다.
      else if (인 > 0) {
        ok = false;
        pa = '칠살을 식상으로 제어하지 못하고 있습니다. 자평진전이 편관격의 성격 조건으로 든 것은 「身強七煞逢制」 하나뿐이라, 이 사주는 그 조건에는 닿지 않습니다.';
        gu = '다만 인성이 칠살의 기운을 받아 나에게 전달하는 자리에 있습니다 — 이를 살인상생으로 보아 좋게 읽는 유파가 있습니다. 자평진전의 성격 조건은 아니지만 구제의 통로로는 봅니다.';
      }
      else {
        ok = false;
        // 조건과 문장을 일치시킨다. 식상이 있어도 일간이 약하면 여기로 오므로 "식상이 없다"고 쓰면 거짓이 된다.
        pa = 식상 > 0
          ? '식상이 칠살을 제어하려 하지만 일간의 힘이 약해 그 제어를 감당하지 못합니다. 자평진전의 조건은 「身強」이 먼저입니다.'
          : '칠살을 제어할 식상도, 흘려줄 인성도 없어 일간이 그대로 압박을 받습니다.';
      }
      break;

    case '상관격':
      // 成: 傷官生財·傷官佩印(印有根)·傷官帶煞而無財  敗: 非金水而見官·生財帶煞身輕
      if (정관 > 0 && !geumsu) {
        ok = false; pa = '상관이 정관을 봅니다(傷官見官). ※ 이 문구의 원출처는 자평진전이 아니라 연해자평이며, 자평진전은 관이 쓸모 있는지에 따라 갈린다고 조건화했습니다.';
        if (인 > 0) gu = '인성이 상관을 눌러 관을 보호합니다(佩印).';
        else if (재 > 0) gu = '재성이 상관의 기운을 관으로 흘려보냅니다(傷官生財 → 財生官).';
      } else if (재 > 0 && 편관 > 0 && !strong) {
        ok = false; pa = '재를 생하면서 칠살까지 끼었는데 일간이 가볍습니다.';
      } else if (재 > 0) { ok = true; seong = '상관이 재성을 생해 흉이 길로 전환됩니다(傷官生財, 轉凶爲吉).'; }
      else if (인 > 0 && !strong) { ok = true; seong = '인성이 상관을 다스립니다(傷官佩印). 자평진전은 상관이 왕하고 일간이 다소 약할 때 秀氣가 된다고 봅니다.'; }
      else if (편관 > 0 && 재 === 0) { ok = true; seong = '상관이 칠살과 짝하되 재가 없어 깨끗합니다(傷官帶煞而無財).'; }
      else if (geumsu && 정관 > 0) { ok = true; seong = '금수상관이라 관을 보아도 흉으로 보지 않습니다(金水傷官喜見官).'; }
      else { ok = false; pa = pagyeokSentence([['재성',재],['인성',인]], '상관을 흘려보내거나 다스리는 역할을 하지 못하는 배치입니다.'); }
      break;

    case '양인격':
      // 成: 陽刃透官煞而露財印，不見傷官  敗: 陽刃無官煞  救: 帶傷食而重印以護之
      if (관살 === 0) {
        ok = false; pa = '양인을 다스릴 관살이 없습니다(陽刃無官煞).';
        if (인 > 0) gu = '인성이 일간을 보호해 거친 기운을 다소 순화합니다.';
      } else if (상관 > 0) {
        ok = false; pa = '관살을 쓰는데 상관이 이를 손상시킵니다(帶忌).';
        if (인 >= 2) gu = '인성이 두터워 상관을 눌러 관살을 지킵니다.';
      } else if (재 > 0 || 인 > 0) { ok = true; seong = '양인이 관살의 제어를 받고 재·인이 함께 드러났습니다(透官煞而露財印).'; }
      else { ok = false; pa = pagyeokSentence([['재성',재],['인성',인]], '양인과 관살 사이를 받쳐주지 못하고 있습니다.'); }
      break;

    case '건록격':
      // 成: 透官而逢財印·透財而逢食傷·透煞而遇制伏  敗: 無財官，透煞印
      if (재 === 0 && 관살 === 0) {
        ok = false; pa = '록·겁이 무거운데 재성도 관성도 없어 힘을 쓸 자리가 없습니다(無財官).';
        if (식상 > 0) gu = '식상이 있어 넘치는 기운이 빠져나갈 통로는 있습니다.';
      } else if (정관 > 0 && (재 > 0 || 인 > 0)) { ok = true; seong = '정관이 투출하고 재·인이 받쳐줍니다(透官而逢財印).'; }
      else if (재 > 0 && 식상 > 0) { ok = true; seong = '재성이 투출하고 식상이 이를 생합니다(透財而逢食傷).'; }
      else if (편관 > 0 && 식상 > 0) { ok = true; seong = '칠살이 투출했으나 식상의 제복을 받습니다(透煞而遇制伏).'; }
      else { ok = false; pa = pagyeokSentence([['식상',식상],['인성',인]], '록·겁의 힘을 재·관으로 잇는 짝이 되지 못하고 있습니다.'); }
      break;

    default:
      return null;
  }

  const isPyeonin = gyeokName === '편인격';
  return {
    ok, seong, pa, gu, daegi,
    note: isPyeonin
      ? '※ 자평진전 8격에는 편인격이 따로 없고 편인을 효신(梟神)으로 봅니다. 여기서는 한국에서 통용되는 십정격을 따르되, 성패는 인수격 조건에 준해 읽었습니다.'
      : '',
  };
}

const API = { STEMS, STEMS_H, BRANCHES, BRANCHES_H, STEM_ELEM, BRANCH_ELEM, HIDDEN,
  gz, tenGod, tenGodBranch, calcPillars, calcDaewoon, analyze, calcSewoon, calcGongmang,
  unsung12, sinsal12, daewoonBond, clashLevel, detectHapguk, gyeokSeongpae, gyeokGojeo, detectJonggyeok, findSangshin };
if (typeof module !== 'undefined') module.exports = API;
else global.SajuEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
