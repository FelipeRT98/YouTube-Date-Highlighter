window.onload = () => {
  //const patterns = [
  //  /^\d+\ssecond[s]?\sago$/,
  //  /^\d+\sminute[s]?\sago$/,
  //  /^\d+\shour[s]?\sago$/,
  //  /^\d+\sday[s]?\sago$/,
  //  /^\d+\sweek[s]?\sago$/,
  //  /^\d+\smonth[s]?\sago$/,
  //  /^\d+\syear[s]?\sago$/,
  //];

  //------------------------------------------------------------------------------

  var currentDate = new Date();

  var minYear;
  var maxYear;

  // LOAD
  chrome.storage.local.get(["minYear", "maxYear"], function (result) {
    minYear = result.minYear;
    maxYear = result.maxYear;
  });

  //------------------------------------------------------------------------------

  // HIGHLIGHT
  function highlightTimeTexts() {
    const elements = document.querySelectorAll(
      "div.yt-content-metadata-view-model__metadata-row span:nth-of-type(3)," + // Home
        "div#metadata-line span:nth-of-type(2)," + // Channel
        "yt-formatted-string#info span:nth-of-type(3)," + // Video
        "yt-formatted-string#video-info span:nth-of-type(3)," + // Playlist
        "span#published-time-text a" // Comment
    );

    elements.forEach((el) => {
      let text = el.innerText?.trim();
      if (!text) return;

      let videoYear = currentDate.getFullYear();
      const parts = text.split(" ");

      if (text.includes("ago")) {
        //              *00 unit  ago*
        // Streamed       1 year  ago
        // Streamed live 19 hours ago
        //               16 years ago
        //               16 years ago (edited)
        const agoIndex = parts.indexOf("ago");
        const unit = parts[agoIndex - 1];
        if (unit.startsWith("year")) {
          const number = parseInt(parts[agoIndex - 2], 10);
          videoYear = currentDate.getFullYear() - number;
        }
      } else if (text.includes(",")) {
        // Apr 24, 2005
        // Streamed live on Sep 2, 2021
        const yearPart = parts[parts.length - 1];
        videoYear = parseInt(yearPart, 10);
        // ---
        // todo (maybe)
        // the current calculation is not precise, resulting in a different color
        // current date = Oct 06, 2025
        // video upload date A = Dec 10, 2010
        // video upload date B = 14 years ago
        // 2025 -  2010     = 15 years ago
        // 2025 - (2025-14) = 14 years ago
      } else {
        return;
      }

      const { r, g, b } = interpolateYearColor(videoYear, minYear, maxYear);

      el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 1)`;
      el.style.color = "white";
      el.style.fontWeight = "bold";
      el.style.padding = "2px 4px";
      el.style.borderRadius = "4px";
      el.style.textShadow = `-1px -1px 0 #000, 1px -1px 0 #000,
                               -1px 1px 0 #000, 1px 1px 0 #000`;
    });
  }

  //------------------------------------------------------------------------------

  var minYearColor;
  var midYearColor;
  var maxYearColor;

  // LOAD
  chrome.storage.local.get(
    ["minYearColor", "midYearColor", "maxYearColor"],
    function (result) {
      minYearColor = result.minYearColor || { r: 0, g: 255, b: 0 };
      midYearColor = result.midYearColor || { r: 255, g: 255, b: 0 };
      maxYearColor = result.maxYearColor || { r: 255, g: 0, b: 0 };
    }
  );

  function interpolateYearColor(year, minYear, maxYear) {
    const start = minYearColor;
    const mid = midYearColor;
    const end = maxYearColor;

    if (year <= minYear) return start;
    if (year >= maxYear) return end;

    const midYear = (minYear + maxYear) / 2;
    let ratio;

    if (year <= midYear) {
      // Fade from start → mid
      ratio = (year - minYear) / (midYear - minYear);
      return {
        r: Math.round(start.r + (mid.r - start.r) * ratio),
        g: Math.round(start.g + (mid.g - start.g) * ratio),
        b: Math.round(start.b + (mid.b - start.b) * ratio),
      };
    } else {
      // Fade from mid → end
      ratio = (year - midYear) / (maxYear - midYear);
      return {
        r: Math.round(mid.r + (end.r - mid.r) * ratio),
        g: Math.round(mid.g + (end.g - mid.g) * ratio),
        b: Math.round(mid.b + (end.b - mid.b) * ratio),
      };
    }
  }

  highlightTimeTexts();

  //------------------------------------------------------------------------------

  // Re-run on every change
  const observer = new MutationObserver(() => {
    highlightTimeTexts();
  });
  observer.observe(document.body, { childList: true, subtree: true });
};
