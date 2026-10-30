const NASA_API_KEY = "DEMO_KEY";
const NASA_APOD_URL = "https://api.nasa.gov/planetary/apod";
const LAUNCHES_API_URL =
  "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=12&ordering=net";
const SOLAR_API_URL = "https://api.le-systeme-solaire.net/rest/bodies/";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) =>
  Array.from(parent.querySelectorAll(selector));

const planetNames = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

const planetColors = {
  mercury: "#eab308",
  venus: "#f97316",
  earth: "#3b82f6",
  mars: "#ef4444",
  jupiter: "#fb923c",
  saturn: "#facc15",
  uranus: "#06b6d4",
  neptune: "#2563eb",
};

let planetsData = [];
let launchesData = [];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function formatDate(dateString, options = {}) {
  if (!dateString) return "Date to be announced";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

function formatNumber(value, maximumFractionDigits = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "N/A";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(number);
}

function setText(selector, value, fallback = "N/A") {
  const element = $(selector);

  if (element) {
    element.textContent = value ?? fallback;
  }
}

function showMessage(container, message, isError = false) {
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full rounded-xl border ${
      isError
        ? "border-red-500/40 text-red-300"
        : "border-slate-700 text-slate-400"
    } bg-slate-800/60 p-6 text-center" role="status">
      ${escapeHTML(message)}
    </div>`;
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status}) for ${url}`
    );
  }

  return response.json();
}

/* Sidebar and section navigation */

function initializeNavigation() {
  const sidebar = $("#sidebar");
  const toggleButton = $("#sidebar-toggle");
  const navLinks = $$(".nav-link");
  const sections = $$(".app-section");

  function showSection(sectionId) {
    sections.forEach((section) => {
      section.classList.toggle(
        "hidden",
        section.id !== sectionId
      );
    });

    navLinks.forEach((link) => {
      const isActive = link.dataset.section === sectionId;

      link.classList.toggle("bg-blue-500/10", isActive);
      link.classList.toggle("text-blue-400", isActive);
      link.classList.toggle("text-slate-300", !isActive);
    });

    if (sidebar && window.innerWidth < 1024) {
      sidebar.classList.add("-translate-x-full");
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showSection(link.dataset.section);
    });
  });

  toggleButton?.addEventListener("click", () => {
    sidebar?.classList.toggle("-translate-x-full");
  });

  document.addEventListener("click", (event) => {
    if (
      sidebar &&
      toggleButton &&
      window.innerWidth < 1024 &&
      !sidebar.contains(event.target) &&
      !toggleButton.contains(event.target)
    ) {
      sidebar.classList.add("-translate-x-full");
    }
  });

  if (sidebar && window.innerWidth < 1024) {
    sidebar.classList.add("-translate-x-full");
  }
}

/* NASA Astronomy Picture of the Day */

function getApodValue(data, key) {
  const value = data?.[key];

  if (value && typeof value === "object") {
    return value.rendered || value.value || "";
  }

  return value ?? "";
}

function getApodImageURL(data) {
  return (
    data?.hdurl ||
    data?.url ||
    data?.image_url ||
    data?.featured_media_url ||
    data?.thumbnail_url ||
    ""
  );
}

function displayApod(data) {
  const title =
    getApodValue(data, "title") ||
    "Astronomy Picture of the Day";

  const date =
    data?.date ||
    data?.published_at ||
    data?.published ||
    "";

  const explanation =
    getApodValue(data, "explanation") ||
    getApodValue(data, "description") ||
    getApodValue(data, "content") ||
    "No explanation is available for this image.";

  const mediaType =
    data?.media_type ||
    data?.mediaType ||
    "image";

  const imageURL = getApodImageURL(data);
  const copyright = data?.copyright || data?.credit || "NASA";

  setText("#apod-title", title);
  setText(
    "#apod-date",
    `Astronomy Picture of the Day - ${formatDate(date)}`
  );
  setText("#apod-date-detail", date);
  setText("#apod-date-info", date);
  setText("#apod-media-type", mediaType);
  setText("#apod-explanation", explanation);
  setText("#apod-copyright", copyright, "NASA");

  const image = $("#apod-image");
  const imageContainer = $("#apod-image-container");

  if (image && imageURL && mediaType === "image") {
    image.src = imageURL;
    image.alt = title;
    image.classList.remove("hidden");
  } else if (image) {
    image.removeAttribute("src");
    image.alt =
      mediaType === "video" ? "Video content" : title;
  }

  const fullResolutionButton = $(
    "#apod-image-container button"
  );

  if (fullResolutionButton) {
    fullResolutionButton.onclick = () => {
      const fullURL = data?.hdurl || imageURL;

      if (fullURL) {
        window.open(
          fullURL,
          "_blank",
          "noopener,noreferrer"
        );
      }
    };
  }

  const loading = $("#apod-loading");

  if (loading) {
    loading.classList.add("hidden");
  }

  if (imageContainer) {
    imageContainer.setAttribute("aria-busy", "false");
  }
}

async function loadApod(date = "") {
  const imageContainer = $("#apod-image-container");
  const loading = $("#apod-loading");
  const image = $("#apod-image");

  if (loading) {
    loading.classList.remove("hidden");
  }

  if (imageContainer) {
    imageContainer.setAttribute("aria-busy", "true");
  }

  if (image) {
    image.classList.add("opacity-50");
  }

  const params = new URLSearchParams({
    api_key: NASA_API_KEY,
  });

  if (date) {
    params.set("date", date);
  }

  try {
    const data = await fetchJSON(
      `${NASA_APOD_URL}?${params.toString()}`
    );

    const apod = Array.isArray(data) ? data[0] : data;

    if (!apod) {
      throw new Error("No image data was returned.");
    }

    displayApod(apod);
  } catch (error) {
    console.error("NASA APOD error:", error);

    setText(
      "#apod-explanation",
      "We couldn't load the space image. Please try again in a moment."
    );

    setText(
      "#apod-title",
      "Unable to load today's image"
    );

    if (loading) {
      loading.classList.add("hidden");
    }

    if (imageContainer) {
      imageContainer.setAttribute("aria-busy", "false");
    }
  } finally {
    if (image) {
      image.classList.remove("opacity-50");
    }
  }
}

function initializeApodControls() {
  const dateInput = $("#apod-date-input");
  const loadButton = $("#load-date-btn");
  const todayButton = $("#today-apod-btn");

  if (!dateInput || !loadButton || !todayButton) return;

  const today = new Date();

  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  dateInput.max = todayString;
  dateInput.min = "1995-06-16";
  dateInput.value = todayString;

  const dateLabel = $(".date-input-wrapper span");

  if (dateLabel) {
    dateLabel.textContent = formatDate(todayString);
  }

  loadButton.addEventListener("click", () => {
    if (!dateInput.value) {
      dateInput.focus();
      return;
    }

    if (
      dateInput.value > todayString ||
      dateInput.value < dateInput.min
    ) {
      dateInput.reportValidity();
      return;
    }

    loadApod(dateInput.value);
  });

  todayButton.addEventListener("click", () => {
    dateInput.value = todayString;
    loadApod();
  });

  dateInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loadButton.click();
    }
  });
}

/* SpaceDevs upcoming launches */

function getLaunchStatus(launch) {
  return (
    launch?.status?.abbrev ||
    launch?.status?.name ||
    "TBD"
  );
}

function getLaunchAgency(launch) {
  return (
    launch?.launch_service_provider?.name ||
    launch?.lsp?.name ||
    "Agency not announced"
  );
}

function getLaunchRocket(launch) {
  return (
    launch?.rocket?.configuration?.full_name ||
    launch?.rocket?.configuration?.name ||
    launch?.rocket?.name ||
    "Rocket details unavailable"
  );
}

function getLaunchLocation(launch) {
  return (
    launch?.pad?.name ||
    launch?.pad?.location?.name ||
    "Location to be announced"
  );
}

function getLaunchImage(launch) {
  return (
    launch?.image ||
    launch?.image_url ||
    launch?.rocket?.configuration?.image_url ||
    launch?.launch_service_provider?.logo_url ||
    ""
  );
}

function statusColor(status) {
  const normalized = String(status).toLowerCase();

  if (
    normalized.includes("go") ||
    normalized.includes("success")
  ) {
    return "bg-green-500/90";
  }

  if (
    normalized.includes("tbd") ||
    normalized.includes("tbc")
  ) {
    return "bg-yellow-500/90";
  }

  if (
    normalized.includes("fail") ||
    normalized.includes("hold")
  ) {
    return "bg-red-500/90";
  }

  return "bg-blue-500/90";
}

function launchCardTemplate(launch, index) {
  const name = launch?.name || "Unnamed mission";
  const agency = getLaunchAgency(launch);
  const rocket = getLaunchRocket(launch);
  const location = getLaunchLocation(launch);
  const date = launch?.net || launch?.window_start;
  const status = getLaunchStatus(launch);
  const image = getLaunchImage(launch);
  const detailsURL = launch?.url || "";
  const id = launch?.id || index;

  return `
    <article class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group">
      <div class="relative h-48 bg-slate-900/50 flex items-center justify-center overflow-hidden">
        ${
          image
            ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(name)}" class="w-full h-full object-cover" loading="lazy" onerror="this.remove()">`
            : `<i class="fas fa-rocket text-5xl text-slate-700"></i>`
        }
        <div class="absolute top-3 right-3">
          <span class="px-3 py-1 ${statusColor(status)} text-white backdrop-blur-sm rounded-full text-xs font-semibold">
            ${escapeHTML(status)}
          </span>
        </div>
      </div>
      <div class="p-5">
        <div class="mb-3">
          <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
            ${escapeHTML(name)}
          </h4>
          <p class="text-sm text-slate-400 flex items-center gap-2">
            <i class="fas fa-building text-xs"></i>${escapeHTML(agency)}
          </p>
        </div>
        <div class="space-y-2 mb-4">
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-calendar text-slate-500 w-4"></i>
            <span class="text-slate-300">${escapeHTML(formatDate(date))}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-clock text-slate-500 w-4"></i>
            <span class="text-slate-300">${
              date
                ? escapeHTML(
                    new Date(date).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                        timeZoneName: "short",
                      }
                    )
                  )
                : "TBD"
            }</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-rocket text-slate-500 w-4"></i>
            <span class="text-slate-300">${escapeHTML(rocket)}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-map-marker-alt text-slate-500 w-4"></i>
            <span class="text-slate-300 line-clamp-1">${escapeHTML(location)}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
          <button type="button" data-launch-details="${escapeHTML(detailsURL)}"
            class="flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold">
            Details
          </button>
          <button type="button" class="launch-favorite px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
            data-launch-id="${escapeHTML(id)}" aria-label="Add ${escapeHTML(name)} to favorites" aria-pressed="false">
            <i class="far fa-heart"></i>
          </button>
        </div>
      </div>
    </article>`;
}

function renderFeaturedLaunch(launch) {
  const container = $("#featured-launch");

  if (!container || !launch) return;

  const name = launch.name || "Upcoming space mission";
  const agency = getLaunchAgency(launch);
  const rocket = getLaunchRocket(launch);
  const location = getLaunchLocation(launch);
  const date = launch.net || launch.window_start;
  const status = getLaunchStatus(launch);
  const image = getLaunchImage(launch);
  const detailsURL = launch.url || "";

  const description =
    launch.mission?.description ||
    launch.mission?.name ||
    "Mission details have not been published yet.";

  const daysLeft = date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(date).getTime() - Date.now()) /
            86400000
        )
      )
    : null;

  container.innerHTML = `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 md:p-8">
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-3 mb-4">
              <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-star"></i>Featured Launch
              </span>
              <span class="px-4 py-1.5 ${statusColor(status)} text-white rounded-full text-sm font-semibold">${escapeHTML(status)}</span>
            </div>
            <h3 class="text-2xl md:text-3xl font-bold mb-3 leading-tight">${escapeHTML(name)}</h3>
            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
              <div class="flex items-center gap-2"><i class="fas fa-building"></i><span>${escapeHTML(agency)}</span></div>
              <div class="flex items-center gap-2"><i class="fas fa-rocket"></i><span>${escapeHTML(rocket)}</span></div>
            </div>
            <div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
              <i class="fas fa-clock text-2xl text-blue-400"></i>
              <div><p class="text-2xl font-bold text-blue-400">${daysLeft === null ? "TBD" : daysLeft}</p><p class="text-xs text-slate-400">Days Until Launch</p></div>
            </div>
            <div class="grid xl:grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded-xl p-4"><p class="text-xs text-slate-400 mb-1"><i class="fas fa-calendar mr-2"></i>Launch Date</p><p class="font-semibold">${escapeHTML(formatDate(date))}</p></div>
              <div class="bg-slate-900/50 rounded-xl p-4"><p class="text-xs text-slate-400 mb-1"><i class="fas fa-clock mr-2"></i>Launch Time (UTC)</p><p class="font-semibold">${date ? escapeHTML(new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })) : "TBD"}</p></div>
              <div class="bg-slate-900/50 rounded-xl p-4"><p class="text-xs text-slate-400 mb-1"><i class="fas fa-map-marker-alt mr-2"></i>Location</p><p class="font-semibold text-sm">${escapeHTML(location)}</p></div>
              <div class="bg-slate-900/50 rounded-xl p-4"><p class="text-xs text-slate-400 mb-1"><i class="fas fa-globe mr-2"></i>Country</p><p class="font-semibold">${escapeHTML(launch.pad?.location?.country?.name || "Not specified")}</p></div>
            </div>
            <p class="text-slate-300 leading-relaxed mb-6">${escapeHTML(description)}</p>
          </div>
          <div class="flex flex-col md:flex-row gap-3">
            <button type="button" data-launch-details="${escapeHTML(detailsURL)}"
              class="self-start px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-info-circle"></i>View Full Details
            </button>
            <div class="icons self-end md:self-center">
              <button type="button" class="launch-favorite px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors" data-launch-id="${escapeHTML(launch.id || "featured")}" aria-label="Add featured launch to favorites" aria-pressed="false"><i class="far fa-heart"></i></button>
              <button type="button" class="launch-reminder px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors" aria-label="Toggle launch reminder" aria-pressed="false"><i class="fas fa-bell"></i></button>
            </div>
          </div>
        </div>
        <div class="relative min-h-[300px] lg:min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50 flex items-center justify-center">
          ${
            image
              ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(name)}" class="absolute inset-0 w-full h-full object-cover" onerror="this.remove()">`
              : `<i class="fas fa-rocket text-9xl text-slate-700/50"></i>`
          }
          <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent pointer-events-none"></div>
        </div>
      </div>
    </div>`;
}

async function loadLaunches() {
  const grid = $("#launches-grid");

  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full text-center py-10 text-slate-400">
      <i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i>
      <p>Loading upcoming launches...</p>
    </div>`;

  try {
    const data = await fetchJSON(LAUNCHES_API_URL);

    launchesData = Array.isArray(data.results)
      ? data.results
      : [];

    if (!launchesData.length) {
      showMessage(
        grid,
        "No upcoming launches were returned by the API."
      );
      return;
    }

    grid.innerHTML = launchesData
      .map((launch, index) =>
        launchCardTemplate(launch, index)
      )
      .join("");

    renderFeaturedLaunch(launchesData[0]);

    const desktopCount = $("#launches-count");
    const mobileCount = $("#launches-count-mobile");

    if (desktopCount) {
      desktopCount.textContent =
        `${launchesData.length} Launches`;
    }

    if (mobileCount) {
      mobileCount.textContent =
        String(launchesData.length);
    }
  } catch (error) {
    console.error("Launches API error:", error);

    showMessage(
      grid,
      "Couldn't load launches. The API may be rate-limited; please try again later.",
      true
    );
  }
}

function initializeLaunchActions() {
  document.addEventListener("click", (event) => {
    const detailsButton = event.target.closest(
      "[data-launch-details]"
    );

    if (detailsButton) {
      const url = detailsButton.dataset.launchDetails;

      if (url) {
        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      } else {
        alert(
          "Detailed information is not available for this launch yet."
        );
      }
    }

    const favoriteButton = event.target.closest(
      ".launch-favorite"
    );

    if (favoriteButton) {
      const isPressed =
        favoriteButton.getAttribute("aria-pressed") === "true";

      favoriteButton.setAttribute(
        "aria-pressed",
        String(!isPressed)
      );

      const icon = $("i", favoriteButton);

      if (icon) {
        icon.classList.toggle("far", isPressed);
        icon.classList.toggle("fas", !isPressed);
      }

      favoriteButton.classList.toggle(
        "text-pink-400",
        !isPressed
      );
    }

    const reminderButton = event.target.closest(
      ".launch-reminder"
    );

    if (reminderButton) {
      const isPressed =
        reminderButton.getAttribute("aria-pressed") === "true";

      reminderButton.setAttribute(
        "aria-pressed",
        String(!isPressed)
      );

      reminderButton.classList.toggle(
        "text-yellow-300",
        !isPressed
      );

      reminderButton.title = !isPressed
        ? "Reminder enabled for this session"
        : "Reminder disabled";
    }
  });
}

/* Solar System OpenData planets */

function planetImagePath(name) {
  return `./assets/images/${String(name).toLowerCase()}.png`;
}

function formatDistance(kilometers) {
  const number = Number(kilometers);

  if (!Number.isFinite(number)) return "N/A";

  if (number >= 1000000) {
    return `${formatNumber(number / 1000000)}M km`;
  }

  return `${formatNumber(number)} km`;
}

function toSuperscript(value) {
  const digits = {
    "-": "⁻",
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };

  return String(value)
    .split("")
    .map((digit) => digits[digit] || digit)
    .join("");
}

function formatMass(mass) {
  if (
    !mass ||
    mass.massValue == null ||
    mass.massExponent == null
  ) {
    return "N/A";
  }

  return `${formatNumber(mass.massValue, 3)} × 10${toSuperscript(mass.massExponent)} kg`;
}

function formatVolume(volume) {
  if (
    !volume ||
    volume.volValue == null ||
    volume.volExponent == null
  ) {
    return "N/A";
  }

  return `${formatNumber(volume.volValue, 3)} × 10${toSuperscript(volume.volExponent)} km³`;
}

function formatPeriod(days) {
  const number = Number(days);

  if (!Number.isFinite(number)) return "N/A";

  if (Math.abs(number) >= 365.25) {
    return `${formatNumber(number / 365.25)} years`;
  }

  return `${formatNumber(number)} days`;
}

function renderPlanetCards(planets) {
  const grid = $("#planets-grid");

  if (!grid) return;

  grid.innerHTML = planets
    .map((planet) => {
      const name = planet.englishName || planet.name;
      const id = String(
        planet.id || name
      ).toLowerCase();

      const color = planetColors[id] || "#3b82f6";
      const image = planetImagePath(id);
      const au = Number(planet.semimajorAxis) / 149597870.7;

      return `
        <button type="button" class="planet-card bg-slate-800/50 border border-slate-700 rounded-2xl p-4 transition-all cursor-pointer group text-left"
          data-planet-id="${escapeHTML(id)}" style="--planet-color:${color}" aria-label="View ${escapeHTML(name)} details">
          <div class="relative mb-3 h-24 flex items-center justify-center">
            <img class="w-20 h-20 object-contain group-hover:scale-110 transition-transform" src="${escapeHTML(image)}" alt="${escapeHTML(name)}" loading="lazy"
              onerror="this.style.display='none'">
          </div>
          <h4 class="font-semibold text-center text-sm">${escapeHTML(name)}</h4>
          <p class="text-xs text-slate-400 text-center">${
            Number.isFinite(au)
              ? `${formatNumber(au, 2)} AU`
              : "Solar system"
          }</p>
        </button>`;
    })
    .join("");
}

function renderPlanetFacts(planet) {
  const list = $("#planet-facts");

  if (!list) return;

  const facts = [];

  if (planet.englishName === "Earth") {
    facts.push(
      "Only known planet with life",
      "About 71% of its surface is covered by water",
      "Its atmosphere contains mostly nitrogen",
      "Formed about 4.54 billion years ago"
    );
  } else {
    facts.push(
      `${planet.englishName || planet.name} is part of our solar system`,
      `Body type: ${planet.bodyType || "Planet"}`,
      `Mean radius: ${formatNumber(planet.meanRadius)} km`,
      `Gravity: ${formatNumber(planet.gravity)} m/s²`
    );
  }

  list.innerHTML = facts
    .map(
      (fact) => `
        <li class="flex items-start">
          <i class="fas fa-check text-green-400 mt-1 mr-2"></i>
          <span class="text-slate-300">${escapeHTML(fact)}</span>
        </li>`
    )
    .join("");
}

function renderPlanetComparison(planets) {
  const tbody = $("#planet-comparison-tbody");

  if (!tbody) return;

  tbody.innerHTML = planets
    .map((planet) => {
      const id = String(planet.id || "").toLowerCase();
      const color = planetColors[id] || "#64748b";

      const distanceAU =
        Number(planet.semimajorAxis) / 149597870.7;

      const diameter = Number(planet.meanRadius) * 2;

      const earthMass = planet.mass
        ? Number(planet.mass.massValue) *
          Math.pow(
            10,
            Number(planet.mass.massExponent)
          ) /
          5.9722e24
        : NaN;

      const moons = Array.isArray(planet.moons)
        ? planet.moons.length
        : 0;

      const period = formatPeriod(planet.sideralOrbit);
      const type = planet.bodyType || "Planet";

      return `
        <tr class="hover:bg-slate-800/30 transition-colors">
          <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
            <div class="flex items-center space-x-2 md:space-x-3">
              <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color:${color}"></div>
              <span class="font-semibold text-sm md:text-base whitespace-nowrap">${escapeHTML(planet.englishName || planet.name)}</span>
            </div>
          </td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm whitespace-nowrap">${
            Number.isFinite(distanceAU)
              ? formatNumber(distanceAU, 2)
              : "N/A"
          }</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm whitespace-nowrap">${
            Number.isFinite(diameter)
              ? formatNumber(diameter, 0)
              : "N/A"
          }</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm whitespace-nowrap">${
            Number.isFinite(earthMass)
              ? formatNumber(earthMass, 3)
              : "N/A"
          }</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm whitespace-nowrap">${escapeHTML(period)}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm whitespace-nowrap">${moons}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
            <span class="px-2 py-1 rounded text-xs bg-blue-500/30 text-blue-200">${escapeHTML(type)}</span>
          </td>
        </tr>`;
    })
    .join("");
}

function displayPlanetDetails(planet) {
  if (!planet) return;

  const name = planet.englishName || planet.name;
  const id = String(
    planet.id || name
  ).toLowerCase();

  const image = $("#planet-detail-image");

  if (image) {
    image.src = planetImagePath(id);
    image.alt = name;

    image.onerror = () => {
      image.onerror = null;
      image.src = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}.jpg`;
    };
  }

  setText(
    "#planet-detail-name",
    name
  );

  setText(
    "#planet-detail-description",
    planet.discoveredBy
      ? `${name} was discovered by ${planet.discoveredBy}${planet.discoveryDate ? ` in ${planet.discoveryDate}` : ""}. Explore its physical and orbital characteristics below.`
      : `${name} is a planet in our solar system. Explore its physical and orbital characteristics below.`
  );

  setText(
    "#planet-distance",
    formatDistance(planet.semimajorAxis)
  );

  setText(
    "#planet-radius",
    `${formatNumber(planet.meanRadius)} km`
  );

  setText(
    "#planet-mass",
    formatMass(planet.mass)
  );

  setText(
    "#planet-density",
    `${formatNumber(planet.density)} g/cm³`
  );

  setText(
    "#planet-orbital-period",
    formatPeriod(planet.sideralOrbit)
  );

  setText(
    "#planet-rotation",
    `${formatNumber(planet.sideralRotation)} hours`
  );

  setText(
    "#planet-moons",
    Array.isArray(planet.moons)
      ? planet.moons.length
      : "0"
  );

  setText(
    "#planet-gravity",
    `${formatNumber(planet.gravity)} m/s²`
  );

  setText(
    "#planet-discoverer",
    planet.discoveredBy || "Known since antiquity"
  );

  setText(
    "#planet-discovery-date",
    planet.discoveryDate || "Ancient"
  );

  setText(
    "#planet-body-type",
    planet.bodyType || "Planet"
  );

  setText(
    "#planet-volume",
    formatVolume(planet.vol)
  );

  setText(
    "#planet-perihelion",
    formatDistance(planet.perihelion)
  );

  setText(
    "#planet-aphelion",
    formatDistance(planet.aphelion)
  );

  setText(
    "#planet-eccentricity",
    formatNumber(planet.eccentricity, 5)
  );

  setText(
    "#planet-inclination",
    `${formatNumber(planet.inclination)}°`
  );

  setText(
    "#planet-axial-tilt",
    `${formatNumber(planet.axialTilt)}°`
  );

  setText(
    "#planet-temp",
    `${formatNumber(planet.avgTemp)} K`
  );

  setText(
    "#planet-escape",
    `${formatNumber(planet.escape)} km/s`
  );

  renderPlanetFacts(planet);
}

async function loadPlanets() {
  const grid = $("#planets-grid");

  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full text-center py-10 text-slate-400">
      <i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i>
      <p>Loading planets...</p>
    </div>`;

  try {
    const params = new URLSearchParams();

    params.append("filter[]", "isPlanet,eq,true");
    params.append("order", "semimajorAxis,asc");

    const data = await fetchJSON(
      `${SOLAR_API_URL}?${params.toString()}`
    );

    planetsData = (
      Array.isArray(data.bodies)
        ? data.bodies
        : []
    )
      .filter((planet) => planet.isPlanet === true)
      .filter((planet) =>
        planetNames.includes(
          String(planet.id || "").toLowerCase()
        )
      )
      .sort(
        (a, b) =>
          Number(a.semimajorAxis || Infinity) -
          Number(b.semimajorAxis || Infinity)
      );

    if (!planetsData.length) {
      showMessage(
        grid,
        "No planet data was returned by the API.",
        true
      );
      return;
    }

    renderPlanetCards(planetsData);
    renderPlanetComparison(planetsData);

    const earth = planetsData.find(
      (planet) => planet.id === "earth"
    );

    displayPlanetDetails(earth || planetsData[0]);
  } catch (error) {
    console.error("Solar System API error:", error);

    showMessage(
      grid,
      "Couldn't load planet data. Check your internet connection and try again.",
      true
    );
  }
}

function initializePlanetActions() {
  const grid = $("#planets-grid");

  grid?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-planet-id]");

    if (!card) return;

    const planet = planetsData.find(
      (item) =>
        String(item.id).toLowerCase() ===
        card.dataset.planetId
    );

    if (planet) {
      displayPlanetDetails(planet);
    }
  });

  const favoriteButton = $("#planet-detail-name")
    ?.parentElement?.querySelector("button");

  favoriteButton?.addEventListener("click", () => {
    const icon = $("i", favoriteButton);

    const isFavorite =
      favoriteButton.getAttribute("aria-pressed") === "true";

    favoriteButton.setAttribute(
      "aria-pressed",
      String(!isFavorite)
    );

    icon?.classList.toggle("far", isFavorite);
    icon?.classList.toggle("fas", !isFavorite);

    favoriteButton.classList.toggle(
      "text-pink-400",
      !isFavorite
    );
  });

  const learnMoreButton = $("#planets button.w-full");

  learnMoreButton?.addEventListener("click", () => {
    const currentName =
      $("#planet-detail-name")?.textContent || "";

    const planet = planetsData.find(
      (item) =>
        (item.englishName || item.name) === currentName
    );

    if (planet?.id) {
      window.open(
        `https://api.le-systeme-solaire.net/rest/bodies/${encodeURIComponent(planet.id)}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  });
}

/* Start the dashboard */

document.addEventListener("DOMContentLoaded", () => {
  initializeNavigation();
  initializeApodControls();
  initializeLaunchActions();
  initializePlanetActions();

  loadApod();
  loadLaunches();
  loadPlanets();
});