/* ===================================
   かけいぼ - データ管理層 (data.js)
   =================================== */

const DB = (() => {
  // ─── カテゴリ定義 ───
  const EXPENSE_CATEGORIES = {
    food_grocery:   { name: '食材',           parent: '食費',   icon: '🥬', color: '#7EC8B0' },
    food_eating:    { name: '外食',           parent: '食費',   icon: '🍽️', color: '#5DAF96' },
    daily_child:    { name: '子供用',         parent: '日用品', icon: '👶', color: '#FFB8C9' },
    daily_life:     { name: '生活用',         parent: '日用品', icon: '🧴', color: '#F8A4B8' },
    edu_school:     { name: '幼稚園・保育園', parent: '教育費', icon: '🏫', color: '#A0D2F0' },
    edu_lesson:     { name: '習い事',         parent: '教育費', icon: '🎹', color: '#7BB8DF' },
    fun_family:     { name: '家族娯楽',       parent: '娯楽費', icon: '👨‍👩‍👧', color: '#FFD4A0' },
    fun_personal:   { name: '個人娯楽',       parent: '娯楽費', icon: '🎮', color: '#FFC080' },
    beauty_salon:   { name: 'サロン',         parent: '美容費', icon: '💇', color: '#C9B8E8' },
    beauty_home:    { name: 'ホームケア',     parent: '美容費', icon: '💄', color: '#B0A0D8' },
    fixed_rent:     { name: '家賃',           parent: '固定費', icon: '🏠', color: '#8E8E8E' },
    fixed_utility:  { name: '光熱費',         parent: '固定費', icon: '💡', color: '#A0A0A0' },
    fixed_comm:     { name: '通信費',         parent: '固定費', icon: '📱', color: '#B0B0B0' },
    medical:        { name: '医療費',         parent: null,     icon: '🏥', color: '#FF9B9B' },
    sudden:         { name: '突発費',         parent: null,     icon: '⚡', color: '#FFB347' },
    other_expense:  { name: 'その他',         parent: null,     icon: '📌', color: '#C0C0C0' },
  };

  const INCOME_CATEGORIES = {
    salary:       { name: '給与',       icon: '💰', color: '#7EC8B0' },
    sidejob:      { name: '副業収入',   icon: '💻', color: '#A0D2F0' },
    other_income: { name: 'その他収入', icon: '🎁', color: '#FFD4A0' },
  };

  const SIDEJOB_INCOME_CATS = {
    sns:        { name: 'SNS',            icon: '📱' },
    affiliate:  { name: 'アフィリエイト', icon: '🔗' },
    writing:    { name: 'ライティング',   icon: '✍️' },
    design:     { name: 'デザイン',       icon: '🎨' },
    consulting: { name: 'コンサル',       icon: '💡' },
    sj_other:   { name: 'その他',        icon: '📌' },
  };

  const SIDEJOB_INVEST_CATS = {
    study:    { name: '教材費',   icon: '📚' },
    tools:    { name: 'ツール代', icon: '🔧' },
    ads:      { name: '広告費',   icon: '📢' },
    inv_other:{ name: 'その他',   icon: '📌' },
  };

  const POSITIVE_MESSAGES = [
    { emoji: '✨', msg: '記録できてえらい！' },
    { emoji: '🌸', msg: 'すごい！今日も続けてるね！' },
    { emoji: '💪', msg: 'がんばってる！えらい！' },
    { emoji: '🎉', msg: 'ナイス記録！' },
    { emoji: '🌟', msg: 'コツコツ最高！' },
    { emoji: '💐', msg: '今日もおつかれさま！' },
    { emoji: '🍀', msg: '節約上手！' },
    { emoji: '👏', msg: 'すばらしい！' },
  ];

  // ─── ストレージ操作 ───
  const KEY_TX = 'kakeibo_transactions';
  const KEY_BUDGET = 'kakeibo_budgets';
  const KEY_SJ = 'kakeibo_sidejobs';
  const KEY_STREAK = 'kakeibo_streak';
  const KEY_HISTORY = 'kakeibo_history';
  const KEY_GOAL = 'kakeibo_goal';
  const KEY_FIXED = 'kakeibo_fixed_costs';
  const KEY_CHECKS = 'kakeibo_daily_checks';
  const KEY_FIXED_APPLIED = 'kakeibo_fixed_applied_months';

  function load(key, fallback) {
    try {
      const d = localStorage.getItem(key);
      return d ? JSON.parse(d) : fallback;
    } catch { return fallback; }
  }

  function save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      // IndexedDB バックアップ
      backupToIDB(key, data);
    } catch (e) {
      console.warn('Save error:', e);
    }
  }

  // ─── IndexedDB バックアップ ───
  let idb = null;

  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('kakeibo_backup', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data');
        }
      };
      req.onsuccess = (e) => { idb = e.target.result; resolve(idb); };
      req.onerror = () => resolve(null);
    });
  }

  async function backupToIDB(key, data) {
    try {
      if (!idb) await openIDB();
      if (!idb) return;
      const tx = idb.transaction('data', 'readwrite');
      tx.objectStore('data').put(data, key);
    } catch {}
  }

  async function restoreFromIDB(key) {
    try {
      if (!idb) await openIDB();
      if (!idb) return null;
      return new Promise((resolve) => {
        const tx = idb.transaction('data', 'readonly');
        const req = tx.objectStore('data').get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch { return null; }
  }

  // 起動時にlocalStorageが空ならIndexedDBから復元
  async function init() {
    await openIDB();
    const keys = [KEY_TX, KEY_BUDGET, KEY_SJ, KEY_STREAK, KEY_HISTORY, KEY_GOAL, KEY_FIXED, KEY_CHECKS, KEY_FIXED_APPLIED];
    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        const idbData = await restoreFromIDB(key);
        if (idbData) {
          localStorage.setItem(key, JSON.stringify(idbData));
        }
      }
    }
  }

  function getActiveMode() {
    return localStorage.getItem('kakeibo_current_mode') || 'family';
  }

  function setActiveMode(mode) {
    localStorage.setItem('kakeibo_current_mode', mode);
  }

  // ─── UUID生成 ───
  function uuid() {
    return 'xxxx-xxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
  }

  // ─── 月キー ───
  function monthKey(date) {
    const d = date ? new Date(date) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ─── 取引CRUD ───
  function getTransactions() {
    return load(KEY_TX, []);
  }

  function getMonthTransactions(month, mode = null) {
    const txs = getTransactions().filter(t => t.date.startsWith(month));
    if (mode) return txs.filter(t => t.mode === mode);
    return txs;
  }

  function addTransaction(tx) {
    const all = getTransactions();
    tx.id = uuid();
    tx.createdAt = Date.now();
    tx.mode = tx.mode || getActiveMode();
    tx.isFixed = !!tx.isFixed;
    all.push(tx);
    save(KEY_TX, all);
    if (tx.type === 'expense' && !tx.isFixed) {
      addToHistory(tx);
    }
    updateStreak();
    setDailyCheck(tx.date, true);
    return tx;
  }

  function deleteTransaction(id) {
    let all = getTransactions();
    all = all.filter(t => t.id !== id);
    save(KEY_TX, all);
  }

  function getMonthExpenses(month, mode = null) {
    return getMonthTransactions(month, mode).filter(t => t.type === 'expense');
  }

  function getMonthIncomes(month, mode = null) {
    return getMonthTransactions(month, mode).filter(t => t.type === 'income');
  }

  function getTotalExpense(month, mode = null) {
    return getMonthExpenses(month, mode).reduce((s, t) => s + t.amount, 0);
  }

  function getTotalIncome(month, mode = null) {
    return getMonthIncomes(month, mode).reduce((s, t) => s + t.amount, 0);
  }

  function getCategoryTotal(month, catKey) {
    return getMonthExpenses(month)
      .filter(t => t.category === catKey)
      .reduce((s, t) => s + t.amount, 0);
  }

  function getParentCategoryTotal(month, parentName) {
    return getMonthExpenses(month)
      .filter(t => {
        const cat = EXPENSE_CATEGORIES[t.category];
        return cat && cat.parent === parentName;
      })
      .reduce((s, t) => s + t.amount, 0);
  }

  function getDayTransactions(dateStr) {
    return getTransactions().filter(t => t.date === dateStr);
  }

  function getDayTotal(dateStr) {
    return getDayTransactions(dateStr)
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
  }

  // ─── 予算 ───
  function getBudgets(month) {
    const all = load(KEY_BUDGET, {});
    return all[month] || {};
  }

  function saveBudget(month, catKey, amount) {
    const all = load(KEY_BUDGET, {});
    if (!all[month]) all[month] = {};
    all[month][catKey] = amount;
    save(KEY_BUDGET, all);
  }

  function saveBudgets(month, budgets) {
    const all = load(KEY_BUDGET, {});
    all[month] = budgets;
    save(KEY_BUDGET, all);
  }

  function getRemainingBudget(month, catKey) {
    const budget = getBudgets(month)[catKey];
    if (!budget) return null;
    const spent = getCategoryTotal(month, catKey);
    return budget - spent;
  }

  function getTotalBudget(month) {
    const budgets = getBudgets(month);
    return Object.values(budgets).reduce((s, v) => s + v, 0);
  }

  // ─── 副業 ───
  function getSidejobs() {
    return load(KEY_SJ, []);
  }

  function getMonthSidejobs(month) {
    return getSidejobs().filter(s => s.date.startsWith(month));
  }

  function addSidejob(sj) {
    const all = getSidejobs();
    sj.id = uuid();
    sj.createdAt = Date.now();
    all.push(sj);
    save(KEY_SJ, all);
    updateStreak();
    return sj;
  }

  function deleteSidejob(id) {
    let all = getSidejobs();
    all = all.filter(s => s.id !== id);
    save(KEY_SJ, all);
  }

  function getSidejobSummary(month) {
    const items = getMonthSidejobs(month);
    const income = items.filter(s => s.type === 'sj_income').reduce((s, i) => s + i.amount, 0);
    const invest = items.filter(s => s.type === 'sj_invest').reduce((s, i) => s + i.amount, 0);
    const profit = income - invest;
    const margin = income > 0 ? (profit / income) * 100 : 0;
    return { income, invest, profit, margin };
  }

  function getSidejobByCategory(month) {
    const items = getMonthSidejobs(month);
    const result = {};
    items.forEach(item => {
      if (!result[item.category]) result[item.category] = 0;
      result[item.category] += item.amount;
    });
    return result;
  }

  // ─── 連続記録 ───
  function getStreak() {
    return load(KEY_STREAK, { count: 0, lastDate: null });
  }

  function updateStreak() {
    const streak = getStreak();
    const td = today();
    if (streak.lastDate === td) return streak;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (streak.lastDate === yd) {
      streak.count += 1;
    } else if (streak.lastDate !== td) {
      streak.count = 1;
    }
    streak.lastDate = td;
    save(KEY_STREAK, streak);
    return streak;
  }

  // ─── 履歴（クイック入力用） ───
  function getHistory() {
    return load(KEY_HISTORY, []);
  }

  function addToHistory(tx) {
    let hist = getHistory();
    // 重複除去（同じカテゴリ+金額）
    hist = hist.filter(h => !(h.category === tx.category && h.amount === tx.amount));
    hist.unshift({ category: tx.category, amount: tx.amount, type: tx.type, memo: tx.memo });
    hist = hist.slice(0, 10); // 最新10件
    save(KEY_HISTORY, hist);
  }

  // ─── エクスポート/インポート ───
  function exportAll() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions: getTransactions(),
      budgets: load(KEY_BUDGET, {}),
      sidejobs: getSidejobs(),
      streak: getStreak(),
      history: getHistory(),
    };
  }

  function importAll(data) {
    if (!data || data.version !== 1) throw new Error('Invalid data');
    save(KEY_TX, data.transactions || []);
    save(KEY_BUDGET, data.budgets || {});
    save(KEY_SJ, data.sidejobs || []);
    save(KEY_STREAK, data.streak || { count: 0, lastDate: null });
    save(KEY_HISTORY, data.history || []);
  }

  function exportCSV(month) {
    const txs = getMonthTransactions(month);
    const sjs = getMonthSidejobs(month);
    let csv = '\uFEFF日付,種別,カテゴリ,金額,メモ\n';
    txs.forEach(t => {
      const catName = (EXPENSE_CATEGORIES[t.category] || INCOME_CATEGORIES[t.category] || {}).name || t.category;
      const typeName = t.type === 'expense' ? '支出' : '収入';
      csv += `${t.date},${typeName},${catName},${t.amount},${(t.memo || '').replace(/,/g, '，')}\n`;
    });
    sjs.forEach(s => {
      const catName = (SIDEJOB_INCOME_CATS[s.category] || SIDEJOB_INVEST_CATS[s.category] || {}).name || s.category;
      const typeName = s.type === 'sj_income' ? '副業収入' : '副業投資';
      csv += `${s.date},${typeName},${catName},${s.amount},${(s.memo || '').replace(/,/g, '，')}\n`;
    });
    return csv;
  }

  function resetAll() {
    [KEY_TX, KEY_BUDGET, KEY_SJ, KEY_STREAK, KEY_HISTORY].forEach(k => localStorage.removeItem(k));
  }

  function getRandomPositive() {
    return POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)];
  }

  // ─── 月別データ（棒グラフ用） ───
  function getMonthlyTotals(count) {
    const result = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = monthKey(d);
      result.push({
        month: m,
        label: `${d.getMonth() + 1}月`,
        expense: getTotalExpense(m),
        income: getTotalIncome(m),
      });
    }
    return result;
  }

  // ─── カテゴリ別集計（円グラフ用） ───
  function getCategoryBreakdown(month) {
    const expenses = getMonthExpenses(month);
    const breakdown = {};
    expenses.forEach(t => {
      if (!breakdown[t.category]) breakdown[t.category] = 0;
      breakdown[t.category] += t.amount;
    });
    return Object.entries(breakdown)
      .map(([key, amount]) => ({
        key,
        name: (EXPENSE_CATEGORIES[key] || {}).name || key,
        icon: (EXPENSE_CATEGORIES[key] || {}).icon || '📌',
        color: (EXPENSE_CATEGORIES[key] || {}).color || '#C0C0C0',
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // ─── 新規分析ロジック ───
  function getPrevMonthKey(month) {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    return monthKey(date);
  }

  function getMonthlyComparison(month, mode = null) {
    const current = getTotalExpense(month, mode);
    const prevKey = getPrevMonthKey(month);
    const prev = getTotalExpense(prevKey, mode);
    const diff = current - prev;
    const hasPrev = getMonthTransactions(prevKey, mode).length > 0;
    return { current, prev, diff, hasPrev };
  }

  function getCategoryRanking(month) {
    return getCategoryBreakdown(month).slice(0, 3);
  }

  function getSavingsSuccessRate(month, mode = 'family') {
    const actual = getTotalExpense(month, mode);
    const budget = getTotalBudget(month);
    if (budget === 0) return null;
    return Math.max(0, Math.min(100, (1 - actual / budget) * 100));
  }

  // 予算日数計算ベースの成功率
  function getSavingsSuccessRateDays(month) {
    const transactions = getMonthExpenses(month).filter(t => t.mode === 'family');
    const monthlyBudget = getTotalBudget(month);
    if (monthlyBudget === 0) return null;

    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(year, m, 0).getDate();
    const dailyLimit = monthlyBudget / lastDay;

    // 日ごとの合計を集計
    const dailyTotals = {};
    transactions.forEach(t => {
      dailyTotals[t.date] = (dailyTotals[t.date] || 0) + t.amount;
    });

    let successDays = 0;
    const todayStr = today();
    const currentMaxDay = month === monthKey() ? new Date().getDate() : lastDay;

    for (let d = 1; d <= currentMaxDay; d++) {
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const total = dailyTotals[dateStr] || 0;
      if (total <= dailyLimit) successDays++;
    }

    return {
      percent: Math.round((successDays / currentMaxDay) * 100),
      successDays,
      totalDays: currentMaxDay
    };
  }

  // 固定費管理
  function getFixedCosts() {
    return load(KEY_FIXED, []);
  }

  function saveFixedCosts(list) {
    save(KEY_FIXED, list);
  }

  function applyMonthlyFixedCosts(month) {
    const applied = load(KEY_FIXED_APPLIED, []);
    if (applied.includes(month)) return;

    const templates = getFixedCosts().filter(f => f.active);
    if (templates.length === 0) return;

    const [year, m] = month.split('-').map(Number);
    templates.forEach(f => {
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(f.day || 1).padStart(2, '0')}`;
      addTransaction({
        type: 'expense',
        amount: f.amount,
        category: f.category,
        date: dateStr,
        isFixed: true,
        mode: 'family',
        memo: f.memo || '固定費自動反映'
      });
    });

    applied.push(month);
    save(KEY_FIXED_APPLIED, applied);
  }

  function getFixedCostRatio(month) {
    const totalExp = getTotalExpense(month, 'family');
    const fixedExp = getMonthExpenses(month, 'family').filter(t => t.isFixed).reduce((s, t) => s + t.amount, 0);
    const income = getTotalIncome(month, 'family');
    
    return {
      ratio: income > 0 ? (fixedExp / income) * 100 : 0,
      fixedTotal: fixedExp
    };
  }

  // デイリーチェック
  function getDailyCheck(dateStr) {
    const checks = load(KEY_CHECKS, {});
    return !!checks[dateStr];
  }

  function setDailyCheck(dateStr, value) {
    const checks = load(KEY_CHECKS, {});
    checks[dateStr] = value;
    save(KEY_CHECKS, checks);
  }

  function getActionProposal(month) {
    const ranking = getCategoryRanking(month);
    if (ranking.length === 0) return null;

    const top = ranking[0];
    const proposals = {
      food_grocery: { issue: '食料品代が多いかも', action: '週末のまとめ買い＆作り置きで支出を抑えましょう♪' },
      food_eating: { issue: '外食が少し続いています', action: '今週はあと1回だけ自炊に変えてみませんか？' },
      daily_child: { issue: '子供費がかさんでいます', action: 'おむつ等はポイント還元が高い日にまとめ買いが◎' },
      daily_life: { issue: '日用品が増えています', action: '特売日のチェックや、ストックの確認をしてみましょう。' },
      fun_family: { issue: 'レジャー費が多めです', action: '次の週末はお弁当を持って無料の公園へGO！🍀' },
      fun_personal: { issue: '自分の趣味を楽しみましたね', action: '来週は無料の読書や散歩でリフレッシュもおすすめ。' },
      beauty_salon: { issue: '美容代が今月のトップです', action: '自宅で贅沢に時間をかけるホームケアを楽しみましょう。' },
      beauty_home: { issue: '美容グッズが充実しています', action: '今あるアイテムを使い切ってから次を買うように意識♪' },
    };

    return proposals[top.key] || { issue: '支出が増えています', action: 'まずは「本当に必要かな？」と自分に問いかけてみて。' };
  }

  function getGoal() {
    return load(KEY_GOAL, null);
  }

  function saveGoal(goal) {
    save(KEY_GOAL, goal);
  }

  function getGoalProgress(month) {
    const goal = getGoal();
    if (!goal) return null;

    let current = 0;
    if (goal.type === 'category_count') {
      current = getMonthTransactions(month).filter(t => t.category === goal.category).length;
    } else if (goal.type === 'category_amount') {
      current = getCategoryTotal(month, goal.category);
    } else if (goal.type === 'total_amount') {
      current = getTotalExpense(month);
    }

    const isSuccess = current <= goal.limit;
    return { ...goal, current, isSuccess };
  }

  function getAdvice(comp, successRate) {
    if (!comp.hasPrev && successRate === null) {
      return { emoji: '✨', text: '家計簿スタートおめでとう！まずは記録から始めよう♪' };
    }

    if (successRate !== null && successRate < 10) {
      return { emoji: '💦', text: '今月は少し使いすぎかも。後半はのんびり過ごしましょう。' };
    }

    if (comp.hasPrev) {
      if (comp.diff < -5000) {
        return { emoji: '✨', text: '先月より節約できています！このままの調子でいきましょう♪' };
      } else if (comp.diff > 5000) {
        return { emoji: '🌸', text: '今月は先月より活動的ですね！計画的に使えていればOKです。' };
      }
    }

    if (successRate !== null && successRate > 30) {
      return { emoji: '👏', text: '素晴らしい節約ペースです！自分へのご褒美も忘れずに♪' };
    }

    // サブスクチェック
    const fixedExpenses = getMonthExpenses(month, 'family').filter(t => t.isFixed);
    if (fixedExpenses.length > 5) {
      return { emoji: '🧐', text: '固定費が少し多めかも。使っていないサブスクはありませんか？' };
    }

    return { emoji: '👍', text: 'いいペースです。この調子で毎日コツコツ記録しましょう！' };
  }

  return {
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    SIDEJOB_INCOME_CATS,
    SIDEJOB_INVEST_CATS,
    init,
    monthKey,
    today,
    getTransactions,
    getMonthTransactions,
    addTransaction,
    deleteTransaction,
    getMonthExpenses,
    getMonthIncomes,
    getTotalExpense,
    getTotalIncome,
    getCategoryTotal,
    getParentCategoryTotal,
    getDayTransactions,
    getDayTotal,
    getBudgets,
    saveBudget,
    saveBudgets,
    getRemainingBudget,
    getTotalBudget,
    getSidejobs,
    getMonthSidejobs,
    addSidejob,
    deleteSidejob,
    getSidejobSummary,
    getSidejobByCategory,
    getStreak,
    updateStreak,
    getHistory,
    exportAll,
    importAll,
    exportCSV,
    resetAll,
    getRandomPositive,
    getMonthlyTotals,
    getCategoryBreakdown,
    getPrevMonthKey,
    getMonthlyComparison,
    getCategoryRanking,
    getSavingsSuccessRate,
    getSavingsSuccessRateDays,
    getAdvice,
    getActionProposal,
    getGoal,
    saveGoal,
    getGoalProgress,
    getActiveMode,
    setActiveMode,
    getFixedCosts,
    saveFixedCosts,
    applyMonthlyFixedCosts,
    getFixedCostRatio,
    getDailyCheck,
    setDailyCheck,
  };
})();
