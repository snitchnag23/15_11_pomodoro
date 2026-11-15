// Pomodoro timer.
// The time left is worked out from the clock (Date.now), not by counting ticks,
// so it stays correct even when the tab is in the background.

var TOTAL_MS = 15 * 1000; // TEST ONLY: 15 seconds. Put back to 25 * 60 * 1000.
var MAX_BLUR_PX = 18; // how blurry the painting is at the start

var timeEl = document.getElementById('time');
var mainBtn = document.getElementById('main-btn');
var resetBtn = document.getElementById('reset-btn');
var restartBtn = document.getElementById('restart-btn');
var detailsEl = document.getElementById('details');
var paintingEl = document.getElementById('painting');

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

  // The painting gets sharper as the time runs down.
  var blur = MAX_BLUR_PX * (remainingMs / TOTAL_MS);
  paintingEl.style.setProperty('--blur', blur.toFixed(2) + 'px');

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

resetBtn.addEventListener('click', backToStart);
restartBtn.addEventListener('click', backToStart);

// When you come back to the tab, update straight away.
document.addEventListener('visibilitychange', function () {
  if (state === 'running') {
    tick();
  }
});

render();
