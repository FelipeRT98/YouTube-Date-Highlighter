const minYear = document.getElementById("minYear");
const maxYear = document.getElementById("maxYear");

const currentYear = new Date().getFullYear();

const minYearMin = 2005;
const minYearDefault = 2005;
const minYearMax = currentYear - 1;

const maxYearMin = minYearMin + 1;
const maxYearDefault = currentYear;
const maxYearMax = currentYear;

//------------------------------------------------------------------------------

const colorDefaults = {
  minYearColor: { r: 0, g: 255, b: 0 },
  midYearColor: { r: 255, g: 255, b: 0 },
  maxYearColor: { r: 255, g: 0, b: 0 },
};

const colorInputs = {};

for (const key in colorDefaults) {
  const row = document.getElementById(`${key}Row`);

  colorInputs[key] = {
    r: document.getElementById(`${key}R`),
    g: document.getElementById(`${key}G`),
    b: document.getElementById(`${key}B`),
  };

  const updateRowColor = (fromInputs = true) => {
    const r = fromInputs
      ? parseInt(colorInputs[key].r.value, 10)
      : colorDefaults[key].r;
    const g = fromInputs
      ? parseInt(colorInputs[key].g.value, 10)
      : colorDefaults[key].g;
    const b = fromInputs
      ? parseInt(colorInputs[key].b.value, 10)
      : colorDefaults[key].b;
    if (row) row.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  };

  ["r", "g", "b"].forEach((ch) => {
    const input = colorInputs[key][ch];
    input.min = 0;
    input.max = 255;

    input.addEventListener("input", () => {
      // CLAMP
      let val = parseInt(input.value, 10);
      if (isNaN(val)) val = colorDefaults[key][ch];
      val = Math.max(0, Math.min(255, val));
      input.value = val;

      // SAVE
      chrome.storage.local.set({
        [key]: {
          r: parseInt(colorInputs[key].r.value, 10),
          g: parseInt(colorInputs[key].g.value, 10),
          b: parseInt(colorInputs[key].b.value, 10),
        },
      });

      // Update row background
      updateRowColor();
    });
  });

  // Reset button
  const resetBtn = document.getElementById(
    `reset${key[0].toUpperCase()}${key.slice(1)}`
  );
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      ["r", "g", "b"].forEach((ch) => {
        colorInputs[key][ch].value = colorDefaults[key][ch];
      });
      chrome.storage.local.set({ [key]: colorDefaults[key] });

      // Update row background
      updateRowColor(false);
    });
  }
}

//------------------------------------------------------------------------------

// LOAD
chrome.storage.local.get(["minYear", "maxYear"], function (result) {
  minYear.value = result.minYear || minYearDefault;
  maxYear.value = result.maxYear || maxYearDefault;
  validateYears("init");
});

chrome.storage.local.get(Object.keys(colorDefaults), (result) => {
  for (const key in colorDefaults) {
    const color = result[key] || colorDefaults[key];
    ["r", "g", "b"].forEach((ch) => {
      colorInputs[key][ch].value = color[ch];
    });

    // Update row background
    const row = document.getElementById(`${key}Row`);
    if (row) {
      row.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    }
  }
});

//------------------------------------------------------------------------------

// SAVE
minYear.addEventListener("input", () => validateYears("min"));
maxYear.addEventListener("input", () => validateYears("max"));

//------------------------------------------------------------------------------

// RESET
document.getElementById("resetMinYear").addEventListener("click", () => {
  minYear.value = minYearDefault;
  validateYears("resetMin");
});

document.getElementById("resetMaxYear").addEventListener("click", () => {
  if (
    parseInt(maxYear.value, 10) === currentYear &&
    parseInt(minYear.value, 10) === currentYear - 1
  ) {
    minYear.value = maxYearDefault - 1;
    maxYear.value = maxYearDefault;
  } else {
    maxYear.value = maxYearDefault;
  }
  validateYears("resetMax");
});

//------------------------------------------------------------------------------

// VALIDATE
function validateYears(trigger = "manual") {
  let min = parseInt(minYear.value, 10) || minYearDefault;
  let max = parseInt(maxYear.value, 10) || maxYearDefault;

  // CLAMP
  min = Math.max(minYearMin, Math.min(min, minYearMax));
  max = Math.max(maxYearMin, Math.min(max, maxYearMax));

  if (trigger === "min" && max <= min) {
    max = Math.min(maxYearMax, min + 1);
  } else if (trigger === "max" && max <= min) {
    min = Math.max(minYearMin, max - 1);
  } else if (max <= min) {
    max = Math.min(maxYearMax, min + 1);
  }

  // CLAMP
  min = Math.max(minYearMin, Math.min(min, minYearMax));
  max = Math.max(maxYearMin, Math.min(max, maxYearMax));

  minYear.value = min;
  maxYear.value = max;

  chrome.storage.local.set({ minYear: min, maxYear: max });
}

//------------------------------------------------------------------------------

let currentURLOrigin;

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  if (tabs.length > 0) {
    currentURLOrigin = tabs[0].url || "URL not available";
    currentURLOrigin = new URL(currentURLOrigin).origin || "URL not available";
  } else {
    currentURLOrigin = "No active tab found";
  }

  document.getElementById("currentURLOrigin").innerText =
    "Current URL Origin: " + currentURLOrigin;

  checkURLMatch();
});

//------------------------------------------------------------------------------

function checkURLMatch() {
  if (currentURLOrigin == "https://www.youtube.com") {
    document.getElementById("urlMatch").innerText =
      "🟢The format is applied to this site";

    // Inject and run content.js on current tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;

      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ["content.js"],
        },
        () => {
          chrome.tabs.sendMessage(
            tabId,
            { action: "findTimeTexts" },
            (response) => {
              if (response && response.results) {
                console.log("Found texts:", response.results);
              }
            }
          );
        }
      );
    });
  } else {
    document.getElementById("urlMatch").innerText =
      "❌The format is not applied to this site";
  }
}

//------------------------------------------------------------------------------
