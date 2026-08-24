let demoSkins = [];
let selectedDemoSkins = [];


/* =========================
   ЗАВАНТАЖЕННЯ STEAM ІНВЕНТАРЮ
========================= */

async function loadSkins() {

  const box =
    document.querySelector("#demoInventory");

  if (!box) {
    return;
  }

  box.innerHTML = `
    <div class="skin-empty">
      Завантаження Steam-інвентарю...
    </div>
  `;

  try {

    const response =
      await fetch("/api/my-steam-inventory", {
        credentials: "include"
      });

    if (!response.ok) {
      const errorData =
        await response.json().catch(() => null);

      throw new Error(
        errorData?.error ||
        "Не вдалося отримати Steam-інвентар"
      );
    }

    const data =
      await response.json();

    const items =
      Array.isArray(data.items)
        ? data.items
        : [];

    demoSkins = items.map(item => ({
      id: item.assetid,
      name: item.name || "Unknown skin",
      image: item.image || "",
      assetid: item.assetid,
      price: Number(item.price) || 0
    }));

    selectedDemoSkins = [];

    renderSkins();
    updateSelected();

  } catch (error) {

    console.error(
      "Steam inventory loading error:",
      error
    );

    box.innerHTML = `
      <div class="skin-empty">
        ${error.message}
      </div>
    `;
  }
}
/* =========================
   ВІДОБРАЖЕННЯ СКІНІВ
========================= */

function renderSkins() {

  const box =
    document.querySelector("#demoInventory");

  if (!box) {
    return;
  }

  const search =
    (
      document.querySelector("#skinSearch")?.value ||
      ""
    )
      .toLowerCase()
      .trim();

  const sort =
    document.querySelector("#skinSort")?.value ||
    "price";

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

  box.innerHTML =
    list.map(skin => {

      const selected =
        selectedDemoSkins.some(
          item => item.id === skin.id
        );

      return `
        <button
          type="button"
          class="inventory-skin ${
            selected ? "selected" : ""
          }"
          onclick="toggleSkin('${skin.id}')"
        >

          <img
            src="${skin.image}"
            alt="${skin.name}"
          >

          <div class="inventory-skin-name">
            ${skin.name}
          </div>

          <div class="inventory-skin-price">
            ${
              skin.price > 0
                ? skin.price.toFixed(2) + " ₴"
                : "Ціна уточнюється"
            }
          </div>

        </button>
      `;

    }).join("");
}
/* =========================
   ВИБІР СКІНА
========================= */

function toggleSkin(id) {

  const skin =
    demoSkins.find(
      item => String(item.id) === String(id)
    );

  if (!skin) {
    return;
  }

  const index =
    selectedDemoSkins.findIndex(
      item =>
        String(item.id) === String(id)
    );

  if (index >= 0) {

    selectedDemoSkins.splice(
      index,
      1
    );

  } else {

    selectedDemoSkins.push(skin);
  }

  renderSkins();
  updateSelected();
}
/* =========================
   ВИБРАНІ СКІНИ
========================= */

function updateSelected() {

  const box =
    document.querySelector("#selectedSkins");

  const count =
    document.querySelector("#selectedCount");

  const total =
    document.querySelector("#selectedTotal");

  if (!box) {
    return;
  }

  const sum =
    selectedDemoSkins.reduce(
      (result, skin) =>
        result + Number(skin.price || 0),
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
        Оберіть скіни для поповнення
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
            ${
              Number(skin.price) > 0
                ? Number(skin.price).toFixed(2) + " ₴"
                : "Ціна уточнюється"
            }
          </span>

        </div>

        <button
          type="button"
          onclick="toggleSkin('${skin.id}')"
        >
          ×
        </button>

      </div>

    `).join("");
}
/* =========================
   ПОШУК І СОРТУВАННЯ
========================= */

function filterSkins() {
  renderSkins();
}

function sortSkins() {
  renderSkins();
}

document.querySelector("#skinSearch")?.addEventListener(
  "input",
  filterSkins
);

document.querySelector("#skinSort")?.addEventListener(
  "change",
  sortSkins
);
/* =========================
   ПОПОВНЕННЯ
========================= */

document.querySelector("#skinsTopupButton")?.addEventListener(
  "click",
  async () => {

    if (!selectedDemoSkins.length) {
      alert("Оберіть хоча б один скін");
      return;
    }

    const tradeUrl =
      document.querySelector(
        "#steamTradeUrl"
      )?.value.trim();

    if (!tradeUrl) {
      alert("Вставте Steam Trade URL");
      return;
    }

    try {

      for (const skin of selectedDemoSkins) {

        const response =
          await fetch(
            "/api/skin-deposit",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              credentials: "include",

              body: JSON.stringify({
                skinName: skin.name,
                value: Number(
                  skin.price
                ),
                assetid: skin.assetid,
                tradeUrl: tradeUrl
              })
            }
          );

        if (!response.ok) {

          const data =
            await response.json()
              .catch(() => null);

          throw new Error(
            data?.error ||
            "Не вдалося створити заявку"
          );
        }
      }

      const total =
        selectedDemoSkins.reduce(
          (sum, skin) =>
            sum + Number(
              skin.price || 0
            ),
          0
        );

      alert(
        "Заявка на поповнення створена!\n\n" +
        `Предметів: ${selectedDemoSkins.length}\n` +
        `Сума: ${total.toFixed(2)} ₴\n\n` +
        "Очікуйте обробки заявки."
      );

      selectedDemoSkins = [];

      renderSkins();
      updateSelected();

    } catch (error) {

      console.error(
        "Skin deposit error:",
        error
      );

      alert(
        error.message ||
        "Не вдалося створити заявку"
      );
    }
  }
);
/* =========================
   ЗАПУСК
========================= */

document.addEventListener(
  "DOMContentLoaded",
  loadSkins
);
