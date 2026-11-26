'use strict';

(function () {
  const data = window.redChamberData;
  const story = window.redChamberStory;
  const key = 'red-chamber-choices.v1';
  const views = Array.from(document.querySelectorAll('main > section'));
  const get = function (id) { return document.getElementById(id); };
  const game = get('game');
  const world = window.redChamberWorld(get('world'), function () {
    if (sceneIndex < 0 && !get('home').disabled) positionPins();
  });
  const status = get('storage-status');
  let save = story.emptySave();
  let sceneIndex = -1;
  let mapStation = 0;
  let travellingTo = null;
  let lineIndex = 0;
  let sceneLines = [];
  let selected = '';
  let screen = 'map';
  let returnScreen = 'map';
  let storage = null;
  let pendingWrite = Promise.resolve();
  let writeSequence = 0;
  let badgeRevealPending = false;

  function show(name, focus) {
    if (screen !== name) {
      if (screen === 'map') get('pins').classList.remove('is-revealing', 'is-preparing');
      views.find(function (panel) { return panel.id === screen + '-view'; })
        .querySelectorAll('.badge-stage.is-revealing').forEach(function (stage) {
          stage.classList.remove('is-revealing');
        });
    }
    screen = name;
    views.forEach(function (panel) { panel.hidden = panel.id !== name + '-view'; });
    get('home').hidden = name === 'map';
    get('wordmark').hidden = name !== 'map';
    get('collection').hidden = name === 'badge';
    if (focus) get(name + '-view').querySelector('h1').focus();
  }

  function setWorld(animateMap = false) {
    game.dataset.world = sceneIndex < 0 ? 'map' : data.scenes[sceneIndex].id;
    world.setScene(sceneIndex, save.choices.length, mapStation, animateMap);
  }

  function setStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }

  function buildVersion(options) {
    const value = options && options.miniToolEnv && options.miniToolEnv.buildVersion;
    if (!/^[1-9]\d{6,}$/.test(String(value))) return 0;
    return Number.isSafeInteger(Number(value)) ? Number(value) : 0;
  }

  function withReadDeadline(promise) {
    let timer;
    return Promise.race([
      promise,
      new Promise(function (resolve, reject) {
        timer = window.setTimeout(function () { reject(new Error('读取超时')); }, 2000);
      })
    ]).then(function (value) {
      window.clearTimeout(timer);
      return value;
    }, function (error) {
      window.clearTimeout(timer);
      throw error;
    });
  }

  async function loadSave() {
    const xhs = window.xhs;
    const miniTool = xhs && xhs.miniTool;
    if (!miniTool || typeof miniTool.getStorage !== 'function' || typeof miniTool.setStorage !== 'function') {
      setStatus('当前环境无法保存进度。进度仅保留在本次游玩。');
      return;
    }
    try {
      let version = buildVersion(xhs.launchOptions);
      if (!version && typeof miniTool.getLaunchOptions === 'function') {
        version = buildVersion(await withReadDeadline(miniTool.getLaunchOptions()));
      }
      if (Math.floor(version / 1000) < 9460) {
        setStatus('当前客户端无法保存进度。可以继续游玩。');
        return;
      }
      const result = await withReadDeadline(miniTool.getStorage({ key: key }));
      if (!result || (result.errMsg && result.errMsg !== 'getStorage:ok') ||
          (result.data !== null && typeof result.data !== 'string')) {
        throw new Error('存档格式无法识别');
      }
      if (result.data) save = story.validateSave(JSON.parse(result.data));
      storage = miniTool;
    } catch (error) {
      setStatus('未能读取存档，原有记录会保留。你可以在本次打开期间游玩。');
    }
  }

  function persist() {
    if (!storage) return;
    const snapshot = JSON.stringify(save);
    const request = ++writeSequence;
    pendingWrite = pendingWrite.then(async function () {
      try {
        const result = await storage.setStorage({ key: key, data: snapshot });
        if (!result || result.errMsg !== 'setStorage:ok') throw new Error('存档未确认');
        if (request === writeSequence) setStatus('');
      } catch (error) {
        if (request === writeSequence) setStatus('进度未能保存。本局仍可继续，下次选择时会再尝试保存。');
      }
    });
  }

  function renderBadgeCount() {
    get('badge-count').textContent = save.badges.length + ' / ' + Object.keys(data.badges).length;
  }

  function renderMap(animateEntrance = false) {
    const count = save.choices.length;
    const finished = count === data.scenes.length;
    get('progress').textContent = '已点亮 ' + count + ' / ' + data.scenes.length;
    get('map-completion').value = count;
    get('map-hint').textContent = travellingTo !== null ? '黛玉正前往' + data.scenes[travellingTo].place + '。' :
      finished ? '四处旧景都已点亮。' :
      count ? '前往' + data.scenes[count].place + '，续读故事。' : '从荣国府开始，逐处点亮地图。';
    get('view-ending').hidden = !finished || travellingTo !== null;
    renderBadgeCount();
    const pins = get('pins');
    pins.classList.remove('is-revealing', 'is-preparing');
    pins.innerHTML = data.scenes.map(function (scene, index) {
      const state = index > count ? 'locked' : index === count ? 'open' : 'done';
      const label = { locked: '锁定', open: '可进入', done: '已点亮，可回看' }[state];
      return `<button type="button" class="pin" data-open="${index}" data-state="${state}"
        aria-label="${scene.title}，${label}" ${state === 'locked' || travellingTo !== null ? 'disabled' : ''}>
        <span class="pin-art">
          <span class="pin-mark" aria-hidden="true">${state === 'done' ? '✓' : ['一','二','三','四'][index]}</span>
          <span class="pin-name">${scene.place}</span>
        </span>
      </button>`;
    }).join('');
    positionPins();
    if (!animateEntrance) return;
    pins.classList.add('is-preparing');
    Array.from(pins.children).forEach(function (pin, index) {
      pin.style.setProperty('--pin-delay', world.stationDelay(index) + 'ms');
    });
    world.revealStations(function () {
      pins.classList.remove('is-preparing');
      if (screen === 'map') pins.classList.add('is-revealing');
    });
  }

  function positionPins() {
    const points = world.positions();
    get('pins').querySelectorAll('.pin').forEach(function (pin, index) {
      pin.style.left = points[index][0]*100 + '%';
      pin.style.top = points[index][1]*100 + '%';
    });
  }

  function goMap(focus) {
    sceneIndex = -1;
    setWorld();
    renderMap();
    show('map', focus);
  }

  function goStory(index) {
    if (index < 0 || index > save.choices.length || !data.scenes[index]) return;
    sceneIndex = index;
    mapStation = index;
    lineIndex = 0;
    const scene = data.scenes[index];
    sceneLines = [['旁白', scene.description]].concat(story.dialogue(index, save.choices));
    selected = '';
    get('chapter').textContent = scene.chapter;
    get('scene-title').textContent = scene.title;
    setWorld();
    renderStory();
    show('scene', true);
  }

  function renderStory() {
    const scene = data.scenes[sceneIndex];
    const previousChoice = story.choiceAt(sceneIndex, save.choices[sceneIndex]);
    const line = sceneLines[lineIndex];
    const panel = get('scene-paper');
    const advance = sceneIndex === data.scenes.length - 1 ? '翻阅尾声' : '进入下一站';

    if (line) {
      panel.innerHTML = `
        <p class="speaker" id="paper-focus" tabindex="-1">${line[0]}</p>
        <p class="speech-text" aria-live="polite">${line[1]}</p>
        <div class="paper-controls"><span class="line-count">
          <progress class="paper-progress" value="${lineIndex + 1}" max="${sceneLines.length}" aria-label="本段剧情阅读进度"></progress>
          ${lineIndex + 1} / ${sceneLines.length}</span>
          <button type="button" class="action" data-action="next">${lineIndex + 1 < sceneLines.length ? '继续' : previousChoice ? '查看这一回的选择' : '作出选择'} →</button></div>`;
    } else if (previousChoice) {
      panel.innerHTML = `
        <p class="speaker" id="paper-focus" tabindex="-1">${scene.place} · 已落笔</p>
        <p class="speech-text">${previousChoice.response}</p>
        <p class="side-note choice-recap">${previousChoice.text}</p>
        <div class="paper-controls journey-controls"><button type="button" class="ghost" data-action="map">回到地图</button>
          <button type="button" class="action" data-action="advance">${advance} →</button></div>`;
    } else {
      const options = scene.choices.map(function (choice) {
        return `<button type="button" class="choice" data-choice="${choice.id}" aria-pressed="false">${choice.text}
          <small>${choice.hint}</small></button>`;
      }).join('');
      panel.innerHTML = `
        <h2 class="speaker" id="paper-focus" tabindex="-1">${scene.prompt}</h2>
        <div class="choices">${options}</div>
        <div class="paper-controls"><span class="side-note">取材自${scene.chapter}，台词为改编</span>
          <button type="button" class="action" id="confirm" data-action="confirm" disabled>落笔</button></div>`;
    }
    panel.scrollTop = 0;
  }

  function nextLine() {
    if (lineIndex >= sceneLines.length) return;
    lineIndex += 1;
    renderStory();
    get('paper-focus').focus();
  }

  function selectChoice(button) {
    selected = button.dataset.choice;
    get('scene-paper').querySelectorAll('[data-choice]').forEach(function (option) {
      option.setAttribute('aria-pressed', String(option === button));
    });
    get('confirm').disabled = false;
  }

  function confirmChoice() {
    const next = story.choose(save, sceneIndex, selected);
    if (next === save) return;
    save = next;
    if (save.choices.length === data.scenes.length) badgeRevealPending = true;
    renderBadgeCount();
    selected = '';
    persist();
    renderStory();
    get('paper-focus').focus();
  }

  function medal(id) {
    return `<img class="medal" alt="" width="104" height="104" src="./assets/papercraft/badge-${id}.webp">`;
  }

  function badgeStage(id, interactive) {
    const badge = data.badges[id];
    const canReplay = interactive && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tag = canReplay ? 'button' : 'div';
    const replay = canReplay ? `type="button" data-action="badge-effects" aria-label="重播「${badge.name}」动效"` : '';
    return `<${tag} class="badge-stage" data-badge-theme="${id}" ${replay}>
      <span class="badge-halo" aria-hidden="true"></span>
      <span class="badge-ripple" aria-hidden="true"></span>
      <span class="badge-pieces" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
      ${medal(id)}
    </${tag}>`;
  }

  function playBadgeEffect(stage) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stage.classList.remove('is-revealing');
    // Repeated taps restart the finite effect on the same badge.
    void stage.offsetWidth;
    stage.classList.add('is-revealing');
  }

  function goResult() {
    const result = story.result(save.choices);
    if (!result) return;
    if (sceneIndex !== data.scenes.length - 1) {
      sceneIndex = data.scenes.length - 1;
      setWorld();
    }
    const badge = data.badges[result.badge];
    const scores = Object.keys(data.dimensions).map(function (id) {
      return `<div class="score"><dt>${data.dimensions[id]}</dt><dd>${Math.round(result.scores[id] / 8 * 100)}</dd></div>`;
    }).join('');
    const recap = [1, 3].map(function (index) {
      return '<li><strong>' + data.scenes[index].place + '</strong> · ' + story.choiceAt(index, save.choices[index]).response + '</li>';
    }).join('');
    const view = get('result-view');
    view.dataset.badgeTheme = result.badge;
    view.innerHTML = `<div class="sheet ending-sheet">
      <div class="result-badge" data-badge-theme="${result.badge}">
        <p class="setting">本局徽章 · ${badge.type}</p>
        ${badgeStage(result.badge, true)}
        <h1 id="result-title" tabindex="-1">${badge.name}</h1>
        <p class="badge-meaning">${badge.meaning}</p>
      </div>
      <p class="ending-detail">${badge.detail}</p>
      <h2 class="ending-heading">故事落笔</h2>
      <p>${result.ending}</p>
      <dl class="score-grid" aria-label="三项评分，满分各为一百">${scores}</dl>
      <h3>回看这一局</h3><ol class="recap">${recap}</ol>
      <div class="result-actions"><button type="button" class="action" data-action="replay">再走一回</button>
        <button type="button" class="ghost" data-action="badges">查看徽章册</button></div>
    </div>`;
    show('result', true);
    if (badgeRevealPending) {
      badgeRevealPending = false;
      playBadgeEffect(view.querySelector('.badge-stage'));
    }
  }

  function goBadges() {
    returnScreen = screen;
    const list = Object.keys(data.badges).map(function (id) {
      const badge = data.badges[id];
      const earned = save.badges.includes(id);
      return `<article class="badge-card" data-badge-theme="${id}" data-earned="${earned}">${badgeStage(id, earned)}
        <h2>${badge.name}</h2><p class="badge-status">${badge.type} · ${earned ? '已获得' : '待获得'}</p>
        <p class="badge-meaning">${badge.meaning}</p></article>`;
    }).join('');
    get('badge-view').innerHTML = `<div class="sheet badge-book">
      <div class="badge-book-heading">
        <div><p class="setting">林黛玉篇</p><h1 id="badge-title" tabindex="-1">徽章册</h1></div>
        <p class="book-count">已获得 ${save.badges.length} / ${Object.keys(data.badges).length}</p>
      </div>
      <div class="badge-grid">${list}</div>
      <button type="button" class="ghost" data-action="close-badges">合上徽章册</button></div>`;
    show('badge', true);
  }

  function replay() {
    save = { version: save.version, choices: [], badges: save.badges };
    mapStation = 0;
    badgeRevealPending = false;
    persist();
    goMap(true);
  }

  function advance() {
    const next = sceneIndex + 1;
    if (next === data.scenes.length) {
      goResult();
      return;
    }
    travellingTo = next;
    get('collection').disabled = true;
    goMap(true);
    world.walkTo(next, function () {
      travellingTo = null;
      get('collection').disabled = false;
      goStory(next);
    });
  }

  const actions = {
    next: nextLine,
    confirm: confirmChoice,
    advance: advance,
    map: function () { goMap(true); },
    replay: replay,
    badges: goBadges,
    'badge-effects': playBadgeEffect,
    'close-badges': function () { show(returnScreen, true); }
  };

  game.addEventListener('click', function (event) {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.open !== undefined) goStory(Number(button.dataset.open));
    if (button.dataset.choice) selectChoice(button);
    if (button.dataset.action) actions[button.dataset.action](button);
  });
  game.addEventListener('animationend', function (event) {
    if (event.animationName === 'badge-ring-out') {
      event.target.parentElement.classList.remove('is-revealing');
    }
  });
  get('home').addEventListener('click', function () { goMap(true); });
  get('view-ending').addEventListener('click', goResult);
  get('collection').addEventListener('click', goBadges);

  let resizeFrame = 0;
  window.addEventListener('resize', function () {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(function () {
      resizeFrame = 0;
      world.resize();
      if (sceneIndex < 0 && !get('home').disabled) positionPins();
    });
  });
  setWorld(true);
  loadSave().then(function () {
    mapStation = Math.max(0, save.choices.length - 1);
    if (save.choices.length > 0) setWorld(true);
    renderMap(true);
    ['home', 'collection'].forEach(function (id) { get(id).disabled = false; });
  });
}());
