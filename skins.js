let demoSkins = [];
let selectedDemoSkins = [];


async function loadSkins() {
  const box = document.querySelector("#demoInventory");

  if (!box) {
    return;
  }

  box.innerHTML = `
    <div class="skin-empty">
      Завантаження скінів...
    </div>
  `;

  try {
    const response = await fetch("/api/skins");

    if (!response.ok) {
      throw new Error("Не вдалося отримати скіни");
    }

    const skins = await response.json();

    demoSkins = skins
      .slice(0, 50)
      .map((skin, index) => ({
        id: index,
        name: skin.name || "Unknown skin",
        image: skin.image || "",
        price: Number(skin.price) || 0
      }));

    selectedDemoSkins = [];

    renderSkins();
    updateSelected();

  } catch (error) {

    console.error(error);

    box.innerHTML = `
      <div class="skin-empty">
        Не вдалося завантажити скіни
      </div>
    `;
  }
}
function getDemoPrice(index) {
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

  return prices[index % prices.length];
}


function renderSkins() {
  const box = document.querySelector("#demoInventory");

  if (!box) {
    return;
  }

  const search =
    (document.querySelector("#skinSearch")?.value || "")
      .toLowerCase()
      .trim();

  const sort =
    document.querySelector("#skinSort")?.value || "price";

  let list = demoSkins.filter(skin =>
    skin.name.toLowerCase().includes(search)
  );

  if (sort === "price") {
    list.sort((a, b) => b.price - a.price);
  }

  if (sort === "name") {
    list.sort((a, b) =>
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
        item => item.id === skin.id
      );

    return `
      <button
        type="button"
        class="inventory-skin ${selected ? "selected" : ""}"
        onclick="toggleSkin(${skin.id})"
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
function toggleSkin(id) {
  const skin = demoSkins.find(
    item => item.id === id
  );

  if (!skin) {
    return;
  }

  const index = selectedDemoSkins.findIndex(
    item => item.id === id
  );

  if (index >= 0) {
    selectedDemoSkins.splice(index, 1);
  } else {
    selectedDemoSkins.push(skin);
  }

  renderSkins();
  updateSelected();
}


function updateSelected() {
  const box = document.querySelector("#selectedSkins");
  const count = document.querySelector("#selectedCount");
  const total = document.querySelector("#selectedTotal");

  if (!box) {
    return;
  }

  const sum = selectedDemoSkins.reduce(
    (result, skin) => result + skin.price,
    0
  );

  if (count) {
    count.textContent = selectedDemoSkins.length;
  }

  if (total) {
    total.textContent = sum.toFixed(2);
  }

  if (!selectedDemoSkins.length) {
    box.innerHTML = `
      <div class="selected-empty">
        Select the skins that you want to deposit
      </div>
    `;

    return;
  }

  box.innerHTML = selectedDemoSkins.map(skin => `
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
        onclick="toggleSkin(${skin.id})"
      >
        ×
      </button>

    </div>
  `).join("");
}


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


document.querySelector("#skinsTopupButton")?.addEventListener(
  "click",
  () => {

    if (!selectedDemoSkins.length) {
      alert("Оберіть хоча б один скін");
      return;
    }

    const tradeUrl =
      document.querySelector("#steamTradeUrl")?.value.trim();

    if (!tradeUrl) {
      alert("Вставте Steam Trade URL");
      return;
    }

    alert(
      `Демо-заявка створена.\n\n` +
      `Предметів: ${selectedDemoSkins.length}\n` +
      `Сума: ${selectedDemoSkins.reduce(
        (sum, skin) => sum + skin.price,
        0
      ).toFixed(2)} ₴`
    );
  }
);


document.addEventListener(
  "DOMContentLoaded",
  loadSkins
);
