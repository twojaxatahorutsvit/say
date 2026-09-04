const clamp = (value, min = 0, max = 1) =>
  Math.min(Math.max(value, min), max);

const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
};

const root = document.documentElement;
const hero = document.querySelector("#hero");
const video = document.querySelector("#nvg-video");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const spectrum = document.querySelector("#spectrum");
const spectrumModes = [...document.querySelectorAll("[data-spectrum-mode]")];
const spectrumFrameLabel = document.querySelector("#spectrum-frame-label");

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

};

const getProgress = () => {
  if (reduceMotion.matches) return 1;

  const scrollDistance = Math.max(hero.offsetHeight - window.innerHeight, 1);
  const heroTop = hero.getBoundingClientRect().top + window.scrollY;
  return clamp((window.scrollY - heroTop) / scrollDistance);
};

const getSpectrumProgress = () => {
  if (!spectrum || reduceMotion.matches) return 1;

  const scrollDistance = Math.max(spectrum.offsetHeight - window.innerHeight, 1);
  const sectionTop = spectrum.getBoundingClientRect().top + window.scrollY;
  return clamp((window.scrollY - sectionTop) / scrollDistance);
};

const setSpectrumState = (progress) => {
  if (!spectrum) return;

  const nightIn = smoothstep(0.14, 0.34, progress);
  const thermalIn = smoothstep(0.43, 0.66, progress);
  const copyOut = smoothstep(0.52, 0.71, progress);
  const nearInfo = smoothstep(0.69, 0.84, progress);
  const farInfo = smoothstep(0.78, 0.93, progress);

  root.style.setProperty("--spectrum-progress", progress.toFixed(4));
  root.style.setProperty(
    "--spectrum-day-opacity",
    (1 - nightIn).toFixed(4),
  );
  root.style.setProperty(
    "--spectrum-night-opacity",
    (nightIn * (1 - thermalIn)).toFixed(4),
  );
  root.style.setProperty("--spectrum-thermal-opacity", thermalIn.toFixed(4));
  root.style.setProperty("--spectrum-copy-opacity", (1 - copyOut).toFixed(4));
  root.style.setProperty("--spectrum-copy-y", `${(copyOut * -18).toFixed(2)}px`);
  root.style.setProperty(
    "--spectrum-frame-scale",
    (0.965 + smoothstep(0.02, 0.68, progress) * 0.035).toFixed(4),
  );
  root.style.setProperty(
    "--spectrum-ambient-opacity",
    (0.15 + thermalIn * 0.19).toFixed(4),
  );
  root.style.setProperty(
    "--spectrum-grain-opacity",
    (thermalIn * 0.075).toFixed(4),
  );
  root.style.setProperty("--spectrum-info-near", nearInfo.toFixed(4));
  root.style.setProperty(
    "--spectrum-info-near-y",
    `${((1 - nearInfo) * 22).toFixed(2)}px`,
  );
  root.style.setProperty("--spectrum-info-far", farInfo.toFixed(4));
  root.style.setProperty(
    "--spectrum-info-far-y",
    `${((1 - farInfo) * 22).toFixed(2)}px`,
  );

  const activeMode = progress < 0.27 ? 0 : progress < 0.55 ? 1 : 2;
  const labels = ["Visible spectrum", "Ambient light lost", "White-hot thermal"];

  spectrumModes.forEach((mode, index) => {
    mode.classList.toggle("is-active", index === activeMode);
  });

  if (spectrumFrameLabel) {
    spectrumFrameLabel.textContent = labels[activeMode];
  }
};

const syncVideo = () => {
  ticking = false;
  currentProgress = getProgress();
  setVisualState(currentProgress);
  setSpectrumState(getSpectrumProgress());

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
  requestSync();
};

video.addEventListener("loadedmetadata", prepareVideo, { once: true });

if (video.readyState >= 1) {
  prepareVideo();
}

window.addEventListener("scroll", requestSync, { passive: true });
window.addEventListener("resize", requestSync, { passive: true });
reduceMotion.addEventListener("change", requestSync);

setVisualState(0);
setSpectrumState(0);
requestSync();
