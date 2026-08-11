/**
 * 감명서 해석층 — 「구조 검출 → 한 주제 한 면」 엔진
 *
 * 설계 근거
 *  · docs/research_해석심화_0806.md (코덱스 문헌조사) — 원문 등급·제외 범주를 그대로 상속
 *  · RESEARCH/user_questions_0811 (실사용자 조사) — 사람이 "소름"이라 말하는 조건:
 *      ① 검증 가능한 사실을 콕 집는다  ② 돌려 말하지 않는다  ③ 시점이 구체적이다
 *      그리고 "돈 아깝다"의 원인 1위는 뻔함, 2위는 기억에 안 남음(실행지침 없음)
 *
 * 그래서 이 엔진의 규칙
 *  1. 한 면에는 한 주제만 담는다. 제목은 분류명이 아니라 그 사람에게 하는 말로 단다.
 *  2. 본문에 명리 용어를 쓰지 않는다. 용어는 맨 아래 「근거」 줄에만 남긴다.
 *  3. 모든 면은 「그래서 무엇을 하라」로 끝난다.
 *  4. 명식에서 실제로 검출된 구조만 쓴다. 해당 없는 사람에게는 그 면을 만들지 않는다.
 *
 * 절대 금지 (docs 연구의 제외 범주 상속)
 *  · 질병 예측·병명 언급   · 궁합 흉판정   · 수명/생사 판정
 *  · 성별 전제 관법        · 파격을 낙인으로 쓰기(반드시 구응과 한 쌍)
 */
(function (global) {
  'use strict';

  const EL_KO = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' };
  const EL_HAN = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
  // 오행을 생활 언어로. "표현·발표"처럼 사람이 자기 일상에서 찾을 수 있는 말로만 적는다.
  const EL_LIFE = {
    목: { area: '시작·성장·사람을 잇는 일', act: '새로 벌이고 사람을 연결하는 일' },
    화: { area: '표현·발표·드러내기·인지도', act: '말하고 보여주고 완성해서 내놓는 일' },
    토: { area: '돈·현실·관리·쌓아두기', act: '값을 매기고 관리하고 남기는 일' },
    금: { area: '기준·마감·자르기·결단', act: '기준을 정하고 잘라내고 끝내는 일' },
    수: { area: '공부·정보·생각·기억', act: '배우고 조사하고 축적하는 일' }
  };
  // 10년 흐름을 한마디로 부르는 이름. index.html에도 같은 사전이 있지만
  // 이 파일은 별도 모듈이라 스코프가 달라, 참조하면 조용히 면이 통째로 사라졌다(실측 사고).
  const PLAIN_DECADE = {
    비견: '내 힘으로 서는 10년', 겁재: '경쟁과 나눔이 커지는 10년',
    식신: '꾸준히 만들어내는 10년', 상관: '재능이 터져 나오는 10년',
    편재: '큰돈이 오가는 10년', 정재: '차곡차곡 쌓는 10년',
    편관: '시험과 압박을 통과하는 10년', 정관: '자리와 책임이 생기는 10년',
    편인: '남다른 공부가 무기가 되는 10년', 정인: '배우고 도움받는 10년'
  };
  const GRP_LIFE = {
    비겁: '나 자신·동료·경쟁·내 몫',
    식상: '표현·기술·결과물·말과 글',
    재성: '돈·계약·현실·소유',
    관성: '책임·자리·평가·규칙',
    인성: '공부·자격·문서·도와주는 어른'
  };
  const POS_LIFE = {
    년: { name: '집안과 초년', desc: '태어난 환경, 부모 세대, 오래된 인연' },
    월: { name: '사회생활', desc: '직장, 바깥 활동, 사회에서 맡는 역할' },
    일: { name: '나 자신과 가까운 사람', desc: '내 일상, 배우자와 가장 가까운 관계' },
    시: { name: '말년과 내가 남기는 것', desc: '자녀, 결과물, 나이 들어 갈 자리' }
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ── 한 면을 만드는 틀 ────────────────────────────────
  // kicker=번호와 분류 / title=그 사람에게 하는 말 / lede=한 문단 요약
  // blocks=본문 / action=반드시 있어야 하는 실행 지침 / evidence=명리 근거(작은 글씨)
  function page(o) {
    const secs = (o.blocks || []).join('');
    const act = o.action
      ? `<div class="rd-act"><b>그래서 무엇을 하면 되나</b>${o.action}</div>` : '';
    const ev = o.evidence
      ? `<div class="rd-src">근거 · ${o.evidence}</div>` : '';
    return `<section class="rd-page ${o.cls || ''}">
      <div class="rd-kicker">${esc(o.kicker || '')}</div>
      <h2 class="rd-title">${o.title}</h2>
      ${o.lede ? `<div class="rd-lede">${o.lede}</div>` : ''}
      ${secs}${act}${ev}</section>`;
  }
  const H = (n, t) => `<h3 class="rd-h"><span class="rd-n">${n}</span>${t}</h3>`;
  const P_ = t => `<p>${t}</p>`;
  const UL = arr => `<ul class="rd-ul">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
  const BOX = (t, kind) => `<div class="rd-box ${kind || ''}">${t}</div>`;
  const TBL = (head, rows) =>
    `<table class="rd-tbl"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>` +
    rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') + '</table>';

  // ── 명식에서 쓸 값 정리 ──────────────────────────────
  function facts(A, P, DW, ctx) {
    const g = A.groups || {};
    const el = A.elem || {};
    const order = ['비겁', '식상', '재성', '관성', '인성'];
    const most = order.slice().sort((a, b) => (g[b] || 0) - (g[a] || 0))[0];
    const zeros = order.filter(k => !(g[k] > 0));
    const elMost = Object.keys(el).sort((a, b) => el[b] - el[a])[0];
    const missing = A.completeMissing && A.completeMissing.length ? A.completeMissing : (A.missing || []);
    const strong = ['신강', '태강'].includes(A.strength);
    // 강약 3밴드 — 중화를 '약'으로 뭉개면 18.4%가 남의 사주 문장을 받는다(적천수 억부는 연속적, 중화는 약이 아님)
    const band = strong ? 'strong' : A.strength === '중화' ? 'mid' : 'weak';
    const nowYear = ctx.nowYear;
    // 용신이 대운에 도착하는 구간 — "구체적 시점"을 만들기 위한 재료
    const yongDecades = (DW.list || []).filter(d =>
      A.yongshin && [ctx.E.STEM_ELEM[d.stem], ctx.E.BRANCH_ELEM[d.branch]].includes(A.yongshin));
    const futureYong = yongDecades.filter(d => d.endYear > nowYear);
    return { g, el, order, most, zeros, elMost, missing, strong, band, yongDecades, futureYong, nowYear };
  }
  const ageAt = d => Math.floor(d.startAgeExact);

  // ══════════════════════════════════════════════════
  //  구조 규칙 — 검출되면 그 사람 감명서에 한 면이 생긴다
  // ══════════════════════════════════════════════════
  const RULES = [];
  const rule = (id, weight, fn) => RULES.push({ id, weight, fn });

  // ── 01. 힘의 쏠림 (태강/태약) ─────────────────────
  rule('strength_extreme', 900, (A, P, DW, C, F) => {
    if (!['태강', '태약'].includes(A.strength)) return null;
    const tae = A.strength === '태강';
    const sd = A.strengthDetail || {};
    const pct = Math.round((sd.ratio || 0) * 100);
    const help = tae ? '나를 돕는' : '나를 쓰는';
    const outEl = F.order.filter(k => ['식상', '재성', '관성'].includes(k));
    const outHas = outEl.filter(k => F.g[k] > 0);

    return page({
      kicker: '나는 어떤 사람인가',
      title: tae
        ? `${C.you}에게 부족한 것은 <b>준비가 아니라 발표</b>입니다`
        : `${C.you}은 <b>혼자 다 지지 않을 때</b> 가장 크게 갑니다`,
      lede: tae
        ? `사주는 나를 돕는 힘과 나를 쓰는 힘의 저울입니다. ${C.you}은 <b>돕는 쪽이 압도적</b>입니다.<br>
           밑천이 두껍다는 뜻입니다. 대신 <b>들어오기만 하고 나가는 구멍이 없으면</b> 그 밑천이 고입니다.`
        : `${C.you}은 <b>감당해야 할 몫에 비해 내 힘이 넉넉하지 않은</b> 배치입니다.<br>
           약하다는 뜻이 아닙니다. <b>혼자 다 지는 방식이 손해</b>라는 뜻입니다. 방법을 바꾸면 결과가 달라집니다.`,
      blocks: [
        H(1, tae ? '이 쏠림이 실제로 만드는 장면' : '이 배치가 실제로 만드는 장면'),
        UL(tae ? [
          '<b>웬만한 일에 잘 안 무너집니다.</b> 버티는 힘, 배우면 남는 힘은 확실히 남들보다 큽니다.',
          '<b>대신 결정이 늦습니다.</b> 재료가 많으니 더 볼 것이 계속 생깁니다.',
          '<b>시작보다 준비가 깁니다.</b> 준비 단계에서 이미 만족이 오기 때문에 실행 없이도 뿌듯합니다.',
          '<b>같은 방식으로 모든 문제를 풀려 합니다.</b> 힘이 있으니 밀어붙이면 되던 경험이 쌓여 있어서입니다.'
        ] : [
          '<b>혼자 밀어붙이면 반드시 탈이 납니다.</b> 초반에 잘 나가다 중반에 꺾이는 패턴이 반복됩니다.',
          '<b>대신 사람·자료·절차를 붙이면 확 달라집니다.</b> 이 사주는 혼자보다 팀에서 성과가 큽니다.',
          '<b>큰 자리를 먼저 맡기보다</b> 실력을 증명한 뒤 자리를 받는 순서가 안전합니다.',
          '<b>기회처럼 보이는 것이 부담일 때가 많습니다.</b> 규모를 줄이면 같은 기회가 실제 이익이 됩니다.'
        ]),
        BOX(tae
          ? `<b>${C.you}이 평생 조심해야 할 한 문장</b><br>
             <b>"아직 준비가 덜 됐어."</b> ${C.you}에게 이 말은 대개 사실이 아닙니다.
             준비는 이미 남들보다 되어 있고, 부족한 것은 준비가 아니라 <b>내놓는 행동</b>입니다.
             ${outHas.length ? `내보내는 통로는 <b>${GRP_LIFE[outHas[0]]}</b> 쪽에 있습니다.` : '내보내는 통로가 원국에 거의 없어, 습관으로 만들어야 합니다.'}`
          : `<b>${C.you}이 평생 조심해야 할 한 문장</b><br>
             <b>"내가 다 하면 되지."</b> ${C.you}에게 그건 미덕이 아니라 손실입니다.
             같은 일을 나눠 하면 결과가 커지고, 혼자 하면 결과보다 소모가 큽니다.`,
          tae ? 'warn' : 'warn'),
        H(2, '그래서 무엇이 성패를 가르나'),
        P_(tae
          ? `이 사주의 성패는 <b>얼마나 채우느냐</b>가 아니라 <b>얼마나 꺼내느냐</b>로 갈립니다.
             자격증을 하나 더 따는 것보다, 이미 가진 것으로 <b>한 건을 실제로 끝내는 것</b>이 훨씬 크게 작동합니다.`
          : `이 사주의 성패는 <b>누구와 함께하느냐, 어떤 절차 위에서 하느냐</b>로 갈립니다.
             같은 능력이라도 혼자 맨몸으로 하면 절반이고, 팀·자료·시스템 위에서 하면 배가 됩니다.`)
      ],
      action: UL(tae ? [
        '<b>이번 주</b> — 미뤄둔 것 하나를 <b>70%에서 그냥 내보내세요.</b> 이 분의 70%는 남의 90%입니다.',
        '<b>이번 달</b> — 새 강의를 하나 <b>줄이고</b>, 그 시간에 이미 배운 것으로 <b>한 건을 끝내세요.</b>',
        '<b>올해</b> — "끝냈다"고 말할 수 있는 일을 <b>세 건 만드세요.</b> 개수를 세는 방식이 가장 잘 듣습니다.'
      ] : [
        '<b>이번 주</b> — 지금 혼자 지고 있는 일 하나를 <b>이름을 정해 넘기십시오.</b> 도와달라는 말을 구체적으로 하는 연습입니다.',
        '<b>이번 달</b> — 반복하는 일 하나를 <b>절차로 적어</b> 두십시오. 이 사주는 기억력이 아니라 시스템으로 버팁니다.',
        '<b>올해</b> — 새로 벌이는 것보다 <b>이미 하는 것의 규모를 줄여 안정</b>시키는 쪽이 이익이 큽니다.'
      ]),
      evidence: `일간 ${C.E.STEMS[P.day.stem]}(${A.dayElem}) · 강약 ${A.strength} · 도움 ${(A.strengthDetail || {}).help} 대 소모 ${(A.strengthDetail || {}).enemy} · 세력비 ${pct}% · 월령 ${(A.strengthDetail || {}).deukryeong ? '득령' : '실령'} / 일지 ${(A.strengthDetail || {}).deukji ? '득지' : '실지'}. 적천수 「旺則宜洩宜傷，衰則喜幫喜助」`
    });
  });

  // ── 02. 통째로 없는 기운 ──────────────────────────
  rule('missing_elements', 300, (A, P, DW, C, F) => {
    if (!F.missing.length) return null;
    const list = F.missing;
    const one = list[0];
    const deep = A.completeMissing && A.completeMissing.length >= list.length;
    const yongIsMissing = A.yongshin && list.includes(A.yongshin);

    return page({
      kicker: '타고나지 못한 것',
      title: list.length >= 2
        ? `${C.you}은 <b>${list.map(e => EL_KO[e]).join('·')}</b>의 힘을 타고나지 않았습니다 — 이건 <b>배워서 쓰는</b> 힘입니다`
        : `${C.you}은 <b>${EL_KO[one]}(${EL_HAN[one]})</b>의 힘을 타고나지 않았습니다 — 이건 <b>배워서 쓰는</b> 힘입니다`,
      lede: `사주에서 「없다」는 말을 결핍으로 읽으면 안 됩니다. <b>기본값이 아니라는 뜻</b>일 뿐입니다.<br>
        타고난 사람은 저절로 하고, ${C.you}은 <b>정해두고 합니다.</b> 결과는 같습니다. 방법이 다를 뿐입니다.`,
      blocks: [
        H(1, '어떤 힘을 배워서 써야 하나'),
        TBL(['배워서 쓸 힘', '이게 담당하는 일', '놔두면 이렇게 나타납니다'],
          list.map(e => [
            `<b>${EL_KO[e]} ${EL_HAN[e]}</b>`,
            EL_LIFE[e].area,
            e === '화' ? '아는 것을 밖으로 내놓는 일이 유독 어렵습니다. 실력이 있어도 알려지지 않습니다.'
              : e === '금' ? '스스로 마감과 기준을 정하는 일이 약합니다. 남이 정해주지 않으면 안 끝납니다.'
                : e === '토' ? '벌어도 남기는 구조를 만드는 데 품이 듭니다. 관리와 정리가 뒤로 밀립니다.'
                  : e === '수' ? '충분히 알아보기 전에 움직이는 편입니다. 준비 부족이 뒤늦게 비용이 됩니다.'
                    : '새로 시작하고 사람을 잇는 일에 시동이 늦게 걸립니다.'
          ])),
        H(2, '타고나지 않은 힘은 사람과 환경에서 빌려 씁니다'),
        P_(`${C.you}에게 ${list.map(e => `<b>${EL_LIFE[e].act}</b>`).join('과 ')}은
            <b>기분이 날 때 하는 일이 아니라 일정에 넣어서 하는 일</b>입니다.
            그렇게만 하면 됩니다. 정해두지 않으면 평생 안 하게 되는 것뿐입니다.`),
        yongIsMissing
          ? BOX(`<b>그리고 여기에 이 사주의 가장 좋은 소식이 있습니다.</b><br>
              ${C.you}에게 가장 필요한 힘이 바로 이 <b>${EL_KO[A.yongshin]}(${EL_HAN[A.yongshin]})</b>인데,
              10년 단위 흐름이 그 힘을 <b>직접 실어다 줍니다.</b>
              그래서 타고난 글자보다 <b>어느 시기를 걷고 있느냐</b>가 훨씬 크게 작동합니다.
              그 시기는 뒤에 연도로 적어두었습니다.`, 'good')
          : ''
      ],
      action: UL([
        `<b>이번 주</b> — ${EL_LIFE[one].act} 가운데 <b>딱 하나를 골라 달력에 시간을 잡으세요.</b>`,
        `<b>이번 달</b> — 그 일을 <b>같은 요일 같은 시간에 반복하세요.</b> 이 힘은 의욕이 아니라 반복이 만듭니다.`,
        `<b>평생</b> — 색깔이나 방향 같은 것으로 대신하지 마세요. ${C.you}에게 듣는 것은 <b>${EL_LIFE[one].act}</b> 그 행동뿐입니다.`
      ]),
      evidence: `오행 ${Object.keys(F.el).map(k => k + ' ' + F.el[k]).join(' · ')} · 지장간 포함 결손 ${(A.completeMissing || []).join('·') || '없음'} · 용신 ${A.yongshin || '단일 처방 없음'}(${A.yongshinBasis || '-'}) · 원국 내 존재 ${A.yongshinInChart ? '있음' : '없음(운대기)'}`
    });
  });

  // ── 03. 넘치는 기운 ───────────────────────────────
  rule('excess_element', 290, (A, P, DW, C, F) => {
    const e = F.elMost, n = F.el[e] || 0;
    if (n < 4) return null;
    const dayEl = A.dayElem;
    // 고전 관용구 — 넘치는 기운과 일간의 관계로 그림을 만든다
    const GEN = { 수: '목', 목: '화', 화: '토', 토: '금', 금: '수' };
    const feeds = GEN[e] === dayEl;                 // 넘치는 것이 나를 생함
    const isSelf = e === dayEl;                     // 나 자신이 넘침
    const pic = feeds
      ? `물을 계속 부으면 뿌리가 썩고 나무가 뜹니다. 도움도 넘치면 짐이 됩니다.`
      : isSelf ? `같은 나무가 한 화분에 여럿이면 서로 자리를 다툽니다.`
        : `한 가지 기운이 두꺼우면 그 방식으로만 세상을 풀려 합니다.`;
    return page({
      kicker: '넘치는 것',
      title: `<b>${EL_KO[e]}(${EL_HAN[e]})</b>이 여덟 글자 중 ${n}개 — 이 사주에서 가장 두꺼운 힘입니다`,
      lede: `${pic} 이 사주의 강점도 약점도 여기서 나옵니다.`,
      blocks: [
        H(1, '이 기운이 두꺼워서 좋은 점'),
        P_(`<b>${EL_LIFE[e].area}</b> 쪽에서는 남들보다 확실히 앞섭니다. 애써 노력한 결과가 아니라 기본값이라,
            본인은 이게 강점인 줄 모르는 경우가 많습니다. <b>남이 어려워하는데 나는 쉬운 것</b>을 찾아보면 대개 여기 있습니다.`),
        H(2, '같은 힘이 만드는 그늘'),
        UL(feeds ? [
          '<b>결정이 늦습니다.</b> 받아들일 것이 계속 들어오니 마무리 시점을 스스로 못 정합니다.',
          '<b>도와주는 사람이 많은데 그게 자립을 늦춥니다.</b> 편해서 혼자 결정하는 근육이 늦게 붙습니다.',
          '<b>걱정이 안으로 쌓입니다.</b> 밖으로 말하지 않고 혼자 굴립니다. 특히 밤에 그렇습니다.'
        ] : isSelf ? [
          '<b>내 몫을 지키려다 관계가 상합니다.</b> 양보와 손해를 잘 구분하지 못합니다.',
          '<b>공동비용·역할 분담에서 갈등이 반복됩니다.</b> 먼저 정해두지 않으면 반드시 어긋납니다.',
          '<b>혼자 밀어붙이다 지칩니다.</b> 남에게 넘기는 것을 지는 것으로 느낍니다.'
        ] : [
          `<b>한 방식만 씁니다.</b> ${EL_LIFE[e].act}으로 모든 문제를 풀려 합니다.`,
          '<b>그 방식이 안 통하는 판에서 유독 힘듭니다.</b> 방법이 없는 게 아니라 다른 방법을 안 써본 것입니다.',
          '<b>같은 실수가 주기적으로 반복됩니다.</b> 성격이 아니라 기울어진 배치 때문입니다.'
        ]),
        BOX(`<b>넘치는 것은 줄일 수 없습니다. 타고난 것이니까요.</b><br>
             대신 <b>흘려보낼 출구</b>를 만들어야 합니다. ${EL_KO[e]} 다음에 오는 기운은
             <b>${EL_KO[GEN[e]]}(${EL_HAN[GEN[e]]})</b> — 즉 <b>${EL_LIFE[GEN[e]].act}</b>입니다.
             이 사주는 그 방향으로 힘을 흘릴 때 막힘이 풀립니다.`)
      ],
      action: UL([
        `<b>이번 주</b> — ${EL_LIFE[GEN[e]].act} 쪽으로 작은 일 하나를 끝내십시오.`,
        `<b>이번 달</b> — 넘치는 쪽(${EL_LIFE[e].area})에 쓰는 시간을 <b>10%만</b> 줄여 출구 쪽으로 옮기십시오.`,
        `<b>점검</b> — 같은 불편이 <b>세 번</b> 반복되면 노력의 양이 아니라 방향을 바꿔야 할 신호입니다.`
      ]),
      evidence: `오행 ${Object.keys(F.el).map(k => k + ' ' + F.el[k]).join(' · ')} · 최다 ${e} ${n} · 일간 ${A.dayElem}`
    });
  });

  // ── 04. 받는 것만 있고 내보내는 통로가 없다 ────────
  rule('input_no_output', 280, (A, P, DW, C, F) => {
    const 인 = F.g.인성 || 0, 식 = F.g.식상 || 0;
    if (!(인 >= 3 && 식 === 0)) return null;
    return page({
      kicker: '이 사주의 핵심 구조',
      title: `배우고 받아들이는 힘은 <b>여덟 중 ${인}개</b>인데, 내놓는 통로는 <b>0개</b>입니다`,
      lede: `이 사주를 하나만 이해한다면 이겁니다. <b>입력은 넘치고 출력이 없습니다.</b><br>
             그래서 평생의 숙제도 하나로 정해집니다. 더 배우는 것이 아니라 <b>이미 아는 것을 밖으로 꺼내는 일</b>입니다.`,
      blocks: [
        H(1, '이 구조가 만드는 반복 장면'),
        UL([
          '<b>"자료를 더 보고 결정하자"가 입버릇입니다.</b> 자료는 이미 충분한데 불안해서 미룹니다. 그 사이 남이 먼저 움직입니다.',
          '<b>공부는 실패하지 않으니 안전합니다.</b> 그래서 실행 대신 공부를 택합니다. 자격증이 늘어도 상황은 그대로입니다.',
          '<b>완벽하지 않으면 내놓지 못합니다.</b> 100%를 기다리다 때를 놓칩니다.',
          '<b>말로 표현하는 것이 서툽니다.</b> 서운함도, 원하는 것도, 부탁도 안으로 삼킵니다.'
        ]),
        BOX(`<b>이 사주에 가장 잘 듣는 처방은 「70%에서 내놓기」입니다.</b><br>
             인성이 ${인}개인 사람의 70%는 <b>보통 사람의 90%</b>입니다.
             완성해서 내놓는 것이 아니라 <b>내놓고 나서 완성</b>하는 순서로 바꿔야 이 구조가 풀립니다.`, 'good'),
        H(2, '이걸 놔두면 생기는 일'),
        P_(`받은 것이 안에서만 돌면 <b>생각이 몸보다 먼저 지칩니다.</b>
            몸을 안 썼는데 피곤한 날이 잦고, 밤에 생각이 길어집니다.
            이건 성격이 예민한 것이 아니라 <b>빠져나갈 구멍이 없는 구조</b> 때문입니다.`)
      ],
      action: UL([
        '<b>이번 주</b> — 배운 것 하나를 <b>남에게 설명</b>하십시오. 글이든 말이든 상관없습니다. 밖으로 나가면 됩니다.',
        '<b>이번 달</b> — 새 강의·새 자격을 하나 <b>줄이고</b>, 그 시간에 이미 배운 것으로 <b>한 건을 끝내십시오.</b>',
        '<b>규칙</b> — 무엇을 배우든 <b>제출일을 먼저 정하고</b> 시작하십시오. 마감이 없으면 이 사주는 끝내지 않습니다.'
      ]),
      evidence: `십성군 ${F.order.map(k => k + ' ' + (F.g[k] || 0)).join(' · ')} · 인성 ${인} · 식상 0. 적천수 「旺則宜洩宜傷」 — 왕한 것은 덜어내야 하나 덜어낼 통로가 원국에 없어 후천적 습관으로 대신함.`
    });
  });

  // ── 05. 돈 자리가 적은데 나눌 사람이 많다 (군겁쟁재) ─
  rule('gunggeop_jaengjae', 880, (A, P, DW, C, F) => {
    const 재 = F.g.재성 || 0, 비 = F.g.비겁 || 0;
    if (!(재 <= 1 && 비 >= 2)) return null;
    const hap = (A.relations && A.relations.천간합 || []).filter(r => /간/.test((r.pos || []).join('')));
    const weakHap = hap.length && /불화|멀리/.test(hap[0].status + ' ' + (hap[0].reason || ''));
    return page({
      kicker: '돈',
      title: `돈 자리가 <b>하나</b>인데, 그것을 당기는 손이 <b>${비}개</b> 있습니다`,
      lede: `이 사주의 재물 구조는 두 문장으로 끝납니다. <b>돈이 저절로 굴러오는 구조는 아니고,
             새는 자리가 아주 또렷하게 하나 있습니다.</b> 그 자리만 막으면 됩니다.`,
      blocks: [
        H(1, '가난한 사주가 아닙니다. 관리형 사주입니다'),
        P_(`여덟 글자 중 돈·현실·소유를 뜻하는 글자가 ${재}개입니다.
            이건 못 번다는 뜻이 절대 아닙니다. <b>버는 것보다 지키는 쪽에서 승부가 나는 구조</b>라는 뜻입니다.
            수입을 20% 늘리는 것보다 새는 곳을 막는 쪽이 이 사주에는 효과가 훨씬 큽니다.`),
        H(2, '어디서 새는가 — 이 사주는 답이 정해져 있습니다'),
        BOX(`<b>사람 때문에 나갑니다. 사기가 아니라 정 때문입니다.</b>
          <ul style="margin:2.5mm 0 0">
            <li>빌려주고 못 받습니다. 달라는 말을 못 해서 그냥 넘어갑니다.</li>
            <li>밥값·경비를 자주 냅니다. 한 번은 작지만 누적되면 큽니다.</li>
            <li><b>동업·보증·공동명의</b> — 이 사주에서 가장 위험한 세 단어입니다. 잘 될 때는 문제가 없다가 <b>정산할 때 반드시</b> 어긋납니다.</li>
            <li>가족·형제 문제로 나갑니다. 거절을 못 하는 성향과 겹쳐 커집니다.</li>
          </ul>`, 'warn'),
        weakHap
          ? P_(`다만 다행인 점이 있습니다. 이 구조는 <b>글자끼리 멀리 떨어져 있어 힘이 약합니다.</b>
                한 번에 크게 잃는 형태가 아니라 <b>방심하면 조금씩 새는</b> 형태입니다. 그래서 규칙 몇 줄로 막힙니다.`)
          : P_(`이 구조는 힘이 약하지 않습니다. <b>큰 결정 한 번에 크게 흔들릴 수 있으니</b>
                금액이 커지는 자리에서는 반드시 문서와 제3자를 붙이십시오.`)
      ],
      action: TBL(['규칙', '왜 이 사주에 필요한가'], [
        ['<b>① 친분과 정산을 분리한다</b>', '가까운 사람일수록 금액·기한·방식을 글로 남깁니다. 야박한 게 아니라 이 사주에 필요한 안전장치입니다.'],
        ['<b>② 보증·대납·구두 동업은 금액과 무관하게 하지 않는다</b>', '이 사주에서 새는 돈은 큰 결정이 아니라 작은 호의에서 시작합니다.'],
        ['<b>③ 수입을 늘리기 전에 고정비를 먼저 잠근다</b>', '돈 자리가 적어, 버는 쪽보다 막는 쪽의 효과가 큽니다.']
      ]),
      evidence: `재성 ${재} · 비겁 ${비} · 식상 ${F.g.식상 || 0}${hap.length ? ' · 천간합 ' + hap.map(h => h.pair + '(' + (h.status || '') + ')').join(', ') : ''}. 자평진전은 財輕比重(재가 가볍고 비겁이 무거움)을 파격 조건의 하나로 든다.`
    });
  });

  // ── 06. 자리·마감을 정해주는 기운이 없다 ───────────
  rule('no_gwan', 860, (A, P, DW, C, F) => {
    if ((F.g.관성 || 0) > 0) return null;
    const gm = A.gongmang || [];
    const gmHit = gm.length && ['신', '유', '경', '신'].some(x => gm.includes(x));
    return page({
      kicker: '일과 자리',
      title: `나를 <b>붙잡아 주는 틀</b>이 없습니다 — 자유롭지만, 스스로 마감을 못 정합니다`,
      lede: `여덟 글자에 직책·평가·규칙을 뜻하는 기운이 <b>하나도 없습니다.</b>
             ${gmHit ? '게다가 그 자리가 <b>공망</b>이라 두 번 비었습니다. ' : ''}이건 장점과 단점이 정확히 한 쌍입니다.`,
      blocks: [
        TBL(['좋은 쪽', '불편한 쪽'], [[
          '남이 정한 틀에 잘 안 매입니다. 위계와 사내 정치에 에너지를 덜 씁니다. 직함보다 실력으로 인정받는 자리에서 편합니다.',
          '<b>외부에서 마감을 주지 않으면 일이 안 끝납니다.</b> 스스로 기준과 마감을 정하는 근육이 약합니다. 평가 체계가 촘촘한 조직에서는 답답함을 오래 느낍니다.'
        ]]),
        H(1, '이 사주가 조직에서 겪는 반복'),
        P_(`실력은 늘 충분한데 <b>"내가 이걸 할 만한 사람인가"에서 걸립니다.</b>
            자격을 하나 더 따고 나면 하겠다고 미루는데, 하나 더 따도 같은 자리에서 또 걸립니다.
            자격이 문제가 아니라 <b>나를 세워주는 틀이 없어서</b>입니다.`),
        BOX(`<b>그래서 이 사주는 「틀을 밖에서 빌려 오는 것」이 처방입니다.</b><br>
             혼자 정한 마감은 잘 안 지킵니다. 대신 <b>남과 약속한 마감</b>은 지킵니다.
             발표 자리를 먼저 잡고 준비하기, 함께 하는 사람을 만들기, 제출처가 있는 일 고르기 —
             이런 방식이 이 사주에 유독 잘 듣습니다.`, 'good')
      ],
      action: UL([
        '<b>이번 주</b> — 지금 하는 일 하나에 <b>남이 아는 마감</b>을 붙이십시오. 상대에게 날짜를 말하는 것만으로 됩니다.',
        '<b>이번 달</b> — 자율에 맡겨진 일과 마감이 있는 일 중, <b>마감 있는 쪽</b>에 시간을 더 배분하십시오.',
        '<b>직업 선택</b> — 자율성이 큰 자리를 고를 때는 <b>스스로 마감 구조를 만들 수 있는지</b>를 먼저 확인하십시오. 이 사주가 가장 자주 무너지는 지점입니다.'
      ]),
      evidence: `관성 0 · 금 ${F.el.금 || 0}${gm.length ? ' · 공망 ' + gm.join('·') : ''} · 격국 ${(A.gyeok || {}).name || '-'}`
    });
  });

  // ── 07. 없는 기운이 운에서 오는 시기 (구체적 시점) ──
  rule('yongshin_timing', 180, (A, P, DW, C, F) => {
    if (!A.yongshin) return null;
    const inChart = A.yongshinInChart;
    const fut = F.futureYong;
    if (!fut.length && inChart) return null;
    const rows = fut.map(d => {
      const sg = C.E.tenGod(P.day.stem, d.stem), bg = C.E.tenGodBranch(P.day.stem, d.branch);
      return [`<b>만 ${ageAt(d)}세 ~ ${ageAt(d) + 10}세</b><br><span class="rd-dim">${d.startYear}~${d.endYear}년</span>`,
      `${GRP_LIFE[C.tenGodGroup(sg)]} · ${GRP_LIFE[C.tenGodGroup(bg)]}`,
      d.startYear <= F.nowYear && d.endYear > F.nowYear ? '<b>지금 걷고 있는 구간</b>' : '앞으로 옵니다'];
    });
    return page({
      kicker: '언제가 좋은가',
      title: inChart
        ? `이 사주에 필요한 <b>${EL_KO[A.yongshin]}</b>이 크게 들어오는 시기가 정해져 있습니다`
        : `타고나지 못한 <b>${EL_KO[A.yongshin]}(${EL_HAN[A.yongshin]})</b>을, 10년 흐름이 실어다 줍니다`,
      lede: inChart
        ? `이 사주에는 필요한 기운이 이미 있습니다. 아래 구간은 그 기운이 <b>한 번 더 크게 실리는</b> 때입니다.`
        : `원국에 없는 기운은 <b>운에서 빌려 씁니다.</b> 그래서 이 사주는 타고난 글자보다
           <b>어느 10년을 걷고 있느냐</b>가 삶의 체감을 더 크게 바꿉니다. 그 시기가 아래입니다.`,
      blocks: [
        rows.length
          ? TBL(['시기', '그때의 주제', ''], rows)
          : P_('계산한 10개 구간 안에서는 이 기운이 크게 들어오는 때가 따로 잡히지 않습니다. 그렇다면 시기를 기다리기보다 생활 습관으로 만드는 쪽이 맞습니다.'),
        BOX(`<b>「좋은 운」을 이렇게 읽으십시오.</b><br>
             저절로 좋은 일이 생긴다는 뜻이 아닙니다. <b>${EL_LIFE[A.yongshin].act}</b>을 할 때
             평소보다 <b>마찰이 적다</b>는 뜻입니다. 준비한 것이 없으면 좋은 운도 그냥 지나갑니다.
             그래서 이 표는 예언이 아니라 <b>일정표</b>로 쓰는 것이 맞습니다.`),
        fut.length && fut[0].startYear > F.nowYear
          ? P_(`가장 가까운 구간은 <b>${fut[0].startYear}년, 만 ${ageAt(fut[0])}세</b>부터입니다.
                그때까지 남은 기간은 <b>재료를 쌓는 시간</b>으로 보시면 됩니다.
                지금 쌓아두지 않으면 그때 꺼낼 것이 없습니다.`)
          : ''
      ],
      action: UL([
        `<b>지금</b> — ${EL_LIFE[A.yongshin].act}에 해당하는 일을 <b>한 가지</b> 골라 지금부터 쌓으십시오.`,
        `<b>표시된 구간</b> — 그때가 되면 <b>규모를 키우십시오.</b> 같은 노력에 결과가 더 붙는 때입니다.`,
        `<b>그 밖의 시기</b> — 조급해할 이유가 없습니다. 이 사주는 <b>때가 정해져 있는</b> 편입니다.`
      ]),
      evidence: `용신 ${A.yongshin}(${A.yongshinBasis || '-'}) · 원국 내 존재 ${inChart ? '있음' : '없음 — 운대기'} · 조후 ${A.johu ? (C.E.STEMS[A.johu.main] + '/' + A.johu.mainElem) : '별도 처방 없음'} · 한난조습 ${(A.temp || {}).label || '-'}`
    });
  });

  // ── 08. 반복해서 삐걱대는 자리 (형·충) ─────────────
  rule('friction_spots', 840, (A, P, DW, C, F) => {
    const rel = A.relations || {};
    const items = [];
    (rel.지지충 || []).forEach(r => items.push({ pos: r.pos, kind: '충', pair: r.pair }));
    (rel.형 || []).forEach(r => items.push({ pos: r.pos, kind: '형', pair: r.pair }));
    if (!items.length) return null;
    const rows = items.map(it => {
      const areas = (it.pos || []).map(p => POS_LIFE[p[0]] ? POS_LIFE[p[0]].name : p).filter(Boolean);
      const uniq = [...new Set(areas)];
      return [
        `<b>${uniq.join(' ↔ ')}</b>`,
        it.kind === '충'
          ? '크게 흔들립니다. 그대로 두기보다 <b>조건을 다시 짜야</b> 하는 자리입니다.'
          : '크게 터지지는 않는데 <b>같은 일로 계속 마음이 쓰입니다.</b> 반복이 특징입니다.'
      ];
    });
    return page({
      kicker: '반복되는 마찰',
      title: `이 사주에는 <b>같은 자리에서 반복해서 삐걱대는</b> 지점이 있습니다`,
      lede: `사주에서 이 표시는 <b>사고나 이별의 예고가 아닙니다.</b>
             "그 자리는 한 번 정하고 끝나지 않고, <b>주기적으로 다시 협상해야 한다</b>"는 뜻입니다.`,
      blocks: [
        TBL(['어느 자리', '어떻게 나타나나'], rows),
        H(1, '이 표시를 쓰는 올바른 방법'),
        UL([
          '<b>피하려 하지 마십시오.</b> 이 자리는 없어지지 않습니다. 대신 <b>미리 정해두면</b> 훨씬 작아집니다.',
          '<b>같은 문제가 3년, 5년 간격으로 돌아옵니다.</b> 그때마다 처음처럼 놀라지 않는 것만으로 절반은 해결됩니다.',
          '<b>기록해 두십시오.</b> 언제 어떤 일로 부딪혔는지 적어두면 다음 번에 대응 시간이 확 줄어듭니다.'
        ]),
        BOX(`<b>사주의 이 부분은 검증이 쉽습니다.</b><br>
             위 표에 적힌 자리에서 <b>과거에 실제로 반복이 있었는지</b> 떠올려 보십시오.
             맞으면 이 감명서의 나머지도 같은 기준으로 읽으시면 되고,
             전혀 아니라면 <b>태어난 시각</b>을 다시 확인해야 합니다. 시각이 바뀌면 이 표가 통째로 달라집니다.`, 'good')
      ],
      action: UL([
        '<b>이번 달</b> — 위 자리 중 하나를 골라, <b>지금 어긋나 있는 조건</b>(돈·시간·역할 중 하나)을 종이에 적으십시오.',
        '<b>협상</b> — 상대에게 <b>한 문장</b>으로 말하십시오. 참고 넘어가면 이 자리는 반드시 다시 옵니다.',
        '<b>기록</b> — 부딪힌 날짜와 내용을 남기십시오. 이 사주에서 가장 값이 큰 습관입니다.'
      ]),
      evidence: `${['지지충', '형', '해', '파'].map(k => (rel[k] || []).length ? k + ' ' + rel[k].map(r => r.pair + '(' + (r.pos || []).join('·') + ')').join(', ') : '').filter(Boolean).join(' · ')}. ※ 형·충은 사건 확정이 아니라 조정 빈도의 신호로만 읽음.`
    });
  });

  // ── 09. 도움이 오는 자리 (귀인 집중) ───────────────
  rule('noble_cluster', 820, (A, P, DW, C, F) => {
    const NOBLE = ['천을귀인', '천덕귀인', '월덕귀인', '문곡귀인', '태극귀인', '천주귀인', '복성귀인'];
    const spots = (A.sinsal || []).filter(s => NOBLE.includes(s.name));
    if (spots.length < 2) return null;
    const byPos = {};
    spots.forEach(s => { const p = (s.where || '')[0]; if (!byPos[p]) byPos[p] = []; byPos[p].push(s.name); });
    const top = Object.keys(byPos).sort((a, b) => byPos[b].length - byPos[a].length)[0];
    const info = POS_LIFE[top] || { name: '알 수 없는 자리', desc: '' };
    return page({
      kicker: '사람 복',
      title: `이 사주는 도와주는 사람이 <b>${info.name}</b> 쪽에서 옵니다`,
      lede: `귀인은 "착한 사람이 나타난다"는 뜻이 아닙니다.
             <b>어느 자리에서 도움이 잘 붙는지</b>를 알려주는 표시입니다. 이 사주는 그게 한 자리에 몰려 있습니다.`,
      blocks: [
        TBL(['자리', '무슨 자리인가', '겹친 표시'],
          Object.keys(byPos).map(p => [
            `<b>${(POS_LIFE[p] || {}).name || p}</b>`,
            (POS_LIFE[p] || {}).desc || '',
            byPos[p].join(' · ')
          ])),
        H(1, '실제로 이렇게 나타납니다'),
        P_(`<b>${info.desc}</b> — 이쪽에서 만난 사람이 이 분을 잘 봐줍니다.
            특별히 애쓰지 않아도 챙겨주는 사람이 <b>반복해서</b> 나타납니다.
            반대로 여기가 아닌 곳에서 인맥을 만들려 애쓰면 품에 비해 남는 게 적습니다.`),
        BOX(`<b>그런데 이게 저절로 복이 되지는 않습니다.</b><br>
             귀인은 <b>도와줄 사람이 근처에 있다</b>는 표시이지 <b>알아서 도와준다</b>는 보증이 아닙니다.
             이 사주가 손해 보는 지점이 정확히 여기입니다 — <b>부탁을 안 합니다.</b><br><br>
             <b>구체적으로 부탁하십시오.</b> "도와주세요"가 아니라
             <b>"이 부분을 30분만 봐주실 수 있을까요"</b>처럼 범위와 시간을 정해 말하면
             이 사주는 거절당하는 일이 드뭅니다.`, 'good')
      ],
      action: UL([
        `<b>이번 달</b> — ${info.name} 쪽 사람 <b>한 명</b>에게, 범위를 정한 부탁을 하나 하십시오.`,
        '<b>기준</b> — 부탁은 <b>①무엇을 ②얼마 동안 ③언제까지</b> 세 가지를 붙여서 하십시오.',
        '<b>되돌려주기</b> — 받은 도움은 반드시 결과로 보고하십시오. 이 사주의 인복은 <b>한 번이 아니라 반복</b>으로 옵니다.'
      ]),
      evidence: `${spots.map(s => s.name + '@' + s.where).join(' · ')}. ※ 자평진전 「論星辰無關格局」 — 격국이 서고 깨지는 데 신살은 개입하지 못한다는 취지. 여기서도 보조 표지로만 쓰고 앞의 결론을 뒤집지 않는다.`
    });
  });

  // ── 10. 격국 성패 (파격은 반드시 구응과 한 쌍) ─────
  rule('gyeok', 200, (A, P, DW, C, F) => {
    const gy = A.gyeok; if (!gy || !gy.name) return null;
    const sp = gy.seonggyeok || {}, jp = gy.jpjj || {}, go = gy.gojeo || {}, ss = gy.sangshin || {};
    const ok = sp.ok || jp.ok;
    return page({
      kicker: '이 사주의 뼈대',
      title: ok
        ? `이 사주는 <b>중심이 서 있는</b> 구조입니다`
        : `이 사주는 <b>힘은 있는데 배치가 아쉬운</b> 구조입니다 — 그래서 운이 중요합니다`,
      lede: `사주에는 그 사람이 세상을 대하는 <b>기본 방식</b>이 있습니다.
             이 사주는 <b>${gy.name}</b>으로 잡힙니다. ${go.desc ? go.desc : ''}`,
      blocks: [
        sp.note ? P_(sp.note) : '',
        !ok && jp.pa
          ? BOX(`<b>비어 있는 자리가 있습니다.</b> ${jp.pa}<br><br>
                 <b>이걸 「나쁜 사주」로 읽으면 안 됩니다.</b> 고전(자평진전)은 이런 경우를
                 <b>구응(救應) — 다른 글자가 대신 메우면 되살아난다</b>고 분명히 적어두었습니다.
                 ${ss.found ? '' : '지금은 그 한 글자가 비어 있는 상태이고, <b>운에서 그 글자가 들어오는 때</b>가 이 사주가 크게 서는 시기입니다.'}`, 'warn')
          : (ss.note ? P_(ss.note) : ''),
        go.label ? P_(`고전의 평가 기준으로는 <b>${go.label}</b>에 해당합니다. ${go.desc || ''}`) : '',
        BOX(`<b>이 면을 이렇게 쓰십시오.</b><br>
             격은 등급이 아닙니다. <b>어떤 방식으로 살 때 이 사람이 가장 자기답게 되는가</b>를 가리킵니다.
             비어 있는 자리가 있다면, 그건 결핍이 아니라 <b>어디에 힘을 보태야 하는지</b>를 알려주는 지도입니다.`)
      ],
      action: UL([
        ok ? '<b>지금 방식을 유지하십시오.</b> 이 사주는 중심이 서 있어, 방향을 자주 바꾸는 것이 오히려 손해입니다.'
          : '<b>비어 있는 자리를 사람과 절차로 메우십시오.</b> 타고나지 않은 것은 빌려 쓰면 됩니다.',
        '<b>남과 비교하지 마십시오.</b> 격은 서로 다른 방식이지 높고 낮음이 아닙니다.',
        '<b>운의 시기를 보십시오.</b> 앞의 「언제가 좋은가」 면과 함께 읽어야 이 면이 완성됩니다.'
      ]),
      evidence: `격 ${gy.name}(${gy.basis || '-'}) · 투출 ${(gy.tuchul || []).join('·') || '-'} · 성패 ${ok ? '성격' : '보완 필요'} · 고저 ${go.label || '-'}(${go.basis || '-'})${jp.note ? ' · ' + jp.note : ''}`
    });
  });

  // ── 11. 십성 조합 (원문 근거 있는 것만) ────────────
  rule('patterns', 190, (A, P, DW, C, F) => {
    const ps = (A.patterns || []).filter(p => p && p.title);
    if (!ps.length) return null;
    return page({
      kicker: '글자들이 만드는 연결',
      title: `이 사주에서 <b>글자끼리 이어져 만드는 힘</b>이 있습니다`,
      lede: `사주 해석의 실제는 글자 하나하나가 아니라 <b>글자들의 연결</b>에 있습니다.
             이 사주에는 아래 연결이 잡힙니다.`,
      blocks: ps.slice(0, 3).map((p, i) =>
        H(i + 1, p.title) + P_(p.reading || '')
      ).concat([
        BOX(`<b>이 연결이 이 사주에서 가장 값진 부분입니다.</b><br>
             한 글자만 보면 흔한 사주여도, 연결이 살아 있으면 그 방향에서 확실히 앞섭니다.
             위에 적힌 연결이 실제로 쓰이는 자리를 직업과 생활에서 찾으십시오.`, 'good')
      ]),
      action: UL([
        '<b>이번 달</b> — 위 연결에 해당하는 일을 <b>지금 하는 일 안에서</b> 찾아보십시오. 대개 이미 하고 있습니다.',
        '<b>직업</b> — 그 연결을 못 쓰는 자리는 이 사주에 오래 맞지 않습니다. 만족도가 여기서 갈립니다.',
        '<b>점검</b> — 잘 풀렸던 시기를 떠올려 보면 대개 이 연결이 작동했을 때입니다.'
      ]),
      evidence: ps.map(p => p.title).join(' · ') + '. 자평진전 성패·구응 조항 기준.'
    });
  });

  // ── 12. 몸과 생활 (병명 금지 — 생활 조건만) ────────
  rule('body_life', 800, (A, P, DW, C, F) => {
    const t = A.temp || {};
    const cold = t.cold, hot = t.hot;
    const 인 = F.g.인성 || 0, 식 = F.g.식상 || 0;
    if (!cold && !hot && !(인 >= 3 && 식 === 0)) return null;
    return page({
      kicker: '몸과 생활',
      title: `병명을 찍지 않습니다 — 대신 이 사주가 <b>먼저 무너지는 조건</b>을 적습니다`,
      lede: `사주로 병을 진단할 수 없습니다. 그건 의사의 영역입니다.
             여기서는 <b>기운 배치상 부담이 먼저 가는 생활 조건</b>만 다룹니다.`,
      blocks: [
        cold || hot ? H(1, cold ? '차가운 쪽으로 기울어 있습니다' : '뜨겁고 건조한 쪽으로 기울어 있습니다') : '',
        cold ? UL([
          '<b>몸이 차가워질 때 컨디션이 가장 빨리 무너집니다.</b> 아랫배·발이 차면 그날 하루가 통째로 흔들립니다.',
          '찬 음식이 이어지거나 추운 곳에 오래 있으면 <b>회복이 남보다 느립니다.</b>',
          '<b>겨울과 장마철</b>에 기운이 확연히 떨어집니다. 이 시기 일정을 미리 느슨하게 잡으십시오.'
        ]) : hot ? UL([
          '<b>열이 오르고 건조해질 때 무너집니다.</b> 잠이 얕아지고, 같은 말에도 평소보다 날이 섭니다.',
          '<b>쉬지 않고 몰아치는 일정</b>에 특히 약합니다. 한 번에 몰아 쓰고 오래 앓는 형태입니다.',
          '<b>여름과 건조한 시기</b>에 수분·휴식을 의식적으로 늘려야 합니다.'
        ]) : '',
        인 >= 3 && 식 === 0 ? H(2, '생각이 몸보다 먼저 지칩니다') : '',
        인 >= 3 && 식 === 0
          ? P_(`받아들이는 힘이 ${인}개인데 내보내는 통로가 없습니다.
                <b>머리는 계속 돌아가는데 밖으로 빠지지 않습니다.</b>
                그래서 몸을 안 썼는데도 피곤한 날이 잦고, <b>밤에 생각이 길어집니다.</b>`)
          : '',
        BOX(`<b>이 사주에 실제로 듣는 생활 규칙</b>
          <ul style="margin:2.5mm 0 0">
            ${cold ? '<li><b>아침 햇빛 10~15분.</b> 이 사주에 모자란 온기를 가장 싸게 보충하는 방법입니다.</li><li><b>아랫배·발 보온을 1순위로.</b> 계절과 무관하게.</li><li><b>따뜻한 음식 위주로.</b> 찬 음료·얼음을 줄이면 체감이 큽니다.</li>' : ''}
            ${hot ? '<li><b>일정 사이에 빈칸을 먼저 넣으십시오.</b> 다 채운 일정표가 이 사주에는 가장 위험합니다.</li><li><b>수분과 수면을 숫자로 관리하십시오.</b></li>' : ''}
            ${인 >= 3 && 식 === 0 ? '<li><b>몸을 쓰는 단순 운동.</b> 머리를 비우는 것이 목적입니다.</li><li><b>밤에 내린 결론은 다음 날 낮에 한 번 더 보십시오.</b> 이 사주는 밤 판단이 어둡습니다.</li>' : ''}
          </ul>`),
        P_(`<span class="rd-dim">※ 증상이 계속되거나 심해지면 사주가 아니라 <b>의료진의 진료와 검사</b>가 먼저입니다.
            이 면은 병을 예측하지 않으며 생활 조건만 다룹니다.</span>`)
      ],
      action: UL([
        '<b>이번 주</b> — 위 규칙 중 <b>하나만</b> 고르십시오. 여러 개를 동시에 시작하면 이 사주는 다 놓칩니다.',
        '<b>한 달 뒤</b> — 그 하나를 실제로 지켰는지 확인하십시오. 지켰다면 그때 두 번째를 더하십시오.',
        '<b>기준</b> — 수면·식사·활동 중 <b>두 가지가 동시에</b> 흐트러지면 그때는 일정을 줄여야 하는 신호입니다.'
      ]),
      evidence: `한난조습 ${t.label || '-'}(${t.temp != null ? t.temp : '-'}) · 오행 ${Object.keys(F.el).map(k => k + ' ' + F.el[k]).join(' · ')} · 인성 ${인} · 식상 ${식}. ※ 질병 예측·병명 언급은 정책상 배제.`
    });
  });


  // ══════════════════════════════════════════════════
  //  「언제」 — 실사용자 조사 결과 질문의 46.7%가 시기를 묻는다.
  //  10년 대운이 아니라 「몇 살·몇 년」 해상도로 답한다.
  //  사건을 약속하지 않는다. 「밀 때 / 조정할 때 / 지킬 때」 세 가지 신호만 준다.
  // ══════════════════════════════════════════════════
  const SIGNAL = {
    push: { tag: '밀 때', cls: 'sig-go', why: '마찰이 적어 벌인 만큼 결과가 붙는 해' },
    adjust: { tag: '조정할 때', cls: 'sig-mid', why: '판이 흔들려 조건을 다시 짜야 하는 해' },
    hold: { tag: '지킬 때', cls: 'sig-stop', why: '새로 벌이기보다 있는 것을 단단히 하는 해' }
  };

  // 그해의 신호를 계산한다. 근거는 셋뿐이다 — 처방 도착 / 원국과의 충 / 그해 십성.
  function yearSignal(A, P, s, C, knowTime) {
    const clash = [], hap = [];
    const ps = [['년', P.year.branch], ['월', P.month.branch], ['일', P.day.branch]];
    if (knowTime && P.hour) ps.push(['시', P.hour.branch]);
    ps.forEach(([k, b]) => {
      if ((b + 6) % 12 === s.branch) clash.push(k);
      else if (C.branchHap && C.branchHap(b, s.branch)) hap.push(k);
    });
    const yong = !!s.yongshinHit;
    const g = { stem: C.tenGodGroup(C.E.tenGod(P.day.stem, s.stem)), branch: C.tenGodGroup(C.E.tenGodBranch(P.day.stem, s.branch)) };
    let kind = 'adjust';
    if (clash.length >= 2) kind = 'hold';
    else if (yong && !clash.length) kind = 'push';
    else if (yong && clash.length) kind = 'adjust';
    else if (!clash.length && hap.length) kind = 'push';
    else if (!clash.length && !hap.length) kind = 'adjust';
    // 복음·반음 — 삼명통회 「總論歲運」. 반음(일주와 천간·지지 모두 충)은 변동폭이 가장 큰 해라
    // 처방 도착 여부와 무관하게 '지킬 때'로 내리고, 복음(일주와 같은 간지)은 '밀 때'로는 올리지 않는다.
    const fb = C.E.fuFanYin ? C.E.fuFanYin(P.day, s) : null;
    if (fb === '반음') kind = 'hold';
    else if (fb === '복음' && kind === 'push') kind = 'adjust';
    // 신뢰도 계층(8/11 11차, 4AI 크로스체크 지적 ② 반영) — 이 판정을 지탱하는 독립 근거가 몇 겹인가.
    // 처방 도착 / 지지 충(기둥 수만큼) / 지지 합 / 복음·반음은 서로 다른 계산에서 나오므로 각각 1겹으로 센다.
    let ev = 0;
    if (kind === 'push') ev = (yong ? 1 : 0) + (hap.length ? 1 : 0);
    else if (kind === 'hold') ev = (fb === '반음' ? 1 : 0) + (clash.length >= 2 ? clash.length : 0);
    else ev = (yong || clash.length || fb === '복음') ? 1 : 0;   // adjust = 혼합 신호라 1겹 상한
    return { kind, clash, hap, yong, g, fb, ev };
  }

  // ── 신뢰도 계층 — 근거 겹수에 따라 문장의 형식 자체를 바꾼다 ──
  // 2겹 이상 = 단정 / 1겹 = 조건문(무엇이 확인되면 맞는지 같이 적음) / 0겹 = 점검 항목.
  // data-conf 속성은 confidence_gate.js가 어휘 규칙(조건문에 단정 어투 금지 등)을 검사하는 표지다.
  function confTier(n) { return n >= 2 ? 'firm' : n === 1 ? 'cond' : 'check'; }
  function confSpan(tier, ev, txt) {
    return '<span data-conf="' + tier + '" data-conf-ev="' + ev + '">' + txt + '</span>';
  }
  const CONF_LABEL = { firm: n => '근거 ' + n + '겹', cond: () => '근거 1겹', check: () => '간접' };

  rule('when_calendar', 970, (A, P, DW, C, F) => {
    if (!C.E || !C.E.calcSewoon) return null;
    const N = 12;
    const rows = C.E.calcSewoon(A, F.nowYear, N).map(s => {
      const sig = yearSignal(A, P, s, C, !!(P.hour && A.knowTime !== false));
      const dw = (DW.list || []).find(d => d.startYear <= s.year && d.endYear > s.year);
      const age = dw ? Math.floor(dw.startAgeExact) + (s.year - dw.startYear) : null;
      return { s, sig, age };
    });
    const pushes = rows.filter(r => r.sig.kind === 'push');
    const holds = rows.filter(r => r.sig.kind === 'hold');
    const first = pushes[0], firstHold = holds[0];

    return page({
      kicker: '언제',
      title: `${C.you}이 <b>밀어야 할 해</b>와 <b>지켜야 할 해</b>가 정해져 있습니다`,
      lede: `사주에서 가장 많이 받는 질문이 <b>"언제 하면 되나요"</b>입니다.
             아래는 앞으로 ${N}년을 세 가지 신호로만 나눈 표입니다.
             <b>무슨 일이 생긴다는 약속이 아닙니다.</b> 같은 노력에 마찰이 적은 해와 큰 해를 구분한 것입니다.`,
      blocks: [
        `<table class="rd-tbl rd-cal"><tr><th>해</th><th>나이</th><th>신호</th><th>이 해에 맞는 방식</th></tr>` +
        rows.map(r => {
          const S = SIGNAL[r.sig.kind];
          const tier = confTier(r.sig.ev);
          let detail = r.sig.fb === '반음'
            ? `일주와 천간·지지가 모두 마주 충하는 해(반음)입니다. 변동폭이 가장 크니 큰 결정은 물러날 자리부터 정합니다`
            : r.sig.fb === '복음'
            ? `일주와 글자가 그대로 겹치는 해(복음)입니다. 하던 일의 부피가 커지니 담을 그릇부터 넓힙니다`
            : r.sig.clash.length
            ? `${r.sig.clash.map(k => (POS_LIFE[k] || {}).name).filter(Boolean).join('·')} 쪽 조건을 다시 짜게 됩니다`
            : r.sig.yong
              ? `${EL_LIFE[A.yongshin] ? EL_LIFE[A.yongshin].act : '준비한 일'}을 벌이기 좋습니다`
              : `크게 흔들리지 않습니다. 하던 것을 이어가십시오`;
          // 신뢰도 계층 — 근거가 한 겹이면 단정 대신 조건문으로, 없으면 점검 문구로 바꾼다.
          if (tier === 'cond') detail += ` — 근거가 한 겹이라 단정하지 않습니다. 연초에 실제로 그런 조짐이 보이는지 확인되면 그대로 따르십시오`;
          else if (tier === 'check') detail = `단정할 근거가 없는 해입니다. 연초에 제안·계약·이동의 조짐이 있는지 직접 점검하고 계획의 크기를 맞추십시오`;
          return `<tr class="${S.cls}"><td><b>${r.s.year}</b></td><td>${r.age != null ? '만 ' + r.age : '-'}</td>` +
            `<td><b>${S.tag}</b><br><span class="rd-dim">${CONF_LABEL[tier](r.sig.ev)}</span></td><td>${confSpan(tier, r.sig.ev, detail)}</td></tr>`;
        }).join('') + `</table>`,
        BOX(`<b>이 표를 읽는 법</b><br>
          <b>밀 때</b> — 계약·이직·시작처럼 <b>내가 정해서 벌이는 일</b>을 여기 배치하십시오.<br>
          <b>조정할 때</b> — 새로 벌이기보다 <b>이미 있는 것의 조건을 고치는</b> 데 씁니다.<br>
          <b>지킬 때</b> — 무슨 일이 생기는 해가 아니라, <b>큰 결정을 미루면 손해가 적은</b> 해입니다.<br><br>
          <b>근거 겹수</b> — 같은 신호라도 <b>서로 다른 계산 몇 개가 같은 방향을 가리켰는가</b>입니다.
          2겹 이상이면 그대로 적었고, 1겹이면 조건을 달았고, 간접이면 단정 대신 점검 문구로 바꿨습니다.
          겹수가 낮은 해일수록 표보다 <b>그해의 실제 조건</b>을 크게 보십시오.`),
        first ? P_(confSpan(confTier(first.sig.ev), first.sig.ev,
          confTier(first.sig.ev) === 'firm'
            ? `가장 가까운 <b>밀 때</b>는 <b>${first.s.year}년(만 ${first.age}세)</b>입니다.
               미뤄둔 큰 결정이 있다면 이 해를 먼저 고려하십시오.`
            : `가장 가까운 <b>밀 때</b> 후보는 <b>${first.s.year}년(만 ${first.age}세)</b>입니다.
               다만 근거가 한 겹이라 단정하지 않습니다 — 그 해 초에 실제 제안이나 기회가 확인되면 그때 무게를 실으십시오.`)) : '',
        firstHold ? P_(`반대로 <b>${firstHold.s.year}년(만 ${firstHold.age}세)</b>은 <b>지킬 때</b>입니다.
                   이 해에는 되돌리기 어려운 결정을 한 박자 늦추는 편이 낫습니다.`) : ''
      ],
      action: UL([
        `<b>지금</b> — 미뤄둔 큰 결정 하나를 위 표에서 <b>어느 해에 놓을지 정하세요.</b>`,
        `<b>매년 초</b> — 그해 신호를 확인하고 <b>계획의 크기를 맞추세요.</b> 같은 계획도 해에 따라 비용이 다릅니다.`,
        `<b>검증</b> — 지나간 해를 이 기준으로 대조해 보세요. 맞지 않으면 태어난 시각부터 다시 확인해야 합니다.`
      ]),
      evidence: `세운 ${rows.map(r => r.s.year + ' ' + r.s.str).join(' · ')} · 판정 기준 = 처방(${A.yongshin || '-'}) 도착 / 원국 지지충 / 그해 십성 / 일주 복음·반음(삼명통회 「總論歲運」). 사건이 아니라 마찰의 크기만 읽음.`
    });
  });

  // ── 결정별 시기 — 조사 질문 1·2·3위(결혼/이직/돈)에 직접 답한다 ──
  rule('when_decisions', 965, (A, P, DW, C, F) => {
    if (!C.E || !C.E.calcSewoon) return null;
    const knowTime = !!(P.hour && A.knowTime !== false);
    const N = 12;
    const ys = C.E.calcSewoon(A, F.nowYear, N);
    const dwOf = y => (DW.list || []).find(d => d.startYear <= y && d.endYear > y);
    const ageOf = y => { const d = dwOf(y); return d ? Math.floor(d.startAgeExact) + (y - d.startYear) : null; };

    // 관계 — 배우자궁(일지)이 움직이는 해. 성별 전제 관법은 쓰지 않는다.
    const rel = ys.filter(s => {
      const b = P.day.branch;
      return (b + 6) % 12 === s.branch || (C.branchHap && C.branchHap(b, s.branch));
    });
    // 일·자리 — 사회생활 자리(월지)가 움직이는 해
    const job = ys.filter(s => {
      const b = P.month.branch;
      return (b + 6) % 12 === s.branch || (C.branchHap && C.branchHap(b, s.branch));
    });
    // 돈 — 그해 천간·지지에 재성이 오거나 처방이 도착하는 해
    const money = ys.filter(s => {
      const gs = C.tenGodGroup(C.E.tenGod(P.day.stem, s.stem));
      const gb = C.tenGodGroup(C.E.tenGodBranch(P.day.stem, s.branch));
      return gs === '재성' || gb === '재성' || s.yongshinHit;
    });
    if (!rel.length && !job.length && !money.length) return null;

    const fmt = arr => arr.length
      ? arr.map(s => `<b>${s.year}년</b><span class="rd-dim">(만 ${ageOf(s.year)}세)</span>`).join(' · ')
      : '<span class="rd-dim">앞으로 12년 안에는 두드러진 해가 잡히지 않습니다</span>';

    return page({
      kicker: '언제 · 결정별',
      title: `<b>결혼·이직·돈</b> — 세 가지 결정의 시기만 따로 뽑았습니다`,
      lede: `사람들이 사주를 보러 오는 이유는 대개 셋입니다. <b>사람·일·돈.</b>
             아래는 그 셋에 대해서만, 앞으로 ${N}년 중 <b>움직임이 큰 해</b>를 골라낸 것입니다.`,
      blocks: [
        H(1, '사람 — 관계가 움직이는 해'),
        P_(fmt(rel)),
        P_(`이 해들은 <b>가까운 관계의 조건이 바뀌는</b> 해입니다.
            만남일 수도, 정리일 수도, 이미 있는 관계의 형태가 달라지는 것일 수도 있습니다.
            <b>어느 쪽인지는 사주가 정하지 않습니다.</b> 다만 그해에 <b>미뤄둔 대화를 하게 될 확률</b>이 높습니다.`),
        H(2, '일 — 자리가 움직이는 해'),
        P_(fmt(job)),
        P_(`직장·소속·역할의 조건이 흔들리는 해입니다. 반드시 옮긴다는 뜻이 아니라
            <b>지금 자리를 그대로 유지하기 어려워지는</b> 해로 읽습니다.
            이직을 생각 중이라면 이 해에 <b>협상력이 가장 큽니다.</b>`),
        H(3, '돈 — 현금이 움직이는 해'),
        P_(fmt(money)),
        P_(`수입이든 지출이든 <b>금액이 크게 오가는</b> 해입니다.
            들어오는 해와 나가는 해를 사주만으로 가르지 않습니다.
            대신 이 해에는 <b>계약서·정산·고정비를 반드시 확인</b>하십시오. 확인 여부가 결과를 가릅니다.`),
        BOX(`<b>이 표의 한계를 분명히 적습니다.</b><br>
          여기 적힌 해에 <b>반드시 그 일이 생긴다는 뜻이 아닙니다.</b>
          이 표가 말하는 것은 <b>"그 영역이 흔들릴 확률이 다른 해보다 높다"</b> 하나뿐입니다.
          결혼·퇴사·투자는 이 표가 아니라 <b>실제 조건과 상대와 계약서</b>로 결정하십시오.
          사주는 <b>언제 마음이 급해질지</b>를 미리 알려주는 데까지가 정직한 쓸모입니다.`, 'warn')
      ],
      action: UL([
        `<b>지금</b> — 위 세 줄에서 <b>가장 가까운 해</b>에 동그라미를 치고 달력에 옮겨두세요.`,
        `<b>그 해 초에</b> — 그 영역의 <b>조건을 문서로 정리</b>하세요(계약·역할·금액). 흔들릴 때 기준이 됩니다.`,
        `<b>지금부터</b> — 그 해까지 남은 기간은 <b>준비 기간</b>입니다. 준비 없이 맞으면 흔들림만 남습니다.`
      ]),
      evidence: `관계 = 일지(${C.E.BRANCHES[P.day.branch]}) 충·합 세운 · 일 = 월지(${C.E.BRANCHES[P.month.branch]}) 충·합 세운 · 돈 = 재성 세운 또는 처방(${A.yongshin || '-'}) 도착. ※ 성별에 따라 배우자 별을 달리 보는 고전 관법은 쓰지 않았습니다.`
    });
  });

  // ── 물으신 결정에 직접 답하는 면 — 입력 폼의 「지금 고민 중인 결정」(선택)이 있을 때만 생긴다 ──
  // 가치조사(RESEARCH/value_1m_0811.md) 1순위 구조 반영: 독자가 말해 준 결정에 정면으로 답하는 장.
  // 사건 단정 금지 — 마찰 신호(처방·궁위 충합·그해 십성·복음반음)와 명식의 방식만 읽고,
  // 결정 자체는 실제 조건·상대·계약서로 하라고 면 안에서 명시한다.
  const Q_KIND = {
    job:   { label: '직장 — 이직·창업·부서이동', gung: '월', gungName: '월지, 곧 일과 직장의 자리' },
    money: { label: '돈 — 계약·투자·큰 지출', grp: '재성', grpName: '재성(돈과 결과물의 기운)' },
    rel:   { label: '관계 — 결혼·동거·헤어짐', gung: '일', gungName: '일지, 곧 가장 가까운 관계의 자리' },
    move:  { label: '터전 — 이사·유학·이민' },
    study: { label: '공부 — 시험·자격·진학', grp: '인성', grpName: '인성(배움과 자격의 기운)' }
  };
  rule('prose_decision', 993, function (A, P, DW, C, F) {
    const q = C.question;
    if (!q || !q.type || !Q_KIND[q.type] || !C.E || !C.E.calcSewoon) return null;
    const K = Q_KIND[q.type];
    const knowTime = !!(P.hour && A.knowTime !== false);
    const n = Math.max(1, Math.min(6, +q.horizon || 2));
    const rows = C.E.calcSewoon(A, F.nowYear, n).map(function (s) {
      const sig = yearSignal(A, P, s, C, knowTime);
      const gungHit = K.gung ? (sig.clash.indexOf(K.gung) >= 0 ? '충' : (sig.hap.indexOf(K.gung) >= 0 ? '합' : null)) : null;
      const grpHit = !!(K.grp && (sig.g.stem === K.grp || sig.g.branch === K.grp));
      return { s: s, sig: sig, gungHit: gungHit, grpHit: grpHit };
    });

    const qt = q.text ? ' 적어 주신 말 그대로 옮기면 — "' + q.text + '".' : '';
    const p1 = '이 면은 ' + C.you + '이 입력창에 적어 주신 결정, <b>' + K.label + '</b>에 답합니다.' + qt +
      ' 먼저 정직하게 적습니다. <b>사주는 이 결정을 대신 내려 주지 못합니다.</b> 사주가 읽을 수 있는 것은 두 가지 — ' +
      '같은 결정이라도 <b>마찰이 적은 때와 큰 때</b>, 그리고 이 명식이 <b>이런 종류의 일을 다루는 방식</b>입니다. 그 두 가지로 답하겠습니다.';

    const p2 = K.gung
      ? '명식에서 이 질문을 맡는 자리는 <b>' + K.gungName + '</b>입니다. 그 자리가 그해의 글자와 충하면 지금까지의 조건이 바뀌고, 합하면 이야기가 실제로 진행됩니다. 아래는 물으신 시한 안의 해를 그 기준으로 읽은 것입니다.'
      : K.grp
      ? '명식에서 이 질문을 맡는 것은 <b>' + K.grpName + '</b>입니다. 그 기운이 실제로 들어오는 해와 아닌 해가 갈립니다. 아래는 물으신 시한 안의 해를 그 기준으로 읽은 것입니다.'
      : '이사·유학·이민 같은 터전의 문제는 특정 자리 하나로 읽지 않습니다. 그 해 전체가 얼마나 흔들리는지 — 신호로만 정직하게 읽습니다.';

    const YEAR_KIND = { push: '마찰이 적은 해', adjust: '조건을 다시 짜는 해', hold: '지키는 해' };
    const yearSent = rows.map(function (r) {
      let t = '<b>' + r.s.year + '년(' + r.s.str + ')</b>은 ' + YEAR_KIND[r.sig.kind] + '입니다. ';
      if (r.gungHit === '충') t += '물으신 자리가 정면으로 흔들리는 해라, 결정을 내리기보다 <b>조건이 바뀌는 해</b>로 보는 것이 맞습니다. ';
      else if (r.gungHit === '합') t += '물으신 자리에서 <b>이야기가 실제 약속으로 바뀌기 쉬운 해</b>입니다. 다만 말이 오간 것과 정해진 것은 다르니 문서로 남겨야 합니다. ';
      if (r.grpHit) t += '질문의 기운이 이 해에 실제로 들어옵니다. ';
      if (r.sig.yong) t += '모자란 기운(처방)도 함께 도착해, 움직인다면 평소보다 마찰이 적습니다. ';
      if (r.sig.fb === '복음') t += '일주와 글자가 겹치는 복음의 해라, 새 판보다 하던 일이 커지는 쪽으로 힘이 실립니다. ';
      if (r.sig.fb === '반음') t += '일주와 정면으로 마주 충하는 반음의 해라 변동폭이 가장 큽니다 — 물러날 자리를 정해 놓고 움직여야 합니다. ';
      return t;
    }).join('');

    const best = rows.filter(function (r) { return r.sig.kind === 'push' && r.gungHit !== '충' && r.sig.fb !== '반음'; })[0]
      || rows.filter(function (r) { return r.sig.kind === 'adjust' && r.gungHit !== '충'; })[0];
    // 신뢰도 계층 — 결론에 쓰이는 근거 겹수. 질문 축(궁위 합·질문 기운)도 독립 근거로 센다.
    const bestEv = best ? best.sig.ev + (best.gungHit === '합' ? 1 : 0) + (best.grpHit ? 1 : 0) : 0;
    const bestTier = best ? confTier(bestEv) : 'check';
    const verdict = best && best.sig.kind === 'push'
      ? confSpan(bestTier, bestEv, bestTier === 'firm'
        ? '물으신 시한 안에서 고르라면 <b>' + best.s.year + '년</b>입니다. ' + (best.grpHit || best.sig.yong ? '질문의 기운이 실제로 들어오고 마찰도 적은 해라서입니다.' : '마찰이 가장 적은 해라서입니다.') +
          ' 서로 다른 계산 ' + bestEv + '겹이 같은 해를 가리켜 단정해 적습니다. 다만 해가 좋다는 것은 조건이 좋다는 뜻이 아닙니다 — <b>그 해에 실제 조건(금액·상대·계약)이 갖춰졌을 때</b> 움직이십시오.'
        : '물으신 시한 안에서 고르라면 <b>' + best.s.year + '년</b>입니다. 다만 정직하게 적으면 이 판정의 근거는 <b>한 겹</b>입니다. 그 해 초에 물으신 쪽의 조짐 — 제안·자리·상대 — 이 실제로 확인되면 그때 무게를 실으시고, 확인되지 않으면 해를 넘겨도 됩니다. <b>실제 조건(금액·상대·계약)이 갖춰졌을 때</b> 움직이는 원칙은 같습니다.')
      : best
      ? confSpan(bestTier, bestEv, '물으신 시한 안에는 마찰이 적은 해가 없습니다. 그래도 정해야 한다면 <b>' + best.s.year + '년</b>이 그중 낫고, 이때는 <b>되돌릴 수 있는 형태</b> — 조건부 계약, 물릴 수 있는 약속 — 로 하는 것이 맞습니다.')
      : confSpan('check', 0, '물으신 시한 안의 해가 전부 지키는 해입니다. 이 시한 자체를 한 해 늦출 수 있는지 먼저 검토하시길 권합니다. 늦출 수 없다면 결정의 크기를 줄여서 — 전부가 아니라 일부만 — 움직이는 방법이 남습니다.');

    const p5 = '마지막으로, 이 답을 믿기 전에 뒤의 <b>「이 감명서가 맞는지 재는 법」</b> 장을 먼저 펴 보시길 권합니다. 이미 지나간 해의 굴곡이 맞아야, 앞으로의 해를 읽은 이 면도 무게가 생깁니다. 그것이 이 감명서가 스스로에게 요구하는 순서입니다.';

    return page({
      cls: 'rd-prose',
      kicker: '물으신 결정',
      title: C.you + '이 물으신 것 — ' + K.label.split(' — ')[0] + '에 대한 답',
      lede: '입력창에 적어 주신 결정에 이 면이 직접 답합니다. 적지 않으면 이 면은 만들어지지 않습니다.',
      blocks: [P_(p1), P_(p2), P_(yearSent), P_(verdict),
        BOX('<b>이 면이 하는 일과 하지 않는 일</b><br>합니다 — 물으신 시한 안의 해를 마찰 기준으로 가르고, 그중 어느 해가 나은지 답합니다.<br>하지 않습니다 — 「하라/마라」의 최종 결정, 사건·성패의 단정, 상대와 조건에 대한 판단. 그것은 ' + C.you + '의 몫이고, 실제 조건과 계약서가 사주보다 큽니다.', 'warn'),
        P_(p5)],
      action: UL([
        '<b>지금</b> — 위에서 답한 해를 달력에 적고, 그 해까지 갖춰야 할 실제 조건 세 가지를 밑에 쓰세요.',
        '<b>그 해가 오면</b> — 조건 세 가지가 채워졌는지부터 확인하세요. 해가 좋아도 조건이 비면 미루는 것이 맞습니다.',
        '<b>결정한 뒤</b> — 이 면을 다시 펴서 맞았는지 표시해 두세요. 다음 결정 때 이 감명서를 얼마나 믿을지가 거기서 정해집니다.'
      ]),
      evidence: '질문 ' + K.label + (q.text ? ' · 입력 문구 있음' : '') + ' · 시한 ' + n + '년 · ' +
        rows.map(function (r) { return r.s.year + ' ' + r.s.str + '(' + r.sig.kind + (r.sig.fb ? '·' + r.sig.fb : '') + ')'; }).join(' / ') +
        ' · 기준 = 처방 도착·궁위 충합·그해 십성·복음반음(삼명통회 「總論歲運」)'
    });
  });


  // ══════════════════════════════════════════════════
  //  1면 — 한눈에 보는 판정
  //  사장님 요구: "아 내가 돈복이 있구나, 이때 돈 벌겠구나, 올해는 이렇구나"
  //  설명이 아니라 판정을 준다. 다만 확정이 아니라 「경향의 세기」임을 표기한다.
  // ══════════════════════════════════════════════════
  const EL_COLOR = { 목: '#2E6B5E', 화: '#B23A2E', 토: '#C08A2E', 금: '#6E7B8B', 수: '#23324A' };

  // 다섯 등급. 근거를 함께 반환해 「왜 이 등급인가」를 항상 붙일 수 있게 한다.
  function grade(score) {
    const n = Math.max(1, Math.min(5, Math.round(score)));
    return { n, stars: '★'.repeat(n) + '☆'.repeat(5 - n) };
  }
  function luckScores(A, P, DW, C, F) {
    const g = F.g, strong = F.strong, yong = A.yongshin;
    const pw = k => (C.groupPower ? C.groupPower(A, k) : (g[k] || 0));
    const 재 = g.재성 || 0, 식 = g.식상 || 0, 관 = g.관성 || 0, 인 = g.인성 || 0, 비 = g.비겁 || 0;

    // 돈복 — 재성이 있는가 + 그것을 감당할 힘이 있는가 + 만들어 파는 통로가 있는가
    let money = 2.5;
    if (재 >= 1) money += 0.8; if (재 >= 2) money += 0.5;
    if (식 >= 1) money += 0.7;                       // 식상생재
    if (strong && 재 >= 1) money += 0.8;             // 신강 + 재성 = 감당 가능
    if (!strong && 재 >= 2) money -= 0.8;            // 재다신약
    if (비 > 재 + 1) money -= 0.7;                   // 군겁쟁재
    if (yong && ['토', '금', '수', '목', '화'].includes(yong) && C.tenGodGroupOfElem) { /* noop */ }
    const moneyWhy = [
      재 === 0 ? '타고난 돈 자리가 없어 후천적으로 만드는 쪽' : `돈 자리 ${재}개`,
      식 >= 1 ? '만들어 파는 통로가 있음' : '만들어 파는 통로가 약함',
      F.band === 'mid' ? '판에 따라 조절되는 균형형' : strong ? '감당할 힘이 넉넉함' : '혼자 감당하기보다 나눠야 함',
      비 > 재 + 1 ? '나눠 갖는 손이 많아 새는 자리 주의' : null
    ].filter(Boolean);

    // 일복 — 자리를 주는 기운 + 실력을 쌓는 기운 + 결과를 내는 기운
    let work = 2.5;
    if (관 >= 1) work += 0.8; if (인 >= 1) work += 0.6; if (식 >= 1) work += 0.6;
    if (관 === 0) work -= 0.5;
    if (인 >= 3) work += 0.4;                        // 전문성 축적형
    if (strong && (식 >= 1 || 관 >= 1)) work += 0.5;
    const workWhy = [
      관 === 0 ? '조직의 틀보다 실력으로 인정받는 쪽' : `자리·책임의 기운 ${관}개`,
      인 >= 3 ? '전문성이 쌓일수록 값이 오르는 형' : (인 >= 1 ? '배움이 무기가 됨' : '현장 경험형'),
      식 >= 1 ? '결과물을 내는 통로가 있음' : '결과물로 바꾸는 습관이 필요'
    ];

    // 인복 — 도와주는 기운 + 귀인 표지 + 같은 편
    const NOBLE = ['천을귀인', '천덕귀인', '월덕귀인', '문곡귀인', '태극귀인', '복성귀인'];
    const nobles = (A.sinsal || []).filter(x => NOBLE.includes(x.name));
    let people = 2.5;
    if (인 >= 1) people += 0.7; if (인 >= 3) people += 0.5;
    people += Math.min(1.5, nobles.length * 0.5);
    if (비 >= 2) people += 0.3;
    const peopleWhy = [
      nobles.length ? `도움 표지 ${nobles.length}개(${[...new Set(nobles.map(x => x.name))].join('·')})` : '도움 표지는 따로 잡히지 않음',
      인 >= 3 ? '윗사람·선배의 도움이 반복되는 형' : (인 >= 1 ? '도움을 받을 통로가 있음' : '스스로 뚫는 편'),
      '부탁을 구체적으로 할 때만 실제 도움이 됨'
    ];

    // 버티는 힘 — 강약과 온도의 균형 (건강 예측이 아니라 회복 탄력의 경향)
    let stam = 3;
    if (A.strength === '중화') stam += 1.2;
    if (['태강', '태약'].includes(A.strength)) stam -= 0.8;
    if (A.temp && (A.temp.cold || A.temp.hot)) stam -= 0.5;
    if (식 >= 1) stam += 0.4;                        // 풀어내는 통로
    const stamWhy = [
      `힘의 균형 ${A.strength}`,
      A.temp && A.temp.cold ? '차가운 쪽으로 기울어 온도 관리가 관건' : (A.temp && A.temp.hot ? '뜨거운 쪽으로 기울어 쉬는 시간이 관건' : '온도는 치우치지 않음'),
      식 >= 1 ? '쌓인 것을 풀어내는 통로가 있음' : '안으로 쌓기 쉬워 푸는 습관이 필요'
    ];

    return [
      { key: 'money', icon: '💰', name: '돈복', g: grade(money), why: moneyWhy, one: 재 === 0 ? '버는 재주보다 지키는 규칙이 자산을 만듭니다' : (비 > 재 + 1 ? '벌리기는 합니다. 새는 자리를 막는 것이 관건입니다' : (strong && 재 >= 1 ? '벌어서 실물로 남기는 힘이 있습니다' : '규모를 줄이면 남는 것이 늘어납니다')) },
      { key: 'work', icon: '🧰', name: '일복', g: grade(work), why: workWhy, one: 인 >= 3 ? '오래 파는 자리에서 값이 붙습니다' : (관 === 0 ? '직함보다 실력으로 인정받는 자리가 맞습니다' : '맡은 자리에서 신뢰가 쌓입니다') },
      { key: 'people', icon: '👥', name: '인복', g: grade(people), why: peopleWhy, one: nobles.length >= 2 ? '도와주는 사람이 반복해서 나타납니다' : '먼저 구체적으로 부탁할 때 사람이 붙습니다' },
      { key: 'stamina', icon: '🌿', name: '버티는 힘', g: grade(stam), why: stamWhy, one: A.strength === '중화' ? '치우침이 적어 오래 갑니다' : '한쪽으로 몰릴 때 미리 줄이면 오래 갑니다' }
    ];
  }

  rule('dashboard', 999, (A, P, DW, C, F) => {
    const luck = luckScores(A, P, DW, C, F);
    const maxEl = Math.max(...Object.values(F.el), 1);
    const bars = ['목', '화', '토', '금', '수'].map(e => {
      const n = F.el[e] || 0;
      const h = Math.round((n / maxEl) * 100);
      return `<div class="el-bar"><div class="el-col"><div class="el-fill" style="height:${Math.max(h, 4)}%;background:${EL_COLOR[e]}"></div></div>
        <div class="el-num">${n}</div><div class="el-name" style="color:${EL_COLOR[e]}">${EL_KO[e]}</div></div>`;
    }).join('');

    const pil = [['년', P.year], ['월', P.month], ['일', P.day], ['시', P.hour]].filter(x => x[1]);
    const chars = pil.map(([k, p]) => {
      const se = C.E.STEM_ELEM[p.stem], be = C.E.BRANCH_ELEM[p.branch];
      const sg = k === '일' ? '나 자신' : C.E.tenGod(P.day.stem, p.stem);
      const bg = C.E.tenGodBranch(P.day.stem, p.branch);
      return `<div class="gz"><div class="gz-pos">${k}</div>
        <div class="gz-h" style="color:${EL_COLOR[se]}">${C.E.STEMS[p.stem]}</div>
        <div class="gz-h" style="color:${EL_COLOR[be]}">${C.E.BRANCHES[p.branch]}</div>
        <div class="gz-god">${(POS_LIFE[k] || {}).name || ''}</div></div>`;
    }).join('');

    const cards = luck.map(x => `<div class="luck">
      <div class="luck-top"><span class="luck-ico">${x.icon}</span><b>${x.name}</b>
        <span class="luck-star" data-n="${x.g.n}">${x.g.stars}</span></div>
      <p class="luck-one">${x.one}</p>
      <p class="luck-why">${x.why.join(' · ')}</p></div>`).join('');

    const missing = F.missing.length ? F.missing.map(e => EL_KO[e]).join('·') : null;
    const dw = (DW.list || []).find(d => d.startYear <= F.nowYear && d.endYear > F.nowYear);
    const ageNow = dw ? Math.floor(dw.startAgeExact) + (F.nowYear - dw.startYear) : null;

    return page({
      cls: 'rd-dash',
      kicker: '한눈에 보기',
      title: `${C.you}의 사주, 한 장으로`,
      blocks: [
        `<div class="gz-row">${chars}</div>`,
        `<div class="dash-grid">
           <div class="dash-el"><div class="dash-h">타고난 다섯 기운</div><div class="el-chart">${bars}</div>
             <div class="el-sum">
               <div class="el-sum-row"><span class="el-tag" style="background:${EL_COLOR[F.elMost]}">가장 두꺼운 힘</span>
                 <b>${EL_KO[F.elMost]}</b> — ${EL_LIFE[F.elMost].area}</div>
               ${missing ? `<div class="el-sum-row"><span class="el-tag el-tag-off">배워서 쓸 힘</span>
                 <b>${missing}</b> — ${F.missing.map(e => EL_LIFE[e].area).join(' / ')}</div>` : ''}
             </div>
             <p class="dash-note">${missing ? `${C.you}은 <b>${missing}</b>의 힘을 타고나지 않았습니다. 없는 것이 아니라 <b>정해두고 하는</b> 쪽입니다.` : '다섯 기운이 고르게 갖춰져 있어 한쪽으로 몰리지 않습니다.'}</p></div>
           <div class="dash-luck"><div class="dash-h">네 가지 복</div>${cards}</div>
         </div>`,
        `<div class="rd-box"><b>지금 어디쯤 서 있나</b><br>
          ${ageNow != null ? `올해 <b>만 ${ageNow}세</b>. ` : ''}지금은 <b>${dw ? dw.str : '-'}</b> 흐름 위에 있고,
          <b>${dw ? dw.endYear : '-'}년</b>에 다음 10년으로 넘어갑니다.
          앞으로 어느 해에 밀고 어느 해에 지켜야 하는지는 <b>「언제」</b> 면에 연도별로 적어두었습니다.</div>`
      ],
      evidence: `별점은 확정된 등급이 아니라 <b>경향의 세기</b>입니다. 산출 = 십성군 분포·강약·용신·귀인 표지의 가중합이며, 각 항목의 근거를 카드 안에 함께 적었습니다. 같은 별점이라도 사는 방식에 따라 결과는 달라집니다.`
    });
  });


  // ══════════════════════════════════════════════════
  //  영역 × 시기 — 사장님 지시:
  //  "직장에서 언제 잘 나가고, 이때는 직장이 어떻고, 이때는 돈복이 어떻고 이런 걸 풀어야지"
  //  "누가 사주 공부하고 싶다니. 그냥 내 사주가 궁금한 거지"
  //  → 명리 용어를 한 글자도 쓰지 않는다. 10년 단위로 그 사람 인생을 서술한다.
  // ══════════════════════════════════════════════════

  // 십성 열 개 × 세 영역. 전부 생활 문장으로만 쓴다.
  const LIFE_BY_GOD = {
    비견: {
      job: '내 이름으로 서는 때입니다. 남 밑에서 시키는 대로 하는 자리가 답답해지고, 내가 결정하는 자리로 옮기고 싶어집니다. 독립·이직·부서 이동이 실제로 잦습니다.',
      money: '내가 번 만큼 내가 쓰는 구조가 됩니다. 큰 목돈보다 내 손으로 만든 수입이 늘어납니다. 다만 같이 하는 사람이 생기면 분배를 먼저 정해야 합니다.',
      love: '각자의 공간을 인정하는 관계가 편합니다. 상대에게 맞추라고 요구하면 서로 물러서지 않아 오래 갑니다.'
    },
    겁재: {
      job: '경쟁이 선명해지는 때입니다. 비슷한 사람이 옆에 나타나고, 내 자리를 누가 넘볼 수 있습니다. 성과의 주인이 누구인지 문서로 남겨두어야 하는 구간입니다.',
      money: '들어오는 만큼 나가는 자리가 함께 생깁니다. 이 시기에 보증·대납·구두 동업을 하면 거의 예외 없이 뒤탈이 납니다. 금액이 작아도 마찬가지입니다.',
      love: '끌림이 빠른 대신 비교와 질투도 함께 옵니다. 감정보다 생활 조건을 먼저 확인해야 하는 때입니다.'
    },
    식신: {
      job: '만들어서 내놓는 것으로 평가받는 때입니다. 말이 아니라 결과물이 나를 증명합니다. 한 분야를 깊게 파면 이 구간에 실력이 눈에 보이게 쌓입니다.',
      money: '잘하는 일 하나를 꾸준히 팔아 생기는 돈입니다. 한 방은 없지만 반복 주문이 붙습니다. 이 시기에 만든 것이 다음 10년의 밑천이 됩니다.',
      love: '같이 먹고 쉬는 일상이 관계를 지탱합니다. 특별한 이벤트보다 반복되는 시간이 신호입니다.'
    },
    상관: {
      job: '재능이 밖으로 터져 나오는 때입니다. 남과 다른 방식으로 인정받는 대신, 윗사람·규정과 부딪히기 쉽습니다. 이직이 잦아지는 구간이기도 합니다.',
      money: '남과 다른 방식으로 버는 돈입니다. 재능은 팔리는데, 규칙을 어기면 벌금이 수입을 넘습니다. 계약서를 꼼꼼히 봐야 하는 시기입니다.',
      love: '표현이 많아져 관계가 크게 움직입니다. 다만 홧김에 던진 한마디가 오래 남습니다.'
    },
    편재: {
      job: '여러 판을 동시에 굴리게 되는 때입니다. 본업 외에 다른 일이 붙거나, 사업·부업·확장을 검토하게 됩니다. 판이 커지는 만큼 관리가 관건입니다.',
      money: '<b>돈이 가장 크게 움직이는 구간</b>입니다. 목돈·사업·유통·인맥이 통로가 됩니다. 크게 들어오는 만큼 크게 나가니 고정비를 먼저 잠가야 남습니다.',
      love: '만남의 기회와 활동 반경이 넓어집니다. 관심이 여러 곳으로 분산되지 않는지 스스로 봐야 합니다.'
    },
    정재: {
      job: '맡은 자리에서 신뢰가 쌓이는 때입니다. 화려하지 않아도 "저 사람에게 맡기면 된다"는 평판이 생깁니다. 무리한 확장보다 지금 자리를 단단히 하는 쪽이 이익입니다.',
      money: '<b>수입이 자리를 잡는 구간</b>입니다. 정해진 몫이 정해진 날에 들어옵니다. 큰 이익보다 새는 곳을 막을 때 자산이 늘어납니다. 저축·부동산·보험을 정리하기 좋은 때입니다.',
      love: '생활을 같이 꾸릴 수 있는지가 판단 기준이 됩니다. 결혼·동거처럼 조건을 합의하는 이야기가 실제로 나옵니다.'
    },
    편관: {
      job: '갑작스러운 책임이 오는 때입니다. 준비되기 전에 자리가 먼저 오거나, 감당하기 벅찬 과제가 떨어집니다. 버티면 실력이 증명되고, 권한 없이 책임만 지면 소모됩니다.',
      money: '책임을 떠안는 대가로 들어오는 돈입니다. 금액보다 그 자리에 딸린 위험과 기간을 먼저 계산해야 하는 시기입니다.',
      love: '끌림이 강한 만큼 주도권 다툼도 커집니다. 한쪽이 계속 참는 구조가 되면 오래 못 갑니다.'
    },
    정관: {
      job: '<b>자리와 직함이 생기는 때입니다.</b> 승진·정규직 전환·공식 역할처럼 남이 알아주는 위치가 붙습니다. 사회적으로 가장 반듯해지는 구간입니다.',
      money: '직책과 소속이 수입의 근거가 됩니다. 안정적인 대신 의무비용과 세금도 같이 늘어납니다.',
      love: '관계를 공식화하는 이야기가 나옵니다. 결혼·상견례·법적 정리처럼 형식을 갖추는 일이 실제로 진행됩니다.'
    },
    편인: {
      job: '남들이 안 보는 자리에서 실력이 생기는 때입니다. 비주류 기술·특수 분야·혼자 하는 일이 맞습니다. 다만 준비만 길어지지 않게 마감을 걸어야 합니다.',
      money: '당장 현금보다 나중에 값을 하는 것이 쌓입니다. 자격·기술·정보가 늦게, 그러나 크게 돌아옵니다.',
      love: '혼자 생각하다 결론을 내리기 쉽습니다. 상대는 모르고 있다는 것을 전제로 말해야 하는 시기입니다.'
    },
    정인: {
      job: '배우고 정비하는 때입니다. 자격·학위·문서가 무기가 되고, 윗사람이 끌어주는 일이 생깁니다. 새로 벌이기보다 실력을 채우는 쪽이 맞는 구간입니다.',
      money: '당장 큰돈이 오가지는 않습니다. 대신 다음 수입의 재료가 만들어집니다. 배운 것에 값을 붙이는 순간부터 돈이 됩니다.',
      love: '이해받고 싶은 마음이 커집니다. 알아주기를 기다리지 말고 원하는 것을 말로 옮겨야 하는 때입니다.'
    }
  };
  const DOMAIN = {
    job: { icon: '🧰', name: '직장·일', q: '언제 잘 나가고 언제 힘든가' },
    money: { icon: '💰', name: '돈', q: '언제 들어오고 언제 새는가' },
    love: { icon: '❤️', name: '사람·인연', q: '언제 움직이는가' }
  };

  // 영역별로 사람이 실제로 궁금해하는 나이 상한이 다르다.
  // 직장 전성기를 78세라고 적으면 그 한 줄로 신뢰가 무너진다.
  // 십성 조합 — 코덱스 문헌조사의 결론 「감명의 실체는 단일 십성이 아니라 조합이다」(자평진전 성패 조항).
  // 엔진이 96%의 명식에서 계산해내는데 본문에 안 쓰면 공부를 버리는 것이라, 직장·돈 면에 직접 녹인다.
  const PATTERN_DOMAIN = {
    siksang_saengjae: { dom: ['money', 'job'], easy: '만든 것을 파는 길' },
    jae_saenggwan: { dom: ['job'], easy: '성과가 자리를 만드는 길' },
    gwanin_sangsaeng: { dom: ['job'], easy: '책임이 배움을 거쳐 나를 키우는 길' },
    siksin_jesal: { dom: ['job'], easy: '압박을 실력으로 다스리는 길' },
    sanggwan_jesal: { dom: ['job'], easy: '압박을 재능으로 받아치는 길' },
    sanggwan_paein: { dom: ['job'], easy: '터져 나오는 재능에 브레이크가 달린 구조' },
    sanggwan_gyeongwan: { dom: ['job'], easy: '재능과 규칙이 부딪히는 긴장' },
    jae_in_tension: { dom: ['money'], easy: '벌려는 힘과 쌓으려는 힘의 줄다리기' }
  };
  function patternsFor(A, dom) {
    return (A.patterns || []).filter(pt => (PATTERN_DOMAIN[pt.id] || {}).dom && PATTERN_DOMAIN[pt.id].dom.includes(dom));
  }
  function patternBox(A, dom, you) {
    const ps = patternsFor(A, dom);
    if (!ps.length) return '';
    const main = ps.filter(pt => pt.grade === '주요'), cand = ps.filter(pt => pt.grade !== '주요');
    const item = pt => `<p class="pt-item"><b>${PATTERN_DOMAIN[pt.id].easy}</b>${pt.grade !== '주요' ? ' <span class="pt-cand">(옅게)</span>' : ''} — ${pt.reading}</p>`;
    return BOX(`<b>${you}의 여덟 글자가 서로 이어져 만드는 길</b><br>
      <span class="pt-note">글자 하나가 아니라 글자끼리의 연결이 실제 팔자입니다. ${you}에게는 이런 연결이 잡힙니다.</span>
      ${main.map(item).join('')}${cand.map(item).join('')}`, 'good');
  }
  const DOM_AGE_CAP = { job: 65, money: 78, love: 70 };
  function lifeTimeline(A, P, DW, C, F, dom) {
    const cap = DOM_AGE_CAP[dom] || 80;
    const rows = (DW.list || [])
      .filter(d => d.endYear > F.nowYear && Math.floor(d.startAgeExact) < cap)
      .slice(0, 5).map((d, i) => {
      const sg = C.E.tenGod(P.day.stem, d.stem), bg = C.E.tenGodBranch(P.day.stem, d.branch);
      // 10년의 바탕은 지지, 겉으로 드러나는 과제는 천간. 바탕을 본문으로 쓴다.
      let main = (LIFE_BY_GOD[bg] || {})[dom] || '';
      const sub = bg !== sg ? (LIFE_BY_GOD[sg] || {})[dom] || '' : '';
      // 신약·태약에게 재성·편관 구간은 「기회」가 아니라 「감당」이 먼저다(재다신약·살중신경).
      // 이 한 줄이 없으면 약한 사주에 반대 방향의 조언이 나간다.
      if (F.band === 'weak' && (['편재', '정재', '편관'].includes(bg) || ['편재', '정재', '편관'].includes(sg))) {
        main += ' 다만 이 사주는 혼자 다 감당하는 힘이 넉넉한 편이 아니라, <b>규모를 키우기보다 나눠 들 사람을 먼저 구해야</b> 이 구간이 기회로 남습니다.';
      }
      const from = Math.floor(d.startAgeExact), to = from + 10;
      const now = d.startYear <= F.nowYear && d.endYear > F.nowYear;
      const ageNow = now ? Math.floor(d.startAgeExact) + (F.nowYear - d.startYear) : null;
      return { d, from, to, now, ageNow, main, sub, i };
    });
    return rows;
  }

  ['job', 'money', 'love'].forEach((dom, di) => {
    rule('life_' + dom, 990 - di * 5, (A, P, DW, C, F) => {
      const rows = lifeTimeline(A, P, DW, C, F, dom);
      if (!rows.length) return null;
      const D = DOMAIN[dom];
      const cur = rows.find(r => r.now);
      const best = rows.filter(r => r.from < (DOM_AGE_CAP[dom] || 80) - 10)
                       .find(r => /가장 크게|자리를 잡는|자리와 직함|눈에 보이게/.test(r.main));

      return page({
        cls: 'rd-life',
        kicker: D.name,
        title: `${C.you}의 <b>${D.name}</b> — ${D.q}`,
        lede: cur
          ? `올해 <b>만 ${cur.ageNow}세</b>. 지금은 <b>${cur.from}세부터 ${cur.to}세까지</b>의 흐름 위에 서 있습니다.<br>
             아래는 지금부터 앞으로 <b>${rows.length * 10}년</b>을 10년 단위로, ${D.name} 하나만 놓고 푼 것입니다.`
          : `아래는 앞으로의 ${D.name}을 10년 단위로 푼 것입니다.`,
        blocks: [
          patternBox(A, dom, C.you),
          `<div class="life-tl">` + rows.map(r => `
            <div class="life-row${r.now ? ' now' : ''}">
              <div class="life-age"><b>만 ${r.from}~${r.to}세</b>
                <span>${r.d.startYear}~${r.d.endYear}년</span>
                ${r.now ? '<em>지금</em>' : ''}</div>
              <div class="life-txt"><p>${r.main}</p>${r.sub ? `<p class="life-sub">${r.sub}</p>` : ''}</div>
            </div>`).join('') + `</div>`,
          best
            ? BOX(`<b>이 표에서 딱 하나만 기억하신다면</b><br>
                ${D.name}에서 가장 크게 움직이는 구간은 <b>만 ${best.from}~${best.to}세(${best.d.startYear}~${best.d.endYear}년)</b>입니다.
                ${best.now ? '지금이 바로 그 구간입니다. 미루지 마십시오.'
                : `그때까지는 <b>준비 기간</b>입니다. 지금 쌓아두지 않으면 그때 꺼낼 것이 없습니다.`}`, 'good')
            : ''
        ],
        action: UL(
          dom === 'job' ? [
            cur ? `<b>지금(만 ${cur.ageNow}세)</b> — ${cur.main.replace(/<[^>]+>/g, '').split('.')[0]}. 이 문장에 맞게 <b>올해 목표를 한 줄로 다시 쓰세요.</b>` : '',
            '<b>이직을 생각 중이라면</b> — 위 표에서 자리가 움직이는 구간을 먼저 확인하고, 그 앞해에 이력서를 정리하세요.',
            '<b>매년</b> — 「내가 만든 결과물」을 한 줄로 적어두세요. 직함보다 결과물이 값을 만드는 사주입니다.'
          ].filter(Boolean) : dom === 'money' ? [
            best ? `<b>${best.d.startYear}년(만 ${best.from}세)</b>을 달력에 표시하세요. 돈이 가장 크게 움직이는 구간의 시작입니다.` : '',
            '<b>지금</b> — 고정비·빌려준 돈·공동비용을 <b>표 한 장</b>으로 정리하세요. 이게 이 사주에서 가장 큰 수익률입니다.',
            '<b>큰 구간 전에</b> — 계약서 검토와 세금 상담을 미리 받아두세요. 돈이 크게 움직일 때 준비 없으면 남는 게 없습니다.'
          ].filter(Boolean) : [
            '<b>지금</b> — 위 표에서 관계가 움직이는 구간이 언제인지 확인하세요.',
            '<b>그 구간에</b> — 감정만 확인하지 말고 <b>돈·시간·집안일</b>을 구체적으로 합의하세요.',
            '<b>평소</b> — 불편한 것을 <b>한 문장으로 그때그때</b> 말하세요. 참았다가 한 번에 정리하는 방식이 이 사주의 관계 수명을 가장 크게 줄입니다.'
          ]),
        evidence: rows.map(r => `${r.d.startYear}~ ${r.d.str}(${C.E.tenGod(P.day.stem, r.d.stem)}/${C.E.tenGodBranch(P.day.stem, r.d.branch)})`).join(' · ')
      });
    });
  });


  // ══════════════════════════════════════════════════
  //  올해·내년 운세 — 토정비결처럼 「월별로 그림이 보이게」
  //  사장님 지시: "올해운세 내년운세 이런 앞으로의 운세도 토정비결처럼 진짜 자세하게 풀어"
  //  명리 용어를 쓰지 않고, 그 달에 실제로 벌어지는 장면으로 적는다.
  // ══════════════════════════════════════════════════
  const MONTH_SCENE = {
    비견: { s: '내가 앞장서게 되는 달', d: '누가 대신 해주지 않습니다. 내가 정하고 내가 책임지는 일이 늘어납니다.', do: '결정할 일을 미루지 말고 이번 달에 매듭지으세요.' },
    겁재: { s: '나가는 돈이 눈에 띄는 달', d: '경조사·모임·빌려주는 일이 겹칩니다. 작은 지출이 모여 큰 금액이 됩니다.', do: '이번 달만은 빌려주기·보증·한턱내기를 미루세요.' },
    식신: { s: '만든 것이 인정받는 달', d: '조용히 해오던 일에 반응이 옵니다. 크지 않아도 방향이 맞다는 신호입니다.', do: '완성도가 아쉬워도 이번 달에 내놓으세요.' },
    상관: { s: '말이 앞서기 쉬운 달', d: '아이디어가 많고 표현하고 싶어집니다. 잘 되면 인정, 잘못되면 구설입니다.', do: '보내기 전에 한 번 더 읽으세요. 특히 윗사람에게 가는 글.' },
    편재: { s: '큰돈이 오가는 달', d: '들어올 일도 나갈 일도 함께 생깁니다. 기회처럼 보이는 제안이 옵니다.', do: '금액·기한·책임자를 문서로 남기고 결정하세요.' },
    정재: { s: '들어올 것이 정리되는 달', d: '수입·정산·계약이 자리를 잡습니다. 화려하지 않아도 확실합니다.', do: '미수금과 고정비를 이번 달에 표로 정리하세요.' },
    편관: { s: '갑자기 일이 몰리는 달', d: '준비되기 전에 요청이 들어옵니다. 압박이 느껴지는 시기입니다.', do: '맡기 전에 권한과 기한을 먼저 확인하세요.' },
    정관: { s: '자리와 평가가 정해지는 달', d: '공식적인 결정·발표·평가가 있습니다. 남이 나를 어떻게 보는지가 드러납니다.', do: '요구 기준을 정확히 맞추세요. 이 달은 원칙이 이깁니다.' },
    편인: { s: '혼자 파고들게 되는 달', d: '사람보다 자료가 편해집니다. 생각이 깊어지고 밖으로 덜 나갑니다.', do: '자료를 모으되 끝날 날짜를 정해두세요.' },
    정인: { s: '배우고 기대는 달', d: '공부·문서·자격 일이 생기고 도와주는 사람이 나타납니다.', do: '망설이지 말고 먼저 물어보세요. 이 달은 부탁이 통합니다.' }
  };

  // 지지 관계 미니 판정 — 충·합만 보면 일지가 축/해로 다른 두 사람도 같은 달이 나온다.
  // 형·해·파까지 봐야 원국 한 글자 차이가 달 문장에 드러난다.
  const REL_HAE = [[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]];           // 자미 축오 인사 묘진 신해 유술
  const REL_PA  = [[0,9],[1,10],[2,11],[3,6],[4,1],[5,8]];           // 자유 축술 인해 묘오 진축 사신
  const REL_HYUNG = [[0,3],[2,5],[5,8],[2,8],[1,7],[7,10],[1,10]];   // 자묘·인사신·축술미
  function minorRel(a,b){
    const has=(L)=>L.some(([x,y])=>(a===x&&b===y)||(a===y&&b===x));
    if((a===b&&[4,6,9,11].includes(a))||has(REL_HYUNG))return '형';
    if(has(REL_HAE))return '해'; if(has(REL_PA))return '파'; return null;
  }
  const TENGOD_GROUP = { 비견:'비겁', 겁재:'비겁', 식신:'식상', 상관:'식상',
    편재:'재성', 정재:'재성', 편관:'관성', 정관:'관성', 편인:'인성', 정인:'인성' };
  function tenGodGroupOf(g) { return TENGOD_GROUP[g] || '비겁'; }

  function monthRows(A, P, DW, C, year) {
    // 원국-월지 관계만 보면 매년 같은 달이 나온다(월지는 해마다 동일).
    // 그해 세운 지지가 달과 맺는 관계를 섞어야 연도별로 달라진다.
    const swYear = C.E.calcSewoon ? C.E.calcSewoon(A, year, 1)[0] : null;
    const out = [];
    for (let m = 1; m <= 12; m++) {
      // 절기 기준 월지 — 1월=축(丑), 2월=인(寅) … 11월=해(亥), 12월=자(子)
      // (m+1)로 두면 한 칸씩 밀려 표 전체가 틀어진다.
      const branch = m % 12;
      const god = C.E.tenGodBranch(P.day.stem, branch);
      const sc = MONTH_SCENE[god] || MONTH_SCENE['비견'];
      // 원국과 부딪히는지
      const hits = [];
      [['년', P.year.branch], ['월', P.month.branch], ['일', P.day.branch], ['시', P.hour && P.hour.branch]]
        .forEach(([k, b]) => {
          if (b == null) return;
          if ((b + 6) % 12 === branch) hits.push({ k, t: '충' });
          else if (C.branchHap && C.branchHap(b, branch)) hits.push({ k, t: '합' });
          else { const mr = minorRel(b, branch); if (mr) hits.push({ k, t: mr }); }
        });
      // 그해 세운과 이 달의 관계 — 해마다 다른 유일한 축
      if (swYear) {
        if ((swYear.branch + 6) % 12 === branch) hits.push({ k: '세', t: '충' });
        else if (C.branchHap && C.branchHap(swYear.branch, branch)) hits.push({ k: '세', t: '합' });
      }
      // 그 사람만의 조건을 섞는다 — 지금 걷는 10년, 그리고 이 달이 모자란 기운을 채우는지
      const elems = [C.E.BRANCH_ELEM[branch]];
      const yongMonth = A.yongshin && elems.includes(A.yongshin);
      // 그 달의 글자를 원국에 이미 갖고 있는가 — 같은 일간이라도 원국이 다르면 여기서 갈린다
      const natalHas = [P.year.branch, P.month.branch, P.day.branch, P.hour && P.hour.branch]
        .filter(x => x != null).includes(branch);
      out.push({ m, branch, god, sc, hits, yongMonth, natalHas });
    }
    return out;
  }

  [0, 1].forEach(off => {
    rule('year_' + off, 960 - off, (A, P, DW, C, F) => {
      if (!C.E) return null;
      const year = F.nowYear + off;
      const sw = C.E.calcSewoon(A, year, 1)[0];
      if (!sw) return null;
      const yg = { s: C.E.tenGod(P.day.stem, sw.stem), b: C.E.tenGodBranch(P.day.stem, sw.branch) };
      const rows = monthRows(A, P, DW, C, year);
      const prevSw = C.E.calcSewoon(A, year - 1, 1)[0];
      const prevGz = prevSw ? prevSw.str : '', curGz = sw.str;
      const dwForYear = (DW.list || []).find(d => d.startYear <= year && d.endYear > year);
      const dwGod = dwForYear ? C.E.tenGodBranch(P.day.stem, dwForYear.branch) : null;
      const dw = (DW.list || []).find(d => d.startYear <= year && d.endYear > year);
      const age = dw ? Math.floor(dw.startAgeExact) + (year - dw.startYear) : null;
      const head = MONTH_SCENE[yg.b] || MONTH_SCENE[yg.s];

      const hot = rows.filter(r => r.hits.some(h => h.t === '충'));
      const soft = rows.filter(r => r.hits.some(h => h.t === '합'));

      return page({
        cls: 'rd-year',
        kicker: off === 0 ? '올해 운세' : '내년 운세',
        title: `<b>${year}년</b> ${C.you}의 한 해 — ${head.s.replace(/ 달$/, ' 해')}`,
        lede: `${age != null ? `이 해에 <b>만 ${age}세</b>가 됩니다. ` : ''}${head.d}<br>
               ${sw.yongshinHit ? '<b>이 해에는 이 사주에 모자란 기운이 채워집니다.</b> 준비해 둔 것을 꺼내 쓰기에 마찰이 적은 해입니다.' : ''}`,
        blocks: [
          `<div class="yr-sum">
             <div class="yr-cell"><b>돈</b><span>${(LIFE_BY_GOD[yg.b] || {}).money || ''}</span></div>
             <div class="yr-cell"><b>일</b><span>${(LIFE_BY_GOD[yg.b] || {}).job || ''}</span></div>
             <div class="yr-cell"><b>사람</b><span>${(LIFE_BY_GOD[yg.b] || {}).love || ''}</span></div>
           </div>`,
          H(1, '달마다 이렇게 흘러갑니다'),
          `<div class="mon-grid">` + rows.map(r => {
            // 첫 기둥만 표시하면(find) 년주가 같은 두 사람은 일주 차이가 있어도 같은 문장이 나온다.
            // 걸린 기둥을 전부 나열해야 원국 한 글자 차이가 문장에 드러난다.
            const clashes = r.hits.filter(h => h.t === '충');
            const haps = r.hits.filter(h => h.t === '합');
            const minors = r.hits.filter(h => h.t === '형' || h.t === '해' || h.t === '파');
            const clash = clashes[0], hap = haps[0];
            const mark = clash ? 'mon-clash' : hap ? 'mon-hap' : '';
            const names = arr => [...new Set(arr.map(h => h.k === '세' ? '그해의 큰 흐름' : (POS_LIFE[h.k] || {}).name))].filter(Boolean).join('·');
            const parts = [];
            if (clashes.length) parts.push(names(clashes) + ' 쪽이 흔들립니다');
            if (haps.length) parts.push(names(haps) + ' 쪽에서 이야기가 진행됩니다');
            minors.forEach(h => parts.push((POS_LIFE[h.k] || {}).name + ' 쪽이 ' + (h.t === '형' ? '삐걱대며 신경 쓰입니다' : h.t === '해' ? '은근히 발목을 잡습니다' : '깨졌다 다시 붙습니다')));
            const extra = parts.length ? '<em>' + parts.join(' · ') + '</em>' : '';
            // 이 달의 성격이 「그 사람이 평소 많이 쓰는 힘」인지 「평소 없는 힘」인지에 따라 체감이 정반대다.
            const mg = tenGodGroupOf(r.god);
            const own = (F.g[mg] || 0);
            const natal = r.natalHas
              ? '<span class="mon-natal">이 달의 글자를 원국에 이미 갖고 있어, 남들보다 몸에 익은 흐름입니다</span>'
              : '';
            const fit = own >= 3
              ? `<span class="mon-fit">평소에도 두꺼운 <b>${GRP_LIFE[mg]}</b> 쪽이라, 이 달은 익숙한 방식이 더 진해집니다</span>`
              : own === 0
              ? `<span class="mon-fit">평소 거의 안 쓰는 <b>${GRP_LIFE[mg]}</b> 쪽이라, 이 달은 낯설고 서툴게 느껴질 수 있습니다</span>`
              : `<span class="mon-fit">${C.you}의 원국에 ${own}자리 있는 <b>${GRP_LIFE[mg]}</b> 쪽이 이 달에 한 번 더 눌립니다</span>`;
            const mine = r.yongMonth
              ? `<em class="mon-yong">${C.you}에게 모자란 ${EL_KO[A.yongshin]}이 닿는 달 — ${EL_LIFE[A.yongshin].act}을 붙이기 좋습니다</em>` : '';
            const dwNote = dwGod && r.god !== dwGod
              ? `<span class="mon-dw">지금의 10년(${PLAIN_DECADE[dwGod] || ''})과 결이 달라, 이 달만 따로 움직이는 느낌이 듭니다</span>`
              : dwGod ? `<span class="mon-dw">지금의 10년과 같은 결이라 흐름이 진하게 나옵니다</span>` : '';
            // 2월은 절기 경계 — 입춘 전(양력 1일~4일 무렵)은 아직 앞 해의 기운이다.
            // 이걸 안 적으면 2월 초의 일을 새해 기운으로 잘못 읽는다.
            const term = r.m === 2
              ? `<span class="mon-term">양력 1일~입춘(2월 4일 무렵) 직전은 ${prevGz}년, 입춘부터 ${curGz}년으로 나누어 읽습니다</span>` : '';
            return `<div class="mon ${mark}"><div class="mon-n">${r.m}월</div>
              <div class="mon-b"><b>${r.sc.s}</b><p>${r.sc.d}</p>${term}${fit}${natal}${extra}${mine}${dwNote}
              <span class="mon-do">${r.sc.do}</span></div></div>`;
          }).join('') + `</div>`,
          hot.length ? BOX(`<b>이 해에 특히 조심할 달</b><br>
            <b>${hot.map(r => r.m + '월').join(' · ')}</b> — 이 달들은 기존 조건이 흔들립니다.
            새로 벌이기보다 <b>계약·일정·사람 관계를 다시 확인</b>하는 데 쓰십시오.
            사고가 난다는 뜻이 아니라, 미뤄둔 문제가 이 달에 올라온다는 뜻입니다.`, 'warn') : '',
          soft.length ? BOX(`<b>이 해에 일이 잘 풀리는 달</b><br>
            <b>${soft.map(r => r.m + '월').join(' · ')}</b> — 제안·협의·약속이 실제로 진행되기 쉬운 달입니다.
            미뤄둔 대화나 결정을 이 달에 배치하십시오.`, 'good') : ''
        ],
        action: UL([
          `<b>${year}년 계획을 세울 때</b> — 큰 결정은 위에서 <b>일이 잘 풀리는 달</b>에 배치하세요.`,
          hot.length ? `<b>${hot[0].m}월</b>에는 되돌리기 어려운 결정(계약·이사·이직·큰 지출)을 <b>한 박자 늦추세요.</b>` : '<b>매달 초</b> — 그 달의 한 줄을 읽고 이번 달 목표를 맞추세요.',
          `<b>연말에</b> — 맞은 달과 틀린 달을 표시해 두세요. 다음 해 읽기가 정확해집니다.`
        ]),
        evidence: `${year}년 ${sw.str} · 천간 ${yg.s} · 지지 ${yg.b}${sw.yongshinHit ? ' · 처방 ' + A.yongshin + ' 도착' : ''} · 월별은 절기 기준(양력 1일이 아니라 매달 4~8일 무렵 바뀜)`
      });
    });
  });


  // ── 년별 상세 — 앞으로 10년을 해마다 푼다 ──────────
  rule('year_by_year', 950, (A, P, DW, C, F) => {
    if (!C.E) return null;
    const N = 10;
    const ys = C.E.calcSewoon(A, F.nowYear, N);
    const rows = ys.map(sw => {
      const dw = (DW.list || []).find(d => d.startYear <= sw.year && d.endYear > sw.year);
      const age = dw ? Math.floor(dw.startAgeExact) + (sw.year - dw.startYear) : null;
      const gs = C.E.tenGod(P.day.stem, sw.stem), gb = C.E.tenGodBranch(P.day.stem, sw.branch);
      const life = LIFE_BY_GOD[gb] || {};
      const outer = LIFE_BY_GOD[gs] || {};
      const hits = [];
      [['년', P.year.branch], ['월', P.month.branch], ['일', P.day.branch], ['시', P.hour && P.hour.branch]]
        .forEach(([k, b]) => {
          if (b == null) return;
          if ((b + 6) % 12 === sw.branch) hits.push({ k, t: '충' });
          else if (C.branchHap && C.branchHap(b, sw.branch)) hits.push({ k, t: '합' });
        });
      const clash = hits.filter(h => h.t === '충'), hap = hits.filter(h => h.t === '합');
      const scene = (MONTH_SCENE[gb] || {}).s || '';
      return { sw, age, gs, gb, life, outer, clash, hap, scene };
    });

    return page({
      cls: 'rd-yby',
      kicker: '해마다',
      title: `앞으로 ${N}년, ${C.you}에게 해마다 무슨 일이 있나`,
      lede: `한 해씩 끊어서 적었습니다. <b>돈·일·사람</b> 중 그해에 가장 크게 움직이는 것을 앞에 놓았습니다.<br>
             무슨 일이 반드시 생긴다는 뜻이 아니라, <b>그 영역에 마음과 시간이 쏠릴 확률이 높다</b>는 뜻입니다.`,
      blocks: [
        `<div class="yby">` + rows.map(r => `
          <div class="yby-row${r.sw.yongshinHit ? ' yong' : ''}${r.clash.length ? ' clash' : ''}">
            <div class="yby-y"><b>${r.sw.year}</b><span>만 ${r.age}세</span>${r.sw.yongshinHit ? '<em>기운이 닿는 해</em>' : ''}</div>
            <div class="yby-b">
              <b>${r.scene.replace(/ 달$/, ' 해')}</b>
              <p>${r.life.money || ''}</p>
              <p class="yby-sub">${r.life.job || ''}</p>
              ${r.clash.length ? `<p class="yby-warn">⚠ ${r.clash.map(h => (POS_LIFE[h.k] || {}).name).join('·')} 쪽 조건이 흔들립니다. 이 해에는 계약·이사·이직처럼 되돌리기 어려운 결정을 한 번 더 확인하십시오.</p>` : ''}
              ${r.hap.length ? `<p class="yby-good">○ ${r.hap.map(h => (POS_LIFE[h.k] || {}).name).join('·')} 쪽에서 이야기가 구체화됩니다. 미뤄둔 대화를 이 해에 하십시오.</p>` : ''}
            </div>
          </div>`).join('') + `</div>`
      ],
      action: UL([
        `<b>지금</b> — 위에서 <b>「기운이 닿는 해」</b>를 찾아 달력에 표시하세요. 같은 노력에 결과가 더 붙는 해입니다.`,
        `<b>⚠ 표시된 해</b> — 그 앞해 연말에 <b>계약·보험·대출 조건</b>을 한 번 점검해 두세요.`,
        `<b>매년 12월</b> — 그해 줄을 다시 읽고 <b>맞았는지 표시</b>하세요. 표시가 쌓이면 다음 해 읽기가 정확해집니다.`
      ]),
      evidence: rows.map(r => `${r.sw.year} ${r.sw.str}(${r.gs}/${r.gb})`).join(' · ')
    });
  });


  // ══════════════════════════════════════════════════
  //  과거 검증 — 4AI(GPT-5) 지적: "소름은 미래 예측이 아니라 검증 가능한 과거를 콕 집을 때 나온다."
  //  지나간 운세를 나열하는 면이 아니다. 이 감명서가 맞는지 재는 자(尺)다.
  //  후보를 많이 만들되 출력은 엄격히 제한한다(억지로 채우면 그게 바넘이다).
  // ══════════════════════════════════════════════════
  rule('past_check', 940, (A, P, DW, C, F) => {
    if (!C.E) return null;
    const birthY = (DW.list && DW.list[0]) ? DW.list[0].startYear - DW.list[0].countingAge + 1 : null;
    if (!birthY) return null;
    const span = F.nowYear - birthY;
    if (span < 20) return null;                    // 너무 어리면 대조할 과거가 없다

    const from = Math.max(birthY + 12, F.nowYear - 28);
    const ys = C.E.calcSewoon(A, from, F.nowYear - from);
    const cand0 = ys.map(sw => {
      let score = 0; const why = [];
      // ① 10년 흐름이 바뀐 해 — 가장 굵은 변곡
      const turn = (DW.list || []).find(d => d.startYear === sw.year);
      if (turn) { score += 3; why.push('삶의 판이 바뀌는 자리'); }
      // ② 원국 기둥과 정면으로 부딪힌 해
      const hits = [];
      [['년', P.year.branch], ['월', P.month.branch], ['일', P.day.branch], ['시', P.hour && P.hour.branch]]
        .forEach(([k, b]) => { if (b != null && (b + 6) % 12 === sw.branch) hits.push(k); });
      if (hits.length) { score += hits.length * 2; why.push(hits.map(k => (POS_LIFE[k] || {}).name).join('·') + ' 쪽이 크게 흔들림'); }
      // ③ 모자란 기운이 처음 닿은 해
      if (sw.yongshinHit) { score += 1; why.push('막혔던 것이 풀리는 자리'); }
      const dw = (DW.list || []).find(d => d.startYear <= sw.year && d.endYear > sw.year);
      const age = dw ? Math.floor(dw.startAgeExact) + (sw.year - dw.startYear) : null;
      const gb = C.E.tenGodBranch(P.day.stem, sw.branch);
      return { sw, score, why, age, gb, hits };
    });
    // 같은 지지는 12년마다 돌아오므로 그대로 뽑으면 똑같은 문장이 3~4번 나온다.
    // 지지 하나당 최고 점수 한 해만 남겨 서로 다른 이야기가 되게 한다.
    const perBranch = new Map();
    const picked = [];
    cand0.filter(x => x.score >= 4).sort((a, b) => b.score - a.score).forEach(x => {
      const n = perBranch.get(x.sw.branch) || 0;
      if (n < 2) { perBranch.set(x.sw.branch, n + 1); picked.push(x); }   // 같은 지지는 최대 2번까지
    });
    const cand = picked.slice(0, 4).sort((a, b) => a.sw.year - b.sw.year);

    if (cand.length < 3) return null;              // 3개도 안 나오면 만들지 않는다

    return page({
      cls: 'rd-past',
      kicker: '이 감명서가 맞는지 재는 법',
      title: `${C.you}에게 <b>이미 지나간 ${cand.length}개의 굴곡</b>을 먼저 맞혀 보겠습니다`,
      lede: `앞으로의 이야기를 믿으시려면, 먼저 <b>이미 겪은 일</b>이 맞아야 합니다.<br>
             아래는 이 사주 계산만으로 뽑은 <b>흔들렸을 해</b>입니다. 무슨 일이었는지는 적지 않았습니다.
             그건 ${C.you}만 아는 것이고, <b>맞았는지 아닌지가 이 감명서의 신뢰도</b>입니다.`,
      blocks: [
        `<div class="past-tl">` + cand.map(x => `
          <div class="past-row">
            <div class="past-y"><b>${x.sw.year}년</b><span>만 ${x.age}세 무렵</span></div>
            <div class="past-b">
              <p>${x.why.join(' · ')}</p>
              <p class="past-q">${x.hits.length
          ? `이 무렵 <b>${x.hits.map(k => (POS_LIFE[k] || {}).name).join('·')}</b> 쪽에 변화가 있었습니까? (이사·이직·이별·큰 지출·가족 문제 중 하나)`
          : `이 무렵 삶의 방식이 한 번 바뀌지 않았습니까? (환경·소속·역할 중 하나)`}</p>
              <div class="past-mark">□ 맞다 &nbsp;&nbsp; □ 아니다 &nbsp;&nbsp; □ 기억 안 남</div>
            </div>
          </div>`).join('') + `</div>`,
        BOX(`<b>세 개 이상 맞았다면</b><br>
          이 감명서의 계산이 ${C.you}의 실제 삶과 맞물려 있다는 뜻입니다. 뒤의 연도 표를 그대로 쓰셔도 됩니다.<br><br>
          <b>절반도 안 맞았다면</b><br>
          <b>태어난 시각을 다시 확인하십시오.</b> 30분만 달라져도 네 번째 기둥이 통째로 바뀌고,
          그러면 이 표도 전부 달라집니다. 병원 기록·부모님 기억·출생신고 시각을 대조해 보시고 다시 뽑으십시오.`, 'good'),
        P_(`<span class="rd-dim">※ 여기 적힌 해에 <b>반드시 나쁜 일</b>이 있었다는 뜻이 아닙니다.
            결혼·출산·합격·이직처럼 좋은 변화도 「흔들림」으로 잡힙니다. 크기만 재고 방향은 재지 않습니다.</span>`)
      ],
      action: UL([
        `<b>지금</b> — 위 칸에 <b>맞다/아니다를 직접 체크</b>하세요. 이게 이 책을 읽는 첫 순서입니다.`,
        `<b>3개 이상 맞으면</b> — 뒤의 연도 표를 달력에 옮기세요.`,
        `<b>절반 이하면</b> — 태어난 시각을 확인해 다시 뽑으세요. 안 맞는 표를 들고 다니는 게 제일 손해입니다.`
      ]),
      evidence: cand.map(x => `${x.sw.year} ${x.sw.str}(${x.why.length}층)`).join(' · ') + ` · 판정 = 10년 흐름 교체 + 원국 지지충 + 처방 도착의 가중합. 후보 ${ys.length}년 중 상위 ${cand.length}년만 출력.`
    });
  });


  // ══════════════════════════════════════════════════
  //  서술식 — 카드·표가 아니라 줄글로 쭉 풀어쓴다.
  //  반드시 그 사람의 원국(일간·계절·강약·합충·대운)을 문장 안에 녹인다.
  //  안 그러면 일간만 같으면 남과 글자 하나 안 틀리고 같은 글이 나온다(실측 확인).
  // ══════════════════════════════════════════════════
  const SEASON = { 1: '한겨울', 2: '초봄', 3: '봄', 4: '늦봄', 5: '초여름', 6: '한여름',
                   7: '늦여름', 8: '초가을', 9: '가을', 10: '늦가을', 11: '초겨울', 0: '겨울' };
  const DAY_IMAGE = {
    '갑': '곧게 자라는 큰 나무', '을': '감고 타고 올라가는 덩굴과 화초',
    '병': '한낮의 해', '정': '어둠을 밝히는 등불',
    '무': '넓고 두터운 땅', '기': '곡식을 기르는 밭흙',
    '경': '아직 다듬지 않은 쇳덩이', '신': '이미 세공된 보석과 칼날',
    '임': '흘러가는 큰 물', '계': '스며드는 이슬과 비'
  };
  const DAY_WAY = {
    '갑': '한번 정한 방향으로 밀고 나갑니다. 돌아가는 법을 잘 모르는 대신 버티는 힘은 확실합니다.',
    '을': '정면으로 부딪히지 않습니다. 싫어도 일단 맞춰주고 뒤에서 방법을 찾습니다. 약해 보이지만 잘 살아남습니다.',
    '병': '숨기지 못합니다. 좋으면 좋다고 아니면 아니라고 표가 납니다. 그래서 사람이 빨리 붙고 빨리 갈립니다.',
    '정': '전부를 밝히기보다 필요한 곳만 비춥니다. 가까운 사람에게 특히 세심합니다.',
    '무': '쉽게 흔들리지 않습니다. 사람들이 기대고 맡깁니다. 대신 무거워서 방향을 바꾸는 데 오래 걸립니다.',
    '기': '받아서 길러 냅니다. 티는 안 나지만 없으면 안 되는 자리에 자주 섭니다.',
    '경': '잘라야 할 때 자릅니다. 결단이 빠른 대신 표현이 거칠게 나갈 때가 있습니다.',
    '신': '기준이 정확합니다. 어설픈 것을 못 견디고 그 예민함이 곧 실력이 됩니다.',
    '임': '한곳에 머물지 않습니다. 사람과 정보가 계속 흘러 들어오고 나갑니다.',
    '계': '조용히 스며듭니다. 앞에 나서지 않는데 어느새 안쪽까지 알고 있습니다.'
  };

  function proseFacts(A, P, DW, C, F) {
    const cur = (DW.list || []).find(d => d.startYear <= F.nowYear && d.endYear > F.nowYear);
    return {
      day: C.E.STEMS[P.day.stem],
      season: SEASON[P.month.branch] || '',
      cur,
      ageNow: cur ? Math.floor(cur.startAgeExact) + (F.nowYear - cur.startYear) : null
    };
  }

  // ── 전체 사주 총론 (서술식) ────────────────────────
  rule('prose_whole', 995, function (A, P, DW, C, F) {
    const x = proseFacts(A, P, DW, C, F);
    const img = DAY_IMAGE[x.day] || '', way = DAY_WAY[x.day] || '';
    const rel = A.relations || {};
    const bumps = (rel['지지충'] || []).concat(rel['형'] || []);
    const yong = A.yongshin;
    const spots = bumps.map(function (r) {
      return (r.pos || []).map(function (k) { return (POS_LIFE[k[0]] || {}).name; }).filter(Boolean).join('·');
    }).filter(Boolean).slice(0, 2).join(', ');

    const p1 = C.you + '은 <b>' + x.season + '에 태어난 ' + img + '</b>입니다. 사주에서 나를 대표하는 글자가 ' +
      x.day + '인데, 이 글자는 ' + way;

    const p2 = F.band === 'mid'
      ? '여덟 글자를 저울에 올려 보면 <b>돕는 힘과 쓰는 힘이 거의 반반</b>입니다. 이건 이도저도 아니라는 뜻이 아니라, ' +
        '<b>판에 따라 강해질 수도 약해질 수도 있는 유연한 구조</b>라는 뜻입니다. 한쪽 역할에 갇히지 않고, ' +
        '기회가 크면 밀고 부담이 크면 물러서는 조절이 됩니다. 대신 <b>방향을 스스로 정하지 않으면</b> 주변 상황에 따라 이리저리 흔들리기 쉽습니다. ' +
        EL_KO[F.elMost] + ' 기운이 ' + F.el[F.elMost] + '자리로 가장 두꺼우니, 흔들릴 때는 그 힘을 기준점으로 삼으면 됩니다.'
      : F.strong
      ? '여덟 글자를 저울에 올려 보면 <b>나를 돕는 쪽이 훨씬 무겁습니다.</b> ' + EL_KO[F.elMost] + ' 기운이 ' +
        F.el[F.elMost] + '자리로 가장 두껍고, 그것이 대부분 ' + C.you + '을 밀어 올리는 방향에 서 있습니다. ' +
        '그래서 웬만한 일에 잘 무너지지 않습니다. 배우면 남고, 버티면 넘어가고, 챙겨주는 사람도 끊이지 않습니다. ' +
        '<b>문제는 반대쪽입니다.</b> 들어오는 것은 많은데 나가는 구멍이 좁아, 다 안고 있다가 스스로 무거워지는 구조입니다.'
      : '여덟 글자를 저울에 올려 보면 <b>감당해야 할 몫이 내 힘보다 무겁습니다.</b> ' + EL_KO[F.elMost] + ' 기운이 ' +
        F.el[F.elMost] + '자리로 가장 두꺼운데, 그것이 ' + C.you + '을 돕기보다 쓰는 쪽에 서 있습니다. ' +
        '그래서 혼자 밀어붙이면 초반에 잘 가다가 중반에 꺾이는 일이 반복됩니다. ' +
        '<b>대신 사람과 절차를 붙이면 결과가 확 달라집니다.</b> 약한 사주가 아니라 <b>같이 해야 커지는 사주</b>입니다.';

    const p3 = F.missing.length
      ? '다섯 기운 중 <b>' + F.missing.map(function (e) { return EL_KO[e]; }).join('과 ') + '</b>은 타고나지 않았습니다. ' +
        F.missing.map(function (e) { return EL_LIFE[e].act; }).join('과 ') + ' — 이런 일이 ' + C.you + '에게는 저절로 되지 않는다는 뜻입니다. ' +
        '못 한다는 말이 아닙니다. <b>남들은 기분 따라 하는 일을 ' + C.you + '은 정해두고 해야 한다</b>는 뜻입니다. ' +
        '그래서 이 사주에 가장 잘 듣는 처방은 마음가짐이 아니라 <b>일정표</b>입니다.'
      : '다섯 기운이 크게 빠진 것 없이 갖춰져 있습니다. 어떤 판에서도 쓸 재료가 있다는 뜻이고, ' +
        '대신 <b>무엇을 먼저 할지 스스로 정하지 않으면</b> 이것저것 손대다 끝나기 쉽습니다.';

    const p4 = '삶에서 가장 자주 쓰는 힘은 <b>' + GRP_LIFE[F.most] + '</b> 쪽입니다. 잘 풀릴 때도 여기서 풀리고 막힐 때도 여기서 막힙니다. ' +
      (spots
        ? '그리고 원국 안에 ' + spots + ' 사이가 부딪히는 자리가 있습니다. 이 자리는 한 번 정리하면 끝나는 게 아니라 ' +
          '<b>몇 년 간격으로 같은 문제가 다시 올라옵니다.</b> 원래 그렇게 생긴 구조이니, 올 때마다 처음처럼 당황하지 않는 것만으로 절반은 해결됩니다.'
        : '원국 안에서 서로 크게 부딪히는 자리가 적습니다. 큰 사건보다 <b>매일의 습관이 결과를 가르는</b> 사주입니다.');

    const pat = (A.patterns || []).filter(pt => pt.grade === '주요').slice(0, 2);
    const p45 = pat.length
      ? '그리고 이 여덟 글자는 따로 놀지 않고 <b>서로 이어져 길을 만듭니다.</b> ' +
        pat.map(pt => '<b>' + ((PATTERN_DOMAIN[pt.id] || {}).easy || pt.title) + '</b> — ' + pt.reading).join(' ') +
        ' 잘 풀렸던 시기를 떠올려 보면 대개 이 연결이 작동했을 때였을 것입니다.'
      : '';
    // 상신(相神) — 자평진전 「論相神緊要」. 엔진은 8/6부터 계산해 왔는데 새 감명서 본문에 0줄이었다(8/11 주입).
    const ss = (A.gyeok || {}).sangshin;
    const p47 = (ss && ss.found && ss.name)
      ? '이 짜임이 서는 데 공이 가장 큰 글자가 하나 있습니다. 옛 책은 임금 곁의 재상에 빗대어 이런 글자를 <b>상신</b>이라 불렀고, 이 글자가 다치지 않으면 격은 이미 이루어진 것이라 했습니다. ' + C.you + '의 사주에서 그 자리는 <b>' + ss.name + '</b>입니다. ' +
        (ss.why || '') + ' 거꾸로 이 글자가 상하면 그 격은 곧바로 무너진다고도 했습니다. ' +
        ' 그래서 앞으로 운을 읽을 때 <b>' + ss.name + '이 힘을 얻는 해와 부딪히는 해</b>를 따로 보는 것이 이 감명서의 숨은 기준선 중 하나입니다.' +
        (ss.damaged
          ? ' 정직하게 적어 두면, 지금 원국 안에는 이 글자를 건드리는 손상 신호도 함께 보입니다. 격을 못 쓰게 됐다는 뜻이 아니라, ' +
            '이 글자를 지키는 일 — 그 힘을 쓰는 자리를 하나로 모으고, 부딪히는 기운과 거리를 두는 일 — 이 남들보다 중요하다는 뜻입니다.'
          : '')
      : '';

    const p5 = yong
      ? '이 사주에 필요한 것은 <b>' + EL_KO[yong] + '</b>입니다. ' + (A.yongshinInChart
        ? '다행히 원국에 이미 갖고 있습니다. ' + EL_LIFE[yong].act + '을 할 때 막힘이 풀리는 구조라, 그 방향으로 시간을 쓰면 됩니다.'
        : '그런데 원국에는 없습니다. 그래서 ' + C.you + '의 삶은 타고난 글자보다 <b>어느 시기를 걷고 있느냐</b>에 더 크게 좌우됩니다. ' +
          '바꿔 말하면 <b>때가 오면 확실히 달라지는 사주</b>입니다.')
      : '한 가지 기운으로 결론이 나지 않는 사주입니다. 그때그때 무엇이 과하고 무엇이 모자란지 보고 조절하는 쪽이 맞습니다.';

    const p6 = x.cur
      ? '지금은 <b>만 ' + x.ageNow + '세</b>, ' + Math.floor(x.cur.startAgeExact) + '세부터 ' +
        (Math.floor(x.cur.startAgeExact) + 10) + '세까지 이어지는 흐름의 한가운데에 있습니다. ' +
        '이 10년이 무엇을 요구하는지, 다음 10년에 무엇이 바뀌는지는 뒤에서 하나씩 적었습니다.'
      : '';

    return page({
      cls: 'rd-prose',
      kicker: '제1장 — 내 사주 전체',
      title: C.you + '은 어떤 사람인가 — 여덟 글자를 이어서 읽으면',
      lede: '표로 나누기 전에, <b>한 사람으로 이어서</b> 읽어보겠습니다.',
      blocks: [p1, p2, p3, p4, p45, p47, p5, p6].filter(Boolean).map(function (t) { return P_(t); }),
      action: UL([
        '<b>읽으면서</b> — 맞는 문단에 표시하고, <b>틀린 문단에도 표시</b>하세요. 틀린 쪽이 더 중요합니다.',
        '<b>절반 이상 틀리면</b> — 태어난 시각을 다시 확인하세요. 30분 차이로 네 번째 기둥이 바뀝니다.',
        '<b>맞는다면</b> — 뒤의 시기표를 그대로 달력에 옮기셔도 됩니다.'
      ]),
      evidence: '일간 ' + x.day + '(' + A.dayElem + ') · ' + C.E.BRANCHES[P.month.branch] + '월생 · 강약 ' + A.strength +
        ((A.gyeok || {}).sangshin && (A.gyeok || {}).sangshin.found ? ' · 상신(相神) — 자평진전 「相神無破，貴格已成」 「相神有傷，立敗其格」' : '') +
        ' · 오행 ' + Object.keys(F.el).map(function (k) { return k + F.el[k]; }).join(' ') +
        ' · 용신 ' + (A.yongshin || '단일 처방 없음') + ' · ' + ((A.gyeok || {}).name || '') +
        (ss && ss.found ? ' · 상신 ' + ss.name + (ss.damaged ? '(손상 신호)' : '') : '')
    });
  });

  // ── 연도별 서술식 (올해·내년·내후년) ───────────────
  [0, 1, 2].forEach(function (off) {
    rule('prose_year_' + off, 958 - off, function (A, P, DW, C, F) {
      if (!C.E || !C.E.calcSewoon) return null;
      const year = F.nowYear + off;
      const sw = C.E.calcSewoon(A, year, 1)[0]; if (!sw) return null;
      const dw = (DW.list || []).find(function (d) { return d.startYear <= year && d.endYear > year; });
      const age = dw ? Math.floor(dw.startAgeExact) + (year - dw.startYear) : null;
      const gs = C.E.tenGod(P.day.stem, sw.stem), gb = C.E.tenGodBranch(P.day.stem, sw.branch);
      const dgb = dw ? C.E.tenGodBranch(P.day.stem, dw.branch) : null;

      const touch = [];
      [['년', P.year.branch], ['월', P.month.branch], ['일', P.day.branch], ['시', P.hour && P.hour.branch]]
        .forEach(function (kv) {
          const k = kv[0], b = kv[1];
          if (b == null) return;
          if ((b + 6) % 12 === sw.branch) touch.push({ k: k, t: '충' });
          else if (C.branchHap && C.branchHap(b, sw.branch)) touch.push({ k: k, t: '합' });
        });
      const cl = touch.filter(function (t) { return t.t === '충'; });
      const hp = touch.filter(function (t) { return t.t === '합'; });
      const nm = function (arr) { return arr.map(function (t) { return (POS_LIFE[t.k] || {}).name; }).join('·'); };

      const q1 = year + '년은 ' + C.you + '에게 <b>' + ((MONTH_SCENE[gb] || {}).s || '').replace(/ 달$/, ' 해') + '</b>입니다. ' +
        (age != null ? '이 해에 만 ' + age + '세가 됩니다. ' : '') + ((LIFE_BY_GOD[gb] || {}).money || '');

      const q2 = dgb
        ? '이 해는 <b>' + (PLAIN_DECADE[dgb] || '지금의 10년') + '</b> 안에 들어 있습니다. 그러니 ' + year +
          '년 하나만 떼어 보지 말고 <b>그 10년이 요구하는 방향 안에서</b> 읽어야 합니다. ' + ((LIFE_BY_GOD[dgb] || {}).job || '')
        : '';

      const q3 = cl.length
        ? year + '년의 가장 큰 특징은 <b>' + nm(cl) + '</b> 쪽이 흔들린다는 것입니다. 사고를 예고하는 것이 아니라 ' +
          '<b>지금까지의 조건을 그대로 유지하기 어려워진다</b>는 뜻입니다. 미뤄두었던 문제가 이 해에 표면으로 올라옵니다. ' +
          '그래서 계약·이사·이직처럼 되돌리기 어려운 결정은 <b>서두르지 말고 조건을 다시 적어본 뒤</b> 하시는 편이 낫습니다.'
        : hp.length
        ? year + '년에는 <b>' + nm(hp) + '</b> 쪽에서 이야기가 진행됩니다. 제안이 오거나 미뤄둔 대화가 실제 약속으로 바뀌는 해입니다. ' +
          '다만 <b>말이 오간 것과 정해진 것은 다릅니다.</b> 금액·기한·역할을 문서로 남겨야 이 해의 흐름이 다음 해까지 갑니다.'
        : year + '년에는 원국을 정면으로 건드리는 자리가 없습니다. 밖에서 밀어주는 것도 흔드는 것도 크지 않다는 뜻이고, ' +
          '그만큼 <b>' + C.you + '이 무엇을 정하느냐가 그대로 결과가 되는 해</b>입니다. 조용한 해를 흘려보내면 ' +
          '다음에 바쁜 해가 왔을 때 꺼낼 것이 없습니다.';

      // 복음·반음 — 삼명통회 「總論歲運」. 겁주는 단정이 아니라 변동폭 신호로 번역한다.
      const fb = C.E.fuFanYin ? C.E.fuFanYin(P.day, sw) : null;
      const q35 = fb === '복음'
        ? '따로 적어 둘 것이 하나 있습니다. ' + year + '년의 두 글자 ' + sw.str + '는 ' + C.you + '이 태어난 날의 두 글자와 <b>글자까지 똑같습니다.</b> ' +
          '옛 책은 같은 소리가 겹쳐 울린다 해서 이런 해를 <b>복음</b>이라 불렀고, 운이 태어난 날을 그대로 누르는 해라 적으며 ' +
          '가까운 사람과 돈의 일을 가볍게 보지 말라고 했습니다. 무서운 예고가 아닙니다. 이 해는 새것이 들어오는 해가 아니라 <b>이미 있던 것이 더 크게 울리는 해</b>입니다. ' +
          '잘 되던 것은 부피가 커지고, 미뤄 둔 문제는 더 크게 문을 두드립니다. 그래서 이 해에 맞는 일은 판을 새로 벌이는 것이 아니라, ' +
          '지금 손에 있는 것이 커져도 넘치지 않도록 <b>그릇을 먼저 넓혀 두는 일</b>입니다 — 계약을 글로 만들고, 돈의 칸을 나누고, 역할의 경계를 정해 두는 것이 그것입니다.'
        : fb === '반음'
        ? '따로 적어 둘 것이 하나 있습니다. ' + year + '년의 두 글자는 ' + C.you + '이 태어난 날의 두 글자와 <b>하늘·땅 글자가 모두 정면으로 마주 충합니다.</b> ' +
          '옛 책은 이런 해를 <b>반음</b>이라 불렀고, 가족·배우자처럼 가까운 관계와 ' +
          '돈의 출렁임을 함께 조심하라 했습니다. 사건을 약속하는 글자가 아닙니다. 다만 이 해는 <b>흔들리는 폭 자체가 큽니다.</b> 같은 결정이라도 잘 되면 크게 되고, 어긋나면 크게 어긋납니다. ' +
          '그래서 이 해의 큰 결정은 "되면 좋고 안 되면 그만"으로 던지지 말고, <b>안 됐을 때 물러날 자리까지 정해 놓고</b> 움직여야 합니다. ' +
          '반대로 쓰임도 있습니다 — 오래 끌어와서 이제는 끝내야 하는 일, 정리하고 매듭지어야 하는 자리에는 이만큼 힘이 실리는 해가 없습니다.'
        : '';

      const q4 = sw.yongshinHit
        ? '그리고 이 해에는 <b>' + C.you + '에게 모자란 ' + EL_KO[A.yongshin] + '의 기운이 함께 들어옵니다.</b> ' +
          '좋은 일이 저절로 생긴다는 뜻이 아닙니다. ' + EL_LIFE[A.yongshin].act + '을 할 때 <b>평소보다 마찰이 적다</b>는 뜻입니다. ' +
          '준비해 둔 것이 있으면 이 해에 꺼내십시오. 없으면 이 해는 그냥 지나갑니다.'
        : '이 해에 모자란 기운이 따로 채워지지는 않습니다. 그래서 큰 것을 새로 벌이기보다 ' +
          '<b>이미 하는 것의 완성도를 올리는 쪽</b>이 남는 장사입니다.';

      const q5 = '<b>일</b>은 ' + ((LIFE_BY_GOD[gb] || {}).job || '') + ' <b>사람</b>은 ' + ((LIFE_BY_GOD[gb] || {}).love || '') +
        (gs !== gb ? ' 겉으로 요구받는 것은 이와 달라서, ' + ((LIFE_BY_GOD[gs] || {}).job || '') + ' 두 가지를 같이 다뤄야 하는 해입니다.' : '');

      // 신뢰도 계층 — 이 해 읽기를 지탱하는 근거가 몇 겹인지 독자에게 그대로 보인다.
      const sig = yearSignal(A, P, sw, C, !!(P.hour && A.knowTime !== false));
      const evParts = [];
      if (sw.yongshinHit) evParts.push('모자란 기운의 도착');
      if (cl.length) evParts.push(nm(cl) + ' 자리의 충');
      if (hp.length) evParts.push(nm(hp) + ' 자리의 합');
      if (fb) evParts.push('일주 ' + fb);
      const tier = confTier(sig.ev);
      const q6 = tier === 'firm'
        ? confSpan('firm', sig.ev, '위 읽기는 서로 다른 계산 <b>' + evParts.length + '겹</b>(' + evParts.join(' · ') + ')이 같은 방향을 가리켜 그대로 단정해 적었습니다. 이 해의 계획은 이 글을 기준으로 세우셔도 됩니다.')
        : tier === 'cond'
        ? confSpan('cond', sig.ev, '정직하게 적습니다. 위 읽기의 근거는 <b>' + (evParts[0] || '한 가지 신호') + ' 한 겹</b>입니다. 그래서 단정이 아니라 조건입니다 — 이 해 초에 그 방향의 조짐이 실제로 보이는지 확인되면 위 문장대로 읽으시고, 보이지 않으면 조용한 해로 낮춰 읽으십시오.')
        : confSpan('check', sig.ev, '정직하게 적습니다. 이 해는 원국을 직접 건드리는 근거가 없어 <b>단정할 수 있는 것이 없습니다.</b> 그래서 점검 목록으로 대신합니다 — 연초에 ①제안·계약이 오는지 ②소속·역할이 바뀌는지 ③큰 지출 요인이 생기는지 세 가지를 직접 점검하고, 하나라도 나타나면 그쪽 장을 다시 펴서 읽으십시오.');

      return page({
        cls: 'rd-prose',
        kicker: year + '년 운세',
        title: year + '년, ' + C.you + '에게 어떤 해인가',
        blocks: [q1, q2, q3, q35, q4, q5, q6].filter(Boolean).map(function (t) { return P_(t); }),
        action: UL([
          '<b>' + year + '년 초에</b> — 위에서 ' + (cl.length ? '흔들린다고 적힌 자리' : '가장 마음에 걸리는 대목') + '의 조건을 종이에 적으세요.',
          '<b>연중</b> — 큰 결정은 뒤의 월별 표에서 <b>잘 풀리는 달</b>에 배치하세요.',
          '<b>' + year + '년 말에</b> — 맞았는지 표시해 두세요. 다음 해 읽기가 정확해집니다.'
        ]),
        evidence: year + '년 ' + sw.str + ' · 천간 ' + gs + ' · 지지 ' + gb + (dw ? ' · ' + dw.str + ' 대운 안' : '') +
          (touch.length ? ' · 원국 접점 ' + touch.map(function (t) { return t.k + '주' + t.t; }).join('·') : ' · 원국 직접 접점 없음') +
          (sw.yongshinHit ? ' · 처방 ' + A.yongshin + ' 도착' : '') +
          (fb === '복음' ? ' · 일주 복음(伏吟) — 삼명통회 「總論歲運」 「歲運壓日，謂之伏吟」' : fb === '반음' ? ' · 일주 반음(反吟) — 삼명통회 「總論歲運」 「若歲運與日相對，謂之返吟」' : '') +
          ' · 신뢰도 ' + sig.ev + '겹(' + tier + ')'
      });
    });
  });

  // ══════════════════════════════════════════════════
  //  12차 — 「책처럼 읽는 평생 감명서」 (사장님 8/11 "인생 전반을 다 훑는, 책처럼")
  //  근묘화실(년=뿌리·초년 / 월=줄기·청년 / 일=꽃·중년 / 시=열매·말년) 구조로
  //  인생 전체를 장(章)별 줄글로 훑는다. 과거 연도 숫자는 쓰지 않는다(no_past 정책).
  //  모든 문단에 그 사람의 실제 간지·십성·합충을 박아 남과 같은 글이 나오지 않게 한다.
  // ══════════════════════════════════════════════════
  const TG_CORE = {
    비견: '나와 같은 기운 — 스스로 결정하고 내 몫을 내 손으로 챙기려는 힘',
    겁재: '겨루는 기운 — 승부가 걸리면 강해지지만 내 것의 경계를 자주 시험받는 힘',
    식신: '만들어 내놓는 기운 — 한 가지를 오래 파서 결과물로 말하는 힘',
    상관: '틀을 벗어나 표현하는 기운 — 낡은 방식을 못 견디고 더 나은 길을 찾아내는 힘',
    편재: '움직이는 돈과 기회를 다루는 기운 — 판을 넓게 보고 굴리는 힘',
    정재: '차곡차곡 쌓는 기운 — 셈이 정확하고 약속을 지켜서 신용이 되는 힘',
    편관: '눌러오는 책임과 시험의 기운 — 견뎌 낸 무게가 그대로 권한이 되는 힘',
    정관: '질서와 자리의 기운 — 규칙 안에서 인정받고 책임을 맡는 힘',
    편인: '남과 다른 눈의 기운 — 별난 관심사와 직관으로 파고드는 힘',
    정인: '받아들이고 배우는 기운 — 지식과 어른의 도움이 나를 받쳐 주는 힘'
  };
  const SEASON_FRAME = {
    년: { name: '뿌리 — 초년과 집안', q: '어떤 땅에서 출발했는가' },
    월: { name: '줄기 — 청년과 사회', q: '세상에 나가 어떤 자리를 맡는가' },
    일: { name: '꽃 — 삶의 한가운데', q: '한창때의 나와 내 곁에 무엇이 피는가' },
    시: { name: '열매 — 말년과 남기는 것', q: '무엇을 거두고 무엇을 물려주는가' }
  };
  const GONGWI_APPLY = {
    년: {
      비겁: '집안에서 일찍부터 내 몫을 스스로 챙겨야 했거나, 형제·또래와 나누며 큰 그림입니다. 물려받아 출발하기보다 내가 만들어 출발하는 쪽입니다.',
      식상: '어릴 때부터 만들고 표현하는 것으로 눈에 띄는 아이였습니다. 출발점의 힘은 재주였고, 그 재주를 알아봐 준 기억이 평생의 밑불이 됩니다.',
      재성: '집안에 실리와 현실 감각이 흘렀습니다. 일찍부터 돈과 일의 무게를 아는 아이로 컸고, 그것이 셈 빠른 어른의 바탕이 됐습니다.',
      관성: '규율이 있는 집안이거나, 일찍부터 책임이 얹힌 환경입니다. 어른들의 기대가 초년의 공기였고, 그 무게가 일찍 철들게 했습니다.',
      인성: '배움과 보살핌이 초년의 바탕입니다. 집안 어른의 그늘이 넓었고, 그 그늘 아래서 쌓은 공부가 평생의 자산이 됩니다.'
    },
    월: {
      비겁: '동료와 경쟁자 속에서 크는 자리입니다. 혼자 있을 때보다 여럿 속에서 내 자리를 증명할 때 사회에서의 힘이 붙습니다.',
      식상: '직함보다 산출물이 명함이 되는 자리입니다. 실무와 결과물로 평가받는 판에 설 때 청년기가 풀립니다.',
      재성: '숫자와 실적이 오가는 한복판이 사회의 자리입니다. 값이 매겨지고 성과가 찍히는 일 — 관리·운용·거래 쪽에서 힘이 납니다.',
      관성: '조직의 질서 안에서 인정받아 올라가는 길입니다. 자리가 사람을 만드는 유형이라, 책임이 주어질수록 오히려 커집니다.',
      인성: '배우고 정리해서 전하는 것이 사회의 무기입니다. 문서·자격·지식이 남들의 인맥 명함보다 오래갑니다.'
    },
    일: {
      비겁: '가장 가까운 자리에 나와 닮은 기운이 앉아 있습니다. 배우자·단짝과는 위아래가 아니라 동등한 동료처럼 지낼 때 오래갑니다.',
      식상: '곁에 두는 사람에게 만들어 주고 해 먹이는 것으로 마음을 표현합니다. 거창한 말보다 같이 보내는 일상이 관계의 언어입니다.',
      재성: '내 곁의 자리에 현실을 관리하는 기운이 앉았습니다. 생활의 조건을 함께 다지는 관계일 때 마음이 놓입니다.',
      관성: '가장 가까운 자리에 나를 단속하는 기운이 앉았습니다. 곁 사람의 기준이 나를 바로 세워 주는 대신, 그 말이 잔소리로 들리는 날도 있습니다.',
      인성: '곁 사람에게 기대어 회복하는 유형입니다. 말없이 챙겨 주는 관계 하나가 어떤 보약보다 큽니다.'
    },
    시: {
      비겁: '말년에도 내 힘으로 서 있는 그림입니다. 자식·후배와는 위에서 내려다보기보다 옆에 서는 관계가 됩니다.',
      식상: '거두는 자리에 내가 만든 것들이 남습니다. 손으로 남긴 결과물, 가르쳐 키운 사람들이 말년의 이름이 됩니다.',
      재성: '말년의 자리에 실속이 앉았습니다. 나이 들어서도 굴러가는 수입의 구조를 만들 수 있는 그림입니다.',
      관성: '말년까지 역할이 따라오는 그림입니다. 물러난 뒤에도 감투와 책임이 찾아오고, 그것이 말년의 긴장이자 보람이 됩니다.',
      인성: '나이 들수록 배우고 전하는 자리가 어울립니다. 정리해서 물려주는 일에서 말년의 품위가 나옵니다.'
    }
  };
  // 궁위 하나를 읽는 재료 — 간지·십성·그 자리에 걸린 합충·공망
  function pillarStory(A, P, C, pos) {
    const pil = { 년: P.year, 월: P.month, 일: P.day, 시: P.hour }[pos];
    if (!pil) return null;
    const ganji = C.E.STEMS[pil.stem] + C.E.BRANCHES[pil.branch];
    const gs = pos === '일' ? null : C.E.tenGod(P.day.stem, pil.stem);
    const gb = C.E.tenGodBranch(P.day.stem, pil.branch);
    const rel = A.relations || {};
    const touch = [];
    Object.keys(rel).forEach(function (k) {
      (rel[k] || []).forEach(function (r) {
        if ((r.pos || []).some(function (p) { return String(p)[0] === pos; })) {
          touch.push({ k: k, kind: /충/.test(k) ? '충' : /합/.test(k) ? '합' : '마찰', pair: r.pair || '' });
        }
      });
    });
    const bch = C.E.BRANCHES[pil.branch];
    const gmHit = (A.gongmang || []).some(function (x) { return String(x).indexOf(bch) >= 0; });
    return { ganji: ganji, gs: gs, gb: gb, grp: tenGodGroupOf(gb), grpS: gs ? tenGodGroupOf(gs) : null, touch: touch, gm: gmHit };
  }
  function touchLine(ps, frameName) {
    const chung = ps.touch.filter(function (t) { return t.kind === '충'; });
    const hap = ps.touch.filter(function (t) { return t.kind === '합'; });
    const fric = ps.touch.filter(function (t) { return t.kind === '마찰'; });
    let out = '';
    if (chung.length) out += ' 다만 이 자리는 원국 안에서 <b>충(' + chung.map(function (t) { return t.pair; }).join('·') + ')</b>으로 맞닿아 있어, ' + frameName + '의 조건이 한 번은 크게 재편되는 그림입니다. 그 재편은 무너짐이 아니라 다시 짓는 일이었다는 것을, 지나고 보면 알게 됩니다.';
    else if (hap.length) out += ' 이 자리는 원국 안에서 <b>합(' + hap.map(function (t) { return t.pair; }).join('·') + ')</b>으로 묶여 있어, ' + frameName + '의 인연과 조건이 쉽게 끊기지 않고 길게 이어집니다.';
    else if (fric.length) out += ' 이 자리에는 <b>' + fric.map(function (t) { return t.k; }).join('·') + '</b>의 마찰 표지가 걸려 있습니다. 사건의 예고가 아니라, ' + frameName + '의 조건을 남보다 자주 손봐야 한다는 신호로 읽으십시오.';
    if (ps.gm) out += ' 그리고 이 자리는 <b>공망(빈 곳)</b>으로 잡힙니다. 이 시기의 소유와 소속에 힘을 주기보다, 역할과 기술처럼 들고 다닐 수 있는 것을 쌓는 편이 남습니다.';
    return out;
  }

  // ── 제2장 성격과 마음 ──────────────────────────────
  rule('prose_personality', 994, function (A, P, DW, C, F) {
    if (!C.E) return null;
    const day = C.E.STEMS[P.day.stem];
    const inner = pillarStory(A, P, C, '일');
    const outer = pillarStory(A, P, C, '월');
    const mostGrp = F.most;
    const zeroGrps = F.zeros;

    const p1 = C.you + '의 중심 글자는 <b>' + day + '(' + A.dayElem + ')</b> — ' + DAY_IMAGE[day] + '입니다. ' + DAY_WAY[day] +
      ' 이것이 남들이 뭐라 하든 바뀌지 않는 ' + C.you + '의 바탕색입니다.';

    const p2 = '그 바탕 위에서 마음이 가장 자주 쓰는 방은 <b>' + mostGrp + '</b>의 방 — ' + (GRP_LIFE[mostGrp] || '') + '을 다루는 방입니다. ' +
      '여덟 글자 중 이 기운이 ' + (F.g[mostGrp] || 0) + '개로 가장 많으니, 하루를 돌아보면 결국 이 방에서 보낸 시간이 제일 길었을 것입니다.' +
      (zeroGrps.length ? ' 반대로 <b>' + zeroGrps.join('·') + '</b>의 방은 타고난 원국에 없습니다. 그 일이 나쁜 게 아니라 <b>저절로 되지 않는 일</b>이라는 뜻이라, 남들이 숨 쉬듯 하는 그 일을 ' + C.you + '은 배워서 습관으로 만들어야 합니다.' : '');

    const p3 = F.band === 'strong'
      ? '기운의 총량은 <b>넉넉한 쪽(' + A.strength + ')</b>입니다. 힘이 안으로 고이면 답답해지는 구조라, 일이든 운동이든 표현이든 <b>내보내는 통로</b>를 늘 열어 두어야 마음이 갭니다. 통로가 막힌 채로 지내는 기간이 길어지면 그 힘이 사람과의 부딪힘으로 새어 나갑니다.'
      : F.band === 'mid'
      ? '기운의 총량은 <b>어느 쪽으로도 크게 기울지 않은 균형(' + A.strength + ')</b>입니다. 이런 구조는 무리해서 저지르지 않는 대신, 남의 속도에 휩쓸릴 때 가장 흔들립니다. 내 보폭을 지키는 것 — 그것이 ' + C.you + '에게는 성실보다 중요한 규율입니다.'
      : '기운의 총량은 <b>아껴 써야 하는 쪽(' + A.strength + ')</b>입니다. 벌이는 힘보다 지키는 힘이 좋은 구조라, 판을 키우는 결정보다 판을 고르는 결정에서 승률이 높습니다. 지치기 전에 쉬는 것이 게으름이 아니라 전략입니다.';

    const p4 = '겉과 속도 구분해 둘 만합니다. 사회에서 남들이 먼저 보는 ' + C.you + '은 월주(' + outer.ganji + ')의 <b>' +
      (outer.gs || outer.gb) + '</b> — ' + (TG_CORE[outer.gs || outer.gb] || '') + '의 얼굴이고, 가장 가까운 사람만 아는 속은 일지(' +
      inner.ganji.slice(1) + ')의 <b>' + inner.gb + '</b> — ' + (TG_CORE[inner.gb] || '') + '의 얼굴입니다.' +
      ((outer.gs || outer.gb) !== inner.gb
        ? ' 두 얼굴이 다르니, 밖에서 보이는 모습만으로 ' + C.you + '을 안다고 말하는 사람은 아직 반만 아는 것입니다.'
        : ' 두 얼굴이 같은 기운이라, ' + C.you + '은 안팎이 크게 다르지 않은 사람입니다. 꾸미는 데 힘을 쓰지 않는 대신, 숨기는 것도 잘 안 됩니다.');

    return page({
      cls: 'rd-prose',
      kicker: '성격과 마음',
      title: C.you + '은 어떤 사람인가',
      lede: '여덟 글자에서 성격을 읽는 규칙은 셋입니다 — 중심 글자(일간)가 바탕, 가장 많은 기운이 습관, 월주와 일지가 겉과 속.',
      blocks: [p1, p2, p3, p4].map(function (t) { return P_(t); }),
      action: UL([
        '<b>오늘</b> — 위에서 「저절로 되지 않는 일」로 짚인 것 하나를 이번 달 습관 하나로 바꿔 보세요.',
        '<b>큰 결정 전</b> — 이 장의 기운 운용 문단을 다시 읽고, 지금 그 결정이 내 보폭인지 남의 속도인지 확인하세요.'
      ]),
      evidence: '일간 ' + day + '(' + A.dayElem + ') · 최다 십성군 ' + mostGrp + ' ' + (F.g[mostGrp] || 0) + '개 · 없는 군 ' + (zeroGrps.join('·') || '없음') +
        ' · 강약 ' + A.strength + ' · 월주 ' + outer.ganji + '(' + (outer.gs || '-') + '/' + outer.gb + ') · 일지 ' + inner.gb
    });
  });

  // ── 제3장 인생의 네 계절 (근묘화실) ────────────────
  rule('prose_seasons', 992, function (A, P, DW, C, F) {
    if (!C.E) return null;
    const knowTime = !!P.hour;
    const paras = [];
    ['년', '월', '일', '시'].forEach(function (pos) {
      const fr = SEASON_FRAME[pos];
      if (pos === '시' && !knowTime) {
        paras.push('<b>' + fr.name + '</b> — 태어난 시각이 확인되지 않아 이 계절의 기둥(시주)은 세우지 못했습니다. 정직하게 비워 둡니다. 말년과 자식 자리는 시각이 확인되면 다시 뽑아 읽는 것이 맞고, 억지로 채워 읽으면 그때부터 이 책 전체의 신뢰가 무너집니다.');
        return;
      }
      const ps = pillarStory(A, P, C, pos);
      const head = '<b>' + fr.name + '</b> — ' + fr.q + '. 이 계절의 기둥은 <b>' + ps.ganji + '</b>입니다. ';
      let body;
      if (pos === '일') {
        body = '일주는 하늘 글자가 나 자신이라, 땅 글자(<b>' + ps.gb + '</b>)로 이 계절을 읽습니다. ' + (TG_CORE[ps.gb] || '') + '이 삶의 한가운데에 앉아 있습니다. ' + (GONGWI_APPLY[pos][ps.grp] || '');
      } else {
        body = '하늘에는 <b>' + ps.gs + '</b>(' + (TG_CORE[ps.gs] || '') + ')이, 땅에는 <b>' + ps.gb + '</b>이 놓였습니다. ' + (GONGWI_APPLY[pos][ps.grpS || ps.grp] || '') +
          (ps.grpS && ps.grp !== ps.grpS ? ' 땅의 기운(' + ps.grp + ')은 결이 달라서, 이 시기의 겉 사정과 속 사정이 하나가 아니었을 것입니다.' : '');
      }
      paras.push(head + body + touchLine(ps, fr.name.split(' — ')[1] || fr.name));
    });

    return page({
      cls: 'rd-prose',
      kicker: '제2장 — 인생의 네 계절',
      title: C.you + '의 일생을 네 기둥으로 훑습니다',
      lede: '명리는 인생을 네 기둥으로 봅니다. 옛 명리서는 년을 뿌리, 월을 싹, 일을 꽃, 시를 열매에 비유했습니다 — 뿌리는 초년과 집안, 싹은 청년과 사회, 꽃은 한창때의 나, 열매는 말년과 남기는 것입니다. 아래는 ' + C.you + '의 실제 여덟 글자로 그 네 계절을 읽은 것입니다.',
      blocks: paras.map(function (t) { return P_(t); }),
      action: UL([
        '<b>읽고 나서</b> — 이미 지난 계절 문단이 실제와 맞았는지 표시해 두세요. 맞았다면 아직 오지 않은 계절 문단이 이 책에서 가장 값진 부분이 됩니다.',
        '<b>계절이 바뀔 때</b> — 다음 계절 문단을 다시 펴서, 지금 하는 준비가 그 계절의 결에 맞는지 확인하세요.'
      ]),
      evidence: ['년', '월', '일', '시'].map(function (pos) {
        const pil = { 년: P.year, 월: P.month, 일: P.day, 시: P.hour }[pos];
        return pil ? pos + '주 ' + C.E.STEMS[pil.stem] + C.E.BRANCHES[pil.branch] : pos + '주 미상(시각 미입력)';
      }).join(' · ') + ' · 근묘화실 궁위론 — 연해자평 「論日為主」 「以年為根，以月為苗，以日為花，以時為果」 · 원국 합충 · 공망 ' + ((A.gongmang || []).join('·') || '없음')
    });
  });

  // ── 제4장 곁의 사람들 ──────────────────────────────
  rule('prose_people', 991.5, function (A, P, DW, C, F) {
    if (!C.E) return null;
    const yr = pillarStory(A, P, C, '년');
    const mo = pillarStory(A, P, C, '월');
    const dy = pillarStory(A, P, C, '일');
    const hr = pillarStory(A, P, C, '시');
    const NOBLE = ['천을귀인', '천덕귀인', '월덕귀인', '문곡귀인', '태극귀인', '천주귀인', '복성귀인'];
    const nobles = (A.sinsal || []).filter(function (s) { return NOBLE.indexOf(s.name) >= 0; });

    const p1 = '<b>부모와 집안(년주 ' + yr.ganji + ')</b> — 년주에 앉은 기운은 <b>' + (yr.gs || yr.gb) + '</b>입니다. ' +
      (GONGWI_APPLY['년'][yr.grpS || yr.grp] || '') +
      ' 집안이 내게 준 것과 내가 집안에 갚는 것은 결국 이 기운의 언어로 오갑니다.' + touchLine(yr, '집안');

    const PEOPLE_SOCIAL = {
      비겁: '동료이자 경쟁자인 사람들입니다. 같은 편일 때 가장 든든하고, 몫을 나눌 때 가장 위험하니 성과의 이름표를 늘 분명히 해 두십시오.',
      식상: '내가 만든 것을 알아봐 주는 사람들이 모입니다. 특히 후배·아랫사람 인연이 길게 가고, 그들이 나중에 나의 평판이 됩니다.',
      재성: '거래와 실리로 맺어지는 인연이 많습니다. 셈이 분명한 관계가 오래가고, 정으로만 얽힌 관계는 대개 셈에서 끝납니다.',
      관성: '나를 평가하고 끌어올리는 윗사람 인연이 사회생활의 축입니다. 윗사람 복을 관리하는 것이 곧 경력 관리입니다.',
      인성: '가르쳐 주고 밀어주는 어른의 인연이 사회의 축입니다. 배우는 자세를 보일 때 사람이 붙습니다.'
    };
    const p2 = '<b>사회에서 만나는 사람들(월주 ' + mo.ganji + ')</b> — 동료·상사·오래 가는 친구는 월주의 기운 <b>' + (mo.gs || mo.gb) + '</b>의 결로 만납니다. ' +
      (PEOPLE_SOCIAL[mo.grpS || mo.grp] || '') + touchLine(mo, '사회의 인연');

    const dyTouch = dy.touch.filter(function (t) { return t.kind === '충'; });
    const p3 = '<b>배우자의 자리(일지 ' + dy.ganji.slice(1) + ')</b> — 명리에서 배우자 자리는 일지 하나만 봅니다. ' + C.you + '의 그 자리에는 <b>' + dy.gb + '</b>(' + (TG_CORE[dy.gb] || '') + ')이 앉아 있습니다. ' +
      (GONGWI_APPLY['일'][dy.grp] || '') +
      (dyTouch.length
        ? ' 이 자리가 원국 안에서 충(' + dyTouch.map(function (t) { return t.pair; }).join('·') + ')으로 맞닿아 있으니, 가장 가까운 관계의 조건을 남들보다 자주 다시 맞추게 됩니다. 그것은 관계가 나쁘다는 판정이 아니라 <b>대화의 빈도가 관계의 수명</b>이라는 뜻입니다.'
        : '') +
      ' 상대가 어떤 사람인지는 사주가 정하지 않습니다 — 사주가 말할 수 있는 것은 <b>' + C.you + '이 관계를 다루는 방식</b>까지입니다.';

    const p4 = hr
      ? '<b>자식과 아랫사람(시주 ' + hr.ganji + ')</b> — 시주의 기운은 <b>' + (hr.gs || hr.gb) + '</b>입니다. ' + (GONGWI_APPLY['시'][hr.grpS || hr.grp] || '') +
        ' 자식이 있든 없든 이 자리는 작동합니다 — 후배·제자·내가 만든 것들이 전부 이 자리의 식구입니다.' + touchLine(hr, '거두는 자리')
      : '<b>자식과 아랫사람(시주)</b> — 태어난 시각이 확인되지 않아 이 자리는 정직하게 비워 둡니다. 시각을 확인해 다시 뽑으면 이 문단이 채워집니다.';

    const p5 = nobles.length
      ? '마지막으로, 이 원국에는 <b>도와주는 사람의 표지(' + [...new Set(nobles.map(function (x) { return x.name; }))].join('·') + ')</b>가 ' + nobles.length + '곳에 잡힙니다. 결정적인 순간에 손을 내미는 사람이 반복해서 나타나는 그림이니, 도움을 받으면 반드시 갚아 두십시오. 이 표지는 갚는 사람에게만 계속 작동합니다.'
      : '도와주는 사람의 표지(귀인)는 이 원국에 따로 잡히지 않습니다. 인복이 없다는 뜻이 아니라 <b>먼저, 구체적으로 부탁해야 사람이 붙는다</b>는 뜻입니다. 막연히 기다리는 도움은 오지 않는 대신, 부탁의 형태가 분명하면 오히려 잘 옵니다.';

    return page({
      cls: 'rd-prose',
      kicker: '제3장 — 곁의 사람들',
      title: C.you + ' 곁에 오는 사람들의 결',
      lede: '부모·동료·배우자·자식 — 명리는 사람을 궁위(자리)로 읽습니다. 각 자리에 어떤 기운이 앉았는지가, 그 관계가 오가는 언어를 정합니다.',
      blocks: [p1, p2, p3, p4, p5].map(function (t) { return P_(t); }),
      action: UL([
        '<b>이번 주</b> — 위 문단 중 지금 가장 삐걱대는 자리 하나를 골라, 그 자리의 언어(기운)로 한 번 다가가 보세요.',
        '<b>도움을 받았을 때</b> — 갚음의 형태를 그 자리에서 정하세요. 귀인 표지는 갚는 사람에게만 반복됩니다.'
      ]),
      evidence: '년 ' + yr.ganji + '(' + (yr.gs || '-') + ') · 월 ' + mo.ganji + '(' + (mo.gs || '-') + ') · 일지 ' + dy.gb + ' · 시 ' + (hr ? hr.ganji + '(' + (hr.gs || '-') + ')' : '미상') +
        ' · 귀인 ' + (nobles.length ? nobles.map(function (x) { return x.name + '@' + (x.where || ''); }).join(' · ') : '없음') +
        ' · ※ 성별로 배우자 별을 달리 보는 고전 관법은 쓰지 않음'
    });
  });

  // ── 제5장 직장과 일 ────────────────────────────────
  rule('prose_work', 991, function (A, P, DW, C, F) {
    if (!C.E) return null;
    const gwan = F.g.관성 || 0, sik = F.g.식상 || 0, inj = F.g.인성 || 0;
    const nowDw = (DW.list || []).find(function (d) { return d.startYear <= F.nowYear && d.endYear > F.nowYear; });
    const nowG = nowDw ? C.E.tenGodBranch(P.day.stem, nowDw.branch) : null;
    const pats = patternsFor(A, 'job');

    const p1 = gwan >= 2
      ? '일의 뼈대부터 봅니다. 이 원국에는 <b>자리와 책임의 기운(관성)이 ' + gwan + '개</b> — 조직이 ' + C.you + '을 알아보고 쓰는 구조입니다. 어디에 속해 있는가가 수입보다 먼저 오는 유형이라, 소속의 격을 올리는 것이 곧 연봉을 올리는 길입니다.'
      : gwan === 1
      ? '일의 뼈대부터 봅니다. <b>자리와 책임의 기운(관성)이 딱 하나</b> 있습니다. 조직 생활이 되긴 하되 그 하나가 다치면 크게 흔들리니, 지금 있는 자리의 조건을 함부로 버리지 말고 다음 자리를 정한 뒤에 움직이는 것이 이 구조의 철칙입니다.'
      : '일의 뼈대부터 봅니다. 이 원국에는 <b>자리와 책임의 기운(관성)이 없습니다.</b> 조직의 사다리로 크는 그림이 아니라 <b>내 이름과 내 실력으로 서는 그림</b>이라는 뜻입니다. 직장에 있더라도 직함이 아니라 "그 일은 그 사람"이라는 평판을 쌓는 쪽이 이 구조의 정답입니다.';

    const p2 = sik
      ? '실력의 통로(식상)는 ' + sik + '개로 열려 있습니다. 만들고 내놓는 것이 되는 구조라, 보고서든 제품이든 <b>남는 결과물</b>이 있는 일을 골라야 경력이 쌓일수록 단단해집니다.' + (inj ? ' 배움의 기운(인성 ' + inj + '개)도 같이 있으니, 결과물에 자격과 공부를 얹으면 대체되기 어려운 사람이 됩니다.' : '')
      : '만들어 내놓는 통로(식상)가 원국에 없습니다. 실무 산출보다 <b>판단·관리·중개</b>처럼 사람과 구조를 다루는 일에서 힘이 나는 배치입니다.' + (inj ? ' 대신 배움의 기운(인성 ' + inj + '개)이 있어, 아는 것을 정리해 전하는 역할이 잘 맞습니다.' : '');

    const p3 = pats.length
      ? '그리고 이 사주에는 일에 관한 한 <b>' + pats.map(function (pt) { return (PATTERN_DOMAIN[pt.id] || {}).easy || pt.title; }).join('과 ') + '</b>의 연결이 이미 놓여 있습니다. ' + pats.map(function (pt) { return pt.reading; }).join(' ') + ' 진로를 고를 일이 생기면 이 연결이 작동하는 쪽을 고르십시오 — 같은 노력이 두 배로 계산되는 자리입니다.'
      : '';

    const p4 = nowDw
      ? '지금 걷는 10년(' + nowDw.str + ' 대운)의 일 기운은 <b>' + nowG + '</b>입니다. ' + ((LIFE_BY_GOD[nowG] || {}).job || '') +
        ' 10년 단위의 흐름과 해마다의 신호는 뒤의 흐름 장에서 연도별로 자세히 읽습니다.'
      : '';

    return page({
      cls: 'rd-prose',
      kicker: '제4장 — 직장과 일',
      title: C.you + '의 일은 어떻게 커지는가',
      lede: '일을 읽는 재료는 셋 — 자리의 기운(관성), 실력의 통로(식상), 그리고 글자들이 만드는 연결(격국·조합)입니다.',
      blocks: [p1, p2, p3, p4].filter(Boolean).map(function (t) { return P_(t); }),
      action: UL([
        '<b>진로를 고민할 때</b> — 이 장의 뼈대 문단(조직형인가 이름형인가)을 기준으로 선택지를 반으로 줄이세요.',
        '<b>매년 초</b> — 뒤의 12년 신호등에서 그해 신호를 확인하고, 이 장의 방향과 겹치는 해에 큰 결정을 두세요.'
      ]),
      evidence: '관성 ' + gwan + ' · 식상 ' + sik + ' · 인성 ' + inj + ' · 격 ' + ((A.gyeok || {}).name || '-') +
        (pats.length ? ' · 조합 ' + pats.map(function (pt) { return pt.title; }).join('·') : '') +
        (nowDw ? ' · 현재 대운 ' + nowDw.str + '(' + nowG + ')' : '')
    });
  });

  // ── 제6장 돈의 흐름 ────────────────────────────────
  rule('prose_money', 986, function (A, P, DW, C, F) {
    if (!C.E) return null;
    const jae = F.g.재성 || 0, bi = F.g.비겁 || 0, sik = F.g.식상 || 0;
    const nowDw = (DW.list || []).find(function (d) { return d.startYear <= F.nowYear && d.endYear > F.nowYear; });
    const nowG = nowDw ? C.E.tenGodBranch(P.day.stem, nowDw.branch) : null;
    const fy = (F.futureYong || [])[0];

    const p1 = jae >= 3
      ? '이 원국의 돈 기운(재성)은 <b>' + jae + '개 — 많은 편</b>입니다. 돈이 없는 사주가 아니라 <b>돈이 사방에서 보이는 사주</b>라는 뜻인데, ' +
        (F.band === 'weak' ? '그것을 들 힘(' + A.strength + ')이 상대적으로 가벼워서, 보이는 것을 다 잡으려 들면 오히려 새어 나갑니다. 판을 하나로 줄이고 나눠 들 사람을 구하는 것 — 그것이 이 구조가 돈을 지키는 유일한 방식입니다.'
          : '힘도 그것을 감당하는 쪽(' + A.strength + ')이라 여러 갈래를 굴릴 수 있습니다. 다만 갈래가 늘수록 장부가 분명해야 합니다 — 이 구조의 돈 사고는 벌이에서가 아니라 정산에서 납니다.')
      : jae >= 1
      ? '이 원국의 돈 기운(재성)은 <b>' + jae + '개</b>입니다. 돈이 삶의 중심 주제는 아니되 필요한 만큼은 만드는 배치입니다. ' +
        (sik ? '만드는 통로(식상 ' + sik + '개)가 재성으로 이어지니, 잘하는 일 하나를 오래 파는 것이 재테크보다 확실한 축적 경로입니다.' : '통로가 되는 식상이 없어, 수입의 원천을 내 손이 아니라 자리와 구조에서 찾는 편이 안전합니다.')
      : '이 원국에는 <b>돈 기운(재성)이 없습니다.</b> 평생 가난하다는 뜻이 전혀 아닙니다 — 돈을 직접 좇는 방식이 안 먹히고, <b>실력·자리·사람을 먼저 세우면 돈이 그 뒤를 따라오는 순서</b>라는 뜻입니다. 수익률을 비교하는 시간보다 몸값을 올리는 시간이 이 구조에는 항상 더 남는 장사입니다.';

    const p2 = bi >= 3
      ? '한 가지는 미리 적어 둡니다. 내 몫을 나누자는 기운(비겁)이 ' + bi + '개로 강한 배치라, <b>동업·보증·대납</b>에서 이 사주의 돈이 가장 많이 샙니다. 사람이 미워서가 아니라 구조가 그렇습니다. 같이 하려면 지분과 정산을 먼저 글로 정하고 시작하십시오.'
      : '';

    const p3 = fy
      ? '모이는 때도 적어 둡니다. 이 사주에 모자란 기운(' + EL_KO[A.yongshin] + ')이 대운으로 들어오는 <b>만 ' + ageAt(fy) + '세 무렵부터의 10년(' + fy.str + ')</b>이 돈의 마찰이 가장 적은 구간입니다. 그 전까지는 불리기보다 <b>새는 곳을 막는 것</b>이 수익률이 더 높습니다.'
      : (A.yongshin && F.yongDecades && F.yongDecades.length === 0
        ? '처방 기운(' + EL_KO[A.yongshin] + ')이 대운으로는 따로 들어오지 않는 배치라, 돈의 확장은 해마다의 세운 신호(뒤의 12년 신호등)를 보고 해 단위로 잡는 것이 맞습니다.'
        : '');

    const p4 = nowDw
      ? '지금 걷는 10년(' + nowDw.str + ')의 돈 기운은 <b>' + nowG + '</b>입니다. ' + ((LIFE_BY_GOD[nowG] || {}).money || '')
      : '';

    return page({
      cls: 'rd-prose',
      kicker: '제5장 — 돈의 흐름',
      title: C.you + '의 돈은 어떤 길로 오는가',
      lede: '돈을 읽는 재료는 셋 — 돈 기운의 양(재성), 그것을 들 힘(강약), 그리고 새는 자리(비겁). 셋을 겹치면 벌 방식과 지킬 방식이 갈립니다.',
      blocks: [p1, p2, p3, p4].filter(Boolean).map(function (t) { return P_(t); }),
      action: UL([
        '<b>이번 달</b> — 위에서 짚인 「새는 자리」 하나를 점검하세요. 이 구조의 돈은 버는 쪽이 아니라 새는 쪽에서 결판납니다.',
        '<b>투자·확장 전</b> — 지금이 마찰 적은 구간인지 이 장과 12년 신호등에서 확인한 뒤 크기를 정하세요.'
      ]),
      evidence: '재성 ' + jae + ' · 비겁 ' + bi + ' · 식상 ' + sik + ' · 강약 ' + A.strength + '(' + F.band + ')' +
        (fy ? ' · 처방 대운 ' + fy.str + ' 만 ' + ageAt(fy) + '세~' : '') + (nowDw ? ' · 현재 대운 ' + nowDw.str + '(' + nowG + ')' : '')
    });
  });

  // ── 제7장 몸과 리듬 ────────────────────────────────
  rule('prose_body', 979, function (A, P, DW, C, F) {
    if (!C.E) return null;
    const t = A.temp || {};
    const most = F.elMost;
    const miss = F.missing || [];

    const p1 = '몸은 병명을 짚는 장이 아닙니다 — 그것은 병원의 일입니다. 사주가 말할 수 있는 것은 <b>기운의 쏠림이 만드는 생활의 리듬</b>까지고, 이 장은 거기까지만 정직하게 적습니다.';

    const p2 = '이 원국은 <b>' + most + ' 기운(' + (F.el[most] || 0) + '개)</b>이 가장 두텁고' +
      (miss.length ? ', <b>' + miss.map(function (e) { return EL_KO[e]; }).join('·') + '</b>이 비어 있습니다' : ', 다섯 기운이 고루 깔려 있습니다') +
      '. 차고 덥고 마르고 눅눅한 정도로는 <b>' + (function () {
        const raw = String(t.label || '').replace(/\([^)]*\)/g, '');
        const M = { 한: '차가운', 난: '따뜻한', 조: '건조한', 습: '눅눅한' };
        if (raw && raw.split('').every(function (ch) { return M[ch]; }))
          return raw.split('').map(function (ch) { return M[ch]; }).join('고 ') + ' 쪽';
        return raw || '치우침 없는 쪽';
      })() + '</b>의 몸입니다. 기운이 두터운 쪽은 과로해도 버티는 대신 탈이 나면 크게 나고, 빈 쪽의 일은 몸이 저절로 챙기지 않으니 달력에 적어 놓고 챙겨야 합니다.';

    const p3 = F.band === 'strong'
      ? '에너지 운용은 단순합니다 — <b>쓰지 않으면 탈이 나는 몸</b>입니다. 규칙적으로 비우는 운동이 이 몸에는 보약이고, 오래 앉아 고이는 생활이 독입니다.'
      : F.band === 'mid'
      ? '에너지 운용은 <b>리듬 유지</b>가 핵심입니다. 몰아서 무리하고 몰아서 쉬는 방식이 이 몸에는 가장 나쁘고, 같은 시간에 자고 같은 보폭으로 움직이는 것이 어떤 보양보다 큽니다.'
      : '에너지 운용은 <b>회복 우선</b>입니다. 소모가 회복보다 빠른 배치라, 스케줄에 쉼을 먼저 박고 남는 칸에 일을 넣는 순서가 맞습니다. 지치고 나서 쉬면 늦습니다.';

    const p4 = A.johu
      ? '계절 처방도 하나 있습니다. 이 사주는 <b>' + C.E.STEMS[A.johu.main] + '(' + A.johu.mainElem + ')</b>의 기운이 필요한 배치라, ' +
        (EL_LIFE[A.johu.mainElem] ? EL_LIFE[A.johu.mainElem].act + ' — 이런 활동이 계절을 타는 몸의 처방입니다.' : '그 기운에 해당하는 활동을 생활에 심어 두는 것이 처방입니다.')
      : '';

    return page({
      cls: 'rd-prose',
      kicker: '몸과 리듬',
      title: C.you + '의 몸이 좋아하는 생활',
      lede: '오행의 쏠림과 한난조습 — 이 두 가지가 몸의 리듬을 정합니다. 병명은 적지 않습니다. 습관만 적습니다.',
      blocks: [p1, p2, p3, p4].filter(Boolean).map(function (t) { return P_(t); }),
      action: UL([
        '<b>이번 주</b> — 위의 처방 활동 하나를 요일 하나에 고정하세요. 빈 기운의 일은 달력이 챙겨야 합니다.',
        '<b>피곤이 길어질 때</b> — 이 장의 운용 문단을 다시 읽고, 지금 방식이 내 몸의 순서와 맞는지 확인하세요.'
      ]),
      evidence: '오행 ' + Object.keys(F.el).map(function (k) { return k + ' ' + F.el[k]; }).join(' · ') + ' · 결손 ' + (miss.join('·') || '없음') +
        ' · 한난조습 ' + (t.label || '-') + ' · 강약 ' + A.strength + ' · ※ 질병 예측·병명 언급은 정책상 배제'
    });
  });

  // ══════════════════════════════════════════════════
  function build(A, P, DW, C) {
    const ctx = Object.assign({ nowYear: new Date().getFullYear(), name: '' }, C);
    ctx.name = (!ctx.name || ctx.name === '이름 미입력') ? '' : String(ctx.name).trim();
    // 호칭: 이름이 있으면 「○○ 님」, 없으면 「당신」. 문장 안에서 이 값만 쓴다.
    ctx.you = ctx.name ? ctx.name + ' 님' : '당신';
    const F = facts(A, P, DW, ctx);
    const out = [];
    RULES.slice().sort((a, b) => b.weight - a.weight).forEach(r => {
      let html = null;
      // 조용히 삼키면 면이 통째로 사라져도 아무도 모른다. 콘솔에 반드시 남긴다.
      try { html = r.fn(A, P, DW, ctx, F); }
      catch (e) { html = null; try { console.error('[감명서 규칙 실패] ' + r.id + ' — ' + (e && e.message)); } catch (_) {} }
      if (html) out.push({ id: r.id, html });
    });
    return out;
  }

  global.SajuReading = { build, RULES, EL_KO, EL_HAN, EL_LIFE, GRP_LIFE, POS_LIFE, page, H, P_, UL, BOX, TBL };
})(typeof window !== 'undefined' ? window : globalThis);
