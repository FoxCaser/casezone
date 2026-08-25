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
      ).toFixed(2) + " ₴";
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
      <div style="
        grid-column:1/-1;
        padding:50px;
        text-align:center;
        color:#777;
      ">
        У цій категорії
        поки немає кейсів.
      </div>
    `;

    return;
  }

  container.innerHTML =
    filteredCases
      .map((c, index) => {

        const theme =
          getCaseTheme(index);

        const artwork =
          getCaseArtwork(c, index);

        const itemCount =
          Array.isArray(c.items)
            ? c.items.length
            : 0;

        return `
          <article
            class="case-card"
            data-case-id="${c.id}"
            style="
              --case-main:${theme.main};
              --case-dark:${theme.dark};
              --case-glow:${theme.glow};
            "
          >

            <div
              class="cz-new-case-visual"
              style="
                position:relative;
                z-index:2;
                height:180px;
                margin:-8px -8px 8px;
                overflow:hidden;
                border-radius:14px;
              "
            >
              <img
                src="${artwork}"
                alt="${c.name}"
                loading="lazy"
                style="
                  display:block;
                  width:100%;
                  height:100%;
                  object-fit:cover;
                  object-position:center;
                  border-radius:14px;
                  filter:
                    saturate(1.05)
                    contrast(1.04);
                  transition:
                    transform .22s ease,
                    filter .22s ease;
                "
                onerror="
                  this.style.display='none';
                "
              >
            </div>

            <div
              style="
                position:relative;
                z-index:3;
              "
            >

              <h3
                style="
                  margin:7px 0 5px;
                "
              >
                ${c.name}
              </h3>

              <div
                style="
                  color:#777;
                  font-size:10px;
                  margin-bottom:11px;
                "
              >
                ${itemCount}
                предметів
              </div>

              <div
                style="
                  display:flex;
                  align-items:center;
                  justify-content:space-between;
                  gap:8px;
                "
              >

                <strong
                  style="
                    color:${theme.main};
                    font-size:17px;
                    text-shadow:
                      0 0 12px
                      ${theme.glow};
                  "
                >
                  ${Number(c.price)} ₴
                </strong>

                <button
                  type="button"
                  onclick="
                    showCaseDetails('${c.id}')
                  "
                  style="
                    background:${theme.main};
                    color:#080808;
                  "
                >
                  Відкрити
                </button>

              </div>

            </div>

          </article>
        `;

      })
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
========================= */

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

  modal.classList.remove("hidden");

  content.innerHTML = `
    <div style="
      min-height:520px;
      padding:4px;
    ">

      <div style="
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:20px;
        margin-bottom:14px;
      ">

        <div>
          <div style="
            color:#ffd400;
            font-size:10px;
            font-weight:900;
            letter-spacing:2px;
            margin-bottom:5px;
          ">
            CASEZONE
          </div>

          <h2 style="
            margin:0;
            font-size:30px;
          ">
            ${selectedCase.name}
          </h2>

          <p style="
            margin:6px 0 0;
            color:#8f8f8f;
            font-size:13px;
          ">
            Подивись, які предмети можуть випасти з цього кейса
          </p>
        </div>

      </div>

      <div style="
        position:relative;
        min-height:210px;
        display:grid;
        place-items:center;
        overflow:hidden;
        border:1px solid rgba(255,212,0,.12);
        border-radius:18px;
        background:
          radial-gradient(
            circle at 50% 52%,
            rgba(255,212,0,.15),
            transparent 32%
          ),
          linear-gradient(
            180deg,
            #141414,
            #0d0d0d
          );
        margin-bottom:22px;
      ">

        <div style="
          position:absolute;
          width:300px;
          height:110px;
          border-radius:50%;
          background:rgba(255,212,0,.14);
          filter:blur(42px);
        "></div>

        <img
          src="${getCaseArtwork(selectedCase, Math.max(0, cases.indexOf(selectedCase)))}"
          alt="${selectedCase.name}"
          style="
            position:relative;
            z-index:2;
            width:min(330px,72%);
            height:190px;
            object-fit:cover;
            object-position:center;
            border-radius:16px;
            filter:
              drop-shadow(0 22px 30px rgba(0,0,0,.45))
              saturate(1.05);
          "
        >

      </div>

      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
      ">
        <strong style="
          font-size:14px;
        ">
          🎁 Можливі дропи
        </strong>

        <span style="
          color:#777;
          font-size:11px;
        ">
          ${Array.isArray(selectedCase.items) ? selectedCase.items.length : 0}
          предметів
        </span>
      </div>

      <div
        id="casePossibleDrops"
        style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit, minmax(130px, 1fr));
          gap:10px;
          margin-bottom:22px;
        "
      >
        <div style="
          grid-column:1/-1;
          padding:28px;
          text-align:center;
          color:#777;
        ">
          Завантаження предметів...
        </div>
      </div>

      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        flex-wrap:wrap;
        margin:0 0 16px;
        padding:14px;
        border:1px solid rgba(255,255,255,.07);
        border-radius:12px;
        background:#101010;
      ">

        <span style="
          color:#888;
          font-size:12px;
          margin-right:4px;
        ">
          Кількість:
        </span>

        ${[1,2,3,4,5].map(q => `
          <button
            type="button"
            class="case-qty-btn ${q === 1 ? "active" : ""}"
            data-qty="${q}"
            onclick="setCaseOpenQuantity(${q}, ${Number(selectedCase.price)})"
            style="
              width:42px;
              height:38px;
              border-radius:9px;
              border:1px solid ${q === 1 ? "#ffd400" : "rgba(255,255,255,.10)"};
              background:${q === 1 ? "#ffd400" : "#171717"};
              color:${q === 1 ? "#111" : "#aaa"};
              font-weight:900;
              cursor:pointer;
            "
          >
            x${q}
          </button>
        `).join("")}

      </div>

      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        flex-wrap:wrap;
        padding-top:16px;
        border-top:1px solid rgba(255,255,255,.07);
      ">

        <button
          type="button"
          onclick="
            $('#modal').classList.add('hidden')
          "
          style="
            min-height:46px;
            padding:0 18px;
            border:1px solid rgba(255,255,255,.1);
            border-radius:11px;
            background:#141414;
            color:#bbb;
            font-weight:800;
          "
        >
          ← Назад
        </button>

        <button
          id="caseOpenBtn"
          type="button"
          onclick="
            startCaseOpening('${selectedCase.id}', selectedOpenQuantity)
          "
          style="
            min-width:260px;
            min-height:50px;
            padding:0 24px;
            border-radius:12px;
            background:#ffd400;
            color:#111;
            font-weight:950;
            font-size:14px;
            box-shadow:
              0 0 28px rgba(255,212,0,.16);
          "
        >
          🔓 Відкрити x1 —
          ${Number(selectedCase.price).toFixed(0)} ₴
        </button>

      </div>

    </div>
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
        <div style="
          grid-column:1/-1;
          padding:30px;
          text-align:center;
          color:#777;
        ">
          У цьому кейсі поки немає предметів.
        </div>
      `;

      return;
    }

    dropsBox.innerHTML =
      items.map((item, index) => {

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
          <div style="
            position:relative;
            overflow:hidden;
            min-height:150px;
            padding:10px;
            border:
              1px solid
              ${rarityColor}55;
            border-radius:12px;
            background:
              linear-gradient(
                180deg,
                ${rarityColor}12,
                #111 58%
              );
          ">

            <div style="
              position:absolute;
              left:15%;
              right:15%;
              bottom:-18px;
              height:45px;
              border-radius:50%;
              background:${rarityColor};
              opacity:.16;
              filter:blur(22px);
            "></div>

            ${
              image
                ? `
                  <img
                    src="${image}"
                    alt="${itemName}"
                    style="
                      position:relative;
                      z-index:2;
                      width:100%;
                      height:92px;
                      object-fit:contain;
                    "
                         >
                ` : `
                  <div style="
                    height:92px;
                    display:grid;
                    place-items:center;
                    color:#555;
                    font-size:11px;
                  ">
                    Немає фото
                  </div>
                `
            }

            <div style="
              position:relative;
              z-index:2;
              margin-top:5px;
            ">
              <strong style="
                display:block;
                font-size:11px;
                line-height:1.3;
              ">
                ${itemName}
              </strong>

              <span style="
                display:block;
                margin-top:4px;
                color:${rarityColor};
                font-size:9px;
                text-transform:uppercase;
              ">
                ${rarity}
              </span>
            </div>

          </div>
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
        <div style="
          grid-column:1/-1;
          padding:30px;
          text-align:center;
          color:#ff6767;
        ">
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

      button.style.borderColor =
        active
          ? "#ffd400"
          : "rgba(255,255,255,.10)";

      button.style.background =
        active
          ? "#ffd400"
          : "#171717";

      button.style.color =
        active
          ? "#111"
          : "#aaa";
    });

  const openButton =
    $("#caseOpenBtn");

  if (openButton) {

    const total =
      Number(price || 0) *
      selectedOpenQuantity;

    openButton.innerHTML =
      `🔓 Відкрити x${selectedOpenQuantity} — ${total.toFixed(0)} ₴`;
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
      `Недостатньо коштів. Потрібно ${totalPrice.toFixed(2)} ₴`
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
    <div style="
      position:relative;
      overflow:hidden;
      padding:8px 6px 18px;
    ">

      <div style="
        text-align:center;
        margin-bottom:16px;
      ">

        <div style="
          color:#ffd400;
          font-size:10px;
          font-weight:900;
          letter-spacing:2px;
        ">
          CASEZONE DROP
        </div>

        <h2 style="
          margin:8px 0 4px;
          font-size:28px;
        ">
          ${selectedCase.name}
        </h2>

        <p style="
          margin:0;
          color:#888;
          font-size:13px;
        ">
          Відкриваємо ${quantity}
          ${quantity === 1 ? "кейс" : "кейси"}...
        </p>

      </div>

      <div
        id="multiReels"
        style="
          display:grid;
          gap:10px;
        "
      ></div>

      <div style="
        margin-top:14px;
        text-align:center;
        color:#777;
        font-size:11px;
      ">
        Результат кожного відкриття визначається сервером
      </div>

    </div>
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
          padding:10px 0;
        ">

          <div
            class="reel"
            id="reel-${reelIndex}"
            style="
              position:relative;
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

        </div>
      `
    ).join("");

  /* ЖОВТА ЛІНІЯ ПОВЕРХ КОЖНОЇ РУЛЕТКИ */
  reelsBox
    .querySelectorAll(":scope > div")
    .forEach(wrapper => {

      wrapper.style.position = "relative";

      const marker =
        document.createElement("div");

      marker.className =
        "cz-fixed-center-marker";

      marker.style.cssText = `
        position:absolute;
        left:50%;
        top:10px;
        bottom:10px;
        width:4px;
        transform:translateX(-50%);
        background:#ffd400;
        z-index:999999;
        pointer-events:none;
        box-shadow:
          0 0 5px #ffd400,
          0 0 12px #ffd400,
          0 0 22px rgba(255,212,0,.95);
      `;

      const topArrow =
        document.createElement("div");

      topArrow.style.cssText = `
        position:absolute;
        left:50%;
        top:8px;
        transform:translate(-50%,-1px);
        width:0;
        height:0;
        border-left:10px solid transparent;
        border-right:10px solid transparent;
        border-top:14px solid #ffd400;
        z-index:1000000;
        pointer-events:none;
        filter:drop-shadow(0 0 5px #ffd400);
      `;

      const bottomArrow =
        document.createElement("div");

      bottomArrow.style.cssText = `
        position:absolute;
        left:50%;
        bottom:8px;
        transform:translate(-50%,1px);
        width:0;
        height:0;
        border-left:10px solid transparent;
        border-right:10px solid transparent;
        border-bottom:14px solid #ffd400;
        z-index:1000000;
        pointer-events:none;
        filter:drop-shadow(0 0 5px #ffd400);
      `;

      wrapper.appendChild(marker);
      wrapper.appendChild(topArrow);
      wrapper.appendChild(bottomArrow);
    });

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
    <div style="
      text-align:center;
      padding:12px;
        ">

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
                ).toFixed(2)} ₴
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
          ${totalValue.toFixed(2)} ₴
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
========================= */

async function showInventory() {

  if (!currentUser) {

    auth();
    return;
  }


  try {

    const items =
      await api(
        "/api/inventory"
      );


    const skinList =
      await api(
        "/api/skins"
      );


    $("#inventory")
      ?.classList
      .remove("hidden");


    const itemsBox =
      $("#items");


    if (!itemsBox) {
      return;
    }


    if (!items.length) {

      itemsBox.innerHTML = `

        <div style="
          grid-column:1/-1;
          padding:45px;
          text-align:center;
          color:#777;
        ">
          Інвентар порожній.
        </div>
      `;

      return;
    }


    itemsBox.innerHTML =
      items.map(item => {

        const skin =
          skinList.find(
            skin =>
              skin.name ===
              item.item_name
          );


        const image =
          skin?.image || "";


        const rarity =
          String(
            item.rarity || ""
          )
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              "-"
            );


        return `

          <div
            class="
              item
              rarity-${rarity}
            "
          >

            <img
              src="${image}"
              alt="${item.item_name}"
            >


            <strong style="
              display:block;
              margin-top:8px;
            ">
              ${item.item_name}
            </strong>


            <span style="
              display:block;
              margin-top:5px;
              color:#777;
              font-size:11px;
            ">
              ${item.rarity}
            </span>


            <strong style="
              display:block;
              margin-top:5px;
              color:#ffd400;
            ">
              ${Number(
                item.value || 0
              ).toFixed(2)} ₴
            </strong>


            <div style="
              display:grid;
              gap:7px;
              margin-top:12px;
            ">

              <button
                type="button"
                onclick="
                  sellItem(${item.id})
                "
              >
                Продати
              </button>


              <button
                type="button"
                onclick="
                  withdrawItem(${item.id})
                "
              >
                Вивести на Steam
              </button>

            </div>

          </div>
        `;

      }).join("");

  } catch (e) {

    alert(
      e.message ||
      "Не вдалося завантажити інвентар"
    );
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
========================= */

$("#depositBtn")
  ?.addEventListener(
    "click",
    () => {

      if (!currentUser) {

        auth();
        return;
      }


      $("#depositModal")
        ?.classList
        .remove("hidden");


      const depositInfo =
        $("#depositInfo");


      if (!depositInfo) {
        return;
      }


      depositInfo.innerHTML = `

        <p style="
          color:#888;
        ">
          Оберіть спосіб поповнення:
        </p>


        <div
          class="deposit-methods"
          style="
            display:grid;
            grid-template-columns:
              repeat(
                auto-fit,
                minmax(150px,1fr)
              );
            gap:9px;
          "
        >

          <button
            type="button"
            onclick="
              depositMethod('privat')
            "
          >
            🏦 ПриватБанк
          </button>


          <button
            type="button"
            onclick="
              depositMethod('oschad')
            "
          >
            🏦 Ощадбанк
          </button>


          <button
            type="button"
            onclick="
              depositMethod('crypto')
            "
          >
            ₿ Крипта
          </button>


          <button
            type="button"
            onclick="
              depositMethod('skins')
            "
          >
            🎮 Скінами CS2
          </button>

        </div>
      `;
         }
  );
$("#closeDeposit")
  ?.addEventListener(
    "click",
    () => {

      $("#depositModal")
        ?.classList
        .add("hidden");
    }
  );


async function depositMethod(method) {

  if (!currentUser) {

    $("#depositModal")
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


  const info =
    $("#depositInfo");


  if (!info) {
    return;
  }


  if (
    method === "privat" ||
    method === "oschad"
  ) {

    const bankName =
      method === "privat"
        ? "ПриватБанк"
        : "Ощадбанк";


    info.innerHTML = `

      <h3>
        🏦 ${bankName}
      </h3>

      <p style="
        color:#888;
      ">
        Поповнення через LiqPay.
      </p>


      <div
        class="deposit-amounts"
        style="
          display:flex;
          flex-wrap:wrap;
          gap:8px;
        "
      >

        ${[
          100,
          250,
          500,
          1000,
          2500
        ].map(amount => `

          <button
            type="button"
            onclick="
              startLiqPay(${amount})
            "
          >
            ${amount} ₴
          </button>

        `).join("")}

      </div>
    `;

    return;
  }


  if (method === "crypto") {

    info.innerHTML = `

      <h3>
        ₿ Крипта
      </h3>

      <p style="
        color:#888;
          ">
        Криптовалютне поповнення
        буде підключено окремо.
      </p>
    `;
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
========================= */

const profileBtn =
  $("#profileBtn");

const profileModal =
  $("#profileModal");

const closeProfile =
  $("#closeProfile");

const profileTabs =
  $$(".profile-tab");

const profileSettings =
  $("#profileSettings");

const profileDeposits =
  $("#profileDeposits");

const profileWithdrawals =
  $("#profileWithdrawals");

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


/* =========================
   HEADER STEAM AVATAR
========================= */

steamAvatarBtn
  ?.addEventListener(
    "click",
    () => {

      profileBtn?.click();
    }
  );


/* =========================
   OPEN PROFILE
========================= */

profileBtn
  ?.addEventListener(
    "click",
    async () => {
  if (!currentUser) {

        auth();
        return;
      }


      profileModal
        ?.classList
        .remove("hidden");


      try {

        const data =
          await api("/api/me");


        if (
          steamTradeUrl &&
          data.user?.trade_url
        ) {

          steamTradeUrl.value =
            data.user.trade_url;
        }


        if (profileSteamId) {

          profileSteamId.textContent =
            data.user?.steam_id ||
            "Не підключено";
        }

      } catch (e) {

        console.error(
          "Profile load error:",
          e
        );
      }
    }
  );


/* =========================
   CLOSE PROFILE
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


profileModal
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        profileModal
      ) {

        profileModal
          .classList
          .add("hidden");
      }
    }
  );


/* =========================
   PROFILE TABS
========================= */

profileTabs.forEach(
  tab => {

    tab.addEventListener(
      "click",
      () => {

        profileTabs.forEach(
          button =>
            button.classList
              .remove("active")
        );


        tab.classList.add(
          "active"
        );


        profileSettings
          ?.classList
          .add("hidden");

        profileDeposits
          ?.classList
          .add("hidden");

        profileWithdrawals
          ?.classList
          .add("hidden");


        const selected =
          tab.dataset.tab;


        if (
          selected ===
          "settings"
        ) {

          profileSettings
            ?.classList
            .remove("hidden");
        }


        if (
          selected ===
          "deposits"
        ) {

          profileDeposits
            ?.classList
            .remove("hidden");

          loadDepositHistory();
        }


        if (
          selected ===
          "withdrawals"
        ) {

          profileWithdrawals
            ?.classList
            .remove("hidden");

          loadWithdrawHistory();
        }
      }
    );
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
                ).toFixed(2)} ₴
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
              ).toFixed(2)} ₴
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
   INIT
========================= */

async function initApp() {

  try {

    await refresh();

    await loadCases();

  } catch (e) {

    console.error(
      "Помилка запуску:",
      e
    );
  }
}


initApp();
