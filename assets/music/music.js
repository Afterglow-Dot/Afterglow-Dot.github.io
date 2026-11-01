/* 全站背景音乐
 * -----------------------------------------------------------------------------
 * 静态站换页会整份重载文档，音频元素随旧文档一起销毁，所以这里做的是「续播」：
 *   · 播放进度 → sessionStorage（只服务换页那几秒，关标签页即清）
 *   · 开关偏好 / 音量 → localStorage（跨会话，支撑「永久关掉」）
 * 换页后重新尝试 play()；被浏览器拦下（NotAllowedError）就进 blocked，
 * 等第一次真实点击/触摸/按键再续上。
 */
(function () {
  "use strict";

  var dock = document.getElementById("music-dock");
  var audio = document.getElementById("music-audio");
  if (!dock || !audio) return;

  var trigger = document.getElementById("music-trigger");
  var panel = document.getElementById("music-panel");
  var playBtn = document.getElementById("music-play");
  var muteBtn = document.getElementById("music-mute");
  var stateEl = document.getElementById("music-state");
  var timeEl = document.getElementById("music-time");
  var durEl = document.getElementById("music-duration");
  var volInput = document.getElementById("music-volume");
  var volOut = document.getElementById("music-volume-out");
  var notice = document.getElementById("music-notice");
  var noticeText = document.getElementById("music-notice-text");
  var noticeAction = document.getElementById("music-notice-action");
  var noticeClose = document.getElementById("music-notice-close");

  var KEY_ON = "daji-bgm-on";
  var KEY_VOL = "daji-bgm-vol";
  var KEY_TIME = "daji-bgm-time";
  var KEY_TIP = "daji-bgm-tip";
  var NOTICE_MS = 12000;

  /* 隐私模式下 storage 会抛异常，降级成空实现，别让整段脚本挂掉 */
  function pick(fn) {
    try {
      var s = fn();
      s.setItem("__daji_probe", "1");
      s.removeItem("__daji_probe");
      return s;
    } catch (e) {
      return null;
    }
  }
  var ls = pick(function () {
    return window.localStorage;
  });
  var ss = pick(function () {
    return window.sessionStorage;
  });

  function read(key, store) {
    try {
      return store ? store.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }
  function write(key, value, store) {
    try {
      if (store) store.setItem(key, value);
    } catch (e) {
      /* 忽略 */
    }
  }

  var wanted = read(KEY_ON, ls) !== "0";
  var state = "idle";
  var pending = null;
  var attempt = 0;
  var awaiting = false;
  var noticeTimer = null;
  var lastSaved = -1;
  var warmed = false;

  var fallbackVol = parseInt(audio.getAttribute("data-default-volume"), 10);
  if (isNaN(fallbackVol)) fallbackVol = 40;
  var storedVol = parseFloat(read(KEY_VOL, ls));
  var volume = isNaN(storedVol) ? fallbackVol : storedVol;
  volume = Math.max(0, Math.min(100, volume));

  /* iOS Safari 的 audio.volume 是只读的：写进去读不回来。
     用回读做特性检测，不通过就隐藏滑块、只留静音键。 */
  var canSetVolume = (function () {
    var before = audio.volume;
    var ok = false;
    try {
      audio.volume = 0.5;
      ok = Math.abs(audio.volume - 0.5) < 0.01;
      audio.volume = before;
    } catch (e) {
      ok = false;
    }
    return ok;
  })();
  if (!canSetVolume) dock.classList.add("no-volume");
  try {
    audio.volume = volume / 100;
  } catch (e) {
    /* 忽略 */
  }

  var LABELS = {
    idle: "背景音乐",
    loading: "正在加载…",
    playing: "正在播放",
    paused: "已关闭",
    blocked: "等待点击开启",
    error: "音频暂不可用",
  };

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" + s : s);
  }

  function render() {
    var active = state === "playing" || state === "loading";
    dock.setAttribute("data-state", state);
    stateEl.textContent = LABELS[state] || LABELS.idle;
    playBtn.textContent = active ? "关闭音乐" : "播放";
    trigger.setAttribute("aria-pressed", active ? "true" : "false");
    timeEl.textContent = formatTime(audio.currentTime);
    durEl.textContent = isFinite(audio.duration) ? formatTime(audio.duration) : "0:00";
    volInput.value = volume;
    volOut.textContent = Math.round(volume) + "%";
    if (muteBtn) muteBtn.setAttribute("aria-pressed", audio.muted ? "true" : "false");
  }

  function setState(next) {
    state = next;
    render();
  }

  function showNotice(kind) {
    if (!notice) return;
    openPanel(false);
    /* 「被拦截」的提示每个标签页只弹一次，否则每换一页都要弹一遍，很吵 */
    if (kind !== "error") {
      if (read(KEY_TIP, ss) === "1") {
        hideNotice();
        return;
      }
      write(KEY_TIP, "1", ss);
    }
    noticeText.textContent =
      kind === "error" ? "音频加载失败，可以稍后重试。" : "点一下页面任意位置，即可继续播放背景音乐。";
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(hideNotice, NOTICE_MS);
  }

  function hideNotice() {
    if (!notice) return;
    notice.hidden = true;
    clearTimeout(noticeTimer);
  }

  function clearGesture() {
    if (!awaiting) return;
    awaiting = false;
    document.removeEventListener("pointerup", onGesture, true);
    document.removeEventListener("click", onGesture, true);
    document.removeEventListener("keydown", onGesture, true);
  }

  function awaitGesture() {
    if (awaiting) return;
    awaiting = true;
    /* capture 阶段抢先拿到事件；play() 必须在这次手势的调用栈里同步发出 */
    document.addEventListener("pointerup", onGesture, true);
    document.addEventListener("click", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
  }

  function onGesture(event) {
    if (!awaiting || !wanted) return;
    if (event.type === "keydown" && ["Shift", "Control", "Alt", "Meta", "Escape"].indexOf(event.key) !== -1) return;
    var target = event.target;
    if (target && target.closest && target.closest(".music-dock")) return;
    /* 同站跳转这一下会让页面卸载，抢来也没用，交给下一页自己续播；
       但外链（新标签打开）和页内锚点不会卸载页面，照常恢复 */
    var link = target && target.closest ? target.closest("a[href]") : null;
    if (link) {
      var href = link.getAttribute("href") || "";
      var newTab = (link.getAttribute("target") || "") === "_blank";
      var isHash = href.charAt(0) === "#";
      var isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(href) || href.indexOf("//") === 0;
      if (!newTab && !isHash && !isAbsolute) return;
    }
    play(false);
  }

  function play(automatic) {
    if (!wanted || pending) return;
    /* pointerup 与 click 会连着触发；只在确实已经在播时跳过，
       不能用 audio.paused 判断——被拒后各浏览器对 paused 的处置不一致 */
    if (state === "playing" && !audio.paused) return;
    if (state === "error") {
      try {
        audio.load();
      } catch (e) {
        /* 忽略 */
      }
    }
    var token = ++attempt;
    setState("loading");
    var request;
    try {
      request = audio.play();
    } catch (e) {
      setState("error");
      showNotice("error");
      return;
    }
    pending = request;
    if (request && typeof request.then === "function") {
      request.then(
        function () {
          if (pending === request) pending = null;
        },
        function (error) {
          if (pending === request) pending = null;
          if (token !== attempt || !wanted) return;
          var name = error && error.name;
          if (name === "NotAllowedError") {
            setState("blocked");
            awaitGesture();
            showNotice("blocked");
          } else if (name !== "AbortError") {
            setState("error");
            showNotice("error");
          }
        }
      );
    }
  }

  function turnOff() {
    wanted = false;
    attempt++;
    pending = null;
    write(KEY_ON, "0", ls);
    clearGesture();
    hideNotice();
    try {
      audio.pause();
    } catch (e) {
      /* 忽略 */
    }
    setState("paused");
  }

  function toggle() {
    /* 按状态而不是 audio.paused 判断：被拒的自动播放可能短暂让 paused 为 false，
       那时用户点「播放」应当真的去播，而不是被当成「关闭」 */
    if (state === "playing" || state === "loading") {
      turnOff();
      return;
    }
    wanted = true;
    write(KEY_ON, "1", ls);
    play(false);
  }

  function openPanel(open) {
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) hideNotice();
  }

  /* ---- 音频事件 ---- */

  /* 首次真正播出声后，把整首灌进 HTTP 缓存：
     preload 只对"开始加载前"有约束，播放中改它不会多下字节，
     所以真正管用的是主动 fetch 一遍。之后循环回到 0:00 直接命中本地缓存，
     不需要再发请求，弱网或连接被中间设备断掉时也不会卡住。 */
  function warmCache() {
    if (warmed) return;
    warmed = true;
    try {
      audio.preload = "auto";
    } catch (e) {
      /* 忽略 */
    }
    try {
      if (window.fetch) {
        var url = audio.currentSrc || audio.src;
        if (url) window.fetch(url, { cache: "force-cache" }).catch(function () {});
      }
    } catch (e) {
      /* 忽略 */
    }
  }

  audio.addEventListener("loadedmetadata", function () {
    var resume = parseFloat(read(KEY_TIME, ss));
    if (!isNaN(resume) && resume > 0 && isFinite(audio.duration) && resume < audio.duration - 1.5) {
      try {
        audio.currentTime = resume;
      } catch (e) {
        /* 忽略 */
      }
    }
    render();
  });

  audio.addEventListener("play", function () {
    if (state !== "loading") setState("loading");
  });

  audio.addEventListener("playing", function () {
    clearGesture();
    hideNotice();
    setState("playing");
    warmCache();
  });

  /* loop 在个别环境下不生效（老 Safari、MSE、元素被重新插入 DOM）时的兜底：
     正常带 loop 的元素永远不会触发 ended，所以这段只在 loop 失效时才跑。 */
  audio.addEventListener("ended", function () {
    if (!wanted) return;
    try {
      audio.currentTime = 0;
    } catch (e) {
      /* 忽略 */
    }
    play(false);
  });

  audio.addEventListener("waiting", function () {
    if (state === "playing") setState("loading");
  });

  audio.addEventListener("pause", function () {
    /* 播到末尾时浏览器会补一个 pause，那是自然结束，不是用户想关；
       而且不同引擎里 pause / ended 的先后不一致，用 ended 标志判断最稳 */
    if (audio.ended) return;
    /* 自动播放被拒时浏览器也会补一个 pause，那不代表用户想关 */
    if (wanted && (state === "loading" || state === "blocked")) return;
    if (state === "error") return;
    wanted = false;
    write(KEY_ON, "0", ls);
    clearGesture();
    setState("paused");
  });

  audio.addEventListener("timeupdate", function () {
    var now = Math.floor(audio.currentTime);
    if (now !== lastSaved) {
      lastSaved = now;
      write(KEY_TIME, String(now), ss);
    }
    timeEl.textContent = formatTime(audio.currentTime);
  });

  /* 只更新显示，不落盘：初始化设置音量时也会触发这个事件，
     若在这里写 localStorage，配置里的默认音量会被第一次访问永久固化。 */
  audio.addEventListener("volumechange", function () {
    volume = Math.round(audio.volume * 100);
    render();
  });

  audio.addEventListener("error", function () {
    setState("error");
    showNotice("error");
  });

  /* ---- 交互 ---- */
  trigger.addEventListener("click", function () {
    openPanel(panel.hidden);
  });

  playBtn.addEventListener("click", toggle);

  if (noticeAction) {
    noticeAction.addEventListener("click", function () {
      wanted = true;
      write(KEY_ON, "1", ls);
      play(false);
    });
  }
  if (noticeClose) noticeClose.addEventListener("click", hideNotice);

  if (muteBtn) {
    muteBtn.addEventListener("click", function () {
      try {
        audio.muted = !audio.muted;
      } catch (e) {
        /* 忽略 */
      }
      render();
    });
  }

  volInput.addEventListener("input", function () {
    volume = parseInt(volInput.value, 10);
    if (isNaN(volume)) volume = 0;
    try {
      audio.volume = volume / 100;
    } catch (e) {
      /* 忽略 */
    }
    if (volume > 0 && audio.muted) audio.muted = false;
    volOut.textContent = volume + "%";
    write(KEY_VOL, String(volume), ls);
  });

  document.addEventListener("click", function (event) {
    if (panel.hidden) return;
    var path = event.composedPath ? event.composedPath() : [];
    if (path.length ? path.indexOf(dock) !== -1 : dock.contains(event.target)) return;
    openPanel(false);
  });

  dock.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!panel.hidden) {
      openPanel(false);
      trigger.focus();
    }
    hideNotice();
  });

  /* 移动端 pagehide 不一定触发，timeupdate 已经兜底，这里只做补存 */
  window.addEventListener("pagehide", function () {
    if (!audio.paused) write(KEY_TIME, String(Math.floor(audio.currentTime)), ss);
  });

  /* 后退时页面可能从 bfcache 恢复而不重新执行脚本，状态要重新对齐 */
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    render();
    if (wanted && audio.paused) play(true);
  });

  /* 锁屏 / 通知栏显示曲目 */
  if ("mediaSession" in navigator) {
    try {
      var songEl = panel.querySelector(".music-song");
      var artistEl = panel.querySelector(".music-artist");
      if (window.MediaMetadata) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: songEl ? songEl.textContent.trim() : document.title,
          artist: artistEl ? artistEl.textContent.trim() : "",
        });
      }
      navigator.mediaSession.setActionHandler("play", function () {
        wanted = true;
        write(KEY_ON, "1", ls);
        play(false);
      });
      navigator.mediaSession.setActionHandler("pause", turnOff);
    } catch (e) {
      /* 浏览器不支持就算了 */
    }
  }

  render();
  if (wanted) {
    play(true);
  } else {
    setState("paused");
  }
})();
