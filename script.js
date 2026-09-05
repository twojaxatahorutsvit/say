const clamp = (value, min = 0, max = 1) =>
  Math.min(Math.max(value, min), max);

const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
};

const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const hero = document.querySelector("#hero");
const video = document.querySelector("#nvg-video");
const spectrum = document.querySelector("#spectrum");
const spectrumModes = [...document.querySelectorAll("[data-spectrum-mode]")];
const spectrumFrameLabel = document.querySelector("#spectrum-frame-label");

let ticking = false;
let duration = 0;
let videoReady = false;

const getHeroProgress = () => {
  if (!hero || reduceMotion.matches) return 1;

  const scrollDistance = Math.max(hero.offsetHeight - window.innerHeight, 1);
  const heroTop = hero.getBoundingClientRect().top + window.scrollY;
  return clamp((window.scrollY - heroTop) / scrollDistance);
};

const setHeroState = (progress) => {
  const maskFade = smoothstep(0.08, 0.5, progress);
  const activation = smoothstep(0.72, 0.98, progress);
  const sceneTransition = smoothstep(0.79, 0.94, progress);
  const sceneSettled = smoothstep(0.93, 1, progress);
  const identityIn = smoothstep(0.955, 0.995, progress);
  const flashIn = smoothstep(0.78, 0.855, progress);
  const flashOut = 1 - smoothstep(0.87, 0.955, progress);
  const signalFlash = flashIn * flashOut;
  const transitionNoise = signalFlash * 0.3;

  root.style.setProperty("--progress", progress.toFixed(4));
  root.style.setProperty("--mask-opacity", (1 - maskFade).toFixed(4));
  root.style.setProperty("--vignette-opacity", (1 - activation * 0.44).toFixed(4));
  root.style.setProperty(
    "--noise-opacity",
    (0.075 + activation * 0.1 + transitionNoise - sceneSettled * 0.075).toFixed(4),
  );
  root.style.setProperty(
    "--scanline-opacity",
    (activation * 0.038 + signalFlash * 0.055).toFixed(4),
  );
  root.style.setProperty(
    "--phosphor-opacity",
    Math.min(activation * 0.52 + signalFlash * 0.7, 1).toFixed(4),
  );
  root.style.setProperty("--signal-flash-opacity", (signalFlash * 0.9).toFixed(4));
  root.style.setProperty("--video-scale", (1.005 + progress * 0.012).toFixed(4));
  root.style.setProperty("--video-opacity", (1 - sceneTransition * 0.72).toFixed(4));
  root.style.setProperty("--scene-opacity", sceneTransition.toFixed(4));
  root.style.setProperty("--scene-scale", (1.075 - sceneTransition * 0.075).toFixed(4));
  root.style.setProperty("--scene-blur", `${(14 - sceneTransition * 14).toFixed(2)}px`);
  root.style.setProperty("--scene-reveal", `${(8 + sceneTransition * 142).toFixed(2)}%`);
  root.style.setProperty("--hero-identity-opacity", identityIn.toFixed(4));
  root.style.setProperty("--hero-identity-y", `${((1 - identityIn) * 18).toFixed(2)}px`);
  root.style.setProperty("--hero-identity-events", identityIn > 0.98 ? "auto" : "none");
};

const getSpectrumProgress = () => {
  if (!spectrum || reduceMotion.matches) return 1;

  const scrollDistance = Math.max(spectrum.offsetHeight - window.innerHeight, 1);
  const sectionTop = spectrum.getBoundingClientRect().top + window.scrollY;
  return clamp((window.scrollY - sectionTop) / scrollDistance);
};

const setSpectrumState = (progress) => {
  if (!spectrum) return;
  const night = smoothstep(0.22, 0.36, progress);
  const thermal = smoothstep(0.58, 0.72, progress);
  spectrum.style.setProperty("--night-in", night.toFixed(4));
  spectrum.style.setProperty("--thermal-in", thermal.toFixed(4));
  spectrum.style.setProperty("--vision-progress", progress.toFixed(4));
  const mode = thermal >= 0.5 ? 2 : night >= 0.5 ? 1 : 0;
  const labels = ["01 / Visible", "02 / Low light", "03 / Thermal"];
  const descriptions = [
    "What the eye sees.\nThe environment\nin its natural form.",
    "When light fades,\ndetails disappear.\nBut the scene\nis still there.",
    "Heat reveals\nwhat is hidden.\nA different layer\nof the same reality."
  ];
  document.querySelector("#vision-label").textContent = labels[mode];
  document.querySelector("#vision-description").textContent = descriptions[mode];
  document.querySelector("#vision-detail-label").textContent = ["Environment", "Light conditions", "Imaging mode"][mode];
  document.querySelector("#vision-detail").textContent = ["Available light", "After dark", "White-hot"][mode];
};

const syncVisuals = () => {
  ticking = false;
  const heroProgress = getHeroProgress();
  setHeroState(heroProgress);
  setSpectrumState(getSpectrumProgress());

  if (!videoReady || !duration || !video) return;

  const endPadding = Math.min(0.035, duration * 0.008);
  const videoProgress = clamp(heroProgress / 0.8);
  const targetTime = videoProgress * Math.max(duration - endPadding, 0);

  if (Math.abs(video.currentTime - targetTime) > 0.016) {
    video.currentTime = targetTime;
  }
};

const requestSync = () => {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(syncVisuals);
};

const prepareVideo = () => {
  if (!video) return;
  duration = Number.isFinite(video.duration) ? video.duration : 0;
  video.pause();
  videoReady = duration > 0;
  requestSync();
};

if (video) {
  video.addEventListener("loadedmetadata", prepareVideo, { once: true });

  if (video.readyState >= 1) {
    prepareVideo();
  }
}

window.addEventListener("scroll", requestSync, { passive: true });
window.addEventListener("resize", requestSync, { passive: true });
reduceMotion.addEventListener("change", requestSync);

setHeroState(0);
setSpectrumState(0);
requestSync();
