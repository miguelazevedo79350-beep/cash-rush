(() => {
  const SAVE_KEY = "cash-rush-v2";
  const cfg = window.CASH_RUSH_MONETIZATION;

  const upgradesDef = [
    { id: "stand", name: "Stand de rue", desc: "Première caisse qui tourne seule.", baseCost: 15, baseIncome: 0.5, unlockAt: 0 },
    { id: "delivery", name: "Livreur scooter", desc: "Plus de clients, plus vite.", baseCost: 100, baseIncome: 4, unlockAt: 40 },
    { id: "shop", name: "Boutique locale", desc: "Un vrai local, un vrai flux.", baseCost: 750, baseIncome: 22, unlockAt: 250 },
    { id: "franchise", name: "Franchise", desc: "Plusieurs points de vente.", baseCost: 5000, baseIncome: 120, unlockAt: 2000 },
    { id: "factory", name: "Usine", desc: "Production à grande échelle.", baseCost: 35000, baseIncome: 700, unlockAt: 15000 },
    { id: "empire", name: "Empire digital", desc: "L'argent travaille pendant que tu dors.", baseCost: 250000, baseIncome: 4500, unlockAt: 100000 },
  ];

  const state = {
    money: 0,
    clickPower: 1,
    owned: Object.fromEntries(upgradesDef.map((u) => [u.id, 0])),
    totalEarned: 0,
    ownedSkins: ["classic"],
    activeSkin: "classic",
    creatorEur: 0,
    boostUntil: 0,
    adCooldownUntil: 0,
    bank: 0,
    bankWithdrawnTotal: 0,
    bankLog: [],
  };

  const els = {
    balance: document.getElementById("balance"),
    income: document.getElementById("income"),
    clickPower: document.getElementById("clickPower"),
    cashBtn: document.getElementById("cashBtn"),
    upgrades: document.getElementById("upgrades"),
    skins: document.getElementById("skins"),
    floatLayer: document.getElementById("floatLayer"),
    resetBtn: document.getElementById("resetBtn"),
    hint: document.getElementById("hint"),
    hero: document.querySelector(".hero-stage"),
    adBoostBtn: document.getElementById("adBoostBtn"),
    boostPill: document.getElementById("boostPill"),
    adModal: document.getElementById("adModal"),
    adTimer: document.getElementById("adTimer"),
    adProgressBar: document.getElementById("adProgressBar"),
    adSkipBtn: document.getElementById("adSkipBtn"),
    adStats: document.getElementById("adStats"),
    demoNote: document.getElementById("demoNote"),
    bankBalance: document.getElementById("bankBalance"),
    bankTotal: document.getElementById("bankTotal"),
    bankLog: document.getElementById("bankLog"),
    withdrawAmount: document.getElementById("withdrawAmount"),
    withdrawBtn: document.getElementById("withdrawBtn"),
    withdrawAllBtn: document.getElementById("withdrawAllBtn"),
    depositBtn: document.getElementById("depositBtn"),
    ballField: document.getElementById("ballField"),
  };

  let adWatchTimer = null;
  const balls = [];
  let ballSpawnAcc = 0;

  const BALL_TYPES = [
    { kind: "gold", mult: 3, weight: 55 },
    { kind: "mint", mult: 6, weight: 30 },
    { kind: "ruby", mult: 12, weight: 15 },
  ];

  function pickBallType() {
    const total = BALL_TYPES.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * total;
    for (const type of BALL_TYPES) {
      roll -= type.weight;
      if (roll <= 0) return type;
    }
    return BALL_TYPES[0];
  }

  function ballReward(type) {
    const base = Math.max(1, clickPower());
    return Math.max(1, Math.floor(base * type.mult * (0.8 + Math.random() * 0.5)));
  }

  function spawnBall() {
    if (!els.ballField || balls.length >= 14) return;
    const type = pickBallType();
    const size = 28 + Math.random() * 22;
    const el = document.createElement("button");
    el.type = "button";
    el.className = `fall-ball fall-ball--${type.kind}`;
    el.setAttribute("aria-label", "Attraper une boule");
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = "0px";
    el.style.top = "0px";

    const fieldW = els.ballField.clientWidth || window.innerWidth;
    const ball = {
      el,
      type,
      x: (0.08 + Math.random() * 0.84) * fieldW,
      y: -size - 10,
      vy: 90 + Math.random() * 140,
      vx: (Math.random() - 0.5) * 40,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 180,
      size,
      alive: true,
    };

    el.style.transform = `translate(${ball.x}px, ${ball.y}px) rotate(${ball.rot}deg)`;
    els.ballField.appendChild(el);

    el.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      catchBall(ball, event.clientX, event.clientY);
    });

    balls.push(ball);
  }

  function removeBall(ball) {
    ball.alive = false;
    ball.el.remove();
    const idx = balls.indexOf(ball);
    if (idx >= 0) balls.splice(idx, 1);
  }

  function catchBall(ball, x, y) {
    if (!ball.alive) return;
    const gain = ballReward(ball.type);
    addMoney(gain);
    spawnFloater(x, y, `+$${Math.floor(gain)}`);
    ball.el.classList.add("is-pop");
    setTimeout(() => removeBall(ball), 120);
    els.balance.textContent = formatMoney(state.money);
    els.clickPower.textContent = `+$${Math.floor(clickPower()).toLocaleString("fr-FR")}`;
    save();
  }

  function updateBalls(dt) {
    const fieldH = els.ballField.clientHeight || window.innerHeight;
    const fieldW = els.ballField.clientWidth || window.innerWidth;

    ballSpawnAcc += dt;
    const spawnEvery = Math.max(0.35, 1.1 - Math.min(0.6, incomePerSecond() / 2000));
    while (ballSpawnAcc >= spawnEvery) {
      ballSpawnAcc -= spawnEvery;
      spawnBall();
    }

    for (let i = balls.length - 1; i >= 0; i -= 1) {
      const ball = balls[i];
      if (!ball.alive) continue;
      ball.vy += 120 * dt;
      ball.y += ball.vy * dt;
      ball.x += ball.vx * dt;
      ball.rot += ball.vr * dt;

      if (ball.x < 0) {
        ball.x = 0;
        ball.vx *= -0.6;
      } else if (ball.x > fieldW - ball.size) {
        ball.x = fieldW - ball.size;
        ball.vx *= -0.6;
      }

      ball.el.style.transform = `translate(${ball.x}px, ${ball.y}px) rotate(${ball.rot}deg)`;

      if (ball.y > fieldH + 40) removeBall(ball);
    }
  }

  function formatMoney(value) {
    const n = Math.floor(value);
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toLocaleString("fr-FR")}`;
  }

  function formatRate(value) {
    if (value >= 1000) return `${formatMoney(value)} / sec`;
    if (value >= 10) return `$${value.toFixed(1)} / sec`;
    return `$${value.toFixed(2)} / sec`;
  }

  function formatEur(value) {
    return `${value.toFixed(2).replace(".", ",")} €`;
  }

  function costOf(upgrade) {
    const owned = state.owned[upgrade.id] || 0;
    return Math.floor(upgrade.baseCost * Math.pow(1.15, owned));
  }

  function incomePerSecond() {
    return upgradesDef.reduce((sum, u) => sum + (state.owned[u.id] || 0) * u.baseIncome, 0);
  }

  function boostActive() {
    return Date.now() < state.boostUntil;
  }

  function boostMultiplier() {
    return boostActive() ? cfg.rewardedBoost.multiplier : 1;
  }

  function clickPower() {
    const passive = incomePerSecond();
    const base = 1 + Math.floor(Math.sqrt(passive) * 0.8) + Math.floor(state.totalEarned / 5000);
    return base * boostMultiplier();
  }

  function save() {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        money: state.money,
        owned: state.owned,
        totalEarned: state.totalEarned,
        ownedSkins: state.ownedSkins,
        activeSkin: state.activeSkin,
        creatorEur: state.creatorEur,
        boostUntil: state.boostUntil,
        adCooldownUntil: state.adCooldownUntil,
        bank: state.bank,
        bankWithdrawnTotal: state.bankWithdrawnTotal,
        bankLog: state.bankLog,
        savedAt: Date.now(),
      })
    );
  }

  function load() {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem("cash-rush-v1");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      state.money = Number(data.money) || 0;
      state.totalEarned = Number(data.totalEarned) || 0;
      state.owned = { ...state.owned, ...(data.owned || {}) };
      state.ownedSkins = Array.isArray(data.ownedSkins) ? data.ownedSkins : ["classic"];
      state.activeSkin = data.activeSkin || "classic";
      state.creatorEur = Number(data.creatorEur) || 0;
      state.boostUntil = Number(data.boostUntil) || 0;
      state.adCooldownUntil = Number(data.adCooldownUntil) || 0;
      state.bank = Number(data.bank) || 0;
      state.bankWithdrawnTotal = Number(data.bankWithdrawnTotal) || 0;
      state.bankLog = Array.isArray(data.bankLog) ? data.bankLog.slice(0, 8) : [];

      const elapsed = Math.min(60 * 60 * 8, Math.max(0, (Date.now() - (data.savedAt || Date.now())) / 1000));
      const offline = incomePerSecond() * elapsed * 0.5;
      if (offline > 0) {
        state.money += offline;
        state.totalEarned += offline;
        els.hint.textContent = `Retour ! +${formatMoney(offline)} hors ligne`;
      }
    } catch {
      /* ignore */
    }
  }

  function pushBankLog(message) {
    state.bankLog.unshift({
      t: Date.now(),
      message,
    });
    state.bankLog = state.bankLog.slice(0, 8);
  }

  function renderBank() {
    els.bankBalance.textContent = formatMoney(state.bank);
    els.bankTotal.textContent = formatMoney(state.bankWithdrawnTotal);
    els.withdrawBtn.disabled = state.money < 1;
    els.withdrawAllBtn.disabled = state.money < 1;
    els.depositBtn.disabled = state.bank < 1;

    if (!state.bankLog.length) {
      els.bankLog.innerHTML = `<li>Aucun retrait pour l’instant — gagne puis clique <strong>Retirer</strong>.</li>`;
      return;
    }

    els.bankLog.innerHTML = state.bankLog
      .map((entry) => {
        const when = new Date(entry.t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return `<li>${when} · ${entry.message}</li>`;
      })
      .join("");
  }

  function withdraw(amount) {
    const max = Math.floor(state.money);
    if (max < 1) {
      els.hint.textContent = "Pas assez de solde virtuel à retirer";
      return;
    }

    let value = Math.floor(Number(amount));
    if (!Number.isFinite(value) || value <= 0) value = max;
    value = Math.min(value, max);

    state.money -= value;
    state.bank += value;
    state.bankWithdrawnTotal += value;
    pushBankLog(`Retrait virtuel <strong>${formatMoney(value)}</strong> → banque`);
    els.hint.textContent = `${formatMoney(value)} envoyés à la banque virtuelle`;
    els.withdrawAmount.value = "";
    render();
    save();
  }

  function depositAll() {
    const value = Math.floor(state.bank);
    if (value < 1) return;
    state.bank -= value;
    state.money += value;
    pushBankLog(`Rapatriement <strong>${formatMoney(value)}</strong> → solde`);
    els.hint.textContent = `${formatMoney(value)} revenus sur le solde (toujours virtuel)`;
    render();
    save();
  }

  function spawnFloater(x, y, text) {
    const node = document.createElement("span");
    node.className = "floater";
    node.textContent = text;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    els.floatLayer.appendChild(node);
    setTimeout(() => node.remove(), 900);
  }

  function applySkin() {
    els.hero.dataset.skin = state.activeSkin;
    document.body.dataset.skin = state.activeSkin;
  }

  function recordCreatorRevenue(eur, reason) {
    state.creatorEur += eur;
    els.adStats.textContent = `Revenus créateur (démo) : ${formatEur(state.creatorEur)} · ${reason}`;
    save();
  }

  function renderUpgrades() {
    els.upgrades.innerHTML = upgradesDef
      .map((u) => {
        const owned = state.owned[u.id] || 0;
        const cost = costOf(u);
        const unlocked = state.totalEarned >= u.unlockAt;
        const canBuy = unlocked && state.money >= cost;
        return `
          <article class="upgrade ${unlocked ? "" : "locked"} ${canBuy ? "affordable" : ""}">
            <div class="upgrade-info">
              <h3>${u.name}</h3>
              <p>${unlocked ? u.desc : `Débloque à ${formatMoney(u.unlockAt)} gagnés`}</p>
              <div class="upgrade-meta">
                <span class="tag">x${owned}</span>
                <span class="tag mint">+$${u.baseIncome}/s</span>
                <span class="tag gold">${formatMoney(cost)}</span>
              </div>
            </div>
            <button class="buy-btn" type="button" data-buy="${u.id}" ${canBuy ? "" : "disabled"}>
              ${unlocked ? "Acheter" : "Verrouillé"}
            </button>
          </article>
        `;
      })
      .join("");
  }

  function renderSkins() {
    els.skins.innerHTML = cfg.skins
      .map((skin) => {
        const owned = state.ownedSkins.includes(skin.id);
        const active = state.activeSkin === skin.id;
        let actionLabel = "Équiper";
        let actionAttr = `data-equip="${skin.id}"`;
        let disabled = "";

        if (!owned) {
          if (skin.free) {
            actionLabel = "Gratuit";
            actionAttr = `data-equip="${skin.id}"`;
          } else if (cfg.DEMO_MODE || !skin.checkoutUrl) {
            actionLabel = `${skin.priceEur.toFixed(2).replace(".", ",")} € · Démo`;
            actionAttr = `data-buy-skin="${skin.id}"`;
          } else {
            actionLabel = `${skin.priceEur.toFixed(2).replace(".", ",")} €`;
            actionAttr = `data-checkout="${skin.id}"`;
          }
        } else if (active) {
          actionLabel = "Équipé";
          disabled = "disabled";
          actionAttr = "";
        }

        return `
          <article class="skin-card ${active ? "active" : ""}" data-skin-preview="${skin.id}">
            <div class="skin-swatch" data-skin="${skin.id}"></div>
            <div class="skin-info">
              <h3>${skin.name}</h3>
              <p>${skin.desc}</p>
              <div class="upgrade-meta">
                <span class="tag ${skin.free ? "mint" : "gold"}">${skin.free ? "Gratuit" : "Payant"}</span>
                ${owned ? '<span class="tag">Possédé</span>' : ""}
              </div>
            </div>
            <button class="buy-btn skin-btn" type="button" ${actionAttr} ${disabled}>${actionLabel}</button>
          </article>
        `;
      })
      .join("");
  }

  function renderBoostUi() {
    const now = Date.now();
    if (boostActive()) {
      const left = Math.ceil((state.boostUntil - now) / 1000);
      els.boostPill.classList.remove("hidden");
      els.boostPill.textContent = `Boost x${cfg.rewardedBoost.multiplier} · ${left}s`;
      els.adBoostBtn.disabled = true;
      els.adBoostBtn.textContent = `Boost ${left}s`;
    } else if (now < state.adCooldownUntil) {
      const left = Math.ceil((state.adCooldownUntil - now) / 1000);
      els.boostPill.classList.add("hidden");
      els.adBoostBtn.disabled = true;
      els.adBoostBtn.textContent = `Pub ${left}s`;
    } else {
      els.boostPill.classList.add("hidden");
      els.adBoostBtn.disabled = false;
      els.adBoostBtn.textContent = "Pub → x2";
    }
  }

  function render() {
    state.clickPower = clickPower();
    const income = incomePerSecond() * boostMultiplier();
    els.balance.textContent = formatMoney(state.money);
    els.income.textContent = formatRate(income);
    els.clickPower.textContent = `+$${Math.floor(state.clickPower).toLocaleString("fr-FR")}`;
    els.adStats.textContent = `Revenus créateur (démo) : ${formatEur(state.creatorEur)}`;
    els.demoNote.classList.toggle("hidden", !cfg.DEMO_MODE);
    applySkin();
    renderUpgrades();
    renderSkins();
    renderBoostUi();
    renderBank();
  }

  function addMoney(amount) {
    state.money += amount;
    state.totalEarned += amount;
    els.balance.classList.remove("pop");
    void els.balance.offsetWidth;
    els.balance.classList.add("pop");
  }

  function onCashClick(event) {
    const gain = clickPower();
    addMoney(gain);
    els.cashBtn.classList.add("is-hit");
    setTimeout(() => els.cashBtn.classList.remove("is-hit"), 120);
    const rect = els.cashBtn.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    spawnFloater(x, y, `+$${Math.floor(gain)}`);
    render();
    save();
  }

  function buyUpgrade(id) {
    const upgrade = upgradesDef.find((u) => u.id === id);
    if (!upgrade || state.totalEarned < upgrade.unlockAt) return;
    const cost = costOf(upgrade);
    if (state.money < cost) return;
    state.money -= cost;
    state.owned[id] = (state.owned[id] || 0) + 1;
    render();
    save();
  }

  function equipSkin(id) {
    if (!state.ownedSkins.includes(id)) return;
    state.activeSkin = id;
    render();
    save();
  }

  function unlockSkin(id, paidEur = 0) {
    if (!state.ownedSkins.includes(id)) state.ownedSkins.push(id);
    state.activeSkin = id;
    if (paidEur > 0) recordCreatorRevenue(paidEur, `skin ${id}`);
    els.hint.textContent = `Skin débloqué : ${id}`;
    render();
    save();
  }

  function buySkinDemo(id) {
    const skin = cfg.skins.find((s) => s.id === id);
    if (!skin || state.ownedSkins.includes(id)) return;
    if (!confirm(`Acheter « ${skin.name} » pour ${skin.priceEur.toFixed(2)} € ?\n\nMode démo : aucun vrai paiement.`)) return;
    unlockSkin(id, skin.priceEur);
  }

  function checkoutSkin(id) {
    const skin = cfg.skins.find((s) => s.id === id);
    if (!skin) return;
    if (skin.checkoutUrl) {
      window.open(skin.checkoutUrl, "_blank", "noopener");
      els.hint.textContent = "Paiement Stripe ouvert — après achat, débloque le skin côté serveur.";
      return;
    }
    buySkinDemo(id);
  }

  function closeAdModal() {
    els.adModal.classList.add("hidden");
    if (adWatchTimer) {
      clearInterval(adWatchTimer);
      adWatchTimer = null;
    }
    els.adProgressBar.style.width = "0%";
  }

  function grantBoost() {
    const now = Date.now();
    state.boostUntil = now + cfg.rewardedBoost.durationSec * 1000;
    state.adCooldownUntil = now + cfg.rewardedBoost.cooldownSec * 1000;
    if (cfg.DEMO_MODE) recordCreatorRevenue(cfg.demoAdEcpmEur, "pub récompensée");
    els.hint.textContent = `Boost x${cfg.rewardedBoost.multiplier} pendant ${cfg.rewardedBoost.durationSec}s`;
    closeAdModal();
    render();
    save();
  }

  function startRewardedAd() {
    if (boostActive() || Date.now() < state.adCooldownUntil) return;
    els.adModal.classList.remove("hidden");
    let left = cfg.rewardedBoost.watchSec;
    els.adTimer.textContent = String(left);
    els.adProgressBar.style.width = "0%";
    const total = cfg.rewardedBoost.watchSec;

    adWatchTimer = setInterval(() => {
      left -= 1;
      const done = ((total - left) / total) * 100;
      els.adProgressBar.style.width = `${done}%`;
      els.adTimer.textContent = String(Math.max(0, left));
      if (left <= 0) grantBoost();
    }, 1000);
  }

  // Banner impression (démo) toutes les ~45s si onglet visible
  setInterval(() => {
    if (!cfg.DEMO_MODE || document.hidden) return;
    recordCreatorRevenue(cfg.demoAdEcpmEur * 0.25, "bannière");
    renderBoostUi();
  }, 45000);

  els.cashBtn.addEventListener("click", onCashClick);
  els.upgrades.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-buy]");
    if (btn) buyUpgrade(btn.getAttribute("data-buy"));
  });
  els.skins.addEventListener("click", (e) => {
    const equip = e.target.closest("[data-equip]");
    const buy = e.target.closest("[data-buy-skin]");
    const checkout = e.target.closest("[data-checkout]");
    if (equip) equipSkin(equip.getAttribute("data-equip"));
    if (buy) buySkinDemo(buy.getAttribute("data-buy-skin"));
    if (checkout) checkoutSkin(checkout.getAttribute("data-checkout"));
  });
  els.adBoostBtn.addEventListener("click", startRewardedAd);
  els.adSkipBtn.addEventListener("click", closeAdModal);
  els.withdrawBtn.addEventListener("click", () => withdraw(els.withdrawAmount.value));
  els.withdrawAllBtn.addEventListener("click", () => withdraw(state.money));
  els.depositBtn.addEventListener("click", depositAll);
  els.withdrawAmount.addEventListener("keydown", (e) => {
    if (e.key === "Enter") withdraw(els.withdrawAmount.value);
  });

  els.resetBtn.addEventListener("click", () => {
    if (!confirm("Remettre la partie à zéro ? (skins, banque & revenus créateur gardés)")) return;
    state.money = 0;
    state.totalEarned = 0;
    state.owned = Object.fromEntries(upgradesDef.map((u) => [u.id, 0]));
    state.boostUntil = 0;
    state.adCooldownUntil = 0;
    els.hint.textContent = "Clique le bouton ou attrape les boules";
    render();
    save();
  });

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const income = incomePerSecond() * boostMultiplier();
    if (income > 0) {
      addMoney(income * dt);
      els.balance.textContent = formatMoney(state.money);
      els.income.textContent = formatRate(income);
    }
    updateBalls(dt);
    renderBoostUi();
    requestAnimationFrame(tick);
  }

  setInterval(() => {
    render();
    save();
  }, 1000);

  load();
  render();
  requestAnimationFrame(tick);
})();
