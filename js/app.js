/* ===================================
   かけいぼ - メインアプリ (app.js)
   =================================== */

const App = (() => {
  // ─── 状態 ───
  let currentMonth = DB.monthKey();
  let currentScreen = 'home';
  let currentMode = 'household'; // household | sidejob
  let inputType = 'expense';
  let selectedCategory = null;
  let sjInputType = null; // sj_income | sj_invest
  let sjSelectedCategory = null;
  let editingId = null; // 編集中のID
  let selectedDay = DB.today();
  let historyViewMode = 'month'; // month | week
  let historyWeekOffset = 0;
  let pieChart = null;
  let barChart = null;

  // ─── 初期化 ───
  async function init() {
    await DB.init();
    DB.applyMonthlyFixedCosts(DB.monthKey());
    bindEvents();
    updateMonthDisplay();
    renderHome();
    renderInput();
    checkReminder();
  }

  function checkReminder() {
    const banner = document.getElementById('reminder-banner');
    if (!banner) return;
    const hasToday = DB.getDailyCheck(DB.today());
    banner.style.display = hasToday ? 'none' : 'flex';
  }

  // ─── フォーマット ───
  function formatMoney(n) {
    if (n === null || n === undefined) return '¥0';
    const sign = n < 0 ? '-' : '';
    return `${sign}¥${Math.abs(n).toLocaleString()}`;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  // ─── ナビゲーション ───
  function switchScreen(name) {
    if (name === 'home' && currentMode === 'sidejob') {
      name = 'sidejob';
    }
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const screenId = name === 'sidejob' ? 'screen-sidejob' : `screen-${name}`;
    document.getElementById(screenId)?.classList.add('active');

    const navName = name === 'sidejob' ? 'home' : name;
    document.querySelector(`.nav-item[data-screen="${navName}"]`)?.classList.add('active');

    currentScreen = name;

    // 画面レンダリング
    switch (name) {
      case 'home': renderHome(); break;
      case 'sidejob': renderSidejob(); break;
      case 'input': renderInput(); break;
      case 'calendar': renderCalendar(); break;
      case 'chart': renderCharts(); break;
      case 'settings': renderSettings(); break;
      case 'fixed': renderFixedList(); break;
      case 'all-history': renderHistoryList(); break;
    }
    // スクロールをトップに戻す
    const content = document.querySelector('.screen.active .screen-content');
    if (content) content.scrollTop = 0;
  }

  function switchMode(mode) {
    currentMode = mode;
    DB.setActiveMode(mode);
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`)?.classList.add('active');

    // タブも同期させる
    const tabName = mode === 'personal' ? 'sidejob' : 'household';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`)?.classList.add('active');

    if (mode === 'family') {
      switchScreen('home');
    } else {
      switchScreen('sidejob');
    }
  }

  function changeMonth(delta) {
    const parts = currentMonth.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1 + delta, 1);
    currentMonth = DB.monthKey(d);
    updateMonthDisplay();
    switchScreen(currentScreen);
  }

  function updateMonthDisplay() {
    const parts = currentMonth.split('-');
    document.getElementById('current-month').textContent = `${parts[0]}年${parseInt(parts[1])}月`;
  }

  // ─── ホーム画面 ───
  function renderHome() {
    const mode = DB.getActiveMode();
    const income = DB.getTotalIncome(currentMonth, mode);
    const expense = DB.getTotalExpense(currentMonth, mode);
    const totalBudget = DB.getTotalBudget(currentMonth);
    const remaining = totalBudget > 0 ? totalBudget - expense : income - expense;

    document.getElementById('remaining-amount').textContent = formatMoney(remaining);
    document.getElementById('home-expense-total').textContent = formatMoney(expense);

    // 先月比
    const comp = DB.getMonthlyComparison(currentMonth, mode);
    const diffEl = document.getElementById('home-diff');
    if (comp.hasPrev) {
      const prefix = comp.diff > 0 ? '+' : '';
      diffEl.textContent = `${prefix}${formatMoney(comp.diff)}`;
      diffEl.style.color = comp.diff > 0 ? 'rgba(255,255,255,0.8)' : '#FFF';
    } else {
      diffEl.textContent = '-';
    }

    // アドバイス
    const successRate = DB.getSavingsSuccessRate(currentMonth, mode);
    const advice = DB.getAdvice(comp, successRate);
    document.getElementById('advice-emoji').textContent = advice.emoji;
    document.getElementById('advice-text').textContent = advice.text;

    // 残りカード色変更
    const card = document.getElementById('remaining-card');
    if (remaining < 0) {
      card.style.background = 'linear-gradient(135deg, #FF7B7B 0%, #FF9B9B 100%)';
    } else {
      card.style.background = '';
    }

    // 連続記録（ミニ）
    const streak = DB.getStreak();
    const streakCountEl = document.getElementById('home-streak-count');
    if (streakCountEl) streakCountEl.textContent = streak.count;
    
    const checkBtn = document.getElementById('daily-check-btn');
    const checked = DB.getDailyCheck(DB.today());
    if (checkBtn) {
      checkBtn.classList.toggle('checked', checked);
      checkBtn.querySelector('.c-label').textContent = checked ? '記録完了！' : '今日の記録';
    }

    // 固定費割合
    const fRatioData = DB.getFixedCostRatio(currentMonth);
    const ratioValEl = document.getElementById('home-fixed-ratio');
    const ratioFillEl = document.getElementById('home-fixed-ratio-fill');
    const ratioMsgEl = document.getElementById('home-fixed-ratio-msg');
    
    if (ratioValEl) ratioValEl.textContent = `${Math.round(fRatioData.ratio)}%`;
    if (ratioFillEl) {
      ratioFillEl.style.width = `${Math.min(fRatioData.ratio, 100)}%`;
      ratioFillEl.classList.toggle('warning', fRatioData.ratio > 50);
    }
    if (ratioMsgEl) {
      if (fRatioData.ratio > 50) {
        ratioMsgEl.textContent = '⚠️ 固定費が高すぎます！見直しを検討しましょう。';
        ratioMsgEl.style.color = 'var(--danger)';
      } else {
        ratioMsgEl.textContent = '固定費が家計を圧迫していません。Good！';
        ratioMsgEl.style.color = 'var(--text-light)';
      }
    }

    // 成功率（日数ベース）
    const successDaysData = DB.getSavingsSuccessRateDays(currentMonth);
    const dsValueEl = document.getElementById('home-success-rate-days');
    const dsDaysEl = document.getElementById('home-success-days');
    const dsTotalEl = document.getElementById('home-total-days');

    if (successDaysData) {
      if (dsValueEl) dsValueEl.textContent = `${successDaysData.percent}%`;
      if (dsDaysEl) dsDaysEl.textContent = successDaysData.successDays;
      if (dsTotalEl) dsTotalEl.textContent = successDaysData.totalDays;
    }

    // 予算プログレス
    renderBudgetProgress();

    // 最近の取引
    renderRecentList();

    // アクション・目標
    renderActionAndGoal();

    // リマインド更新
    checkReminder();
  }

  function renderActionAndGoal() {
    const actionCard = document.getElementById('home-action-card');
    const goalCard = document.getElementById('home-goal-card');
    const goalProgress = DB.getGoalProgress(currentMonth);

    if (goalProgress) {
      actionCard.style.display = 'none';
      goalCard.style.display = 'block';

      const title = document.getElementById('goal-title');
      const barFill = document.getElementById('goal-bar-fill');
      const progressText = document.getElementById('goal-progress-text');

      let label = '';
      let progressStr = '';
      let percent = 0;

      const categories = DB.getAllExpenseCategories();
      if (goalProgress.type === 'category_count') {
        label = `${(categories[goalProgress.category] || {}).name}を${goalProgress.limit}回まで`;
        const remain = Math.max(0, goalProgress.limit - goalProgress.current);
        progressStr = remain > 0 ? `あと ${remain}回` : '達成！✨';
        percent = Math.min((goalProgress.current / goalProgress.limit) * 100, 100);
      } else {
        label = `予算 ¥${goalProgress.limit.toLocaleString()}以内`;
        const remain = Math.max(0, goalProgress.limit - goalProgress.current);
        progressStr = remain > 0 ? `あと ${formatMoney(remain)}` : '達成！✨';
        percent = Math.min((goalProgress.current / goalProgress.limit) * 100, 100);
      }

      title.textContent = label;
      barFill.style.width = `${percent}%`;
      barFill.classList.toggle('over', percent >= 100);
      progressText.textContent = progressStr;
      if (progressStr === '達成！✨') progressText.style.color = 'var(--accent)';
    } else {
      goalCard.style.display = 'none';
      const proposal = DB.getActionProposal(currentMonth);
      if (proposal) {
        actionCard.style.display = 'block';
        document.getElementById('action-issue').textContent = proposal.issue;
        document.getElementById('action-proposal').textContent = proposal.action;
      } else {
        actionCard.style.display = 'none';
      }
    }
  }

  function openGoalModal() {
    document.getElementById('goal-modal').classList.add('show');
    document.getElementById('goal-setup-detail').style.display = 'none';
    document.querySelectorAll('.goal-option-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.goal;
        showGoalSetup(type);
      };
    });
  }

  function showGoalSetup(type) {
    const detail = document.getElementById('goal-setup-detail');
    const label = document.getElementById('gs-label');
    const unit = document.getElementById('gs-unit');
    const submit = document.getElementById('gs-submit-btn');

    detail.style.display = 'block';
    if (type === 'eat_out_limit') {
      label.textContent = '外食の回数を指定';
      unit.textContent = '回';
      submit.onclick = () => setGoal('category_count', 'food_eating', document.getElementById('gs-value').value);
    } else if (type === 'category_budget') {
      label.textContent = '食費の予算を指定';
      unit.textContent = '円';
      submit.onclick = () => setGoal('category_amount', 'food_grocery', document.getElementById('gs-value').value);
    } else {
      label.textContent = '全体の支出上限を指定';
      unit.textContent = '円';
      submit.onclick = () => setGoal('total_amount', null, document.getElementById('gs-value').value);
    }
  }

  function setGoal(type, category, limit) {
    const numLimit = parseInt(limit);
    if (!numLimit) return;
    DB.saveGoal({ type, category, limit: numLimit });
    closeGoalModal();
    renderHome();
    showToastMessage('🎯', '目標をセットしました！応援しています✨');
  }

  function resetGoal() {
    showConfirm('目標をリセットしますか？', () => {
      DB.saveGoal(null);
      renderHome();
    });
  }

  function closeGoalModal() {
    document.getElementById('goal-modal').classList.remove('show');
  }

  function showGoalSuccessToast() {
    showToastMessage('🎊', '目標達成です！素晴らしい✨');
  }

  function renderBudgetProgress() {
    const container = document.getElementById('budget-progress-list');
    const budgets = DB.getBudgets(currentMonth);
    const keys = Object.keys(budgets).filter(k => budgets[k] > 0);

    if (keys.length === 0) {
      container.innerHTML = `
        <div class="empty-message">
          <span class="empty-icon">📋</span>
          設定画面で予算を設定すると<br>残り金額が表示されます
        </div>`;
      return;
    }

    container.innerHTML = keys.map(k => {
      const categories = DB.getAllExpenseCategories();
      const cat = categories[k];
      if (!cat) return '';
      const budget = budgets[k];
      const spent = DB.getCategoryTotal(currentMonth, k);
      const remaining = budget - spent;
      const percent = Math.min((spent / budget) * 100, 100);
      let barClass = '';
      let warningMsg = '';
      if (percent >= 100) {
        barClass = 'over';
        warningMsg = '予算オーバーです💦';
      } else if (percent >= 80) {
        barClass = 'warning';
        warningMsg = 'あと少しで予算内です！がんばれ💪';
      }

      return `
        <div class="budget-progress-item">
          <div class="budget-progress-head">
            <span class="budget-cat-name">${cat.icon} ${cat.name}</span>
            <span class="budget-remaining ${percent >= 100 ? 'over' : ''}">${formatMoney(remaining)}</span>
          </div>
          <div class="budget-bar">
            <div class="budget-bar-fill ${barClass}" style="width:${percent}%"></div>
          </div>
          ${warningMsg ? `<div class="budget-warning-msg">${warningMsg}</div>` : ''}
        </div>`;
    }).join('');
  }

  function renderRecentList() {
    const mode = DB.getActiveMode();
    const container = document.getElementById('recent-list');
    const txs = DB.getMonthTransactions(currentMonth, mode).slice(-20).reverse();

    if (txs.length === 0) {
      container.innerHTML = `
        <div class="empty-message">
          <span class="empty-icon">📝</span>
          まだ記録がありません<br>入力タブから記録を始めよう！
        </div>`;
      return;
    }

    container.innerHTML = txs.map(t => {
      const categories = t.type === 'expense' ? DB.getAllExpenseCategories() : DB.getAllIncomeCategories();
      const cat = categories[t.category];
      const icon = cat?.icon || '📌';
      const name = cat?.name || t.category;
      const amountClass = t.type === 'expense' ? 'expense' : 'income';
      const prefix = t.type === 'income' ? '+' : '-';
      return `
        <div class="recent-item" data-id="${t.id}">
          <div class="recent-icon" style="background:${cat?.color || 'var(--bg)'}20; color:${cat?.color || 'var(--text)'}">${icon}</div>
          <div class="recent-info">
            <div class="recent-name">${name}</div>
            <div class="recent-meta">${formatDate(t.date)}${t.memo ? ' · ' + t.memo : ''}</div>
          </div>
          <div class="recent-amount ${amountClass}">${prefix}${formatMoney(t.amount)}</div>
          <button class="recent-delete" onclick="App.confirmDeleteTx('${t.id}')">✕</button>
        </div>`;
    }).join('');
  }

  // ─── 入力画面 ───
  function renderInput() {
    renderCategories();
    renderQuickItems();
  }

  function setInputType(type) {
    inputType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.type-btn[data-type="${type}"]`)?.classList.add('active');
    renderCategories();
    renderQuickItems();
    document.getElementById('category-section-title').textContent =
      type === 'expense' ? 'カテゴリを選択' : '収入の種類を選択';
  }

  function renderCategories() {
    const grid = document.getElementById('category-grid');
    const allCats = inputType === 'expense' ? DB.getAllExpenseCategories() : DB.getAllIncomeCategories();
    const frequent = DB.getFrequentCategories(inputType, 8);
    
    // 頻度順にソートし、それ以外を後ろに
    const otherKeys = Object.keys(allCats).filter(k => !frequent.includes(k));
    const sortedKeys = [...frequent, ...otherKeys];

    grid.innerHTML = sortedKeys.map(key => {
      const cat = allCats[key];
      const isFrequent = frequent.includes(key);
      return `
        <div class="category-item ${inputType === 'income' ? 'income-cat' : ''}" data-cat="${key}" onclick="App.selectCategory('${key}')">
          <span class="cat-icon">${cat.icon}</span>
          <span class="cat-name">${cat.name}</span>
          ${cat.parent ? `<span class="cat-parent">${cat.parent}</span>` : ''}
          ${isFrequent ? '<span class="frequent-badge">よく使う</span>' : ''}
        </div>
      `;
    }).join('') + `
      <div class="category-item add-cat" onclick="App.openCustomCatModal()">
        <span class="cat-icon" style="font-size:20px; font-weight:bold; color:var(--primary);">＋</span>
        <span class="cat-name">追加</span>
      </div>
    `;
  }

  function renderQuickItems() {
    const container = document.getElementById('quick-items');
    const history = DB.getHistory(); // 全履歴からフィルタ
    const filtered = history.filter(h => h.type === inputType);

    if (history.length === 0) {
      container.innerHTML = '<span style="font-size:12px;color:var(--text-muted);">入力すると履歴が表示されます</span>';
      return;
    }

    container.innerHTML = filtered.slice(0, 8).map((h, i) => {
      const allCats = inputType === 'expense' ? DB.getAllExpenseCategories() : DB.getAllIncomeCategories();
      const cat = allCats[h.category];
      const icon = cat?.icon || '📌';
      const name = cat?.name || h.category;
      return `
        <button class="quick-item" onclick="App.quickInput(${i})">
          <span>${icon}</span>
          <div style="display:flex; flex-direction:column; align-items:flex-start;">
            <span class="qi-name" style="font-size:10px; opacity:0.8;">${name}</span>
            <span class="qi-amount">${formatMoney(h.amount)}</span>
          </div>
        </button>`;
    }).join('');
  }

  function selectCategory(catKey) {
    selectedCategory = catKey;
    const allCats = inputType === 'expense' ? DB.getAllExpenseCategories() : DB.getAllIncomeCategories();
    const cat = allCats[catKey];
    
    editingId = null;
    document.getElementById('modal-title-text').textContent = '記録する';
    document.getElementById('modal-category-chip').textContent = `${cat?.icon || ''} ${cat?.name || ''}`;
    document.getElementById('modal-category-chip').style.background = `${cat?.color || '#C0C0C0'}20`;
    document.getElementById('modal-category-chip').style.color = cat?.color || '#C0C0C0';
    
    document.getElementById('amount-value').textContent = '0';
    document.getElementById('memo-input').value = '';
    document.getElementById('date-input').value = DB.today();
    document.getElementById('btn-delete-tx').style.display = 'none';
    document.getElementById('amount-modal').classList.add('show');
    document.body.classList.add('modal-open');
  }

  function openEditModal(txId) {
    const all = DB.getTransactions();
    const tx = all.find(t => t.id === txId);
    if (!tx) return;

    editingId = txId;
    inputType = tx.type;
    selectedCategory = tx.category;

    const allCats = tx.type === 'expense' ? DB.getAllExpenseCategories() : DB.getAllIncomeCategories();
    const cat = allCats[tx.category];

    document.getElementById('modal-title-text').textContent = '修正・編集';
    document.getElementById('modal-category-chip').textContent = `${cat?.icon || ''} ${cat?.name || tx.category}`;
    document.getElementById('modal-category-chip').style.background = `${cat?.color || '#C0C0C0'}20`;
    document.getElementById('modal-category-chip').style.color = cat?.color || '#C0C0C0';
    document.getElementById('amount-value').textContent = tx.amount.toLocaleString();
    document.getElementById('memo-input').value = tx.memo || '';
    document.getElementById('date-input').value = tx.date;
    document.getElementById('btn-delete-tx').style.display = 'block';

    document.getElementById('amount-modal').classList.add('show');
    document.body.classList.add('modal-open');
  }

  function quickInput(index) {
    const history = DB.getHistory();
    const filtered = history.filter(h => h.type === inputType);
    const h = filtered[index];
    if (!h) return;
    selectedCategory = h.category;
    const allCats = inputType === 'expense' ? DB.getAllExpenseCategories() : DB.getAllIncomeCategories();
    const cat = allCats[h.category];
    document.getElementById('modal-category').textContent = `${cat?.icon || ''} ${cat?.name || ''}`;
    document.getElementById('amount-value').textContent = h.amount.toLocaleString();
    document.getElementById('memo-input').value = h.memo || '';
    document.getElementById('date-input').value = DB.today();
    document.getElementById('amount-modal').classList.add('show');
    document.body.classList.add('modal-open');
  }

  function handleNumpad(num) {
    const el = document.getElementById('amount-value');
    let val = el.textContent.replace(/,/g, '');
    if (num === 'del') {
      val = val.slice(0, -1) || '0';
    } else if (num === 'clr') {
      val = '0';
    } else {
      if (val === '0') val = '';
      val += num;
      if (val.length > 9) return;
    }
    el.textContent = parseInt(val || '0').toLocaleString();
  }

  function handleSjNumpad(num) {
    const el = document.getElementById('sj-amount-value');
    let val = el.textContent.replace(/,/g, '');
    if (num === 'del') {
      val = val.slice(0, -1) || '0';
    } else if (num === 'clr') {
      val = '0';
    } else {
      if (val === '0') val = '';
      val += num;
      if (val.length > 9) return;
    }
    el.textContent = parseInt(val || '0').toLocaleString();
  }

  function saveTransaction() {
    const amount = parseInt(document.getElementById('amount-value').textContent.replace(/,/g, ''));
    if (!amount || amount <= 0) return;

    const tx = {
      date: document.getElementById('date-input').value || DB.today(),
      type: inputType,
      category: selectedCategory,
      amount: amount,
      memo: document.getElementById('memo-input').value.trim(),
    };

    if (editingId) {
      DB.updateTransaction(editingId, tx);
      showToastMessage('✅', '記録を修正しました');
    } else {
      DB.addTransaction(tx);
      showPositiveToast();
    }
    
    closeAmountModal();
    renderAll();
    renderInput();

    // 目標進捗チェック（達成時にトースト）
    const goal = DB.getGoalProgress(currentMonth);
    if (goal && goal.isSuccess && goal.current === goal.limit) {
      setTimeout(showGoalSuccessToast, 1500);
    }

    // 予算警告チェック
    if (inputType === 'expense') {
      const remaining = DB.getRemainingBudget(DB.monthKey(new Date(tx.date)), selectedCategory);
      if (remaining !== null && remaining < 0) {
        setTimeout(() => {
          showToastMessage('⚠️', '予算をオーバーしました💦');
        }, 2000);
      } else if (remaining !== null && remaining >= 0 && remaining < 1000) {
        setTimeout(() => {
          showToastMessage('💪', 'あと少しで予算内！がんばれ！');
        }, 2000);
      }
    }
  }

  function closeAmountModal() {
    document.getElementById('amount-modal').classList.remove('show');
    document.body.classList.remove('modal-open');
    selectedCategory = null;
  }

  // ─── 副業画面 ───
  function renderSidejob() {
    const summary = DB.getSidejobSummary(currentMonth);
    document.getElementById('sj-income').textContent = formatMoney(summary.income);
    document.getElementById('sj-investment').textContent = formatMoney(summary.invest);
    document.getElementById('sj-profit').textContent = formatMoney(summary.profit);

    // 利益率
    const sjProfitEl = document.getElementById('sj-profit');
    if (summary.income > 0) {
      const margin = ((summary.profit / summary.income) * 100).toFixed(1);
      sjProfitEl.nextElementSibling ? null : sjProfitEl.insertAdjacentHTML('afterend', `<span class="sj-margin">利益率 ${margin}%</span>`);
    }

    // カテゴリ別内訳
    const breakdown = DB.getSidejobByCategory(currentMonth);
    const container = document.getElementById('sj-breakdown');
    const allCats = { ...DB.SIDEJOB_INCOME_CATS, ...DB.SIDEJOB_INVEST_CATS };
    const entries = Object.entries(breakdown).filter(([, v]) => v > 0);

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-message">
          <span class="empty-icon">💼</span>
          まだデータがありません
        </div>`;
    } else {
      container.innerHTML = entries.map(([key, amount]) => {
        const cat = allCats[key];
        return `
          <div class="sj-breakdown-item">
            <span class="sj-breakdown-name">${cat?.icon || '📌'} ${cat?.name || key}</span>
            <span class="sj-breakdown-amount">${formatMoney(amount)}</span>
          </div>`;
      }).join('');
    }

    // 副業履歴
    const items = DB.getMonthSidejobs(currentMonth).slice(-20).reverse();
    const histContainer = document.getElementById('sj-history');

    if (items.length === 0) {
      histContainer.innerHTML = `
        <div class="empty-message">
          <span class="empty-icon">📝</span>
          まだ記録がありません
        </div>`;
    } else {
      histContainer.innerHTML = items.map(s => {
        const cat = allCats[s.category];
        const isIncome = s.type === 'sj_income';
        return `
          <div class="recent-item" data-id="${s.id}">
            <div class="recent-icon">${cat?.icon || '📌'}</div>
            <div class="recent-info">
              <div class="recent-name">${cat?.name || s.category}</div>
              <div class="recent-meta">${formatDate(s.date)}${s.memo ? ' · ' + s.memo : ''} · ${isIncome ? '収入' : '投資'}</div>
            </div>
            <div class="recent-amount ${isIncome ? 'income' : 'expense'}">${isIncome ? '+' : '-'}${formatMoney(s.amount)}</div>
            <button class="recent-delete" onclick="App.confirmDeleteSj('${s.id}')">✕</button>
          </div>`;
      }).join('');
    }
  }

  function openSjInput(type) {
    sjInputType = type;
    sjSelectedCategory = null;
    document.getElementById('sj-modal-title').textContent = type === 'sj_income' ? '💰 副業収入' : '📚 自己投資';
    document.getElementById('sj-amount-value').textContent = '0';
    document.getElementById('sj-memo-input').value = '';
    document.getElementById('sj-date-input').value = DB.today();

    const cats = type === 'sj_income' ? DB.SIDEJOB_INCOME_CATS : DB.SIDEJOB_INVEST_CATS;
    const container = document.getElementById('sj-category-select');
    container.innerHTML = Object.entries(cats).map(([key, cat]) =>
      `<button class="sj-cat-btn" data-cat="${key}" onclick="App.selectSjCategory('${key}')">${cat.icon} ${cat.name}</button>`
    ).join('');

    document.getElementById('sj-amount-modal').classList.add('show');
  }

  function selectSjCategory(key) {
    sjSelectedCategory = key;
    document.querySelectorAll('.sj-cat-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.sj-cat-btn[data-cat="${key}"]`)?.classList.add('active');
  }

  function saveSidejob() {
    const amount = parseInt(document.getElementById('sj-amount-value').textContent.replace(/,/g, ''));
    if (!amount || amount <= 0 || !sjSelectedCategory) return;

    DB.addSidejob({
      date: document.getElementById('sj-date-input').value || DB.today(),
      type: sjInputType,
      category: sjSelectedCategory,
      amount: amount,
      memo: document.getElementById('sj-memo-input').value.trim(),
    });

    document.getElementById('sj-amount-modal').classList.remove('show');
    showPositiveToast();
    renderSidejob();
  }

  // ─── カレンダー ───
  function renderCalendar() {
    const parts = currentMonth.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = DB.today();

    const grid = document.getElementById('calendar-grid');
    let html = '';

    // 空セル
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="cal-cell empty"></div>';
    }

    // 日セル
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      const total = DB.getDayTotal(dateStr);
      const isToday = dateStr === todayStr;
      const dayClass = dayOfWeek === 0 ? 'sun' : dayOfWeek === 6 ? 'sat' : '';

      html += `
        <div class="cal-cell ${dayClass} ${isToday ? 'today' : ''}" onclick="App.selectDay('${dateStr}')">
          <span class="cal-day">${d}</span>
          ${total > 0 ? `<span class="cal-amount">-${(total / 1000).toFixed(total >= 1000 ? 1 : 0)}${total >= 1000 ? 'k' : ''}</span>` : '<span class="cal-amount">&nbsp;</span>'}
        </div>`;
    }

    grid.innerHTML = html;

    // 選択中の日を維持
    selectDay(selectedDay);
  }

  function selectDay(dateStr) {
    document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
    const cells = document.querySelectorAll('.cal-cell');
    const parts = dateStr.split('-');
    const day = parseInt(parts[2]);
    const firstDay = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1).getDay();
    const idx = firstDay + day - 1;
    if (cells[idx]) cells[idx].classList.add('selected');

    document.getElementById('day-detail-date').textContent = formatDate(dateStr);
    const txs = DB.getDayTransactions(dateStr);
    const total = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    document.getElementById('day-detail-total').textContent = total > 0 ? `-${formatMoney(total)}` : '¥0';

    const list = document.getElementById('day-detail-list');
    if (txs.length === 0) {
      list.innerHTML = '<div class="empty-message">この日の記録はありません</div>';
    } else {
      list.innerHTML = txs.map(t => {
        const categories = t.type === 'expense' ? DB.getAllExpenseCategories() : DB.getAllIncomeCategories();
        const cat = categories[t.category];
        return `
          <div class="recent-item" onclick="App.openEditModal('${t.id}')">
            <div class="recent-icon" style="background:${cat?.color || 'var(--bg)'}20; color:${cat?.color || 'var(--text)'}">${cat?.icon || '📌'}</div>
            <div class="recent-info">
              <div class="recent-name">${cat?.name || t.category}</div>
              ${t.memo ? `<div class="recent-meta">${t.memo}</div>` : ''}
            </div>
            <div class="recent-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</div>
          </div>`;
      }).join('');
    }
  }

  // ─── グラフ ───
  function renderCharts() {
    renderPieChart();
    renderBarChart();
    renderAnalysis();
  }

  function switchChartTab(tab) {
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.chart-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.chart-tab[data-chart="${tab}"]`)?.classList.add('active');
    document.getElementById(`chart-${tab}-panel`)?.classList.add('active');
  }

  function renderPieChart() {
    const data = DB.getCategoryBreakdown(currentMonth);
    const canvas = document.getElementById('pie-chart');
    const ctx = canvas.getContext('2d');
    const total = data.reduce((s, d) => s + d.amount, 0);

    if (pieChart) pieChart.destroy();

    if (total === 0) {
      const legend = document.getElementById('pie-legend');
      legend.innerHTML = '<div class="empty-message"><span class="empty-icon">📊</span>データがありません</div>';
      pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['データなし'], datasets: [{ data: [1], backgroundColor: ['#F0E0E4'] }] },
        options: { plugins: { legend: { display: false } }, cutout: '65%' },
      });
      return;
    }

    pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          data: data.map(d => d.amount),
          backgroundColor: data.map(d => d.color),
          borderWidth: 2,
          borderColor: '#FFF',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ¥${ctx.parsed.toLocaleString()} (${((ctx.parsed / total) * 100).toFixed(1)}%)`,
            },
          },
        },
      },
    });

    const legend = document.getElementById('pie-legend');
    legend.innerHTML = data.map(d => `
      <div class="legend-item" onclick="App.showCategoryDetail('${d.key}')">
        <div class="legend-color" style="background:${d.color}"></div>
        <span class="legend-name">${d.icon} ${d.name}</span>
        <span class="legend-amount">${formatMoney(d.amount)}</span>
        <span class="legend-percent">${((d.amount / total) * 100).toFixed(1)}%</span>
      </div>
    `).join('');
  }

  function showCategoryDetail(catKey) {
    switchScreen('all-history');
    renderHistoryList(catKey);
  }

  function setHistoryViewMode(mode) {
    historyViewMode = mode;
    historyWeekOffset = 0;
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-period-${mode}`)?.classList.add('active');
    renderHistoryList();
  }

  function changeHistoryPeriod(delta) {
    if (historyViewMode === 'month') {
      const parts = currentMonth.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1 + delta, 1);
      currentMonth = DB.monthKey(d);
    } else {
      historyWeekOffset += delta;
    }
    renderHistoryList();
  }

  function getWeekRange(offset = 0) {
    const now = new Date();
    const day = now.getDay() || 7; // Monday = 1, Sunday = 7
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1 + offset * 7);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { monday, sunday };
  }

  function renderHistoryList(filterCat = null) {
    const container = document.getElementById('all-history-list');
    const display = document.getElementById('history-period-display');
    
    let txs = [];
    if (historyViewMode === 'month') {
      const [y, m] = currentMonth.split('-');
      display.textContent = `${y}年${parseInt(m)}月`;
      txs = DB.getMonthTransactions(currentMonth);
    } else {
      const { monday, sunday } = getWeekRange(historyWeekOffset);
      const startStr = `${monday.getMonth() + 1}/${monday.getDate()}`;
      const endStr = `${sunday.getMonth() + 1}/${sunday.getDate()}`;
      display.textContent = `${startStr} 〜 ${endStr}`;
      
      const all = DB.getTransactions();
      txs = all.filter(t => {
        const d = new Date(t.date);
        return d >= monday && d <= sunday;
      });
    }

    if (filterCat) {
      txs = txs.filter(t => t.category === filterCat);
    }
    
    // 日付順
    txs.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (txs.length === 0) {
      container.innerHTML = '<div class="empty-message">この期間の記録はありません</div>';
      return;
    }

    container.innerHTML = txs.map(t => {
      const cats = t.type === 'expense' ? DB.getAllExpenseCategories() : DB.getAllIncomeCategories();
      const cat = cats[t.category];
      return `
        <div class="recent-item" onclick="App.openEditModal('${t.id}')">
          <div class="recent-icon" style="background:${cat?.color || 'var(--bg)'}20; color:${cat?.color || 'var(--text)'}">${cat?.icon || '📌'}</div>
          <div class="recent-info">
            <div class="recent-name">${cat?.name || t.category}</div>
            <div class="recent-meta">${t.date} ${t.memo ? `· ${t.memo}` : ''}</div>
          </div>
          <div class="recent-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</div>
        </div>`;
    }).join('');
  }

  function renderBarChart() {
    const data = DB.getMonthlyTotals(6);
    const canvas = document.getElementById('bar-chart');
    const ctx = canvas.getContext('2d');

    if (barChart) barChart.destroy();

    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: '収入',
            data: data.map(d => d.income),
            backgroundColor: 'rgba(126, 200, 176, 0.7)',
            borderColor: '#7EC8B0',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: '支出',
            data: data.map(d => d.expense),
            backgroundColor: 'rgba(248, 164, 184, 0.7)',
            borderColor: '#F8A4B8',
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => `¥${(v / 1000).toFixed(0)}k`,
              font: { family: "'M PLUS Rounded 1c'" },
            },
            grid: { color: 'rgba(0,0,0,0.04)' },
          },
          x: {
            ticks: { font: { family: "'M PLUS Rounded 1c'" } },
            grid: { display: false },
          },
        },
        plugins: {
          legend: {
            labels: { font: { family: "'M PLUS Rounded 1c'", weight: 'bold' } },
          },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ¥${ctx.parsed.y.toLocaleString()}` },
          },
        },
      },
    });
  }

  function renderAnalysis() {
    const container = document.getElementById('analysis-cards');

    const ranking = DB.getCategoryRanking(currentMonth);
    const eatingOut = DB.getCategoryTotal(currentMonth, 'food_eating');
    const grocery = DB.getCategoryTotal(currentMonth, 'food_grocery');
    const childDaily = DB.getCategoryTotal(currentMonth, 'daily_child');
    const eduSchool = DB.getCategoryTotal(currentMonth, 'edu_school');
    const eduLesson = DB.getCategoryTotal(currentMonth, 'edu_lesson');
    const childTotal = childDaily + eduSchool + eduLesson;
    const funFamily = DB.getCategoryTotal(currentMonth, 'fun_family');
    const funPersonal = DB.getCategoryTotal(currentMonth, 'fun_personal');
    const beautySalon = DB.getCategoryTotal(currentMonth, 'beauty_salon');
    const beautyHome = DB.getCategoryTotal(currentMonth, 'beauty_home');

    // 節約成功率
    const successRate = DB.getSavingsSuccessRate(currentMonth);
    const successRateHtml = successRate !== null ? `
      <div class="analysis-card highlight">
        <div class="analysis-title">🏆 今月の節約成功率</div>
        <div class="analysis-value">${successRate.toFixed(1)}%</div>
        <div class="analysis-footer">目標まであと一歩！</div>
      </div>` : '';

    // ランキング
    const rankingHtml = ranking.length > 0 ? `
      <div class="analysis-card">
        <div class="analysis-title">🚩 支出ランキング（TOP3）</div>
        <div class="ranking-list">
          ${ranking.map((r, i) => `
            <div class="ranking-item">
              <span class="rank-num">${i + 1}</span>
              <span class="rank-cat">${r.icon} ${r.name}</span>
              <span class="rank-amount">${formatMoney(r.amount)}</span>
            </div>
          `).join('')}
        </div>
        <div class="ranking-advice">
          ${ranking[0].name}が今月一番多い支出です。
        </div>
      </div>` : '';

    container.innerHTML = `
      ${successRateHtml}
      ${rankingHtml}

      <div class="analysis-card">
        <div class="analysis-title">🍽️ 食費の節約状況</div>
        <div class="analysis-value">${formatMoney(eatingOut + grocery)}</div>
        <div class="analysis-compare">
          <div class="compare-item">
            <span class="compare-label">食材費</span>
            <span class="compare-value">${formatMoney(grocery)}</span>
          </div>
          <div class="compare-item">
            <span class="compare-label">外食費</span>
            <span class="compare-value">${formatMoney(eatingOut)}</span>
          </div>
        </div>
      </div>

      <div class="analysis-card">
        <div class="analysis-title">👶 子供費（今月合計）</div>
        <div class="analysis-value">${formatMoney(childTotal)}</div>
        <div class="analysis-compare">
          <div class="compare-item">
            <span class="compare-label">日用品等</span>
            <span class="compare-value">${formatMoney(childDaily)}</span>
          </div>
          <div class="compare-item">
            <span class="compare-label">教育・習い事</span>
            <span class="compare-value">${formatMoney(eduSchool + eduLesson)}</span>
          </div>
        </div>
      </div>

      <div class="analysis-card">
        <div class="analysis-title">🎮 娯楽費の比較</div>
        <div class="analysis-value">${formatMoney(funFamily + funPersonal)}</div>
        <div class="analysis-compare">
          <div class="compare-item">
            <span class="compare-label">家族</span>
            <span class="compare-value">${formatMoney(funFamily)}</span>
          </div>
          <div class="compare-item">
            <span class="compare-label">個人</span>
            <span class="compare-value">${formatMoney(funPersonal)}</span>
          </div>
        </div>
      </div>

      <div class="analysis-card">
        <div class="analysis-title">💄 美容費の比較</div>
        <div class="analysis-value">${formatMoney(beautySalon + beautyHome)}</div>
        <div class="analysis-compare">
          <div class="compare-item">
            <span class="compare-label">サロン</span>
            <span class="compare-value">${formatMoney(beautySalon)}</span>
          </div>
          <div class="compare-item">
            <span class="compare-label">セルフ</span>
            <span class="compare-value">${formatMoney(beautyHome)}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ─── 設定画面 ───
  function renderSettings() {
    const container = document.getElementById('budget-settings');
    const budgets = DB.getBudgets(currentMonth);

    const allCats = DB.getAllExpenseCategories();
    container.innerHTML = Object.entries(allCats).map(([key, cat]) => `
      <div class="budget-setting-item ${cat.isCustom ? 'custom' : ''}">
        <span class="budget-setting-icon">${cat.icon}</span>
        <span class="budget-setting-name">${cat.name}</span>
        <div style="flex:1; display:flex; gap:10px; align-items:center; justify-content:flex-end;">
          <input type="number" class="budget-setting-input" data-cat="${key}"
                 value="${budgets[key] || ''}" placeholder="¥0"
                 inputmode="numeric" onchange="App.onBudgetChange('${key}', this.value)">
          ${cat.isCustom ? `<button class="delete-custom-btn" onclick="App.confirmDeleteCustomCat('${key}')">🗑️</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  function onBudgetChange(catKey, value) {
    const amount = parseInt(value) || 0;
    DB.saveBudget(currentMonth, catKey, amount);
  }

  function exportCSV() {
    const csv = DB.exportCSV(currentMonth);
    downloadFile(csv, `kakeibo_${currentMonth}.csv`, 'text/csv');
  }

  function backupData() {
    const data = DB.exportAll();
    downloadFile(JSON.stringify(data, null, 2), `kakeibo_backup_${DB.today()}.json`, 'application/json');
    showToastMessage('💾', 'バックアップを保存しました！');
  }

  function restoreData() {
    document.getElementById('restore-file').click();
  }

  function handleRestore(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        DB.importAll(data);
        showToastMessage('✅', 'データを復元しました！');
        switchScreen(currentScreen);
      } catch {
        showToastMessage('❌', 'ファイルが正しくありません');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function resetData() {
    showConfirm('すべてのデータを削除しますか？\nこの操作は取り消せません。', () => {
      DB.resetAll();
      showToastMessage('🗑️', 'データをリセットしました');
      switchScreen(currentScreen);
    });
  }

  // ─── 削除 ───
  function confirmDeleteTx(id) {
    showConfirm('この記録を削除しますか？', () => {
      DB.deleteTransaction(id);
      renderHome();
    });
  }

  function confirmDeleteSj(id) {
    showConfirm('この記録を削除しますか？', () => {
      DB.deleteSidejob(id);
      renderSidejob();
    });
  }

  // ─── ユーティリティ ───
  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function showPositiveToast() {
    const msg = DB.getRandomPositive();
    showToastMessage(msg.emoji, msg.msg);
  }

  function showToastMessage(emoji, message) {
    const toast = document.getElementById('positive-toast');
    document.querySelector('.toast-emoji').textContent = emoji;
    document.getElementById('toast-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }

  let confirmCallback = null;

  function showConfirm(message, callback) {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-dialog').classList.add('show');
    confirmCallback = callback;
  }

  // ─── イベントバインド ───
  function bindEvents() {
    // ボトムナビ
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        if (screen === 'home' && currentMode === 'sidejob') {
          switchScreen('sidejob');
        } else {
          switchScreen(screen);
        }
      });
    });

    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.tab));
    });

    // 月ナビ
    document.getElementById('month-prev').addEventListener('click', () => changeMonth(-1));
    document.getElementById('month-next').addEventListener('click', () => changeMonth(1));

    // 入力タイプ切り替え
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => setInputType(btn.dataset.type));
    });

    // テンキー
    document.querySelectorAll('#amount-modal .num-btn').forEach(btn => {
      btn.addEventListener('click', () => handleNumpad(btn.dataset.num));
    });

    // 金額モーダル
    document.getElementById('modal-close').addEventListener('click', closeAmountModal);
    document.getElementById('modal-done').addEventListener('click', saveTransaction);

    // 副業ボタン
    document.getElementById('sj-add-income').addEventListener('click', () => openSjInput('sj_income'));
    document.getElementById('sj-add-invest').addEventListener('click', () => openSjInput('sj_invest'));

    // 副業テンキー
    document.querySelectorAll('#sj-numpad .num-btn').forEach(btn => {
      btn.addEventListener('click', () => handleSjNumpad(btn.dataset.num));
    });

    // 副業モーダル
    document.getElementById('sj-modal-close').addEventListener('click', () => {
      document.getElementById('sj-amount-modal').classList.remove('show');
    });
    document.getElementById('sj-modal-done').addEventListener('click', saveSidejob);

    // グラフタブ
    document.querySelectorAll('.chart-tab').forEach(btn => {
      btn.addEventListener('click', () => switchChartTab(btn.dataset.chart));
    });

    // 設定ボタン
    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-backup').addEventListener('click', backupData);
    document.getElementById('btn-restore').addEventListener('click', restoreData);
    document.getElementById('restore-file').addEventListener('change', handleRestore);
    document.getElementById('btn-reset').addEventListener('click', resetData);

    // 確認ダイアログ
    document.getElementById('confirm-cancel').addEventListener('click', () => {
      document.getElementById('confirm-dialog').classList.remove('show');
      confirmCallback = null;
    });
    document.getElementById('confirm-ok').addEventListener('click', () => {
      document.getElementById('confirm-dialog').classList.remove('show');
      if (confirmCallback) confirmCallback();
      confirmCallback = null;
    });

    // モードスイッチ
    document.getElementById('mode-switch')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn');
      if (btn) switchMode(btn.dataset.mode);
    });
  }

  // ─── 固定費管理 ───
  function renderFixedList() {
    const list = DB.getFixedCosts();
    const container = document.getElementById('fixed-list');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = '<div class="empty-message">登録された固定費はありません</div>';
      return;
    }

    container.innerHTML = list.map((f, i) => {
      const allCats = DB.getAllExpenseCategories();
      const cat = allCats[f.category] || { icon: '📌', name: f.category };
      return `
        <div class="fixed-item ${!f.active ? 'inactive' : ''}">
          <div class="recent-icon" style="background:${cat.color}20; color:${cat.color}">${cat.icon}</div>
          <div class="fixed-info">
            <span class="fixed-name">${f.memo || cat.name}</span>
            <span class="fixed-meta">毎月 ${f.day}日反映</span>
          </div>
          <div class="fixed-amount">${formatMoney(f.amount)}</div>
          <div class="toggle-switch ${f.active ? 'active' : ''}" onclick="App.toggleFixedActive(${i})">
            <div class="toggle-knob"></div>
          </div>
          <button class="recent-delete" style="position:static;opacity:1;margin-left:8px;" onclick="App.deleteFixed(${i})">✕</button>
        </div>
      `;
    }).join('');
  }

  function openFixedModal() {
    document.getElementById('fixed-modal').classList.add('show');
    document.getElementById('fixed-amount').value = '';
    document.getElementById('fixed-memo').value = '';
    document.getElementById('fixed-day').value = '1';
  }

  function closeFixedModal() {
    document.getElementById('fixed-modal').classList.remove('show');
  }

  function saveFixed() {
    const amount = parseInt(document.getElementById('fixed-amount').value);
    const category = document.getElementById('fixed-cat').value;
    const day = parseInt(document.getElementById('fixed-day').value);
    const memo = document.getElementById('fixed-memo').value;

    if (!amount) return;

    const list = DB.getFixedCosts();
    list.push({ amount, category, day, memo, active: true });
    DB.saveFixedCosts(list);
    closeFixedModal();
    renderFixedList();
  }

  function deleteFixed(index) {
    showConfirm('この固定費テンプレートを削除しますか？', () => {
      const list = DB.getFixedCosts();
      list.splice(index, 1);
      DB.saveFixedCosts(list);
      renderFixedList();
    });
  }

  function toggleFixedActive(index) {
    const list = DB.getFixedCosts();
    list[index].active = !list[index].active;
    DB.saveFixedCosts(list);
    renderFixedList();
  }

  // ─── 習慣化ロジック ───
  function toggleDailyCheck() {
    const today = DB.today();
    const current = DB.getDailyCheck(today);
    DB.setDailyCheck(today, !current);
    
    if (!current) {
      showReward();
    }
    
    renderHome();
  }

  function showReward() {
    const streak = DB.getStreak();
    if (streak.count === 3 || streak.count === 7 || streak.count === 30) {
      showToastMessage('🎖️', `${streak.count}日連続達成！素晴らしいです✨`);
      confettiEffect();
    } else {
      showToastMessage('✅', '記録完了！明日も頑張りましょう♪');
    }
  }

  function confettiEffect() {
    const app = document.getElementById('app');
    for (let i = 0; i < 20; i++) {
      const dot = document.createElement('div');
      dot.style.position = 'fixed';
      dot.style.left = Math.random() * 100 + 'vw';
      dot.style.top = '-10px';
      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 70%)`;
      dot.style.borderRadius = '50%';
      dot.style.zIndex = '2000';
      dot.style.pointerEvents = 'none';
      app.appendChild(dot);

      const anim = dot.animate([
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
        { transform: `translateY(100vh) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], {
        duration: 1000 + Math.random() * 2000,
        easing: 'cubic-bezier(0,0,0.2,1)'
      });
      anim.onfinish = () => dot.remove();
    }
  }

  // ─── カスタムカテゴリ ───
  function openCustomCatModal() {
    document.getElementById('cc-name').value = '';
    document.getElementById('cc-icon').value = '📌';
    document.getElementById('custom-cat-modal').classList.add('show');
  }

  function closeCustomCatModal() {
    document.getElementById('custom-cat-modal').classList.remove('show');
  }

  function saveCustomCategory() {
    const name = document.getElementById('cc-name').value.trim();
    const icon = document.getElementById('cc-icon').value.trim();
    if (!name || !icon) return;

    DB.addCustomCategory({
      name,
      icon,
      type: inputType,
      color: '#C0C0C0'
    });

    closeCustomCatModal();
    renderCategories();
    showToastMessage('✨', 'カスタムカテゴリを追加しました！');
  }

  function confirmDeleteCustomCat(id) {
    showConfirm('このカテゴリを削除しますか？\n登録済みの記録には影響しません。', () => {
      DB.deleteCustomCategory(id);
      renderCategories();
      renderSettings();
    });
  }

  function renderAll() {
    renderHome();
    renderSidejob();
    renderInput();
    renderCalendar();
    renderCharts();
    renderFixedList();
    if (currentScreen === 'all-history') renderHistoryList();
    checkReminder();
  }

  function confirmDeleteTx() {
    const idToDelete = editingId;
    if (!idToDelete) return;

    showConfirm('この記録を削除しますか？', () => {
      DB.deleteTransaction(idToDelete);
      closeAmountModal();
      renderAll();
      showToastMessage('🗑️', '記録を削除しました');
    });
  }

  return {
    init,
    switchScreen,
    switchMode,
    setInputType,
    selectCategory,
    handleNumpad,
    handleSjNumpad,
    saveTransaction,
    closeAmountModal,
    openSjInput,
    selectSjCategory,
    saveSidejob,
    selectDay,
    changeMonth,
    switchChartTab,
    openGoalModal,
    resetGoal,
    confirmDeleteTx,
    confirmDeleteSj,
    renderFixedList,
    openFixedModal,
    closeFixedModal,
    saveFixed,
    deleteFixed,
    toggleFixedActive,
    toggleDailyCheck,
    quickInput,
    openCustomCatModal,
    closeCustomCatModal,
    saveCustomCategory,
    confirmDeleteCustomCat,
    openEditModal,
    showCategoryDetail,
    setHistoryViewMode,
    changeHistoryPeriod,
    confirmDeleteTx,
  };
})();

// アプリ起動
document.addEventListener('DOMContentLoaded', () => App.init());
