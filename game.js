const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("scoreDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const levelDisplay = document.getElementById("levelDisplay");
const livesDisplay = document.getElementById("livesDisplay");
const timeDisplay = document.getElementById("timeDisplay");
const crystalDisplay = document.getElementById("crystalDisplay");

const startScreen = document.getElementById("startScreen");
const messageScreen = document.getElementById("messageScreen");
const pauseScreen = document.getElementById("pauseScreen");

const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const restartButton = document.getElementById("restartButton");
const resumeButton = document.getElementById("resumeButton");
const soundButton = document.getElementById("soundButton");
const messageButton = document.getElementById("messageButton");

const messageIcon = document.getElementById("messageIcon");
const messageTag = document.getElementById("messageTag");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");

const powerStatus = document.getElementById("powerStatus");
const directionButtons = document.querySelectorAll(".direction-button");

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

const keys = {
    up: false,
    down: false,
    left: false,
    right: false
};

const levelSettings = [
    {
        crystals: 8,
        bugs: 3,
        bugSpeed: 1.7,
        time: 60,
        background: "#16233f",
        grid: "#223455"
    },
    {
        crystals: 11,
        bugs: 5,
        bugSpeed: 2.2,
        time: 55,
        background: "#18352f",
        grid: "#245046"
    },
    {
        crystals: 14,
        bugs: 7,
        bugSpeed: 2.7,
        time: 50,
        background: "#34203f",
        grid: "#53305e"
    }
];

let player;
let crystals = [];
let bugs = [];
let powerUps = [];
let particles = [];

let score = 0;
let highScore = Number(localStorage.getItem("codeQuestHighScore")) || 0;
let lives = 3;
let currentLevel = 1;
let collectedCrystals = 0;
let timeRemaining = 60;

let gameRunning = false;
let gamePaused = false;
let levelFinished = false;
let soundEnabled = true;

let timerInterval = null;
let animationId = null;
let powerUpSpawnTimer = 0;

let shieldActive = false;
let shieldEndTime = 0;

let speedBoostActive = false;
let speedBoostEndTime = 0;

let freezeActive = false;
let freezeEndTime = 0;

let playerInvincible = false;
let playerInvincibleEndTime = 0;

let audioContext = null;

highScoreDisplay.textContent = highScore;

function createPlayer() {
    return {
        x: GAME_WIDTH / 2 - 22,
        y: GAME_HEIGHT / 2 - 22,
        width: 44,
        height: 44,
        speed: 4,
        emoji: "🧑‍💻"
    };
}

function createRandomPosition(size = 40) {
    return {
        x: Math.random() * (GAME_WIDTH - size - 40) + 20,
        y: Math.random() * (GAME_HEIGHT - size - 40) + 20
    };
}

function objectsOverlap(objectA, objectB) {
    return (
        objectA.x < objectB.x + objectB.width &&
        objectA.x + objectA.width > objectB.x &&
        objectA.y < objectB.y + objectB.height &&
        objectA.y + objectA.height > objectB.y
    );
}

function positionIsSafe(position, width, height) {
    const temporaryObject = {
        x: position.x,
        y: position.y,
        width,
        height
    };

    if (player && objectsOverlap(temporaryObject, player)) {
        return false;
    }

    for (const crystal of crystals) {
        if (objectsOverlap(temporaryObject, crystal)) {
            return false;
        }
    }

    for (const bug of bugs) {
        if (objectsOverlap(temporaryObject, bug)) {
            return false;
        }
    }

    return true;
}

function getSafePosition(width = 40, height = 40) {
    let position;
    let attempts = 0;

    do {
        position = createRandomPosition(Math.max(width, height));
        attempts++;
    } while (
        !positionIsSafe(position, width, height) &&
        attempts < 100
    );

    return position;
}

function createCrystals(amount) {
    crystals = [];

    for (let i = 0; i < amount; i++) {
        const position = getSafePosition(30, 30);

        crystals.push({
            x: position.x,
            y: position.y,
            width: 30,
            height: 30,
            rotation: Math.random() * Math.PI * 2,
            pulse: Math.random() * Math.PI * 2
        });
    }
}

function createBugs(amount, speed) {
    bugs = [];

    for (let i = 0; i < amount; i++) {
        const position = getSafePosition(42, 42);
        const angle = Math.random() * Math.PI * 2;

        bugs.push({
            x: position.x,
            y: position.y,
            width: 42,
            height: 42,
            speed,
            velocityX: Math.cos(angle) * speed,
            velocityY: Math.sin(angle) * speed,
            emoji: i % 2 === 0 ? "🐞" : "👾"
        });
    }
}

function startNewGame() {
    score = 0;
    lives = 3;
    currentLevel = 1;

    startScreen.classList.remove("active");
    messageScreen.classList.remove("active");
    pauseScreen.classList.remove("active");

    beginLevel();
}

function beginLevel() {
    clearInterval(timerInterval);
    cancelAnimationFrame(animationId);

    const settings = levelSettings[currentLevel - 1];

    player = createPlayer();
    collectedCrystals = 0;
    timeRemaining = settings.time;

    crystals = [];
    bugs = [];
    powerUps = [];
    particles = [];

    shieldActive = false;
    speedBoostActive = false;
    freezeActive = false;
    playerInvincible = false;

    powerUpSpawnTimer = 0;
    levelFinished = false;
    gamePaused = false;
    gameRunning = true;

    createCrystals(settings.crystals);
    createBugs(settings.bugs, settings.bugSpeed);

    updateDashboard();
    startCountdown();

    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);

    playSound("start");
}

function startCountdown() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (!gameRunning || gamePaused || levelFinished) {
            return;
        }

        timeRemaining--;
        updateDashboard();

        if (timeRemaining <= 10 && timeRemaining > 0) {
            playSound("tick");
        }

        if (timeRemaining <= 0) {
            loseLife("Time ran out!");
        }
    }, 1000);
}

function updateDashboard() {
    const settings = levelSettings[currentLevel - 1];

    scoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;
    levelDisplay.textContent = currentLevel;
    livesDisplay.textContent = "❤️".repeat(Math.max(lives, 0));
    timeDisplay.textContent = timeRemaining;

    crystalDisplay.textContent =
        `${collectedCrystals} / ${settings.crystals}`;
}

function gameLoop(timestamp) {
    if (!gameRunning) {
        return;
    }

    if (!gamePaused && !levelFinished) {
        update(timestamp);
        draw(timestamp);
    }

    animationId = requestAnimationFrame(gameLoop);
}

function update(timestamp) {
    updatePlayer(timestamp);
    updateBugs();
    updateCrystals();
    updatePowerUps(timestamp);
    updateParticles();
    updatePowerEffects(timestamp);

    powerUpSpawnTimer++;

    if (
        powerUpSpawnTimer > 450 &&
        powerUps.length === 0 &&
        Math.random() < 0.012
    ) {
        spawnPowerUp();
        powerUpSpawnTimer = 0;
    }
}

function updatePlayer(timestamp) {
    let movementX = 0;
    let movementY = 0;

    if (keys.up) movementY -= 1;
    if (keys.down) movementY += 1;
    if (keys.left) movementX -= 1;
    if (keys.right) movementX += 1;

    if (movementX !== 0 && movementY !== 0) {
        movementX *= 0.707;
        movementY *= 0.707;
    }

    const activeSpeed = speedBoostActive
        ? player.speed * 1.7
        : player.speed;

    player.x += movementX * activeSpeed;
    player.y += movementY * activeSpeed;

    player.x = Math.max(
        0,
        Math.min(GAME_WIDTH - player.width, player.x)
    );

    player.y = Math.max(
        0,
        Math.min(GAME_HEIGHT - player.height, player.y)
    );

    if (playerInvincible && timestamp > playerInvincibleEndTime) {
        playerInvincible = false;
    }
}

function updateCrystals() {
    for (let i = crystals.length - 1; i >= 0; i--) {
        const crystal = crystals[i];

        crystal.rotation += 0.03;
        crystal.pulse += 0.07;

        if (objectsOverlap(player, crystal)) {
            crystals.splice(i, 1);

            collectedCrystals++;
            score += 100;

            createParticles(
                crystal.x + crystal.width / 2,
                crystal.y + crystal.height / 2,
                "crystal"
            );

            playSound("collect");
            updateHighScore();
            updateDashboard();

            if (crystals.length === 0) {
                completeLevel();
            }
        }
    }
}

function updateBugs() {
    for (const bug of bugs) {
        if (!freezeActive) {
            bug.x += bug.velocityX;
            bug.y += bug.velocityY;
        }

        if (bug.x <= 0 || bug.x + bug.width >= GAME_WIDTH) {
            bug.velocityX *= -1;
        }

        if (bug.y <= 0 || bug.y + bug.height >= GAME_HEIGHT) {
            bug.velocityY *= -1;
        }

        bug.x = Math.max(
            0,
            Math.min(GAME_WIDTH - bug.width, bug.x)
        );

        bug.y = Math.max(
            0,
            Math.min(GAME_HEIGHT - bug.height, bug.y)
        );

        if (objectsOverlap(player, bug)) {
            handleBugCollision(bug);
        }
    }
}

function handleBugCollision(bug) {
    if (shieldActive) {
        score += 25;

        bug.velocityX *= -1;
        bug.velocityY *= -1;

        createParticles(
            bug.x + bug.width / 2,
            bug.y + bug.height / 2,
            "shield"
        );

        playSound("shield");
        updateDashboard();
        return;
    }

    if (playerInvincible) {
        return;
    }

    loseLife("A bug caught you!");
}

function loseLife(reason) {
    if (levelFinished) {
        return;
    }

    lives--;
    score = Math.max(0, score - 50);

    playSound("hit");
    createParticles(
        player.x + player.width / 2,
        player.y + player.height / 2,
        "damage"
    );

    updateDashboard();

    if (lives <= 0) {
        gameOver(reason);
        return;
    }

    player.x = GAME_WIDTH / 2 - player.width / 2;
    player.y = GAME_HEIGHT / 2 - player.height / 2;

    playerInvincible = true;
    playerInvincibleEndTime = performance.now() + 2200;
}

function spawnPowerUp() {
    const types = ["shield", "speed", "life", "freeze"];
    const type = types[Math.floor(Math.random() * types.length)];

    const icons = {
        shield: "🛡️",
        speed: "⚡",
        life: "❤️",
        freeze: "❄️"
    };

    const position = getSafePosition(38, 38);

    powerUps.push({
        x: position.x,
        y: position.y,
        width: 38,
        height: 38,
        type,
        icon: icons[type],
        createdAt: performance.now(),
        lifeTime: 9000,
        pulse: 0
    });
}

function updatePowerUps(timestamp) {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];

        powerUp.pulse += 0.08;

        if (timestamp - powerUp.createdAt > powerUp.lifeTime) {
            powerUps.splice(i, 1);
            continue;
        }

        if (objectsOverlap(player, powerUp)) {
            activatePowerUp(powerUp.type, timestamp);

            createParticles(
                powerUp.x + powerUp.width / 2,
                powerUp.y + powerUp.height / 2,
                "power"
            );

            powerUps.splice(i, 1);
            playSound("power");
        }
    }
}

function activatePowerUp(type, timestamp) {
    if (type === "shield") {
        shieldActive = true;
        shieldEndTime = timestamp + 7000;
        score += 50;
    }

    if (type === "speed") {
        speedBoostActive = true;
        speedBoostEndTime = timestamp + 6500;
        score += 50;
    }

    if (type === "life") {
        lives = Math.min(lives + 1, 5);
        score += 100;
    }

    if (type === "freeze") {
        freezeActive = true;
        freezeEndTime = timestamp + 5000;
        score += 75;
    }

    updateHighScore();
    updateDashboard();
}

function updatePowerEffects(timestamp) {
    if (shieldActive && timestamp > shieldEndTime) {
        shieldActive = false;
    }

    if (speedBoostActive && timestamp > speedBoostEndTime) {
        speedBoostActive = false;
    }

    if (freezeActive && timestamp > freezeEndTime) {
        freezeActive = false;
    }

    showPowerStatus(timestamp);
}

function showPowerStatus(timestamp) {
    const activePowers = [];

    if (shieldActive) {
        const seconds = Math.ceil((shieldEndTime - timestamp) / 1000);
        activePowers.push(`🛡️ Shield: ${seconds}s`);
    }

    if (speedBoostActive) {
        const seconds = Math.ceil((speedBoostEndTime - timestamp) / 1000);
        activePowers.push(`⚡ Speed: ${seconds}s`);
    }

    if (freezeActive) {
        const seconds = Math.ceil((freezeEndTime - timestamp) / 1000);
        activePowers.push(`❄️ Freeze: ${seconds}s`);
    }

    powerStatus.innerHTML = activePowers
        .map(power => `<div class="power-pill">${power}</div>`)
        .join("");
}

function createParticles(x, y, type) {
    const particleColours = {
        crystal: ["#7cf8ff", "#ffffff", "#a57aff"],
        damage: ["#ff5d5d", "#ffba49", "#ffffff"],
        shield: ["#4df3d0", "#ffffff", "#75a7ff"],
        power: ["#ffe66d", "#ff82d8", "#ffffff"]
    };

    const colours = particleColours[type] || ["#ffffff"];

    for (let i = 0; i < 16; i++) {
        particles.push({
            x,
            y,
            radius: Math.random() * 4 + 2,
            velocityX: (Math.random() - 0.5) * 6,
            velocityY: (Math.random() - 0.5) * 6,
            life: 1,
            colour: colours[
                Math.floor(Math.random() * colours.length)
            ]
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];

        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.velocityY += 0.04;
        particle.life -= 0.025;

        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function completeLevel() {
    levelFinished = true;
    clearInterval(timerInterval);

    const timeBonus = timeRemaining * 10;
    const lifeBonus = lives * 100;

    score += timeBonus + lifeBonus;

    updateHighScore();
    updateDashboard();
    playSound("level");

    if (currentLevel < levelSettings.length) {
        showMessage({
            icon: "🏆",
            tag: `Level ${currentLevel} Complete`,
            title: "Brilliant Bug Hunting!",
            text:
                `Time bonus: ${timeBonus} points. ` +
                `Life bonus: ${lifeBonus} points. ` +
                `Get ready for a harder level!`,
            buttonText: "Play Next Level",
            action: () => {
                currentLevel++;
                messageScreen.classList.remove("active");
                beginLevel();
            }
        });
    } else {
        showMessage({
            icon: "👑",
            tag: "All Levels Complete",
            title: "You Saved the Digital World!",
            text:
                `Your final score is ${score}. ` +
                `Can you play again and beat your high score?`,
            buttonText: "Play Again",
            action: startNewGame
        });
    }
}

function gameOver(reason) {
    levelFinished = true;
    gameRunning = false;

    clearInterval(timerInterval);
    updateHighScore();
    playSound("gameOver");

    showMessage({
        icon: "💥",
        tag: "Game Over",
        title: "The Bugs Took Over!",
        text:
            `${reason} Your final score is ${score}. ` +
            `Try again and become a master bug hunter.`,
        buttonText: "Try Again",
        action: startNewGame
    });
}

function showMessage({
    icon,
    tag,
    title,
    text,
    buttonText,
    action
}) {
    messageIcon.textContent = icon;
    messageTag.textContent = tag;
    messageTitle.textContent = title;
    messageText.textContent = text;
    messageButton.textContent = buttonText;

    messageButton.onclick = action;
    messageScreen.classList.add("active");
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("codeQuestHighScore", highScore);
    }
}

function togglePause() {
    if (!gameRunning || levelFinished) {
        return;
    }

    gamePaused = !gamePaused;

    if (gamePaused) {
        pauseScreen.classList.add("active");
        pauseButton.textContent = "▶ Resume";
    } else {
        pauseScreen.classList.remove("active");
        pauseButton.textContent = "⏸ Pause";
    }
}

function restartLevel() {
    if (!gameRunning && !levelFinished) {
        return;
    }

    messageScreen.classList.remove("active");
    pauseScreen.classList.remove("active");

    beginLevel();
}

function draw(timestamp) {
    drawBackground();
    drawCrystals();
    drawPowerUps();
    drawBugs();
    drawPlayer(timestamp);
    drawParticles();
}

function drawBackground() {
    const settings = levelSettings[currentLevel - 1];

    ctx.fillStyle = settings.background;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.strokeStyle = settings.grid;
    ctx.lineWidth = 1;

    const gridSize = 40;

    for (let x = 0; x <= GAME_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_HEIGHT);
        ctx.stroke();
    }

    for (let y = 0; y <= GAME_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
    }

    for (let i = 0; i < 25; i++) {
        const starX = (i * 97) % GAME_WIDTH;
        const starY = (i * 61) % GAME_HEIGHT;

        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath();
        ctx.arc(starX, starY, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPlayer(timestamp) {
    ctx.save();

    const centreX = player.x + player.width / 2;
    const centreY = player.y + player.height / 2;

    if (playerInvincible) {
        const flash = Math.floor(timestamp / 120) % 2 === 0;
        ctx.globalAlpha = flash ? 0.35 : 1;
    }

    if (shieldActive) {
        ctx.beginPath();
        ctx.arc(centreX, centreY, 34, 0, Math.PI * 2);

        ctx.fillStyle = "rgba(93, 255, 225, 0.18)";
        ctx.fill();

        ctx.strokeStyle = "#5dffe1";
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    if (speedBoostActive) {
        ctx.strokeStyle = "rgba(255, 238, 99, 0.8)";
        ctx.lineWidth = 5;

        ctx.beginPath();
        ctx.moveTo(player.x - 20, player.y + 14);
        ctx.lineTo(player.x - 5, player.y + 14);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(player.x - 28, player.y + 28);
        ctx.lineTo(player.x - 6, player.y + 28);
        ctx.stroke();
    }

    ctx.font = "42px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.emoji, centreX, centreY);

    ctx.restore();
}

function drawCrystals() {
    for (const crystal of crystals) {
        ctx.save();

        const centreX = crystal.x + crystal.width / 2;
        const centreY = crystal.y + crystal.height / 2;
        const pulseScale = 1 + Math.sin(crystal.pulse) * 0.1;

        ctx.translate(centreX, centreY);
        ctx.rotate(crystal.rotation);
        ctx.scale(pulseScale, pulseScale);

        ctx.shadowColor = "#7cf8ff";
        ctx.shadowBlur = 18;

        ctx.fillStyle = "#7cf8ff";

        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(12, -4);
        ctx.lineTo(8, 12);
        ctx.lineTo(0, 17);
        ctx.lineTo(-8, 12);
        ctx.lineTo(-12, -4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

        ctx.beginPath();
        ctx.moveTo(-2, -10);
        ctx.lineTo(5, -3);
        ctx.lineTo(1, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

function drawBugs() {
    for (const bug of bugs) {
        ctx.save();

        if (freezeActive) {
            ctx.shadowColor = "#b9f2ff";
            ctx.shadowBlur = 16;

            ctx.fillStyle = "rgba(185, 242, 255, 0.25)";
            ctx.beginPath();
            ctx.arc(
                bug.x + bug.width / 2,
                bug.y + bug.height / 2,
                28,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        ctx.font = "38px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            bug.emoji,
            bug.x + bug.width / 2,
            bug.y + bug.height / 2
        );

        ctx.restore();
    }
}

function drawPowerUps() {
    for (const powerUp of powerUps) {
        const pulseScale = 1 + Math.sin(powerUp.pulse) * 0.12;

        ctx.save();

        const centreX = powerUp.x + powerUp.width / 2;
        const centreY = powerUp.y + powerUp.height / 2;

        ctx.translate(centreX, centreY);
        ctx.scale(pulseScale, pulseScale);

        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(powerUp.icon, 0, 0);

        ctx.restore();
    }
}

function drawParticles() {
    for (const particle of particles) {
        ctx.save();

        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.colour;

        ctx.beginPath();
        ctx.arc(
            particle.x,
            particle.y,
            particle.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
    }
}

function playSound(type) {
    if (!soundEnabled) {
        return;
    }

    if (!audioContext) {
        audioContext = new (
            window.AudioContext ||
            window.webkitAudioContext
        )();
    }

    const soundSettings = {
        start: [340, 0.15],
        collect: [720, 0.08],
        hit: [160, 0.18],
        shield: [460, 0.1],
        power: [880, 0.15],
        tick: [250, 0.05],
        level: [620, 0.25],
        gameOver: [110, 0.4]
    };

    const [frequency, duration] =
        soundSettings[type] || [440, 0.1];

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type === "gameOver" ? "sawtooth" : "sine";
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(
        0.14,
        audioContext.currentTime
    );

    gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

function setDirection(direction, isPressed) {
    keys[direction] = isPressed;
}

window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (["arrowup", "w"].includes(key)) {
        keys.up = true;
    }

    if (["arrowdown", "s"].includes(key)) {
        keys.down = true;
    }

    if (["arrowleft", "a"].includes(key)) {
        keys.left = true;
    }

    if (["arrowright", "d"].includes(key)) {
        keys.right = true;
    }

    if (key === "p" || key === "escape") {
        togglePause();
    }

    if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)
    ) {
        event.preventDefault();
    }
});

window.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();

    if (["arrowup", "w"].includes(key)) {
        keys.up = false;
    }

    if (["arrowdown", "s"].includes(key)) {
        keys.down = false;
    }

    if (["arrowleft", "a"].includes(key)) {
        keys.left = false;
    }

    if (["arrowright", "d"].includes(key)) {
        keys.right = false;
    }
});

directionButtons.forEach(button => {
    const direction = button.dataset.direction;

    button.addEventListener("pointerdown", event => {
        event.preventDefault();
        setDirection(direction, true);
    });

    button.addEventListener("pointerup", () => {
        setDirection(direction, false);
    });

    button.addEventListener("pointerleave", () => {
        setDirection(direction, false);
    });

    button.addEventListener("pointercancel", () => {
        setDirection(direction, false);
    });
});

startButton.addEventListener("click", startNewGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restartLevel);

resumeButton.addEventListener("click", () => {
    if (gamePaused) {
        togglePause();
    }
});

soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    soundButton.textContent = soundEnabled
        ? "🔊 Sound On"
        : "🔇 Sound Off";

    if (soundEnabled) {
        playSound("collect");
    }
});

function drawWelcomeBackground() {
    player = createPlayer();

    drawBackground();

    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("💎", 180, 150);
    ctx.fillText("🐞", 680, 350);
    ctx.fillText("⚡", 740, 120);
    ctx.fillText("🛡️", 270, 390);
}

drawWelcomeBackground();
updateDashboard();
