const screens    = [...document.querySelectorAll('.screen')];
const screenName = document.querySelector('#screenName');
const statusTime = document.querySelector('#statusTime');
const navButtons = [...document.querySelectorAll('[data-screen]')];
const goButtons  = [...document.querySelectorAll('[data-go]')];
const askQuestionButtons = [...document.querySelectorAll('[data-action="ask-question"]')];

const screenGroupMap = {
  login:           null,
  signup:          null,
  forgotpassword:  null,
  termsofuse:      null,
  feed:            'feed',
  entry_detail:    'feed',
  entry_write:     'entry_write',
  mentor_top:      'mentor_top',
  mentor_add:      'mentor_top',
  mentor_thread:   'mentor_top',
  discover_top:    'discover_top',
  discover_detail: 'discover_top',
  setting:         'setting',
};

// ── 時刻表示 ─────────────────────────────────────────────────────────
function tickTime() {
  if (!statusTime) return;
  const now = new Date();
  statusTime.textContent = now.toLocaleTimeString('ja-JP', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
tickTime();
setInterval(tickTime, 1000 * 30);

// ── 画面切り替え ─────────────────────────────────────────────────────
function showScreen(target) {
  closeSearchModal();

  screens.forEach(screen => {
    screen.classList.toggle('is-visible', screen.dataset.name === target);
  });

  const groupTarget = screenGroupMap[target] ?? target;
  navButtons.forEach(btn => {
    btn.classList.toggle(
      'is-active',
      btn.dataset.screen === target || btn.dataset.screen === groupTarget,
    );
  });

  if (screenName) screenName.textContent = target.replace(/_/g, ' ');

  // entry_write に遷移したら AI 問いかけを閉じる
  if (target === 'entry_write') {
    document.querySelector('.screen[data-name="entry_write"] .assistant-prompt')
      ?.classList.remove('is-open');
  }
}

navButtons.forEach(btn => btn.addEventListener('click', () => showScreen(btn.dataset.screen)));
goButtons.forEach(btn  => btn.addEventListener('click', () => { if (btn.dataset.go) showScreen(btn.dataset.go); }));

// ── AI 問いかけ（質問をもらう）────────────────────────────────────────
askQuestionButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const screen     = btn.closest('.screen');
    const promptCard = screen?.querySelector('.assistant-prompt');
    if (!promptCard) return;
    promptCard.classList.add('is-open');
    promptCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});

// ── 検索モーダル ─────────────────────────────────────────────────────
const searchModal    = document.getElementById('searchModal');
const searchOpenBtn  = document.getElementById('searchOpenBtn');
const searchOverlay  = document.getElementById('searchOverlay');
const searchCloseBtn = document.getElementById('searchCloseBtn');

function openSearchModal()  { searchModal?.classList.add('is-open');    }
function closeSearchModal() { searchModal?.classList.remove('is-open'); }

searchOpenBtn?.addEventListener('click',  openSearchModal);
searchOverlay?.addEventListener('click',  closeSearchModal);
searchCloseBtn?.addEventListener('click', closeSearchModal);

// フィルタチップの排他選択
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chip.closest('.chip-row').querySelectorAll('.filter-chip')
      .forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
  });
});
document.querySelectorAll('.sort-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chip.closest('.chip-row').querySelectorAll('.sort-chip')
      .forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
  });
});

// ── 振り返り提案 既読処理 ────────────────────────────────────────────
document.querySelectorAll('.suggestion').forEach(card => {
  card.addEventListener('click', () => {
    if (card.classList.contains('is-read')) return;
    card.classList.remove('is-unread');
    card.classList.add('is-read');
    if (!card.querySelector('.suggestion-read-mark')) {
      const mark = document.createElement('span');
      mark.className = 'suggestion-read-mark';
      mark.textContent = '✓ 確認済み';
      card.appendChild(mark);
    }
  });
});

// ── forgotpassword 送信フィードバック ────────────────────────────────
document.getElementById('forgotSubmitBtn')?.addEventListener('click', () => {
  const msg = document.getElementById('forgotSuccess');
  if (msg) msg.style.display = 'block';
});

// ── mentor_top 編集モード ─────────────────────────────────────────────
const mentorEditBtn = document.getElementById('mentorEditBtn');
const mentorList    = document.getElementById('mentorList');
let   mentorEditMode = false;

mentorEditBtn?.addEventListener('click', () => {
  mentorEditMode = !mentorEditMode;
  mentorEditBtn.textContent = mentorEditMode ? '完了' : '編集';
  mentorList?.querySelectorAll('.mentor-card').forEach(card => {
    card.classList.toggle('is-edit-mode', mentorEditMode);
  });
});

// ── discover Like ─────────────────────────────────────────────────────
document.querySelectorAll('.like-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const liked = btn.dataset.liked === 'true';
    btn.dataset.liked = String(!liked);
    btn.classList.toggle('is-liked', !liked);
    btn.textContent = !liked ? '♥ Liked' : '♡ Like';
  });
});
