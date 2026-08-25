const $ = s => document.querySelector(s);

let currentUser = null;
let cases = [];
let skins = [];
let activeCaseFilter = "all";


async function api(url, opts = {}) {
  const r = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...opts
  });

  const d = await r.json();

  if (!r.ok) {
    throw Error(d.error || "Помилка");
  }

  return d;
}


async function refresh() {
  const d = await api("/api/me");

  currentUser = d.user;

  $("#userLabel").textContent =
    currentUser
      ? currentUser.username
      : "Гість";

  $("#balance").textContent =
    (currentUser?.balance || 0) + " ₴";

  $("#authBtn").textContent =
    currentUser
      ? "Вийти"
      : "Увійти";
}


async function loadCases() {
  cases = await api("/api/cases");
  skins = await api("/api/skins");

  renderCases();
}


function renderCases() {

  let filteredCases = cases;

  if (activeCaseFilter === "cheap") {
    filteredCases =
      cases.filter(c => c.price <= 250);
  }

  if (activeCaseFilter === "premium") {
    filteredCases =
      cases.filter(
        c =>
          c.price > 250 &&
          c.price <= 2500
      );
  }

  if (activeCaseFilter === "expensive") {
    filteredCases =
      cases.filter(c => c.price > 2500);
  }


  $("#cases").innerHTML =
    filteredCases.map(c => {

      const total =
        c.items.reduce(
          (sum, item) =>
            sum + item[2],
          0
        );


      const items =
        c.items.map(item => {

          const chance =
            (
              (item[2] / total) *
              100
            ).toFixed(1);

          const image =
            skins.find(
              s => s.name === item[0]
            )?.image || "";


          return `
            <div class="case-item">

              <img
                src="${image}"
                class="case-item-img"
                alt="${item[0]}"
              >

              <div>

                <div>
                  ${item[0]}
                </div>

                <small>
                  ${chance}% • ${item[3]} ₴
                </small>

              </div>

            </div>
          `;
        }).join("");


      return `
        <article class="card">

          <div class="case-art case-${c.id}">

            <div class="case-box">

              <div class="case-lock">
                🔒
              </div>

              <div class="case-label">
                ${c.name}
              </div>

            </div>

          </div>

          <div class="price">
            ${c.price} ₴
          </div>

          <div class="case-items">
            ${items}
          </div>

          <button
            onclick="openCase('${c.id}')"
          >
            Відкрити кейс
          </button>

        </article>
      `;

    }).join("");
}


function filterCases(type) {
  activeCaseFilter = type;
  renderCases();
}
async function openCase(id) {
  if (!currentUser) {
    return auth();
  }

  const c = cases.find(x => x.id === id);

  if (!c) {
    return;
  }

  $("#modal").classList.remove("hidden");

  $("#modalContent").innerHTML = `
    <h2>${c.name}</h2>
    <p class="muted">
      Відкриваємо кейс...
    </p>

    <div class="reel" id="reel"></div>
  `;

  let result;

  try {
    result = await api(
      "/api/open/" + id,
      {
        method: "POST"
      }
    );
  } catch (e) {

    $("#modalContent").innerHTML = `
      <h2>${c.name}</h2>
      <h3>${e.message}</h3>
    `;

    return;
  }

  const availableSkins =
    await api("/api/skins");

  const fake =
    c.items
      .map(item => ({
        name: item[0],
        rarity: item[1],
        image:
          availableSkins.find(
            s => s.name === item[0]
          )?.image || ""
      }))
      .filter(x => x.image);


  const reel = $("#reel");


  for (let i = 0; i < 30; i++) {

    const slot =
      document.createElement("div");

    slot.className = "slot";


    if (i === 27) {

      slot.classList.add(
        "rarity-" +
        result.item.rarity
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
      );

      slot.classList.add("win");

      slot.id = "winningItem";


      const img =
        document.createElement("img");

      img.src =
        result.item.image ||
        skinImage(result.item.name);

      img.alt =
        result.item.name;

      img.style.width = "110px";
      img.style.height = "80px";
      img.style.objectFit = "contain";


      const title =
        document.createElement("div");

      title.textContent =
        result.item.name;

      title.style.fontSize = "11px";


      slot.appendChild(img);
      slot.appendChild(title);

    } else {

      const skin =
        fake[
          Math.floor(
            Math.random() *
            fake.length
          )
        ];

      if (!skin) {
        continue;
      }

      slot.classList.add(
        "rarity-" +
        skin.rarity
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
      );


      const img =
        document.createElement("img");

      img.src = skin.image;
      img.alt = skin.name;

      img.style.width = "110px";
      img.style.height = "80px";
      img.style.objectFit = "contain";


      const title =
        document.createElement("div");

      title.textContent =
        skin.name;

      title.style.fontSize = "11px";


      slot.appendChild(img);
      slot.appendChild(title);
    }


    reel.appendChild(slot);
  }


  reel.scrollLeft = 0;


  setTimeout(() => {

    const win =
      $("#winningItem");

    if (!win) {
      return;
    }

    const target =
      win.offsetLeft -
      reel.clientWidth / 2 +
      win.clientWidth / 2;

    const start =
      reel.scrollLeft;

    const distance =
      target - start;

    const duration = 3000;

    const startTime =
      performance.now();


    function animate(time) {

      const progress =
        Math.min(
          (time - startTime) /
          duration,
          1
        );


      const ease =
        1 -
        Math.pow(
          1 - progress,
          4
        );


      reel.scrollLeft =
        start +
        distance * ease;


      if (progress < 1) {

        requestAnimationFrame(
          animate
        );

      } else {

        setTimeout(() => {

          $("#modalContent").innerHTML = `

            <h2>🎉 Вітаємо!</h2>

            <div
              class="slot win"
              style="
                margin:25px auto;
                max-width:320px
              "
            >

              <img
                src="${
                  result.item.image ||
                  skinImage(result.item.name)
                }"
                alt="${result.item.name}"
                style="
                  width:180px;
                  height:130px;
                  object-fit:contain
                "
              >

              <div>
                ${result.item.name}
              </div>

              <small>
                ${result.item.rarity} ·
                ${result.item.value} ₴
              </small>

            </div>

            <button onclick="closeWin()">
              Забрати
            </button>

          `;

        }, 500);
      }
    }


    requestAnimationFrame(animate);

  }, 300);


  await refresh();
}


async function closeWin() {
  $("#modal").classList.add("hidden");

  await showInventory();
}
async function auth() {
  $("#modal").classList.remove("hidden");

  $("#modalContent").innerHTML = `
    <h2>Вхід / реєстрація</h2>

    <input
      id="u"
      placeholder="Логін"
      style="
        padding:12px;
        margin:7px;
        border-radius:8px
      "
    >

    <input
      id="p"
      type="password"
      placeholder="Пароль"
      style="
        padding:12px;
        margin:7px;
        border-radius:8px
      "
    >

    <br>

    <button onclick="login()">
      Увійти
    </button>

    <button
      class="ghost"
      onclick="register()"
    >
      Створити
    </button>

    <br><br>

    <button onclick="loginSteam()">
      🎮 Увійти через Steam
    </button>
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

        body: JSON.stringify({
          username: $("#u").value,
          password: $("#p").value
        })
      }
    );

    $("#modal").classList.add("hidden");

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

        body: JSON.stringify({
          username: $("#u").value,
          password: $("#p").value
        })
      }
    );

    $("#modal").classList.add("hidden");

    await refresh();

  } catch (e) {

    alert(e.message);
  }
}


async function sellItem(id) {

  try {

    const result =
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
        "/api/withdraw/" +
        id,
        {
          method: "POST"
        }
      );

    alert(
      "Заявка на вивід створена! ID: " +
      result.withdrawalId
    );

  } catch (e) {

    alert(e.message);
  }
}


async function showInventory() {

  if (!currentUser) {
    return auth();
  }

  const items =
    await api("/api/inventory");

  const skinList =
    await api("/api/skins");

  $("#inventory")
    .classList
    .remove("hidden");


  $("#items").innerHTML =
    items.length

      ? items.map(x => {

          const skin =
            skinList.find(
              s => s.name === x.item_name
            );

          const image =
            skin?.image || "";


          return `
            <div
              class="
                item
                rarity-${
                  x.rarity
                    .toLowerCase()
                    .replace(
                      /[^a-z0-9]+/g,
                      "-"
                    )
                }
              "
            >

              <img
                src="${image}"
                alt="${x.item_name}"
                style="
                  width:100px;
                  height:70px;
                  object-fit:contain
                "
              >

              <strong>
                ${x.item_name}
              </strong>

              <span class="muted">
                ${x.rarity} ·
                ${x.value} ₴
              </span>

              <button
                onclick="sellItem(${x.id})"
              >
                Продати за ${x.value} ₴
              </button>

              <button
                onclick="withdrawItem(${x.id})"
              >
                🎁 Вивести
              </button>

            </div>
          `;

        }).join("")

      : "<p class='muted'>Інвентар порожній.</p>";
}
$("#authBtn").onclick = async () => {

  if (currentUser) {

    await api(
      "/api/logout",
      {
        method: "POST"
      }
    );

    location.reload();

  } else {

    auth();
  }
};


$("#inventoryBtn").onclick =
  showInventory;


$("#closeInv").onclick = () => {

  $("#inventory")
    .classList
    .add("hidden");
};


$("#closeModal").onclick = () => {

  $("#modal")
    .classList
    .add("hidden");
};


$("#depositBtn").onclick = () => {

  if (!currentUser) {
    return auth();
  }

  $("#depositModal")
    .classList
    .remove("hidden");

  $("#depositInfo").innerHTML = `
    <p>Оберіть спосіб поповнення:</p>

    <div class="deposit-methods">

      <button onclick="depositMethod('privat')">
        🏦 ПриватБанк
      </button>

      <button onclick="depositMethod('oschad')">
        🏦 Ощадбанк
      </button>

      <button onclick="depositMethod('crypto')">
        ₿ Крипта
      </button>

      <button onclick="depositMethod('skins')">
        🎮 Скінами CS2
      </button>

    </div>
  `;
};


$("#closeDeposit").onclick = () => {

  $("#depositModal")
    .classList
    .add("hidden");
};


async function depositMethod(method) {

  if (!currentUser) {

    $("#depositModal")
      .classList
      .add("hidden");

    return auth();
  }
    if (method === "skins") {
    window.location.href = "/skins.html";
    return;
  }


  const info =
    $("#depositInfo");


  if (method === "privat") {

    info.innerHTML = `
      <h3>🏦 ПриватБанк</h3>

      <p class="muted">
        Поповнення через LiqPay.
      </p>

      <div class="deposit-amounts">

        <button
          onclick="startLiqPay(100)"
        >
          100 ₴
        </button>

        <button
          onclick="startLiqPay(250)"
        >
          250 ₴
        </button>

        <button
          onclick="startLiqPay(500)"
        >
          500 ₴
        </button>

        <button
          onclick="startLiqPay(1000)"
        >
          1000 ₴
        </button>

        <button
          onclick="startLiqPay(2500)"
        >
          2500 ₴
        </button>

      </div>
    `;

    return;
  }


  if (method === "oschad") {

    info.innerHTML = `
      <h3>🏦 Ощадбанк</h3>

      <p class="muted">
        Поповнення через LiqPay.
      </p>

      <div class="deposit-amounts">

        <button
          onclick="startLiqPay(100)"
        >
          100 ₴
        </button>

        <button
          onclick="startLiqPay(250)"
        >
          250 ₴
        </button>

        <button
          onclick="startLiqPay(500)"
        >
          500 ₴
        </button>

        <button
          onclick="startLiqPay(1000)"
        >
          1000 ₴
        </button>

        <button
          onclick="startLiqPay(2500)"
        >
          2500 ₴
        </button>

      </div>
    `;

    return;
  }


  if (method === "crypto") {

    info.innerHTML = `
      <h3>₿ Крипта</h3>

      <p class="muted">
        Криптовалютне поповнення
        буде підключено окремо.
      </p>
    `;

    return;
  }


  if (method === "skins") {

    showSkinDeposit();

    return;
  }
}
async function startLiqPay(amount) {

  try {

    const result = await api(
      "/api/liqpay/create",
      {
        method: "POST",

        body: JSON.stringify({
          amount
        })
      }
    );


    const form =
      document.createElement("form");

    form.method = "POST";
    form.action =
      result.checkoutUrl;

    form.style.display = "none";


    const dataInput =
      document.createElement("input");

    dataInput.type = "hidden";
    dataInput.name = "data";
    dataInput.value =
      result.data;


    const signatureInput =
      document.createElement("input");

    signatureInput.type = "hidden";
    signatureInput.name =
      "signature";

    signatureInput.value =
      result.signature;


    form.appendChild(dataInput);
    form.appendChild(
      signatureInput
    );

    document.body.appendChild(form);

    form.submit();

  } catch (e) {

    alert(
      e.message ||
      "Не вдалося створити платіж"
    );
  }
}
async function showSkinDeposit() {
  const info = $("#depositInfo");


  info.innerHTML = `
    <div class="skin-page">
    <div class="skin-tabs">

  <button
    type="button"
    onclick="depositMethod('privat')"
  >
    💳 CARD
  </button>

  <button
    type="button"
    onclick="depositMethod('crypto')"
  >
    ₿ CRYPTO
  </button>

  <button
    type="button"
    class="active"
    onclick="depositMethod('skins')"
  >
    🎮 SKINS
  </button>

</div>

      <div class="skin-header">
        <h1>PAY BY SKINS</h1>

        <div class="skin-subtitle">
          CASEZONE
          <span>DEPOSIT: DEMO</span>
          <span>ORDER TYPE: DEFAULT</span>
        </div>
      </div>

      <div class="skin-warning">
        ⚠️ Demo mode. Select skins from the inventory below.
      </div>

      <div class="skin-columns">

        <div class="skin-inventory-panel">

          <h3>
            INSERT YOUR TRADE URL
          </h3>

          <input
            id="steamTradeUrl"
            class="trade-input"
            type="text"
            placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
          >

         <div class="skin-tools">

  <input
    id="skinSearch"
    type="text"
    placeholder="Search your inventory..."
    oninput="filterDemoSkins()"
  >

  <select
    id="skinSort"
    onchange="sortDemoSkins()"
  >
    <option value="price">
      Highest price
    </option>

    <option value="name">
      Name A-Z
    </option>
  </select>

</div>

          <div
            id="demoInventory"
            class="skin-grid"
          >
            Завантаження скінів...
          </div>

        </div>


        <div class="skin-selected-panel">

          <h3>
            SELECTED
            <span id="selectedCount">0</span>
            ITEMS FOR
            <span id="selectedTotal">0.00</span> ₴
          </h3>

          <div
            id="selectedSkins"
            class="selected-skins"
          >
            <div class="selected-empty">
              Select the skins that you want to deposit
            </div>
          </div>

          <button
            class="skin-topup-button"
            onclick="submitSelectedDemoSkins()"
          >
            TOP UP
          </button>

        </div>

      </div>

    </div>
  `;

  await loadDemoInventory();
}
let demoSkins = [];
let selectedDemoSkins = [];


async function loadDemoInventory() {
  const box = $("#demoInventory");

  box.innerHTML = `
    <div class="skin-empty">
      Завантаження інвентарю...
    </div>
  `;

  try {
    const skins = await api("/api/skins");

    demoSkins = skins
      .slice(0, 50)
      .map((skin, index) => ({
        id: index,
        name: skin.name,
        image: skin.image || "",
        price: getDemoSkinPrice(index)
      }));

    selectedDemoSkins = [];

    renderDemoSkins();

    updateSelectedSkins();

  } catch (e) {

    box.innerHTML = `
      <div class="skin-empty">
        Не вдалося завантажити інвентар
      </div>
    `;
  }
}


function getDemoSkinPrice(index) {
  const prices = [
    505.40,
    275.48,
    247.44,
    68.25,
    48.24,
    35.90,
    29.50,
    22.80,
    18.40,
    15.70
  ];

  return prices[
    index % prices.length
  ];
}


function renderDemoSkins() {
  const box = $("#demoInventory");

  if (!box) {
    return;
  }

  const search =
    ($("#skinSearch")?.value || "")
      .toLowerCase()
      .trim();

  const sort =
    $("#skinSort")?.value || "price";

  let list =
    demoSkins.filter(skin =>
      skin.name
        .toLowerCase()
        .includes(search)
    );


  if (sort === "price") {
    list.sort(
      (a, b) => b.price - a.price
    );
  }

  if (sort === "name") {
    list.sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );
  }


  if (!list.length) {

    box.innerHTML = `
      <div class="skin-empty">
        Скіни не знайдено
      </div>
    `;

    return;
  }


  box.innerHTML = list.map(skin => {

    const selected =
      selectedDemoSkins.some(
        x => x.id === skin.id
      );


    return `
      <button
        type="button"
        class="inventory-skin ${
          selected ? "selected" : ""
        }"
        onclick="toggleDemoSkin(${skin.id})"
      >

        <div class="skin-condition">
          DEMO
        </div>

        <img
          src="${skin.image}"
          alt="${skin.name}"
        >

        <div class="inventory-skin-name">
          ${skin.name}
        </div>

        <div class="inventory-skin-price">
          ${skin.price.toFixed(2)} ₴
        </div>

      </button>
    `;

  }).join("");
}


function toggleDemoSkin(id) {

  const skin =
    demoSkins.find(
      x => x.id === id
    );

  if (!skin) {
    return;
  }


  const index =
    selectedDemoSkins.findIndex(
      x => x.id === id
    );


  if (index >= 0) {

    selectedDemoSkins.splice(
      index,
      1
    );

  } else {

    selectedDemoSkins.push(skin);
  }


  renderDemoSkins();

  updateSelectedSkins();
}


function filterDemoSkins() {
  renderDemoSkins();
}


function sortDemoSkins() {
  renderDemoSkins();
}


function updateSelectedSkins() {

  const box =
    $("#selectedSkins");

  const count =
    $("#selectedCount");

  const total =
    $("#selectedTotal");


  if (!box) {
    return;
  }


  const sum =
    selectedDemoSkins.reduce(
      (result, skin) =>
        result + skin.price,
      0
    );


  if (count) {
    count.textContent =
      selectedDemoSkins.length;
  }


  if (total) {
    total.textContent =
      sum.toFixed(2);
  }


  if (!selectedDemoSkins.length) {

    box.innerHTML = `
      <div class="selected-empty">
        Select the skins that you want to deposit
      </div>
    `;

    return;
  }


  box.innerHTML =
    selectedDemoSkins.map(skin => `
      <div class="selected-skin">

        <img
          src="${skin.image}"
          alt="${skin.name}"
        >

        <div class="selected-skin-info">

          <strong>
            ${skin.name}
          </strong>

          <span>
            ${skin.price.toFixed(2)} ₴
          </span>

        </div>

        <button
          type="button"
          onclick="toggleDemoSkin(${skin.id})"
        >
          ×
        </button>

      </div>
    `).join("");
}


async function submitSelectedDemoSkins() {
  const selected = [
    ...document.querySelectorAll(
      "#demoInventory input[type='checkbox']:checked"
    )
  ];

  if (!selected.length) {
    alert("Спочатку виберіть скін.");
    return;
  }

  const skinsToSend = selected.map(input => ({
    name: decodeURIComponent(
      input.dataset.name
    )
  }));

  let created = 0;

  try {

    for (const skin of skinsToSend) {

      const value = Number(
        prompt(
          `Тестова вартість для:\n${skin.name}`,
          "100"
        )
      );

      if (!value || value <= 0) {
        continue;
      }

      await api(
        "/api/skin-deposit",
        {
          method: "POST",

          body: JSON.stringify({
            skinName: skin.name,
            value
          })
        }
      );

      created++;
    }

    alert(
      `Створено заявок: ${created}`
    );

    showSkinDeposit();

  } catch (e) {

    alert(
      e.message ||
      "Не вдалося створити заявку"
    );
  }
}
/* =========================
   ПРОФІЛЬ
========================= */

const profileBtn =
  document.getElementById("profileBtn");

const profileModal =
  document.getElementById("profileModal");

const closeProfile =
  document.getElementById("closeProfile");

const profileTabs =
  document.querySelectorAll(".profile-tab");

const profileSettings =
  document.getElementById("profileSettings");

const profileDeposits =
  document.getElementById("profileDeposits");

const profileWithdrawals =
  document.getElementById("profileWithdrawals");

const steamTradeUrl =
  document.getElementById("steamTradeUrl");

const saveTradeUrl =
  document.getElementById("saveTradeUrl");

const tradeUrlStatus =
  document.getElementById("tradeUrlStatus");


profileBtn?.addEventListener(
  "click",
  async () => {

    profileModal.classList.remove("hidden");

    try {

      const data =
        await api("/api/me");

      if (
  data.user &&
  data.user.trade_url
) {
  steamTradeUrl.value =
    data.user.trade_url;
}

    } catch (e) {

      console.error(
        "Profile load error:",
        e
      );
    }
  }
);


closeProfile?.addEventListener(
  "click",
  () => {

    profileModal.classList.add("hidden");

  }
);


profileModal?.addEventListener(
  "click",
  (e) => {

    if (e.target === profileModal) {
      profileModal.classList.add("hidden");
    }

  }
);


profileTabs.forEach(
  tab => {

    tab.addEventListener(
      "click",
      () => {

        profileTabs.forEach(
          btn =>
            btn.classList.remove("active")
        );

        tab.classList.add("active");


        profileSettings.classList.add(
          "hidden"
        );

        profileDeposits.classList.add(
          "hidden"
        );

        profileWithdrawals.classList.add(
          "hidden"
        );


        const selected =
          tab.dataset.tab;


        if (selected === "settings") {

          profileSettings.classList.remove(
            "hidden"
          );

        }


        if (selected === "deposits") {

          profileDeposits.classList.remove(
            "hidden"
          );

        }


        if (selected === "withdrawals") {

          profileWithdrawals.classList.remove(
            "hidden"
          );

        }

      }
    );

  }
  );
  /* =========================
   ЗБЕРЕЖЕННЯ STEAM TRADE URL
========================= */

saveTradeUrl?.addEventListener(
  "click",
  async () => {

    const tradeUrl =
      steamTradeUrl.value.trim();

    tradeUrlStatus.textContent = "";

    if (!tradeUrl) {
      tradeUrlStatus.textContent =
        "Вставте Steam Trade URL";
      return;
    }

    try {

      await api(
        "/api/trade-url",
        {
          method: "POST",

          body: JSON.stringify({
            tradeUrl
          })
        }
      );

      tradeUrlStatus.textContent =
        "✅ Trade URL збережено";

    } catch (e) {

      tradeUrlStatus.textContent =
        e.message ||
        "Не вдалося зберегти Trade URL";

    }
  }
);
async function initApp() {
  try {
    await refresh();
    await loadCases();
  } catch (e) {
    console.error("Помилка запуску:", e);
  }
}

initApp();
