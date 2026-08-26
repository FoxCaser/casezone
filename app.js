/* =========================
   CASEZONE APP
========================= */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  document.querySelectorAll(selector);

let currentUser = null;
let cases = [];
let skins = [];
let activeCaseFilter = "all";
let selectedOpenQuantity = 1;



/* =========================
   API
========================= */

async function api(url, opts = {}) {

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...opts
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {

    const error = new Error(
      data.error || "Помилка сервера"
    );

    error.status = response.status;

    throw error;
  }

  return data;
}


/* =========================
   USER / BALANCE
========================= */

async function refresh() {

  try {

    const data =
      await api("/api/me");

    currentUser =
      data.user || null;

  } catch (e) {

    if (
      e.status === 401 ||
      e.status === 404
    ) {
      currentUser = null;
    } else {

      console.error(
        "User refresh error:",
        e
      );

      currentUser = null;
    }
  }


  const userLabel =
    $("#userLabel");

  const balance =
    $("#balance");

  const authBtn =
    $("#authBtn");

  const steamAvatar =
    $("#steamAvatar");

  const steamAvatarFallback =
    $("#steamAvatarFallback");


  if (userLabel) {

    userLabel.textContent =
      currentUser
        ? currentUser.username
        : "Гість";
  }


  if (balance) {

    balance.textContent =
      Number(
        currentUser?.balance || 0
      ).toFixed(2) + " Core Coins";
  }


  if (authBtn) {

    authBtn.textContent =
      currentUser
        ? "Вийти"
        : "Увійти";
  }


  if (
    steamAvatar &&
    steamAvatarFallback
  ) {

    const avatarUrl =
      currentUser?.avatar_url || "";

    if (avatarUrl) {

      steamAvatar.src =
        avatarUrl;

      steamAvatar.classList
        .remove("hidden");

      steamAvatarFallback.classList
        .add("hidden");

    } else {

      steamAvatar.removeAttribute(
        "src"
      );

      steamAvatar.classList
        .add("hidden");

      steamAvatarFallback.classList
        .remove("hidden");
    }
  }
}


/* =========================
   LOAD CASES
========================= */

async function loadCases() {

  cases =
    await api("/api/cases");

  skins =
    await api("/api/skins");

  renderCases();
  renderNewCases();
}


/* =========================
   CASE COLORS
========================= */

function getCaseTheme(index) {

  const themes = [
    {
      main: "#168cff",
      dark: "#073a70",
      glow: "rgba(22,140,255,.62)"
    },
    {
      main: "#8d3dff",
      dark: "#35106d",
      glow: "rgba(141,61,255,.62)"
    },
    {
      main: "#ff2fab",
      dark: "#761147",
      glow: "rgba(255,47,171,.62)"
    },
    {
      main: "#ff3b21",
      dark: "#72180e",
      glow: "rgba(255,59,33,.62)"
    },
    {
      main: "#ffd000",
      dark: "#806900",
      glow: "rgba(255,208,0,.65)"
    },
    {
      main: "#16c994",
      dark: "#075a43",
      glow: "rgba(22,201,148,.60)"
    }
  ];

  return themes[
    index % themes.length
  ];
}


/* =========================
   RENDER CASES
========================= */

/* =========================
   CASE ARTWORK
========================= */

function getCaseArtwork(c, index) {

  const name =
    String(c?.name || "")
      .trim()
      .toUpperCase();

  const byName = {
    "RED CASE": "/red-case.jpg",
    "EPIC CASE": "/epic-case.jpg",
    "LEGEND CASE": "/legend-case.jpg",
    "BRONZE CASE": "/bronze-case.jpg",
    "SILVER CASE": "/silver-case.jpg",
    "GOLD CASE": "/gold-case.jpg",
    "FIRE CASE": "/fire-case.jpg",
    "DRAGON CASE": "/dragon-case.jpg",
    "KNIFE CASE": "/knife-case.jpg",
    "PREMIUM CASE": "/premium-case.jpg",
    "BLACK MARKET": "/black-market.jpg",
    "ULTIMATE CASE": "/ultimate-case.jpg"
  };

  if (byName[name]) {
    return byName[name];
  }

  const fallback = [
    "/red-case.jpg",
    "/epic-case.jpg",
    "/legend-case.jpg",
    "/bronze-case.jpg",
    "/silver-case.jpg",
    "/gold-case.jpg",
    "/fire-case.jpg",
    "/dragon-case.jpg",
    "/knife-case.jpg",
    "/premium-case.jpg"
  ];

  return fallback[index % fallback.length];
}


/* =========================
   RENDER CASES
========================= */

function getCaseRareChance(caseData) {

  const items =
    Array.isArray(
      caseData?.items
    )
      ? caseData.items
      : [];

  const weights =
    items
      .map(
        item =>
          Number(item?.[2] || 0)
      )
      .filter(
        value =>
          Number.isFinite(value) &&
          value > 0
      );

  if (!weights.length) {
    return 0;
  }

  const total =
    weights.reduce(
      (sum,value) =>
        sum + value,
      0
    );

  const rare =
    Math.min(...weights);

  return total
    ? rare / total * 100
    : 0;
}


function renderCaseCard(
  caseData,
  index,
  options = {}
) {

  const theme =
    getCaseTheme(index);

  const artwork =
    getCaseArtwork(
      caseData,
      index
    );

  const itemCount =
    Array.isArray(
      caseData.items
    )
      ? caseData.items.length
      : 0;

  const rareChance =
    getCaseRareChance(
      caseData
    );

  const badge =
    options.badge || "";

  return `
    <article
      class="case-card cz-case-card-v4"
      data-case-id="${caseData.id}"
      style="
        --case-main:${theme.main};
        --case-dark:${theme.dark};
        --case-glow:${theme.glow};
      "
    >

      ${
        badge
          ? `
            <span class="cz-case-badge-v4">
              ${badge}
            </span>
          `
          : ""
      }

      <div class="cz-case-art-v4">

        <div class="cz-case-art-glow"></div>

        <img
          src="${artwork}"
          alt="${caseData.name}"
          loading="lazy"
          onerror="
            this.style.display='none';
          "
        >

      </div>

      <div class="cz-case-content-v4">

        <h3>
          ${caseData.name}
        </h3>

        <div class="cz-case-meta-v4">

          <span>
            ${itemCount} предметів
          </span>

          <span>
            Рідкісний:
            <b>
              ${rareChance.toFixed(2)}%
            </b>
          </span>

        </div>

        <strong class="cz-case-price-v4">
          ${Number(caseData.price).toFixed(2)} Core Coins
        </strong>

        <button
          type="button"
          class="cz-case-open-v4"
          onclick="
            showCaseDetails('${caseData.id}')
          "
        >
          ВІДКРИТИ
        </button>

      </div>

    </article>
  `;
}


function renderCases() {

  const container =
    $("#cases");

  if (!container) {
    return;
  }

  let filteredCases =
    [...cases];

  if (
    activeCaseFilter === "cheap"
  ) {

    filteredCases =
      cases.filter(
        c =>
          Number(c.price) <= 250
      );
  }

  if (
    activeCaseFilter === "premium"
  ) {

    filteredCases =
      cases.filter(
        c =>
          Number(c.price) > 250 &&
          Number(c.price) <= 2500
      );
  }

  if (
    activeCaseFilter === "expensive"
  ) {

    filteredCases =
      cases.filter(
        c =>
          Number(c.price) > 2500
      );
  }

  if (!filteredCases.length) {

    container.innerHTML = `
      <div class="cz-case-empty-v4">
        У цій категорії поки немає кейсів.
      </div>
    `;

    return;
  }

  /*
    Popular section intentionally stays compact.
    Existing filtering and opening logic are preserved.
  */
  container.innerHTML =
    filteredCases
      .slice(0, 8)
      .map(
        (caseData,index) =>
          renderCaseCard(
            caseData,
            index,
            {
              badge:
                index < 2
                  ? "HOT"
                  : ""
            }
          )
      )
      .join("");
}


function renderNewCases() {

  const container =
    $("#newCases");

  if (!container) {
    return;
  }

  const newest =
    [...cases]
      .slice(-8)
      .reverse();

  if (!newest.length) {

    container.innerHTML = `
      <div class="cz-case-empty-v4">
        Нових кейсів поки немає.
      </div>
    `;

    return;
  }

  container.innerHTML =
    newest
      .map(
        (caseData,index) =>
          renderCaseCard(
            caseData,
            Math.max(
              0,
              cases.indexOf(caseData)
            ),
            {
              badge:
                index < 2
                  ? "NEW"
                  : ""
            }
          )
      )
      .join("");
}


/* =========================
   FILTER CASES
========================= */

function filterCases(type) {

  activeCaseFilter = type;

  const buttons =
    [...$$(".filter")];

  buttons.forEach(
    button =>
      button.classList
        .remove("active")
  );


  const indexMap = {
    all: 0,
    cheap: 1,
    premium: 2,
    expensive: 3
  };

  buttons[
    indexMap[type] ?? 0
  ]?.classList.add(
    "active"
  );


  renderCases();
}
/* =========================
   CASE DETAILS / POSSIBLE DROPS
   Full-screen visual redesign.
   Opening/balance/server logic is unchanged.
========================= */

function getCaseOpeningStats(caseData) {

  const items =
    Array.isArray(caseData?.items)
      ? caseData.items
      : [];

  const validItems =
    items
      .map(item => ({
        item,
        weight:Number(item?.[2] || 0)
      }))
      .filter(
        entry =>
          Number.isFinite(entry.weight) &&
          entry.weight > 0
      );

  const totalWeight =
    validItems.reduce(
      (sum,entry) =>
        sum + entry.weight,
      0
    );

  if (!totalWeight) {
    return {
      knifeChance:0,
      secretChance:0
    };
  }

  const knifeChance =
    validItems
      .filter(({item}) => {

        const name =
          String(item?.[0] || "")
            .toLowerCase();

        return (
          name.includes("★") ||
          name.includes("knife") ||
          name.includes("karambit") ||
          name.includes("bayonet") ||
          name.includes("dagger") ||
          name.includes("talon") ||
          name.includes("stiletto") ||
          name.includes("ursus") ||
          name.includes("navaja") ||
          name.includes("falchion") ||
          name.includes("huntsman")
        );
      })
      .reduce(
        (sum,entry) =>
          sum + entry.weight,
        0
      ) /
      totalWeight *
      100;

  const secretChance =
    validItems
      .filter(({item}) => {

        const rarity =
          String(item?.[1] || "")
            .trim()
            .toLowerCase();

        return (
          rarity.includes("covert") ||
          rarity.includes("contraband") ||
          rarity.includes("rare") ||
          rarity.includes("extraordinary")
        );
      })
      .reduce(
        (sum,entry) =>
          sum + entry.weight,
        0
      ) /
      totalWeight *
      100;

  return {
    knifeChance,
    secretChance
  };
}


function formatCaseOpeningTitle(name) {

  const words =
    String(name || "CASE")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const first =
    words.shift() || "CASE";

  const rest =
    words.join(" ");

  return `
    <span>${first}</span>
    ${rest}
  `;
}


async function showCaseDetails(id) {

  const selectedCase =
    cases.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!selectedCase) {
    return;
  }

  selectedOpenQuantity = 1;

  const modal =
    $("#modal");

  const content =
    $("#modalContent");

  if (!modal || !content) {
    return;
  }

  const caseIndex =
    Math.max(
      0,
      cases.indexOf(selectedCase)
    );

  const fallbackArtwork =
    getCaseArtwork(
      selectedCase,
      caseIndex
    );

  const useApprovedRedArtwork =
    String(selectedCase.id) === "red";

  const heroArtwork =
    useApprovedRedArtwork
      ? "/casezone-red-open-hero.png"
      : fallbackArtwork;

  const stats =
    getCaseOpeningStats(
      selectedCase
    );

  const itemCount =
    Array.isArray(selectedCase.items)
      ? selectedCase.items.length
      : 0;

  modal.classList.remove("hidden");

  content.innerHTML = `
    <main class="cz-case-detail-page">

      <div class="cz-case-detail-noise"></div>
      <div class="cz-case-detail-orbit orbit-a"></div>
      <div class="cz-case-detail-orbit orbit-b"></div>

      <section class="cz-case-detail-inner">

        <div class="cz-case-detail-copy">

          <h1>
            ${formatCaseOpeningTitle(selectedCase.name)}
          </h1>

          <p>
            Відкрий кейс та отримай топові скіни CS2
          </p>

        </div>


        <div class="cz-case-about-wrap">

          <button
            type="button"
            class="cz-case-about-btn"
            onclick="
              document
                .getElementById('caseAboutPanel')
                ?.classList
                .toggle('hidden')
            "
          >
            <span>ⓘ</span>
            Про кейс
          </button>

          <div
            id="caseAboutPanel"
            class="cz-case-about-panel hidden"
          >
            <strong>
              ${selectedCase.name}
            </strong>

            <span>
              ${itemCount} можливих предметів
            </span>

            <span>
              Шанси рахуються з реальних ваг кейса на сервері.
            </span>
          </div>

        </div>


        <div class="cz-case-stage">

          <div class="cz-case-stage-grid"></div>
          <div class="cz-case-stage-glow"></div>

          <img
            class="
              cz-case-stage-art
              ${useApprovedRedArtwork ? "approved-red-art" : ""}
            "
            src="${heroArtwork}"
            alt="${selectedCase.name}"
            onerror="
              this.onerror=null;
              this.src='${fallbackArtwork}';
              this.classList.remove('approved-red-art');
            "
          >

        </div>


        <div class="cz-case-stat-row">

          <article class="cz-case-stat-card">
            <span class="cz-case-stat-icon">
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <ellipse cx="16" cy="8" rx="9" ry="4"></ellipse>
                <path d="M7 8v6c0 2.2 4 4 9 4s9-1.8 9-4V8"></path>
                <path d="M7 14v6c0 2.2 4 4 9 4s9-1.8 9-4v-6"></path>
              </svg>
            </span>

            <span class="cz-case-stat-value">
              ${Number(selectedCase.price).toFixed(0)}
              <small>Core Coins</small>
            </span>

            <span class="cz-case-stat-label">
              Ціна кейса
            </span>
          </article>


          <article class="cz-case-stat-card">
            <span class="cz-case-stat-icon">
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path d="M22 5c-5 4-9 9-12 15l4 2c4-4 7-8 10-13"></path>
                <path d="M8 21l-3 6 6-2"></path>
                <path d="M18 9l7 7"></path>
              </svg>
            </span>

            <span class="cz-case-stat-value">
              ${stats.knifeChance.toFixed(2)}%
            </span>

            <span class="cz-case-stat-label">
              Шанс ножа
            </span>
          </article>


          <article class="cz-case-stat-card">
            <span class="cz-case-stat-icon">
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="9"></circle>
                <circle cx="16" cy="16" r="3"></circle>
                <path d="M16 2v5M16 25v5M2 16h5M25 16h5"></path>
              </svg>
            </span>

            <span class="cz-case-stat-value">
              ${stats.secretChance.toFixed(2)}%
            </span>

            <span class="cz-case-stat-label">
              Шанс секрету
            </span>
          </article>

        </div>


        <div class="cz-case-qty-row">

          <span>
            Кількість
          </span>

          <div class="cz-case-qty-buttons">

            ${[1,2,3,4,5].map(q => `
              <button
                type="button"
                class="case-qty-btn ${q === 1 ? "active" : ""}"
                data-qty="${q}"
                onclick="
                  setCaseOpenQuantity(
                    ${q},
                    ${Number(selectedCase.price)}
                  )
                "
              >
                x${q}
              </button>
            `).join("")}

          </div>

        </div>


        <button
          id="caseOpenBtn"
          type="button"
          class="cz-case-main-open"
          onclick="
            startCaseOpening(
              '${selectedCase.id}',
              selectedOpenQuantity
            )
          "
        >
          <span class="cz-case-open-icon">▣</span>
          ВІДКРИТИ КЕЙС ЗА
          ${Number(selectedCase.price).toFixed(0)}
          Core Coins
        </button>


        <section class="cz-case-drops-section">

          <div class="cz-case-drops-heading">
            <i></i>
            <span>◇</span>
            <strong>МОЖЛИВІ ДРОПИ</strong>
            <span>◇</span>
            <i></i>
          </div>

          <div
            id="casePossibleDrops"
            class="cz-case-drop-grid"
          >
            <div class="cz-case-drop-loading">
              Завантаження предметів...
            </div>
          </div>

        </section>

      </section>

    </main>
  `;

  try {

    const availableSkins =
      skins.length
        ? skins
        : await api("/api/skins");

    const dropsBox =
      $("#casePossibleDrops");

    if (!dropsBox) {
      return;
    }

    const items =
      Array.isArray(selectedCase.items)
        ? selectedCase.items
        : [];

    if (!items.length) {

      dropsBox.innerHTML = `
        <div class="cz-case-drop-loading">
          У цьому кейсі поки немає предметів.
        </div>
      `;

      return;
    }

    dropsBox.innerHTML =
      items.map((item,index) => {

        const itemName =
          item?.[0] || "Предмет";

        const rarity =
          item?.[1] || "default";

        const skin =
          availableSkins.find(
            s =>
              s.name === itemName
          );

        const image =
          skin?.image || "";

        const rarityColor =
          getDropRarityColor(
            rarity,
            index
          );

        return `
          <article
            class="cz-case-drop-card"
            style="
              --drop-rarity:${rarityColor};
            "
          >

            <div class="cz-case-drop-image">

              ${
                image
                  ? `
                    <img
                      src="${image}"
                      alt="${itemName}"
                    >
                  `
                  : `
                    <span class="cz-case-drop-no-image">
                      Немає фото
                    </span>
                  `
              }

            </div>

            <div class="cz-case-drop-copy">

              <strong>
                ${itemName}
              </strong>

              <span>
                ${rarity}
              </span>

            </div>

          </article>
        `;

      }).join("");

  } catch (e) {

    console.error(
      "Case drops preview error:",
      e
    );

    const dropsBox =
      $("#casePossibleDrops");

    if (dropsBox) {

      dropsBox.innerHTML = `
        <div class="cz-case-drop-loading error">
          Не вдалося завантажити предмети.
        </div>
      `;
    }
  }
}


/* =========================
   CASE QUANTITY
========================= */

function setCaseOpenQuantity(
  quantity,
  price
) {

  selectedOpenQuantity =
    Math.max(
      1,
      Math.min(
        5,
        Number(quantity) || 1
      )
    );

  $$(".case-qty-btn")
    .forEach(button => {

      const active =
        Number(button.dataset.qty) ===
        selectedOpenQuantity;

      button.classList.toggle(
        "active",
        active
      );
    });

  const openButton =
    $("#caseOpenBtn");

  if (openButton) {

    const total =
      Number(price || 0) *
      selectedOpenQuantity;

    const quantityText =
      selectedOpenQuantity === 1
        ? "КЕЙС"
        : `x${selectedOpenQuantity} КЕЙСИ`;

    openButton.innerHTML = `
      <span class="cz-case-open-icon">▣</span>
      ВІДКРИТИ ${quantityText} ЗА
      ${total.toFixed(0)}
      Core Coins
    `;
  }
}


/* =========================
   DROP RARITY COLOR
========================= */

function getDropRarityColor(
  rarity,
  index = 0
) {

  const value =
    String(rarity || "")
      .trim()
      .toLowerCase();

  /* CS2 / CS:GO rarity colors */

  if (
    value.includes("contraband")
  ) {
    return "#e4ae39";
  }

  if (
    value.includes("extraordinary") ||
    value.includes("rare special") ||
    value.includes("special item") ||
    value.includes("knife") ||
    value.includes("glove") ||
    value.includes("gold")
  ) {
    return "#e4ae39";
  }

  if (
    value.includes("covert") ||
    value === "red"
  ) {
    return "#eb4b4b";
  }

  if (
    value.includes("classified") ||
    value === "pink"
  ) {
    return "#d32ce6";
  }

  if (
    value.includes("restricted") ||
    value === "purple"
  ) {
    return "#8847ff";
  }

  if (
    value.includes("mil-spec") ||
    value.includes("mil spec") ||
    value === "blue"
  ) {
    return "#4b69ff";
  }

  if (
    value.includes("industrial")
  ) {
    return "#5e98d9";
  }

  if (
    value.includes("consumer")
  ) {
    return "#b0c3d9";
  }

  /* fallback only if the server sends an unknown rarity */
  return "#6f7b8a";
}


/* =========================
   OPEN CASE
========================= */

async function startCaseOpening(
  id,
  quantity = 1
) {

  if (!currentUser) {

    auth();
    return;
  }

  quantity =
    Math.max(
      1,
      Math.min(
        5,
        Number(quantity) || 1
      )
    );

  const selectedCase =
    cases.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!selectedCase) {
    return;
  }

  const totalPrice =
    Number(selectedCase.price || 0) *
    quantity;

  if (
    Number(currentUser?.balance || 0) <
    totalPrice
  ) {

    alert(
      `Недостатньо коштів. Потрібно ${totalPrice.toFixed(2)} Core Coins`
    );

    return;
  }

  $("#modal")
    ?.classList
    .remove("hidden");

  const content =
    $("#modalContent");

  if (!content) {
    return;
  }

  content.innerHTML = `
    <main class="cz-case-opening-page">

      <div class="cz-case-opening-head">

        <span>
          CASEZONE DROP
        </span>

        <h2>
          ${selectedCase.name}
        </h2>

        <p>
          Відкриваємо ${quantity}
          ${quantity === 1 ? "кейс" : "кейси"}...
        </p>

      </div>

      <div
        id="multiReels"
        class="cz-case-reels"
      ></div>

      <div class="cz-case-server-note">
        Результат кожного відкриття визначається сервером
      </div>

    </main>
  `;

  let inventoryBefore = [];

  try {
    inventoryBefore =
      await api("/api/inventory");
  } catch {
    inventoryBefore = [];
  }

  const beforeIds =
    new Set(
      inventoryBefore.map(
        item =>
          String(item.id)
      )
    );

  const results = [];

  try {

    for (
      let i = 0;
      i < quantity;
      i++
    ) {

      const result =
        await api(
          "/api/open/" + id,
          {
            method: "POST"
          }
        );

      results.push(result);
    }

  } catch (e) {

    if (!results.length) {

      content.innerHTML = `
        <div style="
          text-align:center;
          padding:30px;
        ">
          <h2>
            ${selectedCase.name}
          </h2>
          <p style="
            color:#ff5656;
          ">
            ${e.message}
          </p>
        </div>
      `;

      return;
    }

    console.error(
      "Partial multi-open:",
      e
    );
  }

  const availableSkins =
    await api("/api/skins");

  const fakeItems =
    selectedCase.items
      .map(item => ({

        name:
          item[0],

        rarity:
          item[1],

        image:
          availableSkins.find(
            skin =>
              skin.name === item[0]
          )?.image || ""

      }))
      .filter(
        item =>
          item.image
      );

  const reelsBox =
    $("#multiReels");

  if (!reelsBox) {
    return;
  }

  reelsBox.innerHTML =
    results.map(
      (_, reelIndex) => `
        <div style="
          position:relative;
          isolation:isolate;
          overflow:visible;
          padding:10px 0;
        ">
          <div
            class="reel"
            id="reel-${reelIndex}"
            style="
              position:relative;
              z-index:1;
              display:flex;
              gap:10px;
              overflow:hidden;
              scroll-behavior:auto;
              padding:8px calc(50% - 75px);
              border-top:1px solid rgba(255,212,0,.12);
              border-bottom:1px solid rgba(255,212,0,.12);
              background:
                linear-gradient(
                  180deg,
                  rgba(255,212,0,.025),
                  rgba(255,255,255,.01)
                );
            "
          ></div>

          <!-- НЕРУХОМИЙ МАРКЕР ПОВЕРХ РУЛЕТКИ -->
          <div
            class="case-fixed-marker"
            style="
              position:absolute;
              left:50%;
              top:10px;
              bottom:10px;
              width:3px;
              transform:translateX(-50%);
              background:#ffd400;
              z-index:50;
              pointer-events:none;
              box-shadow:
                0 0 5px #ffd400,
                0 0 12px rgba(255,212,0,.95),
                0 0 24px rgba(255,212,0,.55);
            "
          ></div>

          <div
            class="case-fixed-marker-top"
            style="
              position:absolute;
              left:50%;
              top:2px;
              width:0;
              height:0;
              transform:translateX(-50%);
              border-left:9px solid transparent;
              border-right:9px solid transparent;
              border-top:13px solid #ffd400;
              z-index:51;
              pointer-events:none;
              filter:drop-shadow(0 0 5px rgba(255,212,0,.9));
            "
          ></div>

          <div
            class="case-fixed-marker-bottom"
            style="
              position:absolute;
              left:50%;
              bottom:2px;
              width:0;
              height:0;
              transform:translateX(-50%);
              border-left:9px solid transparent;
              border-right:9px solid transparent;
              border-bottom:13px solid #ffd400;
              z-index:51;
              pointer-events:none;
              filter:drop-shadow(0 0 5px rgba(255,212,0,.9));
            "
          ></div>

        </div>
      `
    ).join("");

  results.forEach(
    (result, reelIndex) => {

      const reel =
        $(`#reel-${reelIndex}`);

      if (!reel) {
        return;
      }

      for (
        let i = 0;
        i < 30;
        i++
      ) {

        const slot =
          document.createElement(
            "div"
          );

        slot.className =
          "slot";

        let currentItem;

        if (i === 27) {

          currentItem = {

            name:
              result.item.name,

            rarity:
              result.item.rarity,

            image:
              result.item.image ||
              skinImage(
                result.item.name
              )
          };

          slot.id =
            `winningItem-${reelIndex}`;

          slot.classList.add(
            "win"
          );

        } else {

          if (!fakeItems.length) {
            continue;
          }

          currentItem =
            fakeItems[
              Math.floor(
                Math.random() *
                fakeItems.length
              )
            ];
        }

        if (!currentItem) {
          continue;
        }

        const rarityClass =
          "rarity-" +
          String(
            currentItem.rarity || ""
          )
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              "-"
            );

        slot.classList.add(
          rarityClass
        );

        const rarityColor =
          getDropRarityColor(
            currentItem.rarity,
            i
          );

        slot.style.cssText += `
          flex:0 0 140px;
          min-height:125px;
          padding:9px;
          border:1px solid ${rarityColor};
          border-radius:10px;
          background:
            linear-gradient(
              180deg,
              ${rarityColor}20,
              #111 62%
            );
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:6px;
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.02),
            0 0 16px ${rarityColor}22;
        `;

        slot.innerHTML = `
          <img
            src="${currentItem.image}"
            alt="${currentItem.name}"
            style="
              width:116px;
              height:76px;
              object-fit:contain;
              filter:
                drop-shadow(
                  0 10px 12px rgba(0,0,0,.42)
                );
            "
          >

          <div style="
            width:100%;
            font-size:10px;
            line-height:1.25;
            text-align:center;
            color:${rarityColor};
            text-shadow:
              0 0 8px ${rarityColor}44;
          ">
            ${currentItem.name}
          </div>
        `;

        reel.appendChild(slot);
      }

      reel.scrollLeft = 0;
    }
  );

  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        220
      )
  );

  const duration =
    4500;

  const startTime =
    performance.now();

  const animations =
    results.map(
      (_, reelIndex) => {

        const reel =
          $(`#reel-${reelIndex}`);

        const winningItem =
          $(`#winningItem-${reelIndex}`);

        if (
          !reel ||
          !winningItem
        ) {
          return null;
        }

        return {
          reel,
          start:
            reel.scrollLeft,
          distance:
            winningItem.offsetLeft -
            reel.clientWidth / 2 +
            winningItem.clientWidth / 2 -
            reel.scrollLeft
        };
      }
    ).filter(Boolean);

  await new Promise(
    resolve => {

      function animate(time) {

        const progress =
          Math.min(
            (
              time -
              startTime
            ) /
            duration,
            1
          );

        const ease =
          1 -
          Math.pow(
            1 - progress,
            4
          );

        animations.forEach(
          animation => {

            animation.reel.scrollLeft =
              animation.start +
              animation.distance *
              ease;
          }
        );

        if (progress < 1) {

          requestAnimationFrame(
            animate
          );

          return;
        }

        resolve();
      }

      requestAnimationFrame(
        animate
      );
    }
  );

  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        350
      )
  );

  let inventoryAfter = [];

  try {
    inventoryAfter =
      await api("/api/inventory");
  } catch {
    inventoryAfter = [];
  }

  const newInventoryItems =
    inventoryAfter.filter(
      item =>
        !beforeIds.has(
          String(item.id)
        )
    );

  const usedIds =
    new Set();

  const openedItems =
    results.map(
      result => {

        const match =
          newInventoryItems.find(
            item =>
              !usedIds.has(
                String(item.id)
              ) &&
              item.item_name ===
                result.item.name
          );

        if (match) {

          usedIds.add(
            String(match.id)
          );
        }

        return {
          ...result.item,
          inventoryId:
            match?.id || null
        };
      }
    );

  showMultiOpenResult(
    selectedCase,
    openedItems,
    quantity
  );

  await refresh();
}


/* =========================
   MULTI OPEN RESULT
========================= */

function showMultiOpenResult(
  selectedCase,
  openedItems,
  quantity
) {

  const content =
    $("#modalContent");

  if (!content) {
    return;
  }

  const totalValue =
    openedItems.reduce(
      (sum, item) =>
        sum +
        Number(item.value || 0),
      0
    );

  const sellableIds =
    openedItems
      .map(
        item =>
          item.inventoryId
      )
      .filter(Boolean);

  content.innerHTML = `
    <div
      class="cz-case-result-page"
      style="
        text-align:center;
        padding:12px;
      "
    >

      <div style="
        color:#ffd400;
        font-size:10px;
        font-weight:900;
        etter-spacing:2px;
      ">
        CASEZONE DROP
      </div>

      <h2 style="
        margin:8px 0 5px;
      ">
        🎉 Результат
      </h2>

      <p style="
        margin:0 0 20px;
        color:#888;
        font-size:12px;
      ">
        Відкрито: ${openedItems.length}
        ${openedItems.length === 1 ? "кейс" : "кейси"}
      </p>

      <div style="
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(150px,1fr)
          );
        gap:10px;
        margin-bottom:20px;
      ">

        ${openedItems.map(item => {

          const rarityColor =
            getDropRarityColor(
              item.rarity
            );

          return `
            <div style="
              position:relative;
              overflow:hidden;
              min-height:190px;
              padding:12px;
              border:
                1px solid
                ${rarityColor};
              border-radius:12px;
              background:
                linear-gradient(
                  180deg,
                  ${rarityColor}20,
                  #111 65%
                );
              box-shadow:
                0 0 18px
                ${rarityColor}20;
            ">

              <img
                src="${
                  item.image ||
                  skinImage(
                    item.name
                  )
                }"
                alt="${item.name}"
                style="
                  width:100%;
                  height:110px;
                  object-fit:contain;
                "
              >

              <strong style="
                display:block;
                margin-top:8px;
                font-size:12px;
              ">
                ${item.name}
              </strong>

              <span style="
                display:block;
                margin-top:4px;
                color:${rarityColor};
                font-size:10px;
              ">
                ${item.rarity}
              </span>

              <strong style="
                display:block;
                margin-top:6px;
                color:#fff;
                font-size:14px;
              ">
                ${Number(
                  item.value || 0
                ).toFixed(2)} Core Coins
              </strong>

            </div>
          `;
        }).join("")}

      </div>

      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        gap:10px;
        flex-wrap:wrap;
      ">

        <button
          type="button"
          onclick="
            startCaseOpening(
              '${selectedCase.id}',
              ${quantity}
            )
          "
          style="
            min-height:48px;
            padding:0 22px;
            border:1px solid rgba(255,255,255,.12);
            border-radius:11px;
            background:#1b1b1b;
            color:#fff;
            font-weight:900;
          "
        >
          ↻ Спробувати ще x${quantity}
        </button>

        <button
          type="button"
          ${sellableIds.length ? "" : "disabled"}
          onclick='sellOpenedItems(${JSON.stringify(sellableIds)})'
          style="
            min-height:48px;
            padding:0 24px;
            border:0;
            border-radius:11px;
            background:
              ${sellableIds.length ? "#ff2f91" : "#333"};
            color:#fff;
            font-weight:950;
            cursor:
              ${sellableIds.length ? "pointer" : "not-allowed"};
            box-shadow:
              ${sellableIds.length ? "0 0 22px rgba(255,47,145,.20)" : "none"};
          "
        >
          🛒 Продати за
          ${totalValue.toFixed(2)} Core Coins
        </button>

      </div>

      ${
        sellableIds.length
          ? ""
          : `
            <div style="
              margin-top:10px;
              color:#777;
              font-size:10px;
            ">
              Предмети вже додані у ваш інвентар.
            </div>
          `
      }

    </div>
  `;
}


/* =========================
   SELL OPENED ITEMS
========================= */

async function sellOpenedItems(ids) {

  if (
    !Array.isArray(ids) ||
    !ids.length
  ) {
    return;
  }

  try {

    for (
      const id of ids
    ) {

      await api(
        "/api/inventory/" +
        id +
        "/sell",
        {
          method: "POST"
        }
      );
    }

    await refresh();

    $("#modalContent")
      .innerHTML = `
        <div style="
          text-align:center;
          padding:45px 20px;
        ">

          <div style="
            font-size:38px;
            margin-bottom:12px;
          ">
            ✅
          </div>

          <h2>
            Предмети продано
          </h2>

          <p style="
            color:#888;
          ">
            Кошти зараховані на баланс.
          </p>

          <button
            type="button"
            onclick="
              $('#modal').classList.add('hidden')
            "
            style="
              min-height:44px;
              padding:0 22px;
              border-radius:10px;
              background:#ffd400;
              color:#111;
              font-weight:900;
            "
          >
            Готово
          </button>

        </div>
      `;

  } catch (e) {

    alert(
      e.message ||
      "Не вдалося продати предмети"
    );
  }
}


/* =========================
   CLOSE WIN
========================= */

async function closeWin() {

  $("#modal")
    ?.classList
    .add("hidden");


  await showInventory();
}


/* =========================
   AUTH
========================= */

function auth() {

  $("#modal")
    ?.classList
    .remove("hidden");


  $("#modalContent")
    .innerHTML = `

    <div style="
      max-width:420px;
      margin:auto;
      padding:10px;
    ">

      <div style="
        color:#ffd400;
        font-size:10px;
        font-weight:900;
        letter-spacing:2px;
      ">
        CASEZONE ACCOUNT
      </div>

      <h2>
        Вхід / реєстрація
      </h2>


      <input
        id="u"
        type="text"
        placeholder="Логін"
        style="
          width:100%;
          padding:13px;
          margin:6px 0;
          border:1px solid #303030;
          border-radius:9px;
          background:#090909;
          color:#fff;
        "
      >


      <input
        id="p"
        type="password"
        placeholder="Пароль"
        style="
          width:100%;
          padding:13px;
          margin:6px 0;
          border:1px solid #303030;
          border-radius:9px;
          background:#090909;
          color:#fff;
        "
      >


      <div style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:12px;
      ">

        <button
          type="button"
          onclick="login()"
          style="
            min-height:44px;
            padding:0 19px;
            border-radius:9px;
            background:#ffd400;
            color:#111;
            font-weight:900;
          "
        >
          Увійти
        </button>


        <button
          type="button"
          onclick="register()"
          style="
            min-height:44px;
            padding:0 19px;
            border-radius:9px;
            background:#181818;
            color:#fff;
            border:1px solid #303030;
          "
        >
          Створити
        </button>

      </div>


      <button
        type="button"
        onclick="loginSteam()"
        style="
          width:100%;
          min-height:45px;
          margin-top:10px;
          border-radius:9px;
          background:#1b1b1b;
          color:#fff;
          border:1px solid #303030;
        "
      >
        🎮 Увійти через Steam
      </button>

    </div>
  `;
}


function loginSteam() {

  window.location.href =
    "/auth/steam";
}


async function login() {

  try {

    await api(
      "/api/login",
      {
        method: "POST",

        body:
          JSON.stringify({
            username:
              $("#u")?.value || "",

            password:
              $("#p")?.value || ""
          })
      }
    );


    $("#modal")
      ?.classList
      .add("hidden");


    await refresh();

  } catch (e) {

    alert(e.message);
  }
}
async function register() {

  try {

    await api(
      "/api/register",
      {
        method: "POST",

        body:
          JSON.stringify({
            username:
              $("#u")?.value || "",

            password:
              $("#p")?.value || ""
          })
      }
    );


    $("#modal")
      ?.classList
      .add("hidden");


    await refresh();

  } catch (e) {

    alert(e.message);
  }
}
/* =========================
   INVENTORY ACTIONS
========================= */

async function sellItem(id) {

  try {

    await api(
      "/api/inventory/" +
      id +
      "/sell",
      {
        method: "POST"
      }
    );


    await refresh();

    await showInventory();

  } catch (e) {

    alert(e.message);
  }
}


async function withdrawItem(id) {

  try {

    const result =
      await api(
        "/api/withdraw/" + id,
        {
          method: "POST"
        }
      );


    alert(
      "Заявка на вивід створена! ID: " +
      result.withdrawalId
    );


    await showInventory();

  } catch (e) {

    alert(e.message);
  }
}


/* =========================
   INVENTORY
   Full-screen UI only.
   Sell/withdraw API logic remains unchanged.
========================= */

let inventoryItemsCache = [];
let inventorySkinsCache = [];
let inventoryViewMode = "compact";


function normalizeInventoryRarity(value) {

  return String(value || "")
    .trim()
    .toLowerCase();
}


function inventoryRaritySlug(value) {

  return normalizeInventoryRarity(value)
    .replace(
      /[^a-z0-9]+/g,
      "-"
    );
}


function splitInventoryItemName(value) {

  const full =
    String(value || "Предмет")
      .trim();

  const parts =
    full
      .split("|")
      .map(part => part.trim());

  return {
    full,
    weapon:
      parts[0] || full,
    finish:
      parts.length > 1
        ? parts.slice(1).join(" | ")
        : ""
  };
}


function buildInventoryRarityFilter() {

  const select =
    $("#inventoryRarityFilter");

  if (!select) {
    return;
  }

  const previous =
    select.value || "all";

  const rarities =
    Array.from(
      new Set(
        inventoryItemsCache
          .map(item =>
            String(item.rarity || "")
              .trim()
          )
          .filter(Boolean)
      )
    )
      .sort(
        (a,b) =>
          a.localeCompare(
            b,
            "uk"
          )
      );

  select.innerHTML = `
    <option value="all">
      Всі предмети
    </option>

    ${rarities.map(rarity => `
      <option
        value="${escapeHomeHtml(
          normalizeInventoryRarity(
            rarity
          )
        )}"
      >
        ${escapeHomeHtml(rarity)}
      </option>
    `).join("")}
  `;

  const previousStillExists =
    Array.from(select.options)
      .some(
        option =>
          option.value === previous
      );

  select.value =
    previousStillExists
      ? previous
      : "all";
}


function updateInventorySummary() {

  const count =
    inventoryItemsCache.length;

  const total =
    inventoryItemsCache.reduce(
      (sum,item) =>
        sum +
        Number(item.value || 0),
      0
    );

  const countBox =
    $("#inventoryCount");

  if (countBox) {
    countBox.textContent =
      String(count);
  }

  const totalBox =
    $("#inventoryTotalValue");

  if (totalBox) {

    totalBox.textContent =
      total.toFixed(2) +
      " Core Coins";
  }
}


function renderInventoryItems() {

  const itemsBox =
    $("#items");

  if (!itemsBox) {
    return;
  }

  const search =
    String(
      $("#inventorySearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();

  const rarityFilter =
    $("#inventoryRarityFilter")
      ?.value || "all";

  const sort =
    $("#inventorySort")
      ?.value || "value-desc";


  let visibleItems =
    inventoryItemsCache
      .filter(item => {

        const matchesSearch =
          !search ||
          String(
            item.item_name || ""
          )
            .toLowerCase()
            .includes(search);

        const matchesRarity =
          rarityFilter === "all" ||
          normalizeInventoryRarity(
            item.rarity
          ) === rarityFilter;

        return (
          matchesSearch &&
          matchesRarity
        );
      });


  visibleItems =
    [...visibleItems]
      .sort((a,b) => {

        if (sort === "value-asc") {

          return (
            Number(a.value || 0) -
            Number(b.value || 0)
          );
        }

        if (sort === "newest") {

          return (
            Number(b.id || 0) -
            Number(a.id || 0)
          );
        }

        if (sort === "name") {

          return String(
            a.item_name || ""
          )
            .localeCompare(
              String(
                b.item_name || ""
              ),
              "uk"
            );
        }

        return (
          Number(b.value || 0) -
          Number(a.value || 0)
        );
      });


  itemsBox.classList.toggle(
    "comfort-view",
    inventoryViewMode === "comfort"
  );


  if (!visibleItems.length) {

    itemsBox.innerHTML = `
      <div class="cz-inventory-empty">

        <span>
          ◇
        </span>

        <strong>
          Предметів не знайдено
        </strong>

        <small>
          Змініть пошук або фільтр.
        </small>

      </div>
    `;

    return;
  }


  itemsBox.innerHTML =
    visibleItems
      .map((item,index) => {

        const skin =
          inventorySkinsCache.find(
            skin =>
              skin.name ===
              item.item_name
          );

        const image =
          skin?.image || "";

        const rarity =
          String(
            item.rarity || "Default"
          );

        const raritySlug =
          inventoryRaritySlug(
            rarity
          );

        const rarityColor =
          getDropRarityColor(
            rarity,
            index
          );

        const name =
          splitInventoryItemName(
            item.item_name
          );

        return `
          <article
            class="
              cz-inventory-card
              item
              rarity-${raritySlug}
            "
            style="
              --inventory-rarity:
              ${rarityColor};
            "
            title="${escapeHomeHtml(name.full)}"
          >

            <div class="cz-inventory-card-top">

              <span class="cz-inventory-card-value">
                ${Number(
                  item.value || 0
                ).toFixed(2)}
                Core Coins
              </span>

              <span
                class="cz-inventory-card-lock"
                aria-hidden="true"
              >
                ◇
              </span>

            </div>


            <div class="cz-inventory-card-image">

              ${
                image
                  ? `
                    <img
                      src="${image}"
                      alt="${escapeHomeHtml(name.full)}"
                      loading="lazy"
                    >
                  `
                  : `
                    <span class="cz-inventory-no-image">
                      Немає фото
                    </span>
                  `
              }

            </div>


            <div class="cz-inventory-card-copy">

              <strong>
                ${escapeHomeHtml(name.weapon)}
              </strong>

              ${
                name.finish
                  ? `
                    <b>
                      ${escapeHomeHtml(name.finish)}
                    </b>
                  `
                  : ""
              }

              <span>
                ${escapeHomeHtml(rarity)}
              </span>

            </div>


            <div class="cz-inventory-card-actions">

              <button
                type="button"
                class="cz-inventory-withdraw"
                onclick="
                  withdrawItem(${Number(item.id)})
                "
              >
                Вивести
              </button>

              <button
                type="button"
                class="cz-inventory-sell"
                onclick="
                  sellItem(${Number(item.id)})
                "
              >
                Продати
              </button>

            </div>

          </article>
        `;

      })
      .join("");
}


function bindInventoryControls() {

  const search =
    $("#inventorySearch");

  const rarity =
    $("#inventoryRarityFilter");

  const sort =
    $("#inventorySort");

  const compact =
    $("#inventoryViewCompact");

  const comfort =
    $("#inventoryViewComfort");

  const refreshButton =
    $("#inventoryRefreshBtn");


  if (search) {

    search.oninput =
      renderInventoryItems;
  }


  if (rarity) {

    rarity.onchange =
      renderInventoryItems;
  }


  if (sort) {

    sort.onchange =
      renderInventoryItems;
  }


  if (compact) {

    compact.onclick = () => {

      inventoryViewMode =
        "compact";

      compact.classList.add(
        "active"
      );

      comfort
        ?.classList
        .remove("active");

      renderInventoryItems();
    };
  }


  if (comfort) {

    comfort.onclick = () => {

      inventoryViewMode =
        "comfort";

      comfort.classList.add(
        "active"
      );

      compact
        ?.classList
        .remove("active");

      renderInventoryItems();
    };
  }


  if (refreshButton) {

    refreshButton.onclick =
      showInventory;
  }
}


async function showInventory() {

  if (!currentUser) {

    auth();
    return;
  }


  const inventoryModal =
    $("#inventory");

  inventoryModal
    ?.classList
    .remove("hidden");


  const itemsBox =
    $("#items");

  if (itemsBox) {

    itemsBox.innerHTML = `
      <div class="cz-inventory-loading">
        Завантаження інвентарю...
      </div>
    `;
  }


  try {

    const [
      items,
      skinList
    ] =
      await Promise.all([
        api("/api/inventory"),
        api("/api/skins")
      ]);


    inventoryItemsCache =
      Array.isArray(items)
        ? items
        : [];


    inventorySkinsCache =
      Array.isArray(skinList)
        ? skinList
        : [];


    updateInventorySummary();

    buildInventoryRarityFilter();

    bindInventoryControls();

    renderInventoryItems();


  } catch (e) {

    if (itemsBox) {

      itemsBox.innerHTML = `
        <div class="cz-inventory-empty error">

          <strong>
            Не вдалося завантажити інвентар
          </strong>

          <small>
            ${escapeHomeHtml(
              e.message ||
              "Помилка сервера"
            )}
          </small>

        </div>
      `;
    }
  }
}


/* =========================
   MAIN BUTTONS
========================= */

$("#authBtn")
  ?.addEventListener(
    "click",
    async () => {

      if (currentUser) {

        try {

          await api(
            "/api/logout",
            {
              method: "POST"
            }
          );


          location.reload();

        } catch (e) {

          alert(e.message);
        }

        return;
      }


      auth();
    }
  );


$("#inventoryBtn")
  ?.addEventListener(
    "click",
    showInventory
  );


$("#casesNavBtn")
  ?.addEventListener(
    "click",
    () => {

      $("#inventory")
        ?.classList
        .add("hidden");
    }
  );


$("#upgradeNavBtn")
  ?.addEventListener(
    "click",
    () => {

      $("#inventory")
        ?.classList
        .add("hidden");
    }
  );


$("#closeInv")
  ?.addEventListener(
    "click",
    () => {

      $("#inventory")
        ?.classList
        .add("hidden");
    }
  );


$("#closeModal")
  ?.addEventListener(
    "click",
    () => {

      $("#modal")
        ?.classList
        .add("hidden");
    }
  );


/* =========================
   DEPOSIT
   Full-screen design.
   LiqPay + skins logic preserved.
========================= */

const depositModal =
  $("#depositModal");

const closeDeposit =
  $("#closeDeposit");

const depositAmountInput =
  $("#depositAmountInput");

const depositCardPayBtn =
  $("#depositCardPayBtn");

const depositSkinsBtn =
  $("#depositSkinsBtn");

const depositCardStatus =
  $("#depositCardStatus");


function setDepositAmount(value) {

  const amount =
    Math.max(
      1,
      Math.round(
        Number(value) || 0
      )
    );


  if (depositAmountInput) {

    depositAmountInput.value =
      String(amount);
  }


  $$(".cz-deposit-quick-btn")
    .forEach(button => {

      button.classList.toggle(
        "active",
        Number(
          button.dataset.depositAmount
        ) === amount
      );
    });


  if (depositCardStatus) {

    depositCardStatus.textContent =
      "";
  }
}


function openDepositPage() {

  if (!currentUser) {

    auth();
    return;
  }


  $("#profileModal")
    ?.classList
    .add("hidden");


  $("#inventory")
    ?.classList
    .add("hidden");


  depositModal
    ?.classList
    .remove("hidden");


  setDepositAmount(100);


  setTimeout(
    () => {

      depositAmountInput
        ?.focus();
    },
    80
  );
}


$("#depositBtn")
  ?.addEventListener(
    "click",
    openDepositPage
  );


closeDeposit
  ?.addEventListener(
    "click",
    () => {

      depositModal
        ?.classList
        .add("hidden");
    }
  );


$$(".cz-deposit-quick-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        setDepositAmount(
          button.dataset
            .depositAmount
        );
      }
    );
  });


depositAmountInput
  ?.addEventListener(
    "input",
    () => {

      const amount =
        Math.round(
          Number(
            depositAmountInput.value
          ) || 0
        );


      $$(".cz-deposit-quick-btn")
        .forEach(button => {

          button.classList.toggle(
            "active",
            Number(
              button.dataset
                .depositAmount
            ) === amount
          );
        });


      if (depositCardStatus) {

        depositCardStatus.textContent =
          "";
      }
    }
  );


depositAmountInput
  ?.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        depositCardPayBtn
          ?.click();
      }
    }
  );


depositCardPayBtn
  ?.addEventListener(
    "click",
    async () => {

      const amount =
        Math.round(
          Number(
            depositAmountInput
              ?.value || 0
          )
        );


      if (
        !Number.isFinite(amount) ||
        amount < 1
      ) {

        if (depositCardStatus) {

          depositCardStatus.textContent =
            "Введіть коректну суму поповнення.";
        }

        depositAmountInput
          ?.focus();

        return;
      }


      if (depositCardStatus) {

        depositCardStatus.textContent =
          "Переходимо до безпечної оплати...";
      }


      await startLiqPay(
        amount
      );
    }
  );


depositSkinsBtn
  ?.addEventListener(
    "click",
    () => {

      if (!currentUser) {

        depositModal
          ?.classList
          .add("hidden");

        auth();

        return;
      }


      window.location.href =
        "/skins.html";
    }
  );


/*
  Compatibility wrapper:
  old code or future buttons can still call depositMethod().
*/
async function depositMethod(method) {

  if (!currentUser) {

    depositModal
      ?.classList
      .add("hidden");

    auth();

    return;
  }


  if (method === "skins") {

    window.location.href =
      "/skins.html";

    return;
  }


  /*
    Privat/Oschad used the same LiqPay checkout in the old UI.
    We now open the unified card payment screen instead.
  */
  if (
    method === "privat" ||
    method === "oschad"
  ) {

    openDepositPage();
    return;
  }


  if (
    method === "crypto"
  ) {

    if (depositCardStatus) {

      depositCardStatus.textContent =
        "Криптовалютне поповнення буде підключено окремо.";
    }

    openDepositPage();
  }
}


/* =========================
   LIQPAY
========================= */

async function startLiqPay(amount) {

  try {

    const result =
      await api(
        "/api/liqpay/create",
        {
          method: "POST",

          body:
            JSON.stringify({
              amount
            })
        }
      );


    const form =
      document.createElement(
        "form"
      );


    form.method =
      "POST";

    form.action =
      result.checkoutUrl;

    form.style.display =
      "none";


    const dataInput =
      document.createElement(
        "input"
      );

    dataInput.type =
      "hidden";

    dataInput.name =
      "data";

    dataInput.value =
      result.data;


    const signatureInput =
      document.createElement(
        "input"
      );

    signatureInput.type =
      "hidden";

    signatureInput.name =
      "signature";

    signatureInput.value =
      result.signature;


    form.appendChild(
      dataInput
    );

    form.appendChild(
      signatureInput
    );


    document.body
      .appendChild(form);


    form.submit();

  } catch (e) {

    alert(
      e.message ||
      "Не вдалося створити платіж"
           );
  }
}
/* =========================
   PROFILE
   Full-screen dashboard.
========================= */

const profileBtn =
  $("#profileBtn");

const profileModal =
  $("#profileModal");

const closeProfile =
  $("#closeProfile");

const steamTradeUrl =
  $("#steamTradeUrl");

const saveTradeUrl =
  $("#saveTradeUrl");

const tradeUrlStatus =
  $("#tradeUrlStatus");

const steamAvatarBtn =
  $("#steamAvatarBtn");

const profileSteamId =
  $("#profileSteamId");

const profileSettingsToggle =
  $("#profileSettingsToggle");

const profileSettingsPanel =
  $("#profileSettingsPanel");

const profileCopySteamId =
  $("#profileCopySteamId");

const profileDepositHistoryToggle =
  $("#profileDepositHistoryToggle");

const profileWithdrawFilter =
  $("#profileWithdrawFilter");

const profileInventorySearch =
  $("#profileInventorySearch");

const profileInventoryRarity =
  $("#profileInventoryRarity");

const profileInventorySort =
  $("#profileInventorySort");

const profileInventoryCompact =
  $("#profileInventoryCompact");

const profileInventoryComfort =
  $("#profileInventoryComfort");

const profileInventoryLoadMore =
  $("#profileInventoryLoadMore");


let profileInventoryCache = [];
let profileSkinCache = [];
let profileWithdrawCache = [];
let profileInventoryMode = "compact";
let profileInventoryVisibleLimit = 21;


/* =========================
   PROFILE HELPERS
========================= */

function formatProfileDate(
  value,
  withTime = false
) {

  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  if (withTime) {

    return date
      .toLocaleString(
        "uk-UA",
        {
          day:"2-digit",
          month:"2-digit",
          year:"numeric",
          hour:"2-digit",
          minute:"2-digit"
        }
      );
  }

  return date
    .toLocaleDateString(
      "uk-UA"
    );
}


function getProfileStatusMeta(status) {

  const normalized =
    String(status || "")
      .trim()
      .toLowerCase();

  if (
    normalized === "completed" ||
    normalized === "success" ||
    normalized === "sent" ||
    normalized === "withdrawn"
  ) {

    return {
      key:"completed",
      label:"Успішно"
    };
  }


  if (
    normalized === "failed" ||
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {

    return {
      key:"failed",
      label:"Невдало"
    };
  }


  return {
    key:"pending",
    label:"В очікуванні"
  };
}


function populateProfileInventoryRarity() {

  if (!profileInventoryRarity) {
    return;
  }

  const previous =
    profileInventoryRarity.value ||
    "all";

  const values =
    Array.from(
      new Set(
        profileInventoryCache
          .map(item =>
            String(
              item.rarity || ""
            ).trim()
          )
          .filter(Boolean)
      )
    )
      .sort(
        (a,b) =>
          a.localeCompare(
            b,
            "uk"
          )
      );


  profileInventoryRarity.innerHTML = `
    <option value="all">
      Всі предмети
    </option>

    ${values.map(value => `
      <option
        value="${escapeHomeHtml(
          normalizeInventoryRarity(
            value
          )
        )}"
      >
        ${escapeHomeHtml(value)}
      </option>
    `).join("")}
  `;


  profileInventoryRarity.value =
    Array.from(
      profileInventoryRarity.options
    )
      .some(
        option =>
          option.value ===
          previous
      )
        ? previous
        : "all";
}


function renderProfileInventory() {

  const grid =
    $("#profileInventoryGrid");

  if (!grid) {
    return;
  }


  const search =
    String(
      profileInventorySearch
        ?.value || ""
    )
      .trim()
      .toLowerCase();


  const rarity =
    profileInventoryRarity
      ?.value || "all";


  const sort =
    profileInventorySort
      ?.value || "value-desc";


  let items =
    profileInventoryCache
      .filter(item => {

        const matchesSearch =
          !search ||
          String(
            item.item_name || ""
          )
            .toLowerCase()
            .includes(search);


        const matchesRarity =
          rarity === "all" ||
          normalizeInventoryRarity(
            item.rarity
          ) === rarity;


        return (
          matchesSearch &&
          matchesRarity
        );
      });


  items =
    [...items]
      .sort((a,b) => {

        if (sort === "value-asc") {

          return (
            Number(a.value || 0) -
            Number(b.value || 0)
          );
        }


        if (sort === "newest") {

          return (
            Number(b.id || 0) -
            Number(a.id || 0)
          );
        }


        if (sort === "name") {

          return String(
            a.item_name || ""
          )
            .localeCompare(
              String(
                b.item_name || ""
              ),
              "uk"
            );
        }


        return (
          Number(b.value || 0) -
          Number(a.value || 0)
        );
      });


  const count =
    $("#profileInventoryCount");

  if (count) {

    count.textContent =
      `${items.length} предметів`;
  }


  grid.classList.toggle(
    "comfort-view",
    profileInventoryMode ===
      "comfort"
  );


  if (!items.length) {

    grid.innerHTML = `
      <div class="cz-profile-history-empty">
        Предметів не знайдено
      </div>
    `;

    profileInventoryLoadMore
      ?.classList
      .add("hidden");

    return;
  }


  const visible =
    items.slice(
      0,
      profileInventoryVisibleLimit
    );


  grid.innerHTML =
    visible
      .map((item,index) => {

        const skin =
          profileSkinCache
            .find(
              skin =>
                skin.name ===
                item.item_name
            );


        const image =
          skin?.image || "";


        const rarityColor =
          getDropRarityColor(
            item.rarity,
            index
          );


        const name =
          splitInventoryItemName(
            item.item_name
          );


        return `
          <article
            class="cz-profile-item-card"
            style="
              --profile-rarity:
              ${rarityColor};
            "
          >

            <div class="cz-profile-item-top">

              <span>
                ${escapeHomeHtml(
                  String(
                    item.rarity || ""
                  )
                    .trim()
                    .slice(0,3)
                    .toUpperCase() ||
                  "ITEM"
                )}
              </span>

              <span class="cz-profile-item-lock">
                ◇
              </span>

            </div>


            <div class="cz-profile-item-image">

              ${
                image
                  ? `
                    <img
                      src="${image}"
                      alt="${escapeHomeHtml(
                        name.full
                      )}"
                      loading="lazy"
                    >
                  `
                  : `
                    <span class="cz-profile-item-no-image">
                      Немає фото
                    </span>
                  `
              }

            </div>


            <div class="cz-profile-item-copy">

              <strong>
                ${escapeHomeHtml(
                  name.weapon
                )}
              </strong>

              ${
                name.finish
                  ? `
                    <b>
                      ${escapeHomeHtml(
                        name.finish
                      )}
                    </b>
                  `
                  : ""
              }

              <span>
                ${Number(
                  item.value || 0
                ).toFixed(2)}
                Core Coins
              </span>

            </div>

          </article>
        `;

      })
      .join("");


  const hasMore =
    items.length >
    profileInventoryVisibleLimit;


  profileInventoryLoadMore
    ?.classList
    .toggle(
      "hidden",
      !hasMore
    );
}


function renderProfileWithdrawals() {

  const list =
    $("#profileWithdrawList");

  if (!list) {
    return;
  }


  const filter =
    profileWithdrawFilter
      ?.value || "all";


  const visible =
    profileWithdrawCache
      .filter(item => {

        if (filter === "all") {
          return true;
        }

        return (
          getProfileStatusMeta(
            item.status
          ).key === filter
        );
      })
      .slice(0,6);


  if (!visible.length) {

    list.innerHTML = `
      <div class="cz-profile-history-empty">
        Історія виводу порожня
      </div>
    `;

    return;
  }


  list.innerHTML =
    visible
      .map(item => {

        const status =
          getProfileStatusMeta(
            item.status
          );


        const name =
          splitInventoryItemName(
            item.item_name
          );


        return `
          <div class="cz-profile-withdraw-row">

            <div class="cz-profile-withdraw-item">

              <div class="cz-profile-withdraw-image">

                ${
                  item.image
                    ? `
                      <img
                        src="${item.image}"
                        alt="${escapeHomeHtml(
                          name.full
                        )}"
                      >
                    `
                    : `
                      <span>
                        ◇
                      </span>
                    `
                }

              </div>


              <div>

                <strong>
                  ${escapeHomeHtml(
                    name.full
                  )}
                </strong>

                <small>
                  ${escapeHomeHtml(
                    String(
                      item.rarity || ""
                    )
                  )}
                </small>

              </div>

            </div>


            <strong class="cz-profile-withdraw-value">
              ${Number(
                item.value || 0
              ).toFixed(2)}
              Core Coins
            </strong>


            <span class="cz-profile-withdraw-date">
              ${formatProfileDate(
                item.created_at,
                true
              )}
            </span>


            <span
              class="
                cz-profile-withdraw-status
                status-${status.key}
              "
            >
              ${status.label}
            </span>

          </div>
        `;

      })
      .join("");
}


function renderProfileBestDrop(item) {

  const empty =
    $("#profileBestDropEmpty");

  const box =
    $("#profileBestDrop");


  if (!item) {

    empty
      ?.classList
      .remove("hidden");

    box
      ?.classList
      .add("hidden");

    return;
  }


  empty
    ?.classList
    .add("hidden");

  box
    ?.classList
    .remove("hidden");


  const name =
    $("#profileBestDropName");

  if (name) {
    name.textContent =
      item.item_name || "—";
  }


  const rarity =
    $("#profileBestDropRarity");

  if (rarity) {

    rarity.textContent =
      item.rarity || "—";

    rarity.style.color =
      getDropRarityColor(
        item.rarity
      );
  }


  const image =
    $("#profileBestDropImage");

  if (image) {

    if (item.image) {

      image.src =
        item.image;

      image.classList
        .remove("hidden");

    } else {

      image
        .classList
        .add("hidden");
    }
  }


  const value =
    $("#profileBestDropValue");

  if (value) {

    value.textContent =
      Number(
        item.value || 0
      ).toFixed(2) +
      " Core Coins";
  }


  const date =
    $("#profileBestDropDate");

  if (date) {

    date.textContent =
      formatProfileDate(
        item.created_at,
        true
      );
  }
}


function renderProfileUser(user) {

  const displayName =
    user?.steam_name ||
    user?.username ||
    "CaseZone Player";


  const name =
    $("#profileDisplayName");

  if (name) {
    name.textContent =
      displayName;
  }


  if (profileSteamId) {

    profileSteamId.textContent =
      user?.steam_id ||
      "Не підключено";
  }


  const balance =
    $("#profileBalanceValue");

  if (balance) {

    balance.textContent =
      Number(
        user?.balance || 0
      ).toFixed(2) +
      " Core Coins";
  }


  const avatar =
    $("#profileAvatar");

  const fallback =
    $("#profileAvatarFallback");


  if (
    avatar &&
    user?.avatar_url
  ) {

    avatar.src =
      user.avatar_url;

    avatar.classList
      .remove("hidden");

    fallback
      ?.classList
      .add("hidden");

  } else {

    avatar
      ?.classList
      .add("hidden");

    fallback
      ?.classList
      .remove("hidden");
  }


  if (
    steamTradeUrl &&
    user?.trade_url
  ) {

    steamTradeUrl.value =
      user.trade_url;
  }
}


function renderProfileStats(stats) {

  const opened =
    Number(
      stats?.casesOpened || 0
    );

  const upgrades =
    Number(
      stats?.upgradesCount || 0
    );

  const wins =
    Number(
      stats?.upgradeWins || 0
    );

  const winRate =
    upgrades > 0
      ? (
          wins /
          upgrades *
          100
        )
      : 0;


  const casesBox =
    $("#profileCasesOpened");

  if (casesBox) {
    casesBox.textContent =
      String(opened);
  }


  const upgradesBox =
    $("#profileUpgradesCount");

  if (upgradesBox) {
    upgradesBox.textContent =
      String(upgrades);
  }


  const winBox =
    $("#profileWinRate");

  if (winBox) {

    winBox.textContent =
      winRate.toFixed(2) +
      "%";
  }
}


/* =========================
   OPEN PROFILE
========================= */

async function openProfilePage() {

  if (!currentUser) {

    auth();
    return;
  }


  $("#inventory")
    ?.classList
    .add("hidden");


  profileModal
    ?.classList
    .remove("hidden");


  profileSettingsPanel
    ?.classList
    .add("hidden");


  profileInventoryVisibleLimit =
    21;


  const withdrawList =
    $("#profileWithdrawList");

  const inventoryGrid =
    $("#profileInventoryGrid");


  if (withdrawList) {

    withdrawList.innerHTML = `
      <div class="cz-profile-history-empty">
        Завантаження...
      </div>
    `;
  }


  if (inventoryGrid) {

    inventoryGrid.innerHTML = `
      <div class="cz-profile-history-empty">
        Завантаження інвентарю...
      </div>
    `;
  }


  try {

    const [
      meData,
      dashboard,
      inventory,
      skinsList
    ] =
      await Promise.all([
        api("/api/me"),
        api("/api/profile-dashboard"),
        api("/api/inventory"),
        api("/api/skins")
      ]);


    renderProfileUser(
      meData.user || {}
    );


    renderProfileStats(
      dashboard.stats || {}
    );


    renderProfileBestDrop(
      dashboard.bestDrop || null
    );


    profileWithdrawCache =
      Array.isArray(
        dashboard.withdrawals
      )
        ? dashboard.withdrawals
        : [];


    profileInventoryCache =
      Array.isArray(inventory)
        ? inventory
        : [];


    profileSkinCache =
      Array.isArray(skinsList)
        ? skinsList
        : [];


    populateProfileInventoryRarity();

    renderProfileWithdrawals();

    renderProfileInventory();


  } catch (e) {

    console.error(
      "Profile load error:",
      e
    );


    if (withdrawList) {

      withdrawList.innerHTML = `
        <div class="cz-profile-history-empty error">
          Не вдалося завантажити профіль
        </div>
      `;
    }


    if (inventoryGrid) {

      inventoryGrid.innerHTML = `
        <div class="cz-profile-history-empty error">
          ${escapeHomeHtml(
            e.message ||
            "Помилка сервера"
          )}
        </div>
      `;
    }
  }
}


/* =========================
   HEADER PROFILE / AVATAR
========================= */

steamAvatarBtn
  ?.addEventListener(
    "click",
    openProfilePage
  );


profileBtn
  ?.addEventListener(
    "click",
    openProfilePage
  );


/* =========================
   CLOSE / NAVIGATION
========================= */

closeProfile
  ?.addEventListener(
    "click",
    () => {

      profileModal
        ?.classList
        .add("hidden");
    }
  );


$("#casesNavBtn")
  ?.addEventListener(
    "click",
    () => {

      profileModal
        ?.classList
        .add("hidden");
    }
  );


$("#upgradeNavBtn")
  ?.addEventListener(
    "click",
    () => {

      profileModal
        ?.classList
        .add("hidden");
    }
  );


$("#headerInventoryBtn")
  ?.addEventListener(
    "click",
    () => {

      profileModal
        ?.classList
        .add("hidden");
    }
  );


/* =========================
   PROFILE SETTINGS
========================= */

profileSettingsToggle
  ?.addEventListener(
    "click",
    () => {

      profileSettingsPanel
        ?.classList
        .toggle("hidden");
    }
  );


profileCopySteamId
  ?.addEventListener(
    "click",
    async () => {

      const steamId =
        profileSteamId
          ?.textContent
          ?.trim() || "";


      if (
        !steamId ||
        steamId ===
          "Не підключено"
      ) {
        return;
      }


      try {

        await navigator
          .clipboard
          .writeText(
            steamId
          );

        profileCopySteamId
          .textContent =
            "✓";


        setTimeout(
          () => {

            profileCopySteamId
              .textContent =
                "▣";
          },
          1000
        );

      } catch (e) {

        console.error(
          "Steam ID copy error:",
          e
        );
      }
    }
  );


profileDepositHistoryToggle
  ?.addEventListener(
    "click",
    () => {

      const box =
        $("#depositHistory");

      box
        ?.classList
        .toggle("hidden");


      if (
        box &&
        !box.classList
          .contains("hidden")
      ) {

        loadDepositHistory();
      }
    }
  );


/* =========================
   PROFILE WITHDRAW FILTER
========================= */

profileWithdrawFilter
  ?.addEventListener(
    "change",
    renderProfileWithdrawals
  );


/* =========================
   PROFILE INVENTORY CONTROLS
========================= */

profileInventorySearch
  ?.addEventListener(
    "input",
    () => {

      profileInventoryVisibleLimit =
        21;

      renderProfileInventory();
    }
  );


profileInventoryRarity
  ?.addEventListener(
    "change",
    () => {

      profileInventoryVisibleLimit =
        21;

      renderProfileInventory();
    }
  );


profileInventorySort
  ?.addEventListener(
    "change",
    () => {

      profileInventoryVisibleLimit =
        21;

      renderProfileInventory();
    }
  );


profileInventoryCompact
  ?.addEventListener(
    "click",
    () => {

      profileInventoryMode =
        "compact";

      profileInventoryCompact
        .classList
        .add("active");

      profileInventoryComfort
        ?.classList
        .remove("active");

      renderProfileInventory();
    }
  );


profileInventoryComfort
  ?.addEventListener(
    "click",
    () => {

      profileInventoryMode =
        "comfort";

      profileInventoryComfort
        .classList
        .add("active");

      profileInventoryCompact
        ?.classList
        .remove("active");

      renderProfileInventory();
    }
  );


profileInventoryLoadMore
  ?.addEventListener(
    "click",
    () => {

      profileInventoryVisibleLimit +=
        21;

      renderProfileInventory();
    }
  );


/* =========================
   SAVE TRADE URL
========================= */

saveTradeUrl
  ?.addEventListener(
    "click",
    async () => {

      const tradeUrl =
        steamTradeUrl
          ?.value
          .trim() || "";


      if (tradeUrlStatus) {

        tradeUrlStatus
          .textContent = "";
      }


      if (!tradeUrl) {

        if (tradeUrlStatus) {

          tradeUrlStatus
            .textContent =
            "Вставте Steam Trade URL";
        }

        return;
      }


      try {

        await api(
          "/api/trade-url",
          {
            method: "POST",

            body:
              JSON.stringify({
                tradeUrl
              })
          }
        );


        if (tradeUrlStatus) {

          tradeUrlStatus
            .textContent =
            "✅ Trade URL збережено";
        }

      } catch (e) {

        if (tradeUrlStatus) {

          tradeUrlStatus
            .textContent =
            e.message ||
            "Не вдалося зберегти Trade URL";
        }
      }
    }
  );


/* =========================
   DEPOSIT HISTORY
========================= */

async function loadDepositHistory() {

  const box =
    $("#depositHistory");


  if (!box) {
    return;
  }


  box.innerHTML =
    "Завантаження...";


  try {

    const data =
      await api(
        "/api/deposit-history"
      );


    const deposits =
      data.deposits || [];


    if (!deposits.length) {

      box.innerHTML =
        "Історія поповнень порожня";

      return;
    }


    box.innerHTML =
      deposits.map(item => {

        const date =
          item.created_at
            ? new Date(
                item.created_at
              ).toLocaleString(
                "uk-UA"
              )
            : "";


        return `

          <div class="history-item">

            ${
              item.skin_image

                ? `
                  <img
                    src="${item.skin_image}"
                    alt="${
                      item.skin_name ||
                      "Skin"
                    }"
                    class="
                      history-skin-image
                    "
                  >
                `

                : ""
            }


            <div
              class="history-info"
            >

              <strong>
                ${
                  item.skin_name ||
                  "Поповнення"
                }
              </strong>


              <span style="
                color:#ffd400;
              ">
                ${Number(
                  item.value || 0
                ).toFixed(2)} Core Coins
              </span>


              <span>
                Статус:
                ${formatStatus(
                  item.status
                )}
              </span>


              ${
                date

                  ? `
                    <small>
                      ${date}
                    </small>
                  `

                  : ""
              }

            </div>

          </div>
        `;

      }).join("");

  } catch (e) {

    console.error(
      "Deposit history error:",
      e
    );


    box.innerHTML =
      "Не вдалося завантажити історію";
  }
}


/* =========================
   WITHDRAW HISTORY
========================= */

async function loadWithdrawHistory() {

  const box =
    $("#withdrawHistory");


  if (!box) {
    return;
  }


  box.innerHTML =
    "Завантаження...";


  try {

    const data =
      await api(
        "/api/withdraw-history"
      );


    const withdrawals =
      data.withdrawals || [];


    if (!withdrawals.length) {

      box.innerHTML =
        "Історія виводу порожня";

      return;
    }


    box.innerHTML =
      withdrawals.map(item => `

        <div class="history-item">

          <div
            class="history-info"
          >

            <strong>
              ${item.item_name}
            </strong>


            <span style="
              color:#ffd400;
            ">
              ${Number(
                item.value || 0
              ).toFixed(2)} Core Coins
            </span>


            <span>
              Статус:
              ${formatStatus(
                item.status
              )}
            </span>


            ${
              item.trade_offer_id

                ? `
                  <small>
                    Trade Offer:
                    ${item.trade_offer_id}
                  </small>
                `

                : ""
            }

          </div>

        </div>

      `).join("");

  } catch (e) {

    console.error(
      "Withdraw history error:",
      e
    );


    box.innerHTML =
      "Не вдалося завантажити історію";
  }
}


/* =========================
   STATUS
========================= */

function formatStatus(status) {

  const value =
    String(
      status || ""
    ).toLowerCase();


  if (
    value === "pending"
  ) {
    return "🟡 Очікує";
  }


  if (
    value === "completed" ||
    value === "approved" ||
    value === "success"
  ) {
    return "🟢 Виконано";
  }


  if (
    value === "rejected" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return "🔴 Відхилено";
  }


  return status || "—";
}


/* =========================
   SKIN IMAGE
========================= */

function skinImage(name) {

  const skin =
    skins.find(
      item =>
        item.name === name
    );


  return skin?.image || "";
}


/* =========================
   CLOSE BY BACKGROUND
========================= */

$("#inventory")
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        $("#inventory")
      ) {

        $("#inventory")
          .classList
          .add("hidden");
      }
    }
  );


$("#depositModal")
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        $("#depositModal")
      ) {

        $("#depositModal")
          .classList
          .add("hidden");
      }
    }
  );


/* =========================
   HOME DASHBOARD V3
   Recent drops + top players
========================= */

function escapeHomeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


function homeTimeAgo(value) {

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          date.getTime()
        ) /
        1000
      )
    );

  if (seconds < 60) {
    return "щойно";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `${minutes} хв тому`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours} год тому`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  return `${days} дн тому`;
}


function renderHomeDrops(drops) {

  const track =
    $("#liveDropsTrack");

  if (!track) {
    return;
  }

  if (
    !Array.isArray(drops) ||
    !drops.length
  ) {

    track.classList
      .remove("is-moving");

    track.innerHTML = `
      <div class="cz-live-loading">
        Поки немає останніх дропів.
      </div>
    `;

    return;
  }

  const cards =
    drops.map(item => {

      const name =
        escapeHomeHtml(
          item.item_name
        );

      const username =
        escapeHomeHtml(
          item.username ||
          "Гравець"
        );

      const image =
        escapeHomeHtml(
          item.image || ""
        );

      const value =
        Number(
          item.value || 0
        );

      const ago =
        escapeHomeHtml(
          homeTimeAgo(
            item.created_at
          )
        );

      return `
        <article class="cz-live-drop-card">

          <div class="cz-live-drop-image">
            ${
              image
                ? `
                  <img
                    src="${image}"
                    alt="${name}"
                    loading="lazy"
                  >
                `
                : ""
            }
          </div>

          <div class="cz-live-drop-info">

            <strong class="cz-live-drop-name">
              ${name}
            </strong>

            <span class="cz-live-drop-price">
              ${value.toFixed(2)} Core Coins
            </span>

            <span class="cz-live-drop-meta">
              <b>${username}</b>
              <span>•</span>
              <span>${ago}</span>
            </span>

          </div>

        </article>
      `;
    }).join("");

  /*
    Two identical sets make a seamless
    CSS marquee. No randomness is used.
  */
  track.innerHTML = `
    <div class="cz-live-set">
      ${cards}
    </div>

    <div
      class="cz-live-set"
      aria-hidden="true"
    >
      ${cards}
    </div>
  `;

  track.classList
    .remove("is-moving");

  /*
    Restart CSS animation only after
    the DOM has been painted.
  */
  requestAnimationFrame(
    () => {

      requestAnimationFrame(
        () => {
          track.classList
            .add("is-moving");
        }
      );
    }
  );
}


function formatHomeStat(value) {

  return Number(
    value || 0
  ).toLocaleString(
    "uk-UA"
  );
}


function renderHomeStats(stats) {

  const online =
    $("#homeOnlineStat");

  const casesOpened =
    $("#homeCasesOpenedStat");

  const skinsIssued =
    $("#homeSkinsIssuedStat");

  if (online) {
    online.textContent =
      formatHomeStat(
        stats?.online || 0
      );
  }

  if (casesOpened) {
    casesOpened.textContent =
      formatHomeStat(
        stats?.casesOpened || 0
      );
  }

  if (skinsIssued) {
    skinsIssued.textContent =
      formatHomeStat(
        stats?.skinsIssued || 0
      );
  }
}


function renderHomeTopPlayers(players) {

  const box =
    $("#topPlayersList");

  if (!box) {
    return;
  }

  if (
    !Array.isArray(players) ||
    !players.length
  ) {

    box.innerHTML = `
      <div class="cz-top-empty-v3">
        Топ гравців зʼявиться
        після перших відкриттів.
      </div>
    `;

    return;
  }

  box.innerHTML =
    players
      .slice(0,5)
      .map(
        (player,index) => {

          const username =
            escapeHomeHtml(
              player.username ||
              "Гравець"
            );

          const total =
            Number(
              player.total_value || 0
            );

          const openings =
            Number(
              player.openings_count || 0
            );

          return `
            <div class="cz-top-player-row">

              <span class="cz-top-rank">
                ${index + 1}
              </span>

              <div class="cz-top-player-main">

                <strong class="cz-top-player-name">
                  ${username}
                </strong>

                <small class="cz-top-player-count">
                  ${openings} відкриттів
                </small>

              </div>

              <strong class="cz-top-player-value">
                ${total.toFixed(2)} Core Coins
              </strong>

            </div>
          `;
        }
      )
      .join("");
}


async function loadHomeDashboard() {

  const dropsTarget =
    $("#liveDropsTrack");

  const playersTarget =
    $("#topPlayersList");

  if (
    !dropsTarget &&
    !playersTarget
  ) {
    return;
  }

  try {

    const data =
      await api(
        "/api/home-dashboard"
      );

    renderHomeDrops(
      data.drops || []
    );

    renderHomeTopPlayers(
      data.topPlayers || []
    );

    renderHomeStats(
      data.stats || {}
    );

  } catch (e) {

    console.error(
      "Home dashboard error:",
      e
    );

    if (dropsTarget) {

      dropsTarget.classList
        .remove("is-moving");

      dropsTarget.innerHTML = `
        <div class="cz-live-loading">
          Не вдалося завантажити дропи.
        </div>
      `;
    }

    if (playersTarget) {

      playersTarget.innerHTML = `
        <div class="cz-top-empty-v3">
          Не вдалося завантажити топ.
        </div>
      `;
    }
  }
}


$("#promoDepositBtn")
  ?.addEventListener(
    "click",
    () => {

      $("#depositBtn")
        ?.click();
    }
  );


/* =========================
   INIT
========================= */

async function initApp() {

  try {

    await refresh();

    await loadCases();

    await loadHomeDashboard();

    /*
      Refresh public home data periodically.
      The moving animation itself is CSS.
    */
    setInterval(
      loadHomeDashboard,
      30000
    );

  } catch (e) {

    console.error(
      "Помилка запуску:",
      e
    );
  }
}



/* =========================
   UPGRADE PAGE — FINAL
========================= */

let upgradeInventoryItems = [];
let upgradeTargetItems = [];
let selectedUpgradeSources = [];
let selectedUpgradeTarget = null;
let upgradeMode = "2x";
let upgradeBusy = false;
let upgradePointerAngle = 0;
let upgradeModeRules = {};
let upgradeTargetTolerance = 0;

/*
  Visual-only upgrade result state.
  The real win/loss still comes ONLY from result.success
  returned by POST /api/upgrade.
*/
let upgradeLastResult = null;


const homeSections = () => [
  $(".cz-live-strip"),
  $(".cz-hero-v5"),
  $(".cz-home-v5-grid"),
  $(".cz-benefits-v5")
].filter(Boolean);


function showHomePage() {

  $("#upgradeSection")
    ?.classList
    .add("hidden");

  homeSections()
    .forEach(
      section =>
        section.classList
          .remove("hidden")
    );

  $("#upgradeNavBtn")
    ?.classList
    .remove("active");

  $("#casesNavBtn")
    ?.classList
    .add("active");
}


async function showUpgradePage() {

  if (!currentUser) {
    auth();
    return;
  }

  homeSections()
    .forEach(
      section =>
        section.classList
          .add("hidden")
    );

  $("#upgradeSection")
    ?.classList
    .remove("hidden");

  $("#casesNavBtn")
    ?.classList
    .remove("active");

  $("#upgradeNavBtn")
    ?.classList
    .add("active");

  await loadUpgradeData();
}


$("#upgradeNavBtn")
  ?.addEventListener(
    "click",
    showUpgradePage
  );


$("#casesNavBtn")
  ?.addEventListener(
    "click",
    showHomePage
  );


function upgradeSourceTotal() {

  return selectedUpgradeSources
    .reduce(
      (sum,item) =>
        sum +
        Number(item.value || 0),
      0
    );
}


function upgradeModeData() {

  return (
    upgradeModeRules[upgradeMode] ||
    null
  );
}


function getUpgradeTargetRange() {

  const total =
    upgradeSourceTotal();

  const mode =
    upgradeModeData();

  if (
    !total ||
    !mode
  ) {
    return {
      min:0,
      max:0
    };
  }

  const exact =
    total *
    Number(mode.multiplier);

  const tolerance =
    Number(
      upgradeTargetTolerance || 0
    );

  return {
    min:
      exact *
      (1 - tolerance),

    max:
      exact *
      (1 + tolerance)
  };
}


function getEligibleUpgradeTargets() {

  const {
    min,
    max
  } =
    getUpgradeTargetRange();

  if (!min) {
    return [];
  }

  return upgradeTargetItems
    .filter(
      item =>
        Number(item.value) >= min &&
        Number(item.value) <= max
    );
}


function calculateUpgradeChance() {

  const mode =
    upgradeModeData();

  if (
    !upgradeSourceTotal() ||
    !mode
  ) {
    return 0;
  }

  return Number(
    mode.chance
  );
}


async function loadUpgradeData() {

  const ownGrid =
    $("#upgradeInventoryGrid");

  const targetGrid =
    $("#upgradeTargetGrid");

  if (ownGrid) {
    ownGrid.innerHTML =
      `<div class="upgrade-loading">Завантаження...</div>`;
  }

  if (targetGrid) {
    targetGrid.innerHTML =
      `<div class="upgrade-loading">Оберіть свої предмети.</div>`;
  }

  try {

    const [
      inventory,
      targets,
      upgradeConfig,
      skinList
    ] =
      await Promise.all([
        api("/api/inventory"),
        api("/api/upgrade-targets"),
        api("/api/upgrade-config"),
        skins.length
          ? Promise.resolve(skins)
          : api("/api/skins")
      ]);

    upgradeModeRules =
      upgradeConfig?.modes || {};

    upgradeTargetTolerance =
      Number(
        upgradeConfig?.targetTolerance || 0
      );

    if (
      !upgradeModeRules[upgradeMode]
    ) {
      upgradeMode =
        Object.keys(
          upgradeModeRules
        )[0] ||
        "2x";
    }

    if (!skins.length) {
      skins = skinList;
    }

    upgradeInventoryItems =
      inventory
        .filter(
          item =>
            Number(item.value) > 0
        )
        .map(
          item => ({
            ...item,
            image:
              skinImage(
                item.item_name
              )
          })
        );

    upgradeTargetItems =
      targets
        .filter(
          item =>
            Number(item.value) > 0
        );

    selectedUpgradeSources =
      selectedUpgradeSources
        .filter(
          selected =>
            upgradeInventoryItems
              .some(
                item =>
                  String(item.id) ===
                  String(selected.id)
              )
        );

    if (
      selectedUpgradeTarget &&
      !getEligibleUpgradeTargets()
        .some(
          item =>
            item.name ===
            selectedUpgradeTarget.name
        )
    ) {
      selectedUpgradeTarget = null;
    }

    renderSelectedUpgradeSkins();
    renderUpgradeInventory();
    renderUpgradeTargets();
    refreshUpgradeSelection();

  } catch (e) {

    console.error(
      "Upgrade load error:",
      e
    );

    if (ownGrid) {
      ownGrid.innerHTML =
        `<div class="upgrade-loading">Не вдалося завантажити інвентар.</div>`;
    }
  }
}


function renderSelectedUpgradeSkins() {

  const box =
    $("#upgradeSelectedSkins");

  if (!box) {
    return;
  }

  const cards =
    selectedUpgradeSources
      .map(
        item => `
          <div class="upgrade-selected-card">

            <span class="selected-price">
              ${Number(item.value).toFixed(2)} Core Coins
            </span>

            <button
              type="button"
              class="selected-remove"
              onclick="
                removeUpgradeSource(
                  ${Number(item.id)}
                )
              "
            >
              ×
            </button>

            <img
              src="${item.image || ""}"
              alt="${item.item_name}"
            >

            <strong>
              ${item.item_name}
            </strong>

          </div>
        `
      );

  while (
    cards.length < 5
  ) {

    cards.push(`
      <button
        type="button"
        class="upgrade-add-slot-final"
        onclick="
          document
            .getElementById(
              'upgradeInventoryGrid'
            )
            ?.scrollIntoView({
              behavior:'smooth',
              block:'center'
            })
        "
      >
        <span>＋</span>
        <small>ДОДАТИ СКІН</small>
      </button>
    `);
  }

  box.innerHTML =
    cards.join("");
}


function renderUpgradeInventory() {

  const box =
    $("#upgradeInventoryGrid");

  if (!box) {
    return;
  }

  const query =
    String(
      $("#upgradeInventorySearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();

  const sort =
    $("#upgradeInventorySort")
      ?.value || "desc";

  let list =
    upgradeInventoryItems
      .filter(
        item =>
          !query ||
          item.item_name
            .toLowerCase()
            .includes(query)
      );

  list =
    [...list]
      .sort(
        (a,b) =>
          sort === "asc"
            ? Number(a.value) -
              Number(b.value)
            : Number(b.value) -
              Number(a.value)
      );

  $("#upgradeInventoryCount")
    .textContent =
      String(list.length);

  if (!list.length) {

    box.innerHTML = `
      <div class="upgrade-loading">
        Немає предметів для апгрейду.
      </div>
    `;

    return;
  }

  box.innerHTML =
    list.map(item => {

      const selected =
        selectedUpgradeSources
          .some(
            source =>
              String(source.id) ===
              String(item.id)
          );

      const rarityColor =
        getDropRarityColor(
          item.rarity
        );

      return `
        <button
          type="button"
          class="
            upgrade-item-final
            ${selected ? "selected" : ""}
          "
          onclick="
            toggleUpgradeSource(
              ${Number(item.id)}
            )
          "
        >

          <span class="item-price">
            ${Number(item.value).toFixed(2)} Core Coins
          </span>

          <img
            src="${item.image || ""}"
            alt="${item.item_name}"
          >

          <div class="item-name">
            ${item.item_name}
          </div>

          <div
            class="item-rarity"
            style="color:${rarityColor};"
          >
            ${item.rarity}
          </div>

        </button>
      `;
    }).join("");
}


function renderUpgradeTargets() {

  const box =
    $("#upgradeTargetGrid");

  if (!box) {
    return;
  }

  const eligible =
    getEligibleUpgradeTargets();

  const query =
    String(
      $("#upgradeTargetSearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();

  const sort =
    $("#upgradeTargetSort")
      ?.value || "asc";

  let list =
    eligible
      .filter(
        item =>
          !query ||
          item.name
            .toLowerCase()
            .includes(query)
      );

  list =
    [...list]
      .sort(
        (a,b) =>
          sort === "desc"
            ? Number(b.value) -
              Number(a.value)
            : Number(a.value) -
              Number(b.value)
      );

  $("#upgradeTargetCount")
    .textContent =
      String(list.length);

  if (!upgradeSourceTotal()) {

    box.innerHTML = `
      <div class="upgrade-loading">
        Спочатку виберіть свої предмети зліва.
      </div>
    `;

    return;
  }

  if (!list.length) {

    box.innerHTML = `
      <div class="upgrade-loading">
        Для цього режиму немає доступних предметів.
      </div>
    `;

    return;
  }

  box.innerHTML =
    list.map(item => {

      const selected =
        selectedUpgradeTarget?.name ===
        item.name;

      const rarityColor =
        getDropRarityColor(
          item.rarity
        );

      return `
        <button
          type="button"
          class="
            upgrade-item-final
            ${selected ? "selected" : ""}
          "
          onclick='chooseUpgradeTarget(
            ${JSON.stringify(item.name)}
          )'
        >

          <span class="item-price">
            ${Number(item.value).toFixed(2)} Core Coins
          </span>

          <img
            src="${item.image || ""}"
            alt="${item.name}"
          >

          <div class="item-name">
            ${item.name}
          </div>

          <div
            class="item-rarity"
            style="color:${rarityColor};"
          >
            ${item.rarity}
          </div>

        </button>
      `;
    }).join("");
}


function clearUpgradeResultFeedback() {

  upgradeLastResult = null;

  const panel =
    document.querySelector(
      ".upgrade-target-preview"
    );

  panel
    ?.classList
    .remove(
      "upgrade-result-success",
      "upgrade-result-fail"
    );
}


function renderUpgradeResultFeedback() {

  const panel =
    document.querySelector(
      ".upgrade-target-preview"
    );

  if (!panel) {
    return;
  }

  panel.classList.remove(
    "upgrade-result-success",
    "upgrade-result-fail"
  );

  if (!upgradeLastResult) {
    return;
  }

  const won =
    upgradeLastResult.success === true;

  panel.classList.add(
    won
      ? "upgrade-result-success"
      : "upgrade-result-fail"
  );

  /*
    Keep the attempted target visible after the roll,
    like in the approved reference.
    This is visual only; selectedUpgradeTarget stays cleared.
  */
  const target =
    upgradeLastResult.target;

  if (!target) {
    return;
  }

  $("#upgradeTargetEmpty")
    ?.classList
    .add("hidden");

  $("#upgradeTargetSelected")
    ?.classList
    .remove("hidden");

  const image =
    $("#upgradeTargetImage");

  if (image) {
    image.src =
      target.image || "";
  }

  const name =
    $("#upgradeTargetName");

  if (name) {
    name.textContent =
      target.name || "—";
  }

  const rarity =
    $("#upgradeTargetRarity");

  if (rarity) {

    rarity.textContent =
      target.rarity || "—";

    rarity.style.color =
      getDropRarityColor(
        target.rarity
      );
  }

  const priceText =
    Number(
      target.value || 0
    ).toFixed(2) +
    " Core Coins";

  const price =
    $("#upgradeTargetPrice");

  if (price) {
    price.textContent =
      priceText;
  }

  const range =
    $("#upgradeTargetRange");

  if (range) {
    range.textContent =
      priceText;
  }
}


function toggleUpgradeSource(id) {

  clearUpgradeResultFeedback();

  if (upgradeBusy) {
    return;
  }

  const index =
    selectedUpgradeSources
      .findIndex(
        item =>
          Number(item.id) ===
          Number(id)
      );

  if (index >= 0) {

    selectedUpgradeSources
      .splice(
        index,
        1
      );

  } else {

    if (
      selectedUpgradeSources.length >= 5
    ) {

      alert(
        "Максимум 5 предметів на один апгрейд."
      );

      return;
    }

    const item =
      upgradeInventoryItems
        .find(
          item =>
            Number(item.id) ===
            Number(id)
        );

    if (item) {
      selectedUpgradeSources
        .push(item);
    }
  }

  selectedUpgradeTarget = null;

  renderSelectedUpgradeSkins();
  renderUpgradeInventory();
  renderUpgradeTargets();
  refreshUpgradeSelection();
}


function removeUpgradeSource(id) {

  clearUpgradeResultFeedback();

  if (upgradeBusy) {
    return;
  }

  selectedUpgradeSources =
    selectedUpgradeSources
      .filter(
        item =>
          Number(item.id) !==
          Number(id)
      );

  selectedUpgradeTarget = null;

  renderSelectedUpgradeSkins();
  renderUpgradeInventory();
  renderUpgradeTargets();
  refreshUpgradeSelection();
}


function chooseUpgradeTarget(name) {

  clearUpgradeResultFeedback();

  if (upgradeBusy) {
    return;
  }

  selectedUpgradeTarget =
    getEligibleUpgradeTargets()
      .find(
        item =>
          item.name === name
      ) || null;

  renderUpgradeTargets();
  refreshUpgradeSelection();
}


$("#changeUpgradeTargetBtn")
  ?.addEventListener(
    "click",
    () => {

      clearUpgradeResultFeedback();

      selectedUpgradeTarget = null;

      renderUpgradeTargets();
      refreshUpgradeSelection();

      $("#upgradeTargetsPanel")
        ?.scrollIntoView({
          behavior:"smooth",
          block:"center"
        });
    }
  );


$("#clearUpgradeSelection")
  ?.addEventListener(
    "click",
    () => {

      if (upgradeBusy) {
        return;
      }

      clearUpgradeResultFeedback();

      selectedUpgradeSources = [];
      selectedUpgradeTarget = null;

      renderSelectedUpgradeSkins();
      renderUpgradeInventory();
      renderUpgradeTargets();
      refreshUpgradeSelection();
    }
  );


$$(".upgrade-preset-btn")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          if (upgradeBusy) {
            return;
          }

          clearUpgradeResultFeedback();

          upgradeMode =
            button.dataset.mode;

          $$(".upgrade-preset-btn")
            .forEach(
              item =>
                item.classList
                  .remove("active")
            );

          button.classList
            .add("active");

          selectedUpgradeTarget = null;

          renderUpgradeTargets();
          refreshUpgradeSelection();
        }
      );
    }
  );


function refreshUpgradeSelection() {

  const total =
    upgradeSourceTotal();

  const count =
    selectedUpgradeSources.length;

  $("#upgradeSelectedCount")
    .textContent =
      `${count}/5`;

  $("#upgradeSelectedCountBottom")
    .textContent =
      `${count}/5`;

  $("#upgradeSelectedTotal")
    .textContent =
      total.toFixed(2) + " Core Coins";

  $("#upgradeSourcePrice")
    .textContent =
      total.toFixed(2) + " Core Coins";

  const {
    min,
    max
  } =
    getUpgradeTargetRange();

  $("#upgradeTargetRangeText")
    .textContent =
      total
        ? `Доступні цілі: ${min.toFixed(2)} Core Coins — ${max.toFixed(2)} Core Coins`
        : "Оберіть свої предмети";

  const target =
    selectedUpgradeTarget;

  $("#upgradeTargetEmpty")
    ?.classList
    .toggle(
      "hidden",
      !!target
    );

  $("#upgradeTargetSelected")
    ?.classList
    .toggle(
      "hidden",
      !target
    );

  if (target) {

    $("#upgradeTargetImage").src =
      target.image || "";

    $("#upgradeTargetName")
      .textContent =
        target.name;

    $("#upgradeTargetRarity")
      .textContent =
        target.rarity;

    $("#upgradeTargetRarity")
      .style.color =
        getDropRarityColor(
          target.rarity
        );

    $("#upgradeTargetPrice")
      .textContent =
        Number(
          target.value
        ).toFixed(2) + " Core Coins";

    $("#upgradeTargetRange")
      .textContent =
        Number(
          target.value
        ).toFixed(2) + " Core Coins";

  } else {

    $("#upgradeTargetPrice")
      .textContent =
        "0.00 Core Coins";
  }

  const chance =
    calculateUpgradeChance();

  $("#upgradeChanceRing")
    ?.style
    .setProperty(
      "--chance",
      chance.toFixed(2)
    );

  $("#upgradeChance")
    .textContent =
      chance.toFixed(2) + "%";

  $("#upgradeChanceText")
    .textContent =
      chance
        ? (
            chance >= 50
              ? "ВИСОКИЙ ШАНС"
              : chance >= 20
                ? "СЕРЕДНІЙ ШАНС"
                : "РИЗИКОВИЙ ШАНС"
          )
        : "ВИБЕРИ ПРЕДМЕТИ";

  $("#upgradeMultiplier")
    .textContent =
      upgradeMode === "75"
        ? "75%"
        : upgradeMode;

  const button =
    $("#upgradeActionBtn");

  if (button) {
    button.disabled =
      upgradeBusy ||
      !count ||
      !target;
  }

  $("#upgradeActionNote")
    .textContent =
      target
        ? `Ціль: ${target.name} • шанс ${chance.toFixed(2)}%`
        : "Оберіть свої предмети та ціль справа";

  renderUpgradeResultFeedback();
}


$("#upgradeInventorySearch")
  ?.addEventListener(
    "input",
    renderUpgradeInventory
  );


$("#upgradeInventorySort")
  ?.addEventListener(
    "change",
    renderUpgradeInventory
  );


$("#upgradeTargetSearch")
  ?.addEventListener(
    "input",
    renderUpgradeTargets
  );


$("#upgradeTargetSort")
  ?.addEventListener(
    "change",
    renderUpgradeTargets
  );


$("#upgradeActionBtn")
  ?.addEventListener(
    "click",
    executeUpgrade
  );


function animateUpgradePointer(
  serverStopAngle
) {

  const pointer =
    $("#upgradePointer");

  if (!pointer) {
    return Promise.resolve();
  }

  const semanticAngle =
    (
      Number(serverStopAngle) % 360 +
      360
    ) % 360;

  /*
    Backend: 0° = top of the circle,
    clockwise.

    Existing CSS pointer is physically at
    the bottom when rotate(0deg), therefore
    +180° is ONLY a visual coordinate
    conversion. It does not determine win/loss.
  */
  const visualAngle =
    (
      semanticAngle +
      180
    ) % 360;

  const start =
    upgradePointerAngle;

  let delta =
    visualAngle -
    (start % 360);

  if (delta < 0) {
    delta += 360;
  }

  const end =
    start +
    1080 +
    delta;

  return new Promise(
    resolve => {

      const animation =
        pointer.animate(
          [
            {
              transform:
                `rotate(${start}deg)`
            },
            {
              transform:
                `rotate(${end}deg)`
            }
          ],
          {
            duration:3600,
            easing:
              "cubic-bezier(.12,.72,.18,1)",
            fill:"forwards"
          }
        );

      animation.onfinish =
        () => {

          upgradePointerAngle =
            visualAngle;

          pointer.style.transform =
            `rotate(${visualAngle}deg)`;

          resolve();
        };
    }
  );
}


async function executeUpgrade() {

  if (
    upgradeBusy ||
    !selectedUpgradeSources.length ||
    !selectedUpgradeTarget
  ) {
    return;
  }

  upgradeBusy = true;

  const button =
    $("#upgradeActionBtn");

  button.disabled = true;
  button.textContent =
    "АПГРЕЙД...";

  try {

    const result =
      await api(
        "/api/upgrade",
        {
          method:"POST",

          body:
            JSON.stringify({
              inventoryIds:
                selectedUpgradeSources
                  .map(
                    item =>
                      Number(item.id)
                  ),

              targetName:
                selectedUpgradeTarget.name,

              mode:
                upgradeMode
            })
        }
      );

    /*
      Backend is the single source of truth
      after POST /api/upgrade returns.
    */
    const serverChance =
      Number(result.chance);

    if (
      Number.isFinite(serverChance)
    ) {

      $("#upgradeChanceRing")
        ?.style
        .setProperty(
          "--chance",
          serverChance.toFixed(5)
        );

      const chanceLabel =
        $("#upgradeChance");

      if (chanceLabel) {
        chanceLabel.textContent =
          serverChance.toFixed(2) + "%";
      }
    }

    const stopAngle =
      Number(
        result.animation?.stopAngle
      );

    if (
      !Number.isFinite(stopAngle)
    ) {
      throw new Error(
        "Сервер не повернув позицію анімації"
      );
    }

    await animateUpgradePointer(
      stopAngle
    );

    /*
      The backend result is authoritative:
      success === true  -> green
      success === false -> red
    */
    upgradeLastResult =
      result;

    selectedUpgradeSources = [];
    selectedUpgradeTarget = null;

    await refresh();
    await loadUpgradeData();

    renderUpgradeResultFeedback();

  } catch (e) {

    alert(
      e.message ||
      "Не вдалося виконати апгрейд"
    );

  } finally {

    upgradeBusy = false;

    button.textContent =
      "АПГРЕЙД";

    refreshUpgradeSelection();
  }
}



initApp();
