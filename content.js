window.onload = () => {
  // SUPPORTED: English (any "en-*" counts as "en"), Español (España), Japanese
  const SUPPORTED_LANGUAGES = ["en", "es-ES", "ja-JP"];
  const LANGUAGE = /^en(-|$)/i.test(document.documentElement.lang)
    ? "en"
    : document.documentElement.lang;
  if (!SUPPORTED_LANGUAGES.includes(LANGUAGE)) return;

  var currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  var minYear;
  var maxYear;

  var minYearColor = { r: 0, g: 255, b: 0 };
  var midYearColor = { r: 255, g: 255, b: 0 };
  var maxYearColor = { r: 255, g: 0, b: 0 };

  // LOAD
  chrome.storage.local.get(
    ["minYear", "maxYear", "minYearColor", "midYearColor", "maxYearColor"],
    function (result) {
      minYear = result.minYear;
      maxYear = result.maxYear;
      minYearColor = result.minYearColor || minYearColor;
      midYearColor = result.midYearColor || midYearColor;
      maxYearColor = result.maxYearColor || maxYearColor;
      highlightTimeTexts();
    },
  );

  // ------------------------------------------------------------------------------

  // en
  const RE_EN_VIDEO_SHORT = /^(\d+) min ago$|^(\d+)(h|d|w|mo|y) ago$/;
  const RE_EN_DATE_EXPANDED = /^[A-Z][a-z]{2} \d{1,2}, (\d{4})$/;
  const RE_EN_COMMENT =
    /^(\d+) (minute|hour|day|week|month|year)s? ago( \(edited\))?$/;

  // es-ES
  const RE_ES_VIDEO_SHORT = /^hace (\d+) (min|h|d|sem\.|m|a)$/;
  const RE_ES_DATE_EXPANDED =
    /^\d{1,2} (?:ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)\.? (\d{4})$/;
  const RE_ES_COMMENT =
    /^hace (\d+) (minutos?|horas?|días?|semanas?|mes|meses|años?)( \(editado\))?$/;

  // ja-JP (video block, description and comments share the same relative format)
  const RE_JA_RELATIVE =
    /^(\d+)\s(分|時間|日|週間|か月|年)前(\s?（編集済み）)?$/;
  const RE_JA_DATE_EXPANDED = /^(\d{4})\/\d{1,2}\/\d{1,2}$/;

  // Returns the upload year, or null if the text does not adhere to the formats
  function parseVideoYear(text) {
    // en
    // ------------------------------------------------------------------------------
    // English(US)
    // ---

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // DO NOT style anything that does not adhere to the Elements and formats
    // todo (maybe, also limit styling by URL)
    // ¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡

    // ------------------------------------------------------------------------------
    // VIDEO BLOCK
    // ---
    // ELEMENT:
    // <span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText ytContentMetadataViewModelMetadataTextLastPart ytAttributedStringWhiteSpacePreWrap ytAttributedStringLinkInheritColor">
    //     5h ago
    // </span>
    // ---
    // URL                                                  === XPATH
    // https://www.youtube.com                              === //*[@id="content"]/yt-lockup-view-model/div/div/yt-lockup-metadata-view-model/div[n]/div/yt-content-metadata-view-model/div/span[n]
    // https://www.youtube.com/feed/subscriptions           === //*[@id="content"]/yt-lockup-view-model/div/div/yt-lockup-metadata-view-model/div[n]/div/yt-content-metadata-view-model/div/span[n]
    // https://www.youtube.com/@[user_id]                   === //*[@id="metadata-line"]/span[n]
    // https://www.youtube.com/@[user_id]/videos            === //*[@id="content"]/yt-lockup-view-model/div/div/yt-lockup-metadata-view-model/div[n]/div/yt-content-metadata-view-model/div/span[n]
    // https://www.youtube.com/watch?v=[video_id]           === //*[@id="contents"]/yt-lockup-view-model[n]/div/div/yt-lockup-metadata-view-model/div[n]/div/yt-content-metadata-view-model/div[n]/span[n]
    // https://www.youtube.com/playlist?list=[playlist_id]  === //*[@id="contents"]/div[n]/yt-lockup-view-model/div/div/yt-lockup-metadata-view-model/div[n]/div/yt-content-metadata-view-model/div[n]/span[n]
    // ---
    // FORMATs (en-us, es-es, jp-jp):
    // 1 min ago  ||| hace 1 min  ||| 1 分前
    // 44 min ago ||| hace 16 min ||| 44 分前
    // 1h ago     ||| hace 1 h    ||| 1 時間前
    // 13h ago    ||| hace 13 h   ||| 13 時間前
    // 1d ago     ||| hace 1 d    ||| 1 日前
    // 2w ago     ||| hace 2 sem. ||| 2 週間前
    // 1mo ago    ||| hace 1 m    ||| 1 か月前
    // 10mo ago   ||| hace 10 m   ||| 10 か月前
    // 1y ago     ||| hace 1 a    ||| 1 年前
    // 12y ago    ||| hace 12 a   ||| 12 年前
    //---
    // only the minutes are separated by a space in english
    // only the weeks have a dot at the end in spanish
    // ------------------------------------------------------------------------------

    // ██████████████████████████████████████████████████████████████████████████████

    // ------------------------------------------------------------------------------
    // VIDEO DESCRIPTION (WHEN COLLAPSED)
    // ---
    // ELEMENT:
    // <span class="style-scope yt-formatted-string">
    //     5d ago
    // </span>
    // ---
    // URL                                                  === XPATH
    // https://www.youtube.com/watch?v=[video_id]           === //*[@id="info"]/span[3]
    // ---
    // FORMATs (en-us, es-es, jp-jp):
    // 1 min ago  ||| hace 1 min  ||| 1 分前
    // 44 min ago ||| hace 16 min ||| 44 分前
    // 1h ago     ||| hace 1 h    ||| 1 時間前
    // 13h ago    ||| hace 13 h   ||| 13 時間前
    // 1d ago     ||| hace 1 d    ||| 1 日前
    // 2w ago     ||| hace 2 sem. ||| 2 週間前
    // 1mo ago    ||| hace 1 m    ||| 1 か月前
    // 10mo ago   ||| hace 10 m   ||| 10 か月前
    // 1y ago     ||| hace 1 a    ||| 1 年前
    // 12y ago    ||| hace 12 a   ||| 12 年前
    //---
    // only the minutes are separated by a space in english
    // only the weeks have a dot at the end in spanish
    // ------------------------------------------------------------------------------

    // ██████████████████████████████████████████████████████████████████████████████

    // ------------------------------------------------------------------------------
    // VIDEO DESCRIPTION (WHEN EXPANDED)
    // ---
    // ELEMENT:
    // <span class="style-scope yt-formatted-string">
    //     Nov 1, 2026
    // </span>
    // ---
    // URL                                                  === XPATH
    // https://www.youtube.com/watch?v=[video_id]           === //*[@id="info"]/span[3]
    // ---
    // FORMATs (en-us, es-es, jp-jp):
    // Nov 3, 2026  ||| 3 nov 2023  ||| 2026/11/03
    // Jul 31, 2026 ||| 31 jul 2026 ||| 2026/07/31
    // Jan 17, 2020 ||| 17 ene 2020 ||| 2020/01/17
    // ------------------------------------------------------------------------------

    // ██████████████████████████████████████████████████████████████████████████████

    // ------------------------------------------------------------------------------
    // COMMENTs
    // ---
    // ELEMENT:
    // <span id="published-time-text" class="style-scope ytd-comment-view-model">
    //     <a class="yt-simple-endpoint style-scope ytd-comment-view-model">
    //         5 days ago
    //     </a>
    // </span>
    // ---
    // URL                                                  === XPATH
    // https://www.youtube.com/watch?v=[video_id]           === //*[@id="info"]/span[3]
    // ---
    // FORMATs (en-us, es-es, jp-jp):
    // 1 minute ago   ||| hace 1 minuto   ||| 1 分前
    // 19 minutes ago ||| hace 19 minutos ||| 19 分前
    // 1 hour ago     ||| hace 1 hora     ||| 1 時間前
    // 23 hours ago   ||| hace 23 horas   ||| 23 時間前
    // 1 day ago      ||| hace 1 día      ||| 1 日前
    // 5 days ago     ||| hace 5 días     ||| 5 日前
    // 1 week ago     ||| hace 1 semana   ||| 1 週間前
    // 3 weeks ago    ||| hace 3 semanas  ||| 3 週間前
    // 1 month ago    ||| hace 1 mes      ||| 1 か月前
    // 10 months ago  ||| hace 10 meses   ||| 10 か月前
    // 1 year ago     ||| hace 1 año      ||| 1 年前
    // 12 years ago   ||| hace 12 años    ||| 12 年前
    // [any] (edited) ||| (editado)       ||| （編集済み）
    // ------------------------------------------------------------------------------

    // ██████████████████████████████████████████████████████████████████████████████

    // ------------------------------------------------------------------------------
    // I am not sure about the format for seconds, since I have not seen this format yet, I know it exists, but it could be any of these and they might be different in every part of youtube
    // 12 seconds ago OR 12 sec ago OR 12 s ago OR 12seconds ago OR 12sec ago OR 12s ago
    //------------------------------------------------------------------------------

    let m;

    switch (LANGUAGE) {
      case "es-ES":
        // Video block / video description (collapsed)
        if ((m = text.match(RE_ES_VIDEO_SHORT))) {
          if (m[2] === "a") return currentYear - parseInt(m[1], 10);
          return currentYear; // min, h, d, sem., m
        }

        // Video description (expanded)
        if ((m = text.match(RE_ES_DATE_EXPANDED))) {
          return parseInt(m[1], 10);
        }

        // Comments
        if ((m = text.match(RE_ES_COMMENT))) {
          if (m[2].startsWith("año")) return currentYear - parseInt(m[1], 10);
          return currentYear;
        }

        return null;

      case "ja-JP":
        // Video block / video description (collapsed) / Comments
        if ((m = text.match(RE_JA_RELATIVE))) {
          if (m[2] === "年") return currentYear - parseInt(m[1], 10);
          return currentYear; // 分, 時間, 日, 週間, か月
        }

        // Video description (expanded)
        if ((m = text.match(RE_JA_DATE_EXPANDED))) {
          return parseInt(m[1], 10);
        }

        return null;

      default:
        // en
        // Video block / video description (collapsed)
        if ((m = text.match(RE_EN_VIDEO_SHORT))) {
          if (m[3] === "y") return currentYear - parseInt(m[2], 10);
          return currentYear; // min, h, d, w, mo
        }

        // Video description (expanded)
        if ((m = text.match(RE_EN_DATE_EXPANDED))) {
          return parseInt(m[1], 10);
        }

        // Comments
        if ((m = text.match(RE_EN_COMMENT))) {
          if (m[2] === "year") return currentYear - parseInt(m[1], 10);
          return currentYear;
        }

        return null;
    }
  }

  //------------------------------------------------------------------------------

  function clearStyle(el) {
    if (!el.dataset.ydhStyled) return;
    delete el.dataset.ydhStyled;
    el.style.backgroundColor = "";
    el.style.color = "";
    el.style.fontWeight = "";
    el.style.padding = "";
    el.style.borderRadius = "";
    el.style.textShadow = "";
  }

  // HIGHLIGHT
  function highlightTimeTexts() {
    if (minYear === undefined || maxYear === undefined) return; // not loaded yet

    const elements = document.querySelectorAll(
      "span.ytContentMetadataViewModelMetadataText," + // Video block
        "yt-formatted-string#info span.yt-formatted-string," + // Video description
        "yt-formatted-string#video-info span.yt-formatted-string," + // Playlist
        "div#metadata-line span," + // Channel
        "span#published-time-text a", // Comment
    );

    elements.forEach((el) => {
      const text = el.innerText?.trim();
      const videoYear = text ? parseVideoYear(text) : null;

      if (videoYear === null) {
        // YouTube reuses elements, so remove stale styling
        clearStyle(el);
        return;
      }

      //
      // ---
      // todo (maybe, when youtube adds month precision)
      // the current calculation is not precise, resulting in a different color
      // current date = Oct 06, 2025
      // video upload date A = Dec 10, 2010
      // video upload date B = 14 years ago
      // 2025 -  2010     = 15 years ago
      // 2025 - (2025-14) = 14 years ago

      const { r, g, b } = interpolateYearColor(videoYear, minYear, maxYear);

      el.dataset.ydhStyled = "1";
      el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 1)`;
      el.style.color = "white";
      el.style.fontWeight = "bold";
      el.style.padding = "2px 4px";
      el.style.borderRadius = "4px";
      el.style.textShadow = `-1px -1px 0 #000, 1px -1px 0 #000,
                               -1px 1px 0 #000, 1px 1px 0 #000`;
    });
  }

  // ------------------------------------------------------------------------------

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

  // ------------------------------------------------------------------------------

  // Re-run on every change
  const observer = new MutationObserver(() => {
    highlightTimeTexts();
  });
  observer.observe(document.body, { childList: true, subtree: true });
};
