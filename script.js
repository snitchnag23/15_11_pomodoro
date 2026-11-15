// Pomodoro timer: always 25 minutes.
// The time left is worked out from the clock (Date.now), not by counting ticks,
// so it stays correct even when the tab is in the background.

var TOTAL_MS = 15 * 1000; // TEST ONLY: 15 seconds. Put back to 25 * 60 * 1000.
var MAX_BLUR_PX = 18; // how blurry the painting is at 25:00

var timeEl = document.getElementById('time');
var mainBtn = document.getElementById('main-btn');
var resetBtn = document.getElementById('reset-btn');
var paintingEl = document.getElementById('painting');

var state = 'idle'; // idle, running, paused
var remainingMs = TOTAL_MS; // time left when not running
var endTime = 0; // clock time when the timer will hit 00:00 (while running)
var intervalId = null;

function pad(n) {
  return (n < 10 ? '0' : '') + n;
}

function render() {
  var secondsLeft = Math.ceil(remainingMs / 1000);
  timeEl.textContent = pad(Math.floor(secondsLeft / 60)) + ':' + pad(secondsLeft % 60);

  // The painting gets sharper as the time runs down.
  var blur = MAX_BLUR_PX * (remainingMs / TOTAL_MS);
  paintingEl.style.setProperty('--blur', blur.toFixed(2) + 'px');

  if (state === 'idle') {
    mainBtn.textContent = 'Start';
  } else if (state === 'running') {
    mainBtn.textContent = 'Pause';
  } else {
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
    // Reached 00:00: stop here. Nothing else happens.
    stopTicking();
    state = 'paused';
  }
  render();
}

function startTicking() {
  endTime = Date.now() + remainingMs;
  state = 'running';
  stopTicking();
  intervalId = setInterval(tick, 250);
  render();
}

mainBtn.addEventListener('click', function () {
  if (state === 'idle') {
    startTicking();
  } else if (state === 'running') {
    // Pause
    remainingMs = Math.max(0, endTime - Date.now());
    stopTicking();
    state = 'paused';
    render();
  } else if (remainingMs > 0) {
    // Resume (does nothing at 00:00)
    startTicking();
  }
});

resetBtn.addEventListener('click', function () {
  stopTicking();
  state = 'idle';
  remainingMs = TOTAL_MS;
  render();
});

// When you come back to the tab, update straight away.
document.addEventListener('visibilitychange', function () {
  if (state === 'running') {
    tick();
  }
});

render();
