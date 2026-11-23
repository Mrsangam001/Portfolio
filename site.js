const mobileMenu = document.querySelector('.mobile-nav');
mobileMenu.addEventListener('click', (event) => {
  if (event.target.closest('a')) mobileMenu.open = false;
});
document.addEventListener('pointerdown', (event) => {
  if (mobileMenu.open && !mobileMenu.contains(event.target)) mobileMenu.open = false;
});
mobileMenu.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenu.open) {
    mobileMenu.open = false;
    mobileMenu.querySelector('summary').focus();
  }
});

const siteFrame = document.querySelector('.site-frame');
const heroScene = document.querySelector('.hero-scene');
const heroStage = heroScene.querySelector('.hero');
const projectTitle = document.querySelector('.project-title');
const projectChapter = document.querySelector('#projects');
const closingStage = siteFrame.querySelector('.site-footer');
const chapters = [...siteFrame.querySelectorAll('.chapter')];
const layeredPanels = [heroStage, ...chapters.map((chapter) => chapter.querySelector('.content-panel'))];
const nextLayers = [...chapters, closingStage];
const panelClip = new Array(layeredPanels.length).fill(0);
const scrollMotion = window.matchMedia('(prefers-reduced-motion: no-preference) and (min-height: 33rem)');
const compactLayout = window.matchMedia('(max-width: 700px)');
const motionLevel = () => Number(document.documentElement.dataset.motionLevel ?? 65);
const motionAllowed = () => scrollMotion.matches && motionLevel() > 0;
const canStack = 'ResizeObserver' in window;
for (const ring of document.querySelectorAll('.ring-type')) {
  const letters = Array.from(ring.dataset.ringText);
  const fragment = document.createDocumentFragment();
  for (const [index, letter] of letters.entries()) {
    const glyph = document.createElement('span');
    glyph.textContent = letter;
    glyph.style.setProperty('--ring-angle', `${index / letters.length * 360}deg`);
    fragment.append(glyph);
  }
  ring.append(fragment);
}

const letterDelays = [.36, .48, .29, .09, .16, .24, .04, .13];
for (const [index, glyph] of [...projectTitle.children].entries()) {
  glyph.style.setProperty('--delay', String(letterDelays[index]));
}

const clampUnit = (value) => Math.min(1, Math.max(0, value));
let motionFrame = 0;
let previousHero = '';
let previousProject = -1;
let previousClosing = '';

function updateScrollEffects() {
  motionFrame = 0;
  if (!motionAllowed()) return;

  const scene = heroScene.getBoundingClientRect();
  const stage = heroStage.getBoundingClientRect();
  const style = getComputedStyle(heroScene);
  const overlap = Math.max(0, -parseFloat(style.marginBottom));
  const inset = parseFloat(getComputedStyle(siteFrame).paddingTop);
  const compact = compactLayout.matches;
  const travel = compact ? stage.height * .85 : scene.height - stage.height - overlap;
  const scrollDistance = Math.max(0, inset - scene.top);
  const progress = scrollDistance < .5 || travel <= 0 ? 0 : clampUnit(scrollDistance / travel);
  const overtake = overlap ? clampUnit((scrollDistance - travel) / overlap) : 0;
  const projectTop = projectChapter.getBoundingClientRect().top;
  const projectProgress = clampUnit((window.innerHeight * .86 - projectTop) / (window.innerHeight * .78));
  const closing = closingStage.getBoundingClientRect();
  const closingProgress = clampUnit((window.innerHeight - closing.top) / (window.innerHeight - inset));
  const startRadius = Math.min(window.innerWidth, window.innerHeight) * (compact ? .29 : .28);
  const intensity = motionLevel() / 65;
  // Keep the global wallpaper visible through the glass without showing the outgoing page's text.
  const overlaps = siteFrame.hasAttribute('data-stacked') ? layeredPanels.map((panel, index) => {
    const nextTop = nextLayers[index].getBoundingClientRect().top;
    if (nextTop >= window.innerHeight) return 0;
    const bounds = panel.getBoundingClientRect();
    return bounds.bottom <= 0 ? 0 : Math.round(Math.max(0, Math.min(bounds.height, bounds.bottom - nextTop)));
  }) : [];

  const heroState = [stage.width, stage.height, progress, overtake].join(':');
  if (heroState !== previousHero) {
    previousHero = heroState;
    const sweep = clampUnit((progress - .07) / .93);
    const expansion = sweep ** 2 * (3 - 2 * sweep);
    const endRadius = compact ? stage.width * .47 : Math.hypot(stage.width * .5, stage.height * .53) * 1.14;
    const lift = compact ? 0 : stage.height * .034 * intensity;
    heroStage.style.setProperty('--scene-radius', `${startRadius + (endRadius - startRadius) * expansion}px`);
    heroStage.style.setProperty('--ring-turn', `${-24 + (progress * 78 + overtake * 68) * intensity}deg`);
    heroStage.style.setProperty('--title-shift', `${-lift * expansion}px`);
    const phase = progress === 0 ? 'opening' : expansion >= .96 ? 'covered' : 'expanding';
    if (phase === 'covered' && heroScene.dataset.phase === 'expanding') window.PortfolioSound.play('sweep');
    heroScene.dataset.phase = phase;
  }

  if (projectProgress !== previousProject) {
    if (projectProgress === 1 && previousProject > 0) window.PortfolioSound.play('project');
    previousProject = projectProgress;
    projectTitle.style.setProperty('--project-enter', String(projectProgress));
    projectChapter.dataset.titlePhase = projectProgress === 1 ? 'settled' : projectProgress > 0 ? 'rising' : 'waiting';
  }
  const closingState = [closing.width, closing.height, closingProgress].join(':');
  if (closingState !== previousClosing) {
    previousClosing = closingState;
    const fraction = 1 - closingProgress ** 2 * (3 - 2 * closingProgress);
    const fullRadius = Math.hypot(closing.width * .5, closing.height * .53) * 1.14;
    closingStage.style.setProperty('--scene-radius', `${startRadius + (fullRadius - startRadius) * fraction}px`);
    closingStage.style.setProperty('--ring-turn', `${-24 - fraction * 112 * intensity}deg`);
    const phase = closingProgress >= .985 ? 'settled' : 'entering';
    if (phase === 'settled' && closingStage.dataset.closingPhase === 'entering') window.PortfolioSound.play('close');
    closingStage.dataset.closingPhase = phase;
  }
  for (const [index, amount] of overlaps.entries()) {
    if (amount === panelClip[index]) continue;
    panelClip[index] = amount;
    const style = layeredPanels[index].style;
    if (amount) style.setProperty('--panel-clip', `inset(0 0 ${amount}px)`);
    else style.removeProperty('--panel-clip');
  }
}

function scheduleMotion() {
  if (motionAllowed() && !motionFrame) motionFrame = requestAnimationFrame(updateScrollEffects);
}

function updateMotionPreference() {
  const layeredLayout = motionAllowed() && !compactLayout.matches;
  heroScene.toggleAttribute('data-animated', layeredLayout);
  siteFrame.toggleAttribute('data-stacked', layeredLayout && canStack);
  previousHero = '';
  previousProject = -1;
  previousClosing = '';
  if (motionAllowed()) {
    updateScrollEffects();
    return;
  }
  delete heroScene.dataset.phase;
  delete closingStage.dataset.closingPhase;
  delete projectChapter.dataset.titlePhase;
  for (const property of ['--scene-radius', '--ring-turn', '--title-shift']) heroStage.style.removeProperty(property);
  for (const property of ['--scene-radius', '--ring-turn']) closingStage.style.removeProperty(property);
  projectTitle.style.removeProperty('--project-enter');
}

if (canStack) {
  const sizeObserver = new ResizeObserver((entries) => {
    for (const { target: panel } of entries) {
      panel.parentElement.style.setProperty('--panel-height', `${panel.offsetHeight}px`);
      panel.parentElement.setAttribute('data-measured', '');
    }
    scheduleMotion();
  });
  for (const panel of siteFrame.querySelectorAll('.chapter > .content-panel')) sizeObserver.observe(panel);

  siteFrame.addEventListener('focusin', ({ target }) => {
    if (motionAllowed() && target.matches(':focus-visible') && target.closest('.chapter')) {
      requestAnimationFrame(() => {
        if (document.activeElement === target) target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      });
    }
  });
}

scrollMotion.addEventListener('change', updateMotionPreference);
compactLayout.addEventListener('change', updateMotionPreference);
window.addEventListener('portfolio-motion-change', updateMotionPreference);
window.addEventListener('scroll', scheduleMotion, { passive: true });
window.addEventListener('resize', scheduleMotion);
updateMotionPreference();

const initialSection = document.getElementById(location.hash.slice(1));
const visit = performance.getEntriesByType('navigation')[0];
if (initialSection && (!visit || visit.type === 'navigate')) {
  // Direct fragment navigation can happen before the measured sticky sheets are in place.
  const initialHash = location.hash;
  window.addEventListener('load', () => requestAnimationFrame(() => requestAnimationFrame(() => {
    if (location.hash === initialHash) {
      initialSection.scrollIntoView({ block: 'start', behavior: 'instant' });
      scheduleMotion();
    }
  })), { once: true });
}

const pointer = document.querySelector('.pointer-accent');
const pointerMedia = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
let pointerPosition;
let pointerArea;
let pointerFrame = 0;

function setPointerArea(area) {
  if (pointerArea !== area) {
    pointerArea?.removeAttribute('data-pointer-active');
    pointerArea = area;
    pointerArea?.setAttribute('data-pointer-active', '');
  }
  pointer.hidden = !area;
}

function paintPointer() {
  pointerFrame = 0;
  if (!pointerPosition || !pointerMedia.matches || motionLevel() === 0) {
    setPointerArea(null);
    return;
  }
  const { x, y } = pointerPosition;
  const target = document.elementFromPoint(x, y);
  const area = target?.closest('[data-pointer-area]');
  setPointerArea(area);
  if (!area) return;

  const rect = area.getBoundingClientRect();
  const localX = x - rect.left;
  const localY = y - rect.top;
  pointer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  pointer.toggleAttribute('data-interactive', Boolean(target.closest('a, button, summary, input')));
  area.style.setProperty('--pointer-x', `${localX}px`);
  area.style.setProperty('--pointer-y', `${localY}px`);
  area.style.setProperty('--pointer-local-y', `${localY}px`);
  if (area.classList.contains('project-panel')) {
    const intensity = motionLevel() / 100;
    area.style.setProperty('--orb-x', `${(localX / rect.width - .5) * 18 * intensity}px`);
    area.style.setProperty('--orb-y', `${(localY / rect.height - .5) * 18 * intensity}px`);
  }
}

function schedulePointer() {
  if (pointerPosition && !pointerFrame) pointerFrame = requestAnimationFrame(paintPointer);
}

function clearPointer() {
  pointerPosition = null;
  if (pointerFrame) cancelAnimationFrame(pointerFrame);
  pointerFrame = 0;
  setPointerArea(null);
}

document.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse' || !pointerMedia.matches || motionLevel() === 0) return;
  pointerPosition = { x: event.clientX, y: event.clientY };
  schedulePointer();
}, { passive: true });
document.documentElement.addEventListener('pointerleave', clearPointer);
window.addEventListener('blur', clearPointer);
window.addEventListener('scroll', schedulePointer, { passive: true });
window.addEventListener('portfolio-motion-change', clearPointer);
pointerMedia.addEventListener('change', clearPointer);

if ('IntersectionObserver' in window) {
  const reveal = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting || !motionAllowed()) continue;
      entry.target.setAttribute('data-entered', '');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });

  for (const panel of document.querySelectorAll('.about-grid, .project-copy')) {
    reveal.observe(panel);
  }
}

const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');
const copyMessage = document.querySelector('#copy-message');
const contactAddress = document.querySelector('.contact-email').getAttribute('href');

function contactDraft() {
  const fields = new FormData(contactForm);
  const name = String(fields.get('name')).trim();
  const email = String(fields.get('email')).trim();
  const message = String(fields.get('message')).trim();
  const subject = 'Portfolio inquiry from ' + name.replace(/[\r\n]/g, ' ');
  const body = `Hi Sangam,\r\n\r\n${message}\r\n\r\n${name}\r\n${email}`;
  return { subject, body };
}

contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const { subject, body } = contactDraft();
  formStatus.textContent = 'Review and send the draft in your email app. You can also copy your message.';
  formStatus.dataset.state = 'draft';
  window.location.href = `${contactAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

if (navigator.clipboard?.writeText) {
  copyMessage.hidden = false;
  copyMessage.addEventListener('click', async () => {
    if (!contactForm.reportValidity()) return;
    try {
      const { subject, body } = contactDraft();
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      formStatus.textContent = 'Message copied.';
    } catch {
      formStatus.textContent = 'Clipboard access is unavailable. You can select and copy the message text.';
    }
  });
}

const questionLauncher = document.querySelector('#question-launch');
const questionDialog = document.querySelector('#portfolio-questions');
const questionAnswer = document.querySelector('#question-answer');
const questions = [...questionDialog.querySelectorAll('[data-answer]')];
const answers = {
  stack: 'Sangam uses Python and C++, Django and REST APIs, and SQL databases. His AI/ML work includes TensorFlow, Whisper, and LLMs.',
  projects: 'Sangam built an AI Meeting Minutes System using Whisper and an LLM, and a Restaurant Order Management System using Django.',
  experience: 'Sangam interned in AI/ML at Personifwy in 2025 and in web development at Adityapur Auto Cluster in 2023.',
  contact: 'You can reach Sangam at sangamez15@gmail.com or through the LinkedIn link in the Contact section.',
};

if (typeof questionDialog.showModal === 'function') {
  questionLauncher.hidden = false;
  questionLauncher.addEventListener('click', () => questionDialog.showModal());
  for (const question of questions) {
    question.addEventListener('click', () => {
      for (const option of questions) option.setAttribute('aria-pressed', String(option === question));
      questionAnswer.textContent = answers[question.dataset.answer];
    });
  }
}
