const clamp = (value, min = 0, max = 1) =>
  Math.min(Math.max(value, min), max);

const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
};

const root = document.documentElement;
const hero = document.querySelector("#hero");
const video = document.querySelector("#nvg-video");
const loader = document.querySelector("#loader");
const systemState = document.querySelector("#system-state");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let duration = 0;
let targetTime = 0;
let currentProgress = 0;
let ticking = false;
let videoReady = false;

const setVisualState = (progress) => {
  const maskFade = smoothstep(0.08, 0.5, progress);
  const hudFade = smoothstep(0.32, 0.72, progress);
  const activation = smoothstep(0.72, 0.98, progress);
  const sceneTransition = smoothstep(0.79, 0.94, progress);
  const sceneSettled = smoothstep(0.93, 1, progress);
  const flashIn = smoothstep(0.78, 0.855, progress);
  const flashOut = 1 - smoothstep(0.87, 0.955, progress);
  const signalFlash = flashIn * flashOut;
  const transitionNoise = signalFlash * 0.3;

  root.style.setProperty("--progress", progress.toFixed(4));
  root.style.setProperty("--mask-opacity", (1 - maskFade).toFixed(4));
  root.style.setProperty(
    "--vignette-opacity",
    (1 - activation * 0.44).toFixed(4),
  );
  root.style.setProperty("--hud-opacity", (1 - hudFade).toFixed(4));
  root.style.setProperty(
    "--noise-opacity",
    (0.042 + activation * 0.11 + transitionNoise - sceneSettled * 0.042).toFixed(4),
  );
  root.style.setProperty(
    "--scanline-opacity",
    (activation * 0.038 + signalFlash * 0.055).toFixed(4),
  );
  root.style.setProperty(
    "--phosphor-opacity",
    Math.min(activation * 0.52 + signalFlash * 0.7, 1).toFixed(4),
  );
  root.style.setProperty(
    "--signal-flash-opacity",
    (signalFlash * 0.9).toFixed(4),
  );
  root.style.setProperty(
    "--video-scale",
    (1.005 + progress * 0.012).toFixed(4),
  );
  root.style.setProperty(
    "--video-opacity",
    (1 - sceneTransition * 0.72).toFixed(4),
  );
  root.style.setProperty(
    "--scene-opacity",
    sceneTransition.toFixed(4),
  );
  root.style.setProperty(
    "--scene-scale",
    (1.075 - sceneTransition * 0.075).toFixed(4),
  );
  root.style.setProperty(
    "--scene-blur",
    `${(14 - sceneTransition * 14).toFixed(2)}px`,
  );
  root.style.setProperty(
    "--scene-reveal",
    `${(8 + sceneTransition * 142).toFixed(2)}%`,
  );

  if (progress < 0.28) {
    systemState.textContent = "OPTICS // STANDBY";
  } else if (progress < 0.72) {
    systemState.textContent = "MOUNT // ENGAGING";
  } else {
    systemState.textContent = "PHOSPHOR // ACTIVE";
  }
};

const getProgress = () => {
  if (reduceMotion.matches) return 1;

  const scrollDistance = Math.max(hero.offsetHeight - window.innerHeight, 1);
  const heroTop = hero.getBoundingClientRect().top + window.scrollY;
  return clamp((window.scrollY - heroTop) / scrollDistance);
};

const syncVideo = () => {
  ticking = false;
  currentProgress = getProgress();
  setVisualState(currentProgress);

  if (!videoReady || !duration) return;

  const endPadding = Math.min(0.035, duration * 0.008);
  const videoProgress = clamp(currentProgress / 0.8);
  targetTime = videoProgress * Math.max(duration - endPadding, 0);

  if (Math.abs(video.currentTime - targetTime) > 0.016) {
    video.currentTime = targetTime;
  }
};

const requestSync = () => {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(syncVideo);
};

const prepareVideo = () => {
  duration = Number.isFinite(video.duration) ? video.duration : 0;
  video.pause();
  videoReady = duration > 0;
  loader.classList.add("is-hidden");
  loader.textContent = "OPTICS READY";
  requestSync();
};

video.addEventListener("loadedmetadata", prepareVideo, { once: true });
video.addEventListener("canplay", () => loader.classList.add("is-hidden"), {
  once: true,
});

video.addEventListener("error", () => {
  loader.classList.remove("is-hidden");
  loader.textContent = "VIDEO UNAVAILABLE";
});

if (video.readyState >= 1) {
  prepareVideo();
}

window.addEventListener("scroll", requestSync, { passive: true });
window.addEventListener("resize", requestSync, { passive: true });
reduceMotion.addEventListener("change", requestSync);

setVisualState(0);
requestSync();
