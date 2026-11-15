// Pomodoro timer.
// The time left is worked out from the clock (Date.now), not by counting ticks,
// so it stays correct even when the tab is in the background.

var TOTAL_MS = 15 * 1000; // TEST ONLY: 15 seconds. Put back to 25 * 60 * 1000.

var timeEl = document.getElementById('time');
var mainBtn = document.getElementById('main-btn');
var resetBtn = document.getElementById('reset-btn');
var restartBtn = document.getElementById('restart-btn');
var detailsEl = document.getElementById('details');
var paintingEl = document.getElementById('painting');
var titleEl = document.getElementById('painting-title');
var artistEl = document.getElementById('painting-artist');
var yearEl = document.getElementById('painting-year');
var linkEl = document.getElementById('painting-link');

var state = 'idle'; // idle, running, paused, done
var remainingMs = TOTAL_MS; // time left when not running
var endTime = 0; // clock time when the timer will hit 00:00 (while running)
var intervalId = null;

// ---- Bell sound ("Glass drop"), made with Web Audio. No sound files. ----
// The bell is scheduled on the audio clock when the timer starts. The audio
// clock is not slowed down in background tabs, so the bell still rings on time.

var audioCtx = null;
var bell = null; // the bell that is scheduled or ringing: { startAt, stop }

// Browsers only allow sound after a click, so this runs on Start and Resume.
function unlockAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (e) {
    audioCtx = null;
  }
}

// One note: a main tone plus a quieter, higher "glassy" overtone.
function bellNote(nodes, dest, freq, t, decay) {
  var peak = 0.5;
  var parts = [[freq, peak, decay], [freq * 2.01, peak * 0.25, decay * 0.6]];
  parts.forEach(function (p) {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = p[0];
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(p[1], t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + decay + 0.05);
    nodes.push(o);
  });
}

// Two soft, round notes going down, with a gentle echo (about 2.5 seconds).
function makeBell(startAt) {
  var nodes = [];
  var master = audioCtx.createGain();
  master.gain.value = 0.3;
  master.connect(audioCtx.destination);

  var echo = audioCtx.createDelay(1);
  echo.delayTime.value = 0.24;
  var feedback = audioCtx.createGain();
  feedback.gain.value = 0.35;
  var soften = audioCtx.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 3000;
  echo.connect(feedback);
  feedback.connect(echo);
  echo.connect(soften);
  soften.connect(master);

  var input = audioCtx.createGain();
  input.connect(master);
  input.connect(echo);

  bellNote(nodes, input, 1318.5, startAt, 4.2);
  bellNote(nodes, input, 987.8, startAt + 0.3, 4.5);

  return {
    startAt: startAt,
    stop: function () {
      // Silence it straight away, even if it is already ringing.
      try {
        var now = audioCtx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(0, now);
        nodes.forEach(function (o) {
          try { o.stop(now); } catch (e) { /* already stopped */ }
        });
        master.disconnect();
        echo.disconnect();
      } catch (e) { /* nothing to stop */ }
    }
  };
}

function scheduleBell() {
  cancelBell();
  if (!audioCtx) { return; }
  try {
    bell = makeBell(audioCtx.currentTime + remainingMs / 1000);
  } catch (e) {
    bell = null;
  }
}

function cancelBell() {
  if (bell) {
    bell.stop();
    bell = null;
  }
}

// Safety net: if the audio clock was paused by the browser, ring now instead.
function ringNowIfMissed() {
  if (!audioCtx) { return; }
  try {
    if (bell && audioCtx.currentTime < bell.startAt - 0.3) {
      cancelBell();
      if (audioCtx.state === 'suspended') { audioCtx.resume(); }
      bell = makeBell(audioCtx.currentTime + 0.05);
    }
  } catch (e) { /* no sound is better than a broken timer */ }
}

// ---- Timer ----

function pad(n) {
  return (n < 10 ? '0' : '') + n;
}

function render() {
  var secondsLeft = Math.ceil(remainingMs / 1000);
  timeEl.textContent = pad(Math.floor(secondsLeft / 60)) + ':' + pad(secondsLeft % 60);

  var done = state === 'done';
  mainBtn.hidden = done;
  resetBtn.hidden = done;
  restartBtn.hidden = !done;
  detailsEl.hidden = !done;

  if (state === 'idle') {
    mainBtn.textContent = 'Start';
  } else if (state === 'running') {
    mainBtn.textContent = 'Pause';
  } else if (state === 'paused') {
    mainBtn.textContent = 'Resume';
  }
}

function stopTicking() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function tick() {
  remainingMs = Math.max(0, endTime - Date.now());
  if (remainingMs === 0) {
    // Reached 00:00: stop here, never go lower. The bell rings by itself.
    stopTicking();
    state = 'done';
    ringNowIfMissed();
  }
  render();
}

function startTicking() {
  endTime = Date.now() + remainingMs;
  state = 'running';
  stopTicking();
  intervalId = setInterval(tick, 250);
  scheduleBell();
  render();
}

function backToStart() {
  stopTicking();
  cancelBell();
  state = 'idle';
  remainingMs = TOTAL_MS;
  render();
}

mainBtn.addEventListener('click', function () {
  if (state === 'idle') {
    unlockAudio();
    startTicking();
  } else if (state === 'running') {
    // Pause
    remainingMs = Math.max(0, endTime - Date.now());
    stopTicking();
    cancelBell();
    state = 'paused';
    render();
  } else if (state === 'paused') {
    // Resume
    unlockAudio();
    startTicking();
  }
});

resetBtn.addEventListener('click', backToStart); // Reset keeps the same painting
restartBtn.addEventListener('click', function () {
  backToStart();
  loadPainting(); // Restart session loads a new painting
});

// ---- Painting from the Met Museum's free public API ----
// The image and all the details come from the same record, and are put on the
// page together, so the details at 00:00 always belong to the painting you see.

// Paintings made between 1400 and 1925 are almost all public domain.
var SEARCH_URL = 'https://collectionapi.metmuseum.org/public/collection/v1.1/search?hasImages=true&medium=Paintings&dateBegin=1400&dateEnd=1925&limit=500&offset=';
var OBJECT_URL = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/';
var BATCH_SIZE = 8; // records checked at the same time
var MAX_ROUNDS = 8; // so at most 64 records are checked per painting
var loadCount = 0; // so an old, slow answer never replaces a newer painting

// Get one record from the Met. Gives null if it could not be read.
function fetchRecord(id) {
  return fetch(OBJECT_URL + id)
    .then(function (res) { return res.ok ? res.json() : null; })
    .catch(function () { return null; });
}

function isGoodPainting(o) {
  return !!o && o.isPublicDomain === true &&
    /^painting/i.test(o.objectName || '') &&
    !!(o.primaryImageSmall || o.primaryImage);
}

function preloadImage(url) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
}

function clearPainting() {
  paintingEl.hidden = true;
  paintingEl.removeAttribute('src');
  titleEl.textContent = '';
  artistEl.textContent = '';
  yearEl.textContent = '';
  linkEl.removeAttribute('href');
}

function showPainting(o, imageUrl) {
  titleEl.textContent = o.title || 'Unknown';
  artistEl.textContent = o.artistDisplayName || 'Unknown';
  yearEl.textContent = o.objectDate || 'Unknown';
  if (typeof o.objectURL === 'string' && o.objectURL.indexOf('https://www.metmuseum.org/') === 0) {
    linkEl.href = o.objectURL;
  }
  paintingEl.src = imageUrl;
  paintingEl.hidden = false;
}

async function loadPainting() {
  var myLoad = ++loadCount;
  clearPainting();
  try {
    // Start at a random place in the list of paintings that have an image.
    var offset = Math.floor(Math.random() * 8800);
    var search = await (await fetch(SEARCH_URL + offset)).json();
    var ids = (search.objectIDs || []).slice();

    // Look at a few random records at a time. Keep the first one that is a
    // public domain painting with an image; quietly skip the others.
    for (var round = 0; round < MAX_ROUNDS && ids.length > 0; round++) {
      var batch = [];
      while (batch.length < BATCH_SIZE && ids.length > 0) {
        batch.push(ids.splice(Math.floor(Math.random() * ids.length), 1)[0]);
      }
      var records = await Promise.all(batch.map(fetchRecord));
      if (myLoad !== loadCount) { return; }

      for (var k = 0; k < records.length; k++) {
        var o = records[k];
        if (!isGoodPainting(o)) { continue; }
        var imageUrl = o.primaryImageSmall || o.primaryImage;
        try {
          await preloadImage(imageUrl);
        } catch (e) {
          continue;
        }
        if (myLoad !== loadCount) { return; }
        showPainting(o, imageUrl);
        return;
      }
    }
  } catch (e) {
    console.error('Could not get a painting from the Met:', e);
  }
}

// When you come back to the tab, update straight away.
document.addEventListener('visibilitychange', function () {
  if (state === 'running') {
    tick();
  }
});

render();
loadPainting();
