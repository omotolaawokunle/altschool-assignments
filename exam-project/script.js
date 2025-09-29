let hours = 0;
let minutes = 0;
let seconds = 0;
let milliseconds = 0;
let interval = null;
let isRunning = false;
let lapCounter = 1;

const display = document.getElementById("display");
const millisecondsDisplay = document.getElementById("milliseconds");
const mainBtn = document.getElementById("mainBtn");
const clearBtn = document.getElementById("clearBtn");
const resetBtn = document.getElementById("resetBtn");
const lapBtn = document.getElementById("lapBtn");
const lapsContainer = document.getElementById("laps");

// Format numbers to always show 2 digits
function pad(num) {
  return num < 10 ? "0" + num : num;
}

// Format milliseconds to show 3 digits
function padMs(num) {
  if (num < 10) return "00" + num;
  if (num < 100) return "0" + num;
  return num;
}

// Update the display
function updateDisplay() {
  display.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  millisecondsDisplay.textContent = `.${padMs(milliseconds)}`;
}

// Toggle start/stop
function toggleTimer() {
  if (!isRunning) {
    // Start the timer
    isRunning = true;

    // Update every 10 milliseconds for smooth display
    interval = setInterval(() => {
      milliseconds += 10;

      if (milliseconds >= 1000) {
        milliseconds = 0;
        seconds++;
      }

      if (seconds >= 60) {
        seconds = 0;
        minutes++;
      }

      if (minutes >= 60) {
        minutes = 0;
        hours++;
      }

      updateDisplay();
    }, 10);

    // Enable lap button
    lapBtn.disabled = false;
  } else {
    // Stop the timer
    clearInterval(interval);
    isRunning = false;

    // Disable lap button when stopped
    lapBtn.disabled = true;
  }
}

// Clear/Reset everything
function clear() {
  clearInterval(interval);
  isRunning = false;

  hours = 0;
  minutes = 0;
  seconds = 0;
  milliseconds = 0;
  lapCounter = 1;

  updateDisplay();

  // Clear lap times
  lapsContainer.innerHTML = "";

  // Hide laps panel by removing class from body
  document.body.classList.remove("has-laps");

  lapBtn.disabled = true;
}

// Reset timer (keeps it running if it was running)
function reset() {
  const wasRunning = isRunning;

  clearInterval(interval);
  isRunning = false;

  // Reset time values but keep lap counter
  hours = 0;
  minutes = 0;
  seconds = 0;
  milliseconds = 0;

  updateDisplay();

  // Restart if it was running
  if (wasRunning) {
    toggleTimer();
  }
}

// Record lap time
function recordLap() {
  if (isRunning) {
    const lapTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${padMs(
      milliseconds
    )}`;

    // Create lap item element
    const lapItem = document.createElement("div");
    lapItem.className = "lap-item";
    lapItem.innerHTML = `
                    <span class="lap-number">Lap ${lapCounter}</span>
                    <span class="lap-time">${lapTime}</span>
                `;

    // Add to top of laps container
    lapsContainer.insertBefore(lapItem, lapsContainer.firstChild);

    lapCounter++;
      
    // Show laps panel by adding class to body
    document.body.classList.add("has-laps");
  }
}

// Event listeners
mainBtn.addEventListener("click", toggleTimer);
clearBtn.addEventListener("click", clear);
resetBtn.addEventListener("click", reset);
lapBtn.addEventListener("click", recordLap);

// Initialize display
updateDisplay();
