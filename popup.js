import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js"
import { getDatabase, get, set, ref, push, onValue, remove} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js"

const firebaseConfig = {
    databaseURL: "https://pomodoro-timer-2cd51-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const referenceInDB = ref(database, "timerData");

const time = document.querySelector("#time");
const timerText = document.querySelector("#timer-text");
const timerContainer = document.querySelector("#timer-container");
const timerBtnsDiv = document.querySelector("#timer-buttons");
const storageBtnsDiv= document.querySelector("#storage-buttons");
const ssRows = document.querySelector("#ss-rows");
const clrBtnDiv = document.querySelector("#clr-btn-holder");
let timerInterval;

let timerData;

//start/resume timer
const startTimer = () => {
    if (timerData.newSession) {
        const currentDate = new Date();
        timerData.dateStarted = currentDate.toLocaleDateString();
        timerData.timeStarted = currentDate.toLocaleTimeString();
    }
    timerData.newSession = false;
    timerData.isRunning = true;
    timerData.isPaused = false;
    updateTimerData();
    timerInterval = setInterval(runTimer, 1000);
};

//pause timer
const pauseTimer = () => {
    clearInterval(timerInterval);
    timerData.isRunning = false;
    timerData.isPaused = true;
    updateTimerData();
};

// timer, tracks minutes and seconds
const runTimer = () => {
    if (timerData.timeLeft.minutes === 0 && timerData.timeLeft.seconds === 0) {
        //sendNotification();
        clearInterval(timerInterval);
        timerData.isRunning = false;
        if (!timerData.isBreak) {
            breakTime();
        } else {
            workTime();
        }
        updatePeriod();
        return;
    }
    //if seconds equals 0, subtract 1 minute, otherwise subtract 1 second
    if (timerData.timeLeft.seconds === 0) {
        timerData.timeLeft.minutes--;
        timerData.timeLeft.seconds = 59;
    } else {
        timerData.timeLeft.seconds--;
    }
    updateTime();
};

//setup timer for break period
const breakTime = () => {
    timerData.isBreak = true;
    timerData.timeStudied.minutes += 25;
    timerData.timeLeft = timerData.workCounter % 3 === 0 ? { minutes: 0, seconds: 10 } : { minutes: 0, seconds: 5};
    updateTimerData();
};

//setup timer for work period
const workTime = () => {
    timerData.isBreak = false;
    if (timerData.workCounter % 3 === 0) {
        timerData.timeStudied.minutes += 15;
    } else {
        timerData.timeStudied.minutes += 5;
    }
    timerData.timeLeft = { minutes: 0, seconds: 5 };
    timerData.workCounter++;
    updateTimerData();
};

//sets up user input for titling sessions
const titleSession = () => {
    timerText.textContent = "Title your session:";
    time.textContent = "";
    timerBtnsDiv.innerHTML = "";
    const inputHTML= '<input type="text" id="title-session">';
    const enterBtnHTML = '<button id="enter-btn">ENTER</button>';
    storageBtnsDiv.innerHTML = `${inputHTML}${enterBtnHTML}`;
};

//saves study session
const saveSession = (title) => {
    currentTimeStudied();
    const session = {
        date: timerData.dateStarted,
        time: timerData.timeStarted,
        hours: timerData.timeStudied.hours,
        minutes: timerData.timeStudied.minutes,
        seconds: timerData.timeStudied.seconds,
        title: title
    };
    console.log("session time studied", session);
    if (timerData.savedSessions[0] === "placeholder") {
        timerData.savedSessions = [session];
    } else {
        timerData.savedSessions.push(session);
    }
    updateTimerData();
};

//gets time studied from a paused session 
const currentTimeStudied = () => {
    console.log("session time before adjusting for pause", timerData.timeStudied);
    if (timerData.isPaused) {
        if (timerData.isBreak) {
            if (timerData.workCounter % 3 === 0) {
                timerData.timeStudied.minutes += 15 - timerData.timeLeft.minutes;
            } else {
                timerData.timeStudied.minutes += 5 - timerData.timeLeft.minutes;
            }
        } else {
            timerData.timeStudied.minutes += 25 - timerData.timeLeft.minutes;
        }
        timerData.timeStudied.seconds += 60 - timerData.timeLeft.seconds;
        timerData.timeStudied.minutes--;
    }
    adjustTimeStudied();
}

// adjust time studied variable into hours, minutes, and seconds
const adjustTimeStudied = () => {
    while (timerData.timeStudied.seconds > 59) {
        timerData.timeStudied.minutes++;
        timerData.timeStudied.seconds -= 60;
    }
    while (timerData.timeStudied.minutes > 59) {
        timerData.timeStudied.hours++;
        timerData.timeStudied.minutes -= 60;
    }
    updateTimerData();
}

/////// EVENT LISTENERS ///////////
 
// start and pause buttons (added dynamically)
timerBtnsDiv.addEventListener("click", function(event) {
    if (event.target && event.target.id === "start-btn") {
        startTimer();
        updateRunning();
    }
    if (event.target && event.target.id === "pause-btn") {
        pauseTimer();
        updatePause();
    }
});

// save and reset buttons (added dynamically)
storageBtnsDiv.addEventListener("click", function(event) {
    if (event.target && event.target.id === "reset-btn") {
        initialize(true);
    }
    if (event.target && event.target.id === "save-btn") {
        timerContainer.style.backgroundColor = "rgb(223, 141, 48)";
        titleSession();
    }
    if (event.target && event.target.id === "enter-btn") {
        const inputEl = document.querySelector("#title-session");
        saveSession(inputEl.value);
        setupSessions();
        initialize(true);
    }
});

//click listener for clear button
clrBtnDiv.addEventListener("click", function(event) {
    if (event.target && event.target.id === "clear-ss-btn") {
        timerData.savedSessions = ["placeholder"];            
        setupSessions();
        updateTimerData();
        clrBtnDiv.innerHTML = "";
    }
});

//listener for when website is opened
document.addEventListener('DOMContentLoaded', function() {
    // gets data from firebase if it exists, if not, initialize data
    get(referenceInDB)
        .then( (snapshot) => {
            if (snapshot.exists()) {
                grabData(snapshot.val());
                setupUI();
            } else {
                initialize(false);
                return;
            }
        })
        .catch( (error) => {
            console.log("error", error);
    });
});

/////// UI UPDATE FUNCTIONS //////////

//grabs data from firebase and sets it to global variables
const grabData = (data) => {
    timerData = data;
};

//updates firebase data
const updateTimerData = () => {
    set(referenceInDB, timerData);
}

//display current time left - keeping 2 digit format
const updateTime = () => {
    const minutes = timerData.timeLeft.minutes.toString().padStart(2, '0');
    const seconds = timerData.timeLeft.seconds.toString().padStart(2, '0');
    time.textContent = `${minutes}:${seconds}`;
}

//changes UI depending on running period
const updateRunning = () => {
    timerBtnsDiv.innerHTML = '<button id="pause-btn">PAUSE</button>';
    storageBtnsDiv.innerHTML = "";
    if (timerData.isBreak) {
        if (timerData.workCounter % 3 === 0) {
            timerContainer.style.backgroundColor = "rgb(26, 79, 171)";
            timerText.textContent = "Long Break Time Remaining:";
        } else {
            timerContainer.style.backgroundColor = "rgb(107, 158, 234)";
            timerText.textContent = "Short Break Time Remaining:";
        }
    } else {
        timerContainer.style.backgroundColor = "rgb(241, 66, 35)";
        timerText.textContent = "Work Time Remaining:";
    }
};

// sets up UI to paused state
const updatePause = () => {
    timerContainer.style.backgroundColor = "rgb(127, 131, 125)";
    timerBtnsDiv.innerHTML = '<button id="start-btn">RESUME</button>';
    storageBtnsDiv.innerHTML = '<button id="save-btn">SAVE</button><button id="reset-btn">RESET</button>';
    if (timerData.isBreak) {
        if (timerData.workCounter % 3 === 0) {
            timerText.textContent = "Long Break Time Remaining:";
        } else {
            timerText.textContent = "Short Break Time Remaining:";
        }
    } else {
        timerText.textContent = "Work Time Remaining:";
    }
};

//changes period from work to break and vice versa
const updatePeriod = () => {
    timerBtnsDiv.innerHTML = '<button id="start-btn">START</button>';
    storageBtnsDiv.innerHTML = '<button id="save-btn">SAVE</button><button id="reset-btn">RESET</button>';
    if (timerData.isBreak) {
        if (timerData.workCounter % 3 === 0) {
            timerContainer.style.backgroundColor = "rgb(26, 79, 171)";
            timerText.textContent = "Time for a long break!";
        } else {
            timerContainer.style.backgroundColor = "rgb(107, 158, 234)";
            timerText.textContent = "Time for a short break!";
        }
    } else {
        timerContainer.style.backgroundColor = "rgb(241, 66, 35)";
        timerText.textContent = "Time to work!";
    }
    updateTime();
};

//setting up the UI when website is loaded in
const setupUI = () => {
    if (!timerData.newSession) {
        updateTime();
        if (timerData.isPaused) {
            updatePause();
        } else {
            updatePeriod();
        }
    } else {
        initialize(true);
    }
    setupSessions();
}

//sets up saved sessions log
const setupSessions = () => {
    if (timerData.savedSessions.length !== 0) {
        clrBtnDiv.innerHTML = '<button id="clear-ss-btn">CLEAR</button>';
    }
    let rows = "";
    if (timerData.savedSessions[0] !== "placeholder") {
        for (const session of timerData.savedSessions) {
            const date = session.date;
            const timeStarted = session.time;
            const hours = (session.hours === 0) ? "" : session.hours.toString().padStart(2, '0') + ':';
            const minutes = session.minutes.toString().padStart(2, '0');
            const seconds = session.seconds.toString().padStart(2, '0');
            const title = session.title;
            rows += `<tr><td>${date}<br>${timeStarted}</td><td>${hours}${minutes}:${seconds}</td><td>${title}</td></tr>`;
        }
    }
    ssRows.innerHTML = rows;
};

// sets up UI to initial state
const initialize = (reset) => {
    timerBtnsDiv.innerHTML = '<button id="start-btn">START</button>';
    time.textContent = "00:05";
    timerContainer.style.backgroundColor = "rgb(223, 141, 48)";
    timerText.textContent = "Start a Study Session";
    storageBtnsDiv.innerHTML = "";
    let data = {
        timeLeft: { minutes : 0, seconds : 5 },
        isRunning: false,
        isBreak: false,
        workCounter: 1,
        isPaused: false,
        newSession: true,
        timeStudied: { hours: 0, minutes: 0, seconds: 0 },
        dateStarted: "",
        timeStarted: "",
    }
    data.savedSessions = reset === true ? timerData.savedSessions : ["placeholder"];
    timerData = data;
    updateTimerData();
    console.log("initialized", timerData);
};