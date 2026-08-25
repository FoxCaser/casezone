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


/* =========================
   API
========================= */

async function api(url, opts = {}) {

  const response = await fetch(
    url,
    {
      headers: {
        "Content-Type": "application/json"
      },

      ...opts
    }
  );


  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }


  if (!response.ok) {

    const error =
      new Error(
        data.error ||
        "Помилка сервера"
      );

    error.status =
      response.status;

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
}


/* =========================
   CASES
========================= */

async function loadCases() {

  cases =
    await api("/api/cases");

  skins =
    await api("/api/skins");

  renderCases();
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
      <div style="
        grid-column:1/-1;
        padding:40px;
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

        const itemCount =
          Array.isArray(c.items)
            ? c.items.length
            : 0;


        const previewNames =
          Array.isArray(c.items)
            ? c.items
                .slice(0, 3)
                .map(item => item[0])
                .join(" • ")
            : "";


        return `
          <div
            class="case-card"
            data-case-id="${c.id}"
          >

            <div
              style="
                position:relative;
                z-index:2;
                height:135px;
                display:grid;
                place-items:center;
              "
            >

              <div
                style="
                  width:118px;
                  height:88px;
                  display:grid;
                  place-items:center;
                  border-radius:15px;
                  border:2px solid rgba(255,255,255,.18);
                  background:
                    linear-gradient(
                      145deg,
                      #252525,
                      #101010
                    );
                  box-shadow:
                    0 18px 35px rgba(0,0,0,.55);
                  font-size:29px;
                  font-weight:1000;
                  letter-spacing:-2px;
                  color:#fff;
                "
              >
                CZ
              </div>

            </div>


            <h3>
              ${c.name}
            </h3>


            <p style="
              margin:0 0 5px;
              font-size:12px;
            ">
              ${itemCount} предметів
            </p>


            <p style="
              min-height:30px;
              margin:0 0 12px;
              font-size:10px;
              line-height:1.4;
            ">
              ${previewNames}
            </p>


            <div style="
              position:relative;
              z-index:2;
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:10px;
            ">

              <strong style="
                color:#ffd400;
                font-size:17px;
              ">
                ${Number(c.price)} ₴
              </strong>


              <button
                type="button"
                onclick="openCase('${c.id}')"
              >
                Відкрити
              </button>

            </div>

          </div>
        `;

      })
      .join("");
}


/* =========================
   FILTER CASES
========================= */

function filterCases(type) {

  activeCaseFilter = type;


  $$(".filter").forEach(
    button => {

      button.classList.remove(
        "active"
      );
    }
  );


  const buttons =
    [...$$(".filter")];


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
   OPEN CASE
========================= */

async function openCase(id) {

  if (!currentUser) {

    auth();
    return;
  }


  const selectedCase =
    cases.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!selectedCase) {
    return;
  }


  $("#modal")
    ?.classList
    .remove("hidden");


  $("#modalContent").innerHTML = `

    <div style="
      text-align:center;
      padding:10px;
    ">

      <div style="
        color:#ffd400;
        font-size:11px;
        font-weight:900;
        letter-spacing:2px;
      ">
        CASEZONE
      </div>

      <h2>
        ${selectedCase.name}
      </h2>

      <p style="color:#888;">
        Відкриваємо кейс...
      </p>

    </div>

    <div
      class="reel"
      id="reel"
    ></div>
  `;


  let result;


  try {

    result =
      await api(
        "/api/open/" + id,
        {
          method: "POST"
        }
      );

  } catch (e) {

    $("#modalContent").innerHTML = `

      <div style="
        text-align:center;
        padding:30px;
      ">

        <h2>
          ${selectedCase.name}
        </h2>

        <p style="
          color:#ff5d5d;
        ">
          ${e.message}
        </p>

      </div>
    `;

    return;
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


  const reel =
    $("#reel");


  if (!reel) {
    return;
  }


  reel.innerHTML = "";


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
        "winningItem";

      slot.classList.add(
        "win"
      );

    } else {

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


    slot.innerHTML = `

      <img
        src="${currentItem.image}"
        alt="${currentItem.name}"
        style="
          width:110px;
          height:80px;
          object-fit:contain;
        "
      >

      <div style="
        font-size:11px;
        text-align:center;
      ">
        ${currentItem.name}
      </div>
    `;


    reel.appendChild(slot);
  }


  reel.scrollLeft = 0;


  setTimeout(
    () => {

      const winningItem =
        $("#winningItem");


      if (!winningItem) {
        return;
      }


      const target =
        winningItem.offsetLeft -
        reel.clientWidth / 2 +
        winningItem.clientWidth / 2;


      const start =
        reel.scrollLeft;


      const distance =
        target - start;


      const duration =
        3000;


      const startTime =
        performance.now();


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


        reel.scrollLeft =
          start +
          distance *
          ease;


        if (progress < 1) {

          requestAnimationFrame(
            animate
          );

          return;
        }


        setTimeout(
          () => {

            $("#modalContent")
              .innerHTML = `

              <div style="
                text-align:center;
                padding:15px;
              ">

                <div style="
                  color:#ffd400;
                  font-size:11px;
                  font-weight:900;
                  letter-spacing:2px;
                ">
                  CASEZONE DROP
                </div>

                <h2>
                  🎉 Вітаємо!
                </h2>


                <div
                  class="
                    slot
                    win
                  "
                  style="
                    margin:25px auto;
                    max-width:330px;
                  "
                >

                  <img
                    src="${
                      result.item.image ||
                      skinImage(
                        result.item.name
                      )
                    }"
                    alt="${
                      result.item.name
                    }"
                    style="
                      width:190px;
                      height:140px;
                      object-fit:contain;
                    "
                  >


                  <strong style="
                    display:block;
                    margin-top:10px;
                  ">
                    ${result.item.name}
                  </strong>


                  <small style="
                    color:#ffd400;
                  ">
                    ${result.item.rarity}
                    •
                    ${result.item.value} ₴
                  </small>

                </div>


                <button
                  type="button"
                  onclick="closeWin()"
                  style="
                    padding:13px 22px;
                    border-radius:10px;
                    background:#ffd400;
                    color:#111;
                    font-weight:900;
                  "
                >
                  Забрати
                </button>

              </div>
            `;

          },
          450
        );
      }


      requestAnimationFrame(
        animate
      );

    },
    250
  );


  await refresh();
}


/* =========================
   WIN CLOSE
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


  $("#modalContent").innerHTML = `

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
          border:1px solid #2c2c2c;
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
          border:1px solid #2c2c2c;
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
            padding:12px 18px;
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
            padding:12px 18px;
            border-radius:9px;
            background:#181818;
            color:#fff;
            border:1px solid #2e2e2e;
          "
        >
          Створити акаунт
        </button>

      </div>


      <button
        type="button"
        onclick="loginSteam()"
        style="
          width:100%;
          margin-top:10px;
          padding:13px;
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
          padding:40px;
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
            s =>
              s.name ===
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
                item.value
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
   MAIN BUTTON EVENTS
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


      $("#depositInfo")
        .innerHTML = `

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
        tradeUrlStatus.textContent = "";
      }


      if (!tradeUrl) {

        if (tradeUrlStatus) {

          tradeUrlStatus.textContent =
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


        tradeUrlStatus.textContent =
          "✅ Trade URL збережено";


      } catch (e) {

        tradeUrlStatus.textContent =
          e.message ||
          "Не вдалося зберегти Trade URL";
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
                    alt="${item.skin_name}"
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
   STATUS TEXT
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
   FALLBACK SKIN IMAGE
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
   CLOSE MODALS BY BACKDROP
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
