// ==================== ANIMATED FAVICON ====================
(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 16;
    canvas.width = size;
    canvas.height = size;
    
    const createIdleFavicon = () => {
        const idleCanvas = document.createElement('canvas');
        const idleCtx = idleCanvas.getContext('2d');
        idleCanvas.width = size;
        idleCanvas.height = size;
        
        const centerY = size / 2;
        const dotRadius = 1.5;
        const gapSize = dotRadius + 2;
        
        // Draw horizontal line in segments (skip area around dot)
        idleCtx.strokeStyle = '#000000';
        idleCtx.lineWidth = 1;
        idleCtx.lineCap = 'round';
        
        // Left segment
        idleCtx.beginPath();
        idleCtx.moveTo(2, centerY);
        idleCtx.lineTo(size / 2 - gapSize, centerY);
        idleCtx.stroke();
        
        // Right segment
        idleCtx.beginPath();
        idleCtx.moveTo(size / 2 + gapSize, centerY);
        idleCtx.lineTo(size - 2, centerY);
        idleCtx.stroke();
        
        // Draw dot in the middle
        idleCtx.fillStyle = '#FFFFFF';
        idleCtx.strokeStyle = '#000000';
        idleCtx.lineWidth = 1;
        idleCtx.beginPath();
        idleCtx.arc(size / 2, centerY, dotRadius, 0, Math.PI * 2);
        idleCtx.fill();
        idleCtx.stroke();
        
        return idleCanvas.toDataURL('image/png');
    };
    
    const animateFavicon = () => {
        const duration = 4000; // 4 seconds total cycle
        const animDuration = 2500; // animation takes 2.5s, rest is pause
        const startTime = Date.now();
        
        const updateFrame = () => {
            const elapsed = (Date.now() - startTime) % duration;
            const progress = elapsed / animDuration;
            
            // Clear canvas
            ctx.clearRect(0, 0, size, size);
            
            // Extend animation beyond visible area so dot smoothly exits/enters
            const dotRadius = 1.5;
            const startX = -dotRadius - 2;
            const endX = size + dotRadius + 2;
            const dotX = startX + (endX - startX) * progress;
            
            // Only show dot when animation is active (progress < 1)
            const showDot = progress <= 1;
            
            if (showDot) {
                const centerY = size / 2;
                const gapSize = dotRadius + 2;
                
                // Draw horizontal line in segments (skip area around dot)
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.lineCap = 'round';
                
                // Left segment
                const leftEnd = Math.min(dotX - gapSize, size - 2);
                if (leftEnd > 2) {
                    ctx.beginPath();
                    ctx.moveTo(2, centerY);
                    ctx.lineTo(leftEnd, centerY);
                    ctx.stroke();
                }
                
                // Right segment
                const rightStart = Math.max(dotX + gapSize, 2);
                if (rightStart < size - 2) {
                    ctx.beginPath();
                    ctx.moveTo(rightStart, centerY);
                    ctx.lineTo(size - 2, centerY);
                    ctx.stroke();
                }
                
                // Draw moving dot
                ctx.fillStyle = '#FFFFFF';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(dotX, centerY, dotRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else {
                // Just draw the line when dot is hidden
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(2, size / 2);
                ctx.lineTo(size - 2, size / 2);
                ctx.stroke();
            }
            
            // Update favicon
            const link = document.getElementById('favicon') || document.querySelector('link[rel="icon"]');
            if (link) {
                link.href = canvas.toDataURL('image/png');
            }
            
            requestAnimationFrame(updateFrame);
        };
        
        updateFrame();
    };
    
    // Start animation when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Set idle favicon first as fallback
            const link = document.getElementById('favicon') || document.querySelector('link[rel="icon"]');
            if (link) {
                link.href = createIdleFavicon();
            }
            animateFavicon();
        });
    } else {
        // Set idle favicon first as fallback
        const link = document.getElementById('favicon') || document.querySelector('link[rel="icon"]');
        if (link) {
            link.href = createIdleFavicon();
        }
        animateFavicon();
    }
})();

// ==================== STATE & ELEMENTS ====================
const state = {
    currentFile: null, fileContent: '', projectData: {}, isNewFile: false,
    projectName: '', hasProject: false, totalProjectTime: 0, dailyWorkTime: {},
    timeline: { startDate: null, endDate: null, events: [] }
};

const el = (id) => document.getElementById(id);
const elements = {
    fileUpload: el('file-upload'), headerUploadBtn: el('header-upload-btn'), downloadBtn: el('download-btn'),
    projectTitle: el('project-title'), projectContent: el('project-content'), addSectionControls: el('add-section-controls'),
    centerUploadContainer: el('center-upload-container'), modal: el('modal'), modalTitle: el('modal-title'),
    sectionTitleInput: el('section-title'), parentSelectContainer: el('parent-select-container'),
    parentSelect: el('parent-section'), addLevel2Btn: el('add-level2-btn'), timelineSection: el('timeline-section'),
    timelineStartDate: el('timeline-start-date'), timelineEndDate: el('timeline-end-date'), timelineSvg: el('timeline-svg'),
    timelineEventModal: el('timeline-event-modal'), eventNoteInput: el('event-note'), eventDateInput: el('event-date'),
    timelineLabelStart: el('timeline-label-start'), timelineLabelEnd: el('timeline-label-end'),
    leaveConfirmModal: el('leave-confirm-modal'), themeToggleBtn: el('theme-toggle-btn')
};

// ==================== UTILITY ====================
let audioContext = null;
const playPingSound = () => {
    try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator(), gain = audioContext.createGain();
        osc.connect(gain); gain.connect(audioContext.destination);
        osc.frequency.value = 880; osc.type = 'sine';
        const now = audioContext.currentTime;
        gain.gain.setValueAtTime(0.25, now); gain.gain.setTargetAtTime(0, now + 0.1, 0.15);
        osc.start(now); osc.stop(now + 0.6);
    } catch (e) { console.log('Audio not available'); }
};

const formatTimeDisplay = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : `${sec}s`;
};

const formatTime = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(n => String(n).padStart(2, '0')).join(':');

const formatDateLabel = (d) => new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
const getToday = () => new Date().toISOString().split('T')[0];

const sectionColorPalette = ['#7fbc7f', '#7f7fcd', '#d980a0', '#ff9d7f', '#ffff99', '#99ff99', '#99ffff', '#ff99ff', '#a3c1f0', '#ffe4c4'];

const getUnusedColor = () => {
    const used = Object.values(state.projectData).map(s => s.color).filter(Boolean);
    const avail = sectionColorPalette.filter(c => !used.includes(c));
    return avail.length > 0 ? avail[Math.floor(Math.random() * avail.length)] : sectionColorPalette[Math.floor(Math.random() * sectionColorPalette.length)];
};

const hexToHSL = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h, s, l) => {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

const generateColorVariants = (base) => {
    const hsl = hexToHSL(base);
    const variants = [];
    [-15, 15].forEach(sat => [35, 45, 55, 65, 75].forEach(light => 
        variants.push(hslToHex(hsl.h, Math.max(30, Math.min(100, hsl.s + sat)), light))));
    return variants;
};

const generateSimilarColor = (base, idx) => {
    const v = generateColorVariants(base);
    return v[idx % v.length];
};

// ==================== THEME ====================
const THEME_STORAGE_KEY = 'pm-theme';
const THEME_ICONS = {
    light: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 17.99l1.77 1.79M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.79M18.01 6.01l1.77-1.79"/></svg>`,
    dark: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.5A9 9 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5Z"/></svg>`
};

function applyTheme(mode = 'light') {
    const isDark = mode === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.innerHTML = isDark ? THEME_ICONS.light : THEME_ICONS.dark;
        elements.themeToggleBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
        elements.themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }
}

function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

// ==================== COLOR PICKER ====================
function showColorPicker(x, y, colors, current, onSelect) {
    closeColorPicker();
    const popup = document.getElementById('color-picker-popup');
    const grid = document.getElementById('color-picker-grid');
    grid.innerHTML = '';
    
    colors.forEach(c => {
        const cell = document.createElement('div');
        cell.className = 'color-picker-cell' + (c.toLowerCase() === current?.toLowerCase() ? ' selected' : '');
        cell.style.backgroundColor = c;
        cell.onclick = (e) => { e.stopPropagation(); onSelect(c); closeColorPicker(); };
        grid.appendChild(cell);
    });
    
    popup.style.display = 'block';
    const rect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, Math.min(x, window.innerWidth - rect.width - 10)) + 'px';
    popup.style.top = Math.max(10, Math.min(y + 5, window.innerHeight - rect.height - 10)) + 'px';
    
    setTimeout(() => document.addEventListener('click', handleColorPickerOutsideClick), 0);
}

function handleColorPickerOutsideClick(e) {
    const popup = document.getElementById('color-picker-popup');
    if (popup.style.display !== 'none' && !popup.contains(e.target)) closeColorPicker();
}

function closeColorPicker() {
    const popup = document.getElementById('color-picker-popup');
    if (popup) {
        popup.style.display = 'none';
        document.removeEventListener('click', handleColorPickerOutsideClick);
    }
}

// ==================== FILE & PROJECT ====================
const saveToFile = () => updateMarkdownContent();

function downloadFile() {
    const title = state.fileContent.match(/^#\s+(.+)$/m)?.[1]?.trim() || state.projectName || 'project';
    const blob = new Blob([state.fileContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title}.md`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createNewProject() {
    Object.assign(state, {
        currentFile: null, fileContent: `# ${state.projectName}\n\nTime: 0\n\nDailyWork: {}\n\n`,
        projectData: {}, isNewFile: true, hasProject: true, totalProjectTime: 0, dailyWorkTime: {}
    });
    elements.projectContent.innerHTML = `<div style="text-align: center; padding: 40px; color: #666666;"><h2>New Project Created</h2><p>Click the buttons below to add sections.</p></div>`;
    elements.downloadBtn.style.display = elements.headerUploadBtn.style.display = 'inline-block';
    elements.addSectionControls.style.display = 'flex';
    elements.centerUploadContainer.style.display = 'none';
    showTimeline();
    updateProjectTimeDisplay();
}

const updateProjectTimeDisplay = () => {
    const el = document.getElementById('project-time-display');
    if (el) el.textContent = state.totalProjectTime > 0 ? formatTimeDisplay(state.totalProjectTime) : '';
};

function showConfirmPopup(msg, x, y) {
    return new Promise((resolve) => {
        const popup = document.getElementById('confirm-popup');
        const msgEl = document.getElementById('confirm-popup-message');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');
        
        msgEl.textContent = msg;
        popup.style.display = 'block';
        
        const rect = popup.getBoundingClientRect();
        popup.style.left = Math.max(10, Math.min(x, window.innerWidth - rect.width - 10)) + 'px';
        popup.style.top = Math.max(10, Math.min(y, window.innerHeight - rect.height - 10)) + 'px';
        
        const cleanup = () => { 
            popup.style.display = 'none'; 
            document.removeEventListener('keydown', handleKey); 
            yesBtn.onclick = noBtn.onclick = null;
        };
        
        const handleKey = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); cleanup(); resolve(true); }
            else if (e.key === 'Escape') { e.preventDefault(); cleanup(); resolve(false); }
        };
        
        document.addEventListener('keydown', handleKey);
        yesBtn.onclick = () => { cleanup(); resolve(true); };
        noBtn.onclick = () => { cleanup(); resolve(false); };
        yesBtn.focus();
    });
}

// ==================== MODALS & SECTIONS ====================
let currentModalType = null, preselectedParentSection = null;

function openSectionModal(type) {
    currentModalType = type;
    elements.modalTitle.textContent = type === 'level2' ? 'Add New Section (##)' : 'Add New Subsection (###)';
    elements.parentSelectContainer.style.display = type === 'level2' ? 'none' : 'block';
    if (type === 'level3') {
        const l2 = Object.keys(state.projectData);
        elements.parentSelect.innerHTML = l2.length ? l2.map(n => `<option value="${n}">${n}</option>`).join('') : '<option value="">No sections available</option>';
    }
    elements.modal.classList.add('show');
    elements.sectionTitleInput.focus();
}

function openSubsectionModal(parent) {
    currentModalType = 'level3';
    preselectedParentSection = parent;
    elements.modalTitle.textContent = `Add Subsection to "${parent}"`;
    elements.parentSelectContainer.style.display = 'none';
    elements.modal.classList.add('show');
    elements.sectionTitleInput.focus();
}

const closeSectionModal = (clear = false) => {
    elements.modal.classList.remove('show');
    if (clear) elements.sectionTitleInput.value = '';
    preselectedParentSection = null;
};

function addLevel2Section(title) {
    const color = getUnusedColor();
    state.fileContent += `## ${title}\n\nTime: 0\nColor: ${color}\n\n`;
    state.projectData[title] = { totalTime: 0, color };
    refreshProjectView();
}

function addLevel3Section(title, parent) {
    const lines = state.fileContent.split('\n');
    const idx = lines.findIndex(l => l.trim() === `## ${parent}`);
    if (idx !== -1) {
        let insertIdx = idx + 1;
        while (insertIdx < lines.length && (!lines[insertIdx].startsWith('## ') || lines[insertIdx].startsWith('### '))) insertIdx++;
        
        const pColor = state.projectData[parent]?.color || '';
        const count = Object.keys(state.projectData[parent] || {}).filter(k => !['totalTime', 'color'].includes(k)).length;
        const color = pColor ? generateSimilarColor(pColor, count) : '';
        
        lines.splice(insertIdx, 0, '', `### ${title}`, '', 'Time: 0', color ? `Color: ${color}` : '', '**Notes:**', '', '**Notes:**', '');
        state.fileContent = lines.join('\n');
        
        if (!state.projectData[parent]) state.projectData[parent] = { totalTime: 0 };
        state.projectData[parent][title] = { notes: '', oldNotes: [], totalTime: 0, color };
        
        refreshProjectView([parent]);
    }
}

function refreshProjectView(expandL2 = []) {
    const expanded = { l2: [...expandL2], l3: [] };
    document.querySelectorAll('.section-level-2:not(.is-collapsed)').forEach(s => expanded.l2.push(s.dataset.section));
    document.querySelectorAll('.section-level-3:not(.is-collapsed)').forEach(s => expanded.l3.push({ l2: s.dataset.level2, l3: s.dataset.level3 }));
    
    parseAndRenderMarkdown(state.fileContent);
    
    expanded.l2.forEach(n => {
        const s = document.querySelector(`.section-level-2[data-section="${n}"]`);
        if (s) { s.classList.remove('is-collapsed'); s.querySelector('.section-content-2')?.classList.remove('collapsed'); s.querySelector('.toggle-icon')?.classList.remove('collapsed'); }
    });
    expanded.l3.forEach(({l2, l3}) => {
        const s = document.querySelector(`.section-level-3[data-level2="${l2}"][data-level3="${l3}"]`);
        if (s) { s.classList.remove('is-collapsed'); s.querySelector('.section-content-3')?.classList.remove('collapsed'); s.querySelector('.toggle-icon')?.classList.remove('collapsed'); }
    });
    saveToFile();
}

function buildSectionBase({ level, title, color, timeText, dataset }) {
    const section = document.createElement('div');
    section.className = `section-level-${level} is-collapsed`;
    Object.assign(section.dataset, dataset);
    const hClass = `section-header-${level}`, cClass = `section-content-${level}`, tClass = level === 2 ? 'section-time-display' : 'subsection-time-display';
    
    section.innerHTML = `
        <div class="${hClass}">
            <div class="section-color-stripe" style="background-color: ${color || 'transparent'}"></div>
            <div><${level === 2 ? 'h2' : 'h3'} class="section-title-editable" contenteditable="true" spellcheck="false">${title}</${level === 2 ? 'h2' : 'h3'}></div>
            <div style="display: flex; gap: 15px; align-items: center;">
                <div class="section-controls">
                    <button class="section-ctrl-btn move-up-btn" title="Move Up">↑</button>
                    <button class="section-ctrl-btn move-down-btn" title="Move Down">↓</button>
                    <button class="section-ctrl-btn delete-btn" title="Delete">×</button>
                </div>
                <span class="${tClass}" ${level === 2 ? `data-section="${title}"` : `data-level2="${dataset.level2}" data-level3="${dataset.level3}"`}>${timeText}</span>
                <span class="toggle-icon collapsed">▼</span>
            </div>
        </div>
        <div class="${cClass} collapsed"></div>`;
        
    return {
        section, header: section.querySelector(`.${hClass}`), content: section.querySelector(`.${cClass}`),
        toggleIcon: section.querySelector('.toggle-icon'), titleEl: section.querySelector('.section-title-editable'),
        colorStripe: section.querySelector('.section-color-stripe')
    };
}

function createSection(level, title, parent = null) {
    const isL2 = level === 2;
    const data = isL2 ? state.projectData[title] : state.projectData[parent]?.[title];
    const color = data?.color || '';
    const time = data?.totalTime || 0;
    
    const base = buildSectionBase({
        level, title, color,
        timeText: formatTimeDisplay(time),
        dataset: isL2 ? { section: title } : { level2: parent, level3: title }
    });

    let curTitle = title;
    base.header.onclick = (e) => {
        if (!e.target.closest('.section-controls, .section-title-editable, .section-color-stripe')) {
            base.content.classList.toggle('collapsed');
            base.toggleIcon.classList.toggle('collapsed');
            base.section.classList.toggle('is-collapsed');
        }
    };
    
    base.titleEl.onblur = () => {
        const newT = base.titleEl.textContent.trim();
        const currentParent = isL2 ? null : base.section.dataset.level2;
        if (newT && newT !== curTitle) { updateSectionTitle(base.section, curTitle, newT, level, currentParent); curTitle = newT; }
        else if (!newT) base.titleEl.textContent = curTitle;
    };
    base.titleEl.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); base.titleEl.blur(); } };
    
    base.section.querySelector('.delete-btn').onclick = (e) => { 
        e.stopPropagation(); 
        const currentParent = isL2 ? null : base.section.dataset.level2;
        deleteSection(base.section, curTitle, level, currentParent, e.clientX, e.clientY); 
    };
    base.section.querySelector('.move-up-btn').onclick = (e) => { e.stopPropagation(); moveSection(base.section, 'up', level); };
    base.section.querySelector('.move-down-btn').onclick = (e) => { e.stopPropagation(); moveSection(base.section, 'down', level); };

    base.colorStripe.onclick = (e) => {
        e.stopPropagation();
        const rect = base.colorStripe.getBoundingClientRect();
        const currentParent = isL2 ? null : base.section.dataset.level2;
        const colors = isL2 ? sectionColorPalette : generateColorVariants(state.projectData[currentParent]?.color || sectionColorPalette[0]);
        const curColor = (isL2 ? state.projectData[curTitle] : state.projectData[currentParent]?.[curTitle])?.color || '';
        showColorPicker(rect.right + 5, rect.top, colors, curColor, (c) => {
            if (isL2) { 
                state.projectData[curTitle].color = c; 
                base.colorStripe.style.backgroundColor = c;
                updateSubsectionColors(base.section, c); 
            }
            else { 
                state.projectData[currentParent][curTitle].color = c; 
                base.colorStripe.style.backgroundColor = c;
            }
            saveToFile();
        });
    };

    if (isL2) {
        const btn = document.createElement('button');
        btn.className = 'add-subsection-btn';
        btn.textContent = '+ Add Subsection';
        btn.onclick = (e) => { e.stopPropagation(); openSubsectionModal(curTitle); };
        base.content.appendChild(btn);
    } else {
        base.content.append(createTimerSection(parent, title), createNotesSection(parent, title));
    }
    return base.section;
}

function updateSubsectionColors(el, color) {
    const variants = generateColorVariants(color);
    el.querySelectorAll('.section-level-3').forEach((sub, i) => {
        const c = variants[i % variants.length];
        sub.querySelector('.section-color-stripe').style.backgroundColor = c;
        if (state.projectData[sub.dataset.level2]?.[sub.dataset.level3]) state.projectData[sub.dataset.level2][sub.dataset.level3].color = c;
    });
}

// ==================== TIMER & NOTES ====================
let activeTimer = null;
function createTimerSection(l2, l3) {
    const data = state.projectData[l2]?.[l3];
    const div = document.createElement('div');
    div.className = 'timer-section';
    div.innerHTML = `
        <div class="timer-wave-container"><svg class="timer-wave" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="wave-path" style="stroke: ${data?.color || '#4A90D9'}" d="M0,100 Q12.5,100 25,100 T50,100 T75,100 T100,100" /></svg></div>
        <div style="display: flex; justify-content: center; align-items: center; gap: 20px; margin-bottom: 10px; position: relative; z-index: 1;">
            <div class="timer-display">00:00:00</div>
            <div class="total-time-display" style="margin-left: -40px;">Total: ${formatTimeDisplay(data?.totalTime || 0)}</div>
        </div>
        <div class="timer-controls" style="position: relative; z-index: 1;">
            <button class="timer-btn start">Start</button><button class="timer-btn pause" disabled>Pause</button><button class="timer-btn reset">Reset</button>
        </div>`;
    
    let sec = 0, int = null, running = false, waveAF = null, waveStart = null;
    const [disp, totalDisp] = [div.querySelector('.timer-display'), div.querySelector('.total-time-display')];
    const [start, pause, reset] = div.querySelectorAll('.timer-btn');
    const wavePath = div.querySelector('.wave-path');

    const animate = (ts) => {
        if (!waveStart) waveStart = ts;
        const prog = Math.min((ts - waveStart) / 900000, 1), y = Math.max(100 - (prog * 95), 5), t = (ts - waveStart) / 1500, amp = 1.5 + (1 - prog) * 2;
        const pts = [0, 0.8, 1.6, 2.4, 3.2].map(o => y + Math.sin(t + o) * amp);
        wavePath.setAttribute('d', `M0,${pts[0]} C10,${pts[0]} 15,${pts[1]} 25,${pts[1]} S40,${pts[2]} 50,${pts[2]} S65,${pts[3]} 75,${pts[3]} S90,${pts[4]} 100,${pts[4]}`);
        if (running) waveAF = requestAnimationFrame(animate);
    };

    const stop = (skip = false) => {
        if (!running) return;
        running = false; clearInterval(int);
        div.querySelector('.timer-wave-container').classList.remove('active');
        if (waveAF) cancelAnimationFrame(waveAF);
        wavePath.setAttribute('d', 'M0,100 Q12.5,100 25,100 T50,100 T75,100 T100,100');
        start.disabled = false; pause.disabled = true;
        if (!skip) { saveToFile(); renderTimelineWorkBlurs(); }
    };

    start.onclick = () => {
        if (running) return;
        if (activeTimer) { activeTimer(true); activeTimer = null; }
        running = true; activeTimer = stop;
        div.querySelector('.timer-wave-container').classList.add('active');
        waveStart = null; waveAF = requestAnimationFrame(animate);
        int = setInterval(() => {
            sec++; disp.textContent = formatTime(sec);
            state.projectData[l2][l3].totalTime++; state.projectData[l2].totalTime++; state.totalProjectTime++;
            state.dailyWorkTime[getToday()] = (state.dailyWorkTime[getToday()] || 0) + 1;
            totalDisp.textContent = `Total: ${formatTimeDisplay(state.projectData[l2][l3].totalTime)}`;
            updateTimeDisplays(); updateProjectTimeDisplay();
            if (sec % 60 === 0) renderTimelineWorkBlurs();
            if (sec > 0 && sec % 900 === 0) { playPingSound(); pause.click(); }
        }, 1000);
        start.disabled = true; pause.disabled = false;
    };
    pause.onclick = () => { stop(); activeTimer = null; };
    reset.onclick = () => { if (running) activeTimer = null; stop(); sec = 0; disp.textContent = '00:00:00'; };
    return div;
}

function updateTimeDisplays() {
    document.querySelectorAll('.section-time-display').forEach(d => {
        const t = state.projectData[d.dataset.section]?.totalTime;
        if (t !== undefined) d.textContent = formatTimeDisplay(t);
    });
    document.querySelectorAll('.subsection-time-display').forEach(d => {
        const t = state.projectData[d.dataset.level2]?.[d.dataset.level3]?.totalTime;
        if (t !== undefined) d.textContent = formatTimeDisplay(t);
    });
}

function createNotesSection(l2, l3) {
    const div = document.createElement('div');
    div.className = 'notes-section';
    div.innerHTML = `
        <div class="kanban-board">
            <div class="kanban-column todo">
                <div class="kanban-column-header"><span class="column-count">0</span> To Do <button class="add-note-btn" title="Add note">+</button></div>
                <div class="kanban-column-content" data-status="todo"></div>
            </div>
            <div class="kanban-column in-progress">
                <div class="kanban-column-header"><span class="column-count">0</span> In Progress <button class="add-note-btn" title="Add note">+</button></div>
                <div class="kanban-column-content" data-status="in-progress"></div>
            </div>
            <div class="kanban-column done">
                <div class="kanban-column-header"><span class="column-count">0</span> Done <button class="add-note-btn" title="Add note">+</button></div>
                <div class="kanban-column-content" data-status="done"></div>
            </div>
        </div>`;
    const board = div.querySelector('.kanban-board');
    
    board.dataset.level2 = l2;
    board.dataset.level3 = l3;
    
    // Setup add note buttons
    board.querySelectorAll('.add-note-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const column = btn.closest('.kanban-column');
            const status = column.querySelector('.kanban-column-content').dataset.status;
            createEditableNote(board, l2, l3, status);
        };
    });
    
    // Convert and render existing notes
    const oldNotes = state.projectData[l2]?.[l3]?.oldNotes || [];
    const convertedNotes = convertNotesToKanban(oldNotes);
    if (JSON.stringify(oldNotes) !== JSON.stringify(convertedNotes)) {
        state.projectData[l2][l3].oldNotes = convertedNotes;
    }
    renderKanbanBoard(board, convertedNotes, l2, l3);
    return div;
}

function convertNotesToKanban(notes) {
    if (!notes || !notes.length) return [];
    // Check if already in kanban format
    if (notes[0] && typeof notes[0] === 'object' && 'status' in notes[0]) {
        return notes;
    }
    // Convert human-friendly format to kanban format
    return notes.map((n, i) => {
        if (typeof n === 'string') {
            // Format: - [status] text (timestamp)
            const match = n.match(/^-\s*\[([^\]]+)\]\s*(.+?)\s*\(([^)]+)\)$/);
            if (match) {
                return {
                    text: match[2].trim(),
                    timestamp: match[3],
                    status: match[1],
                    id: Date.now() + i
                };
            }
            // Format without timestamp: - [status] text
            const matchNoTimestamp = n.match(/^-\s*\[([^\]]+)\]\s*(.+)$/);
            if (matchNoTimestamp) {
                return {
                    text: matchNoTimestamp[2].trim(),
                    timestamp: new Date().toLocaleString(),
                    status: matchNoTimestamp[1],
                    id: Date.now() + i
                };
            }
        }
        return n;
    });
}

function renderKanbanBoard(board, notes, l2, l3) {
    const columns = {
        'todo': board.querySelector('[data-status="todo"]'),
        'in-progress': board.querySelector('[data-status="in-progress"]'),
        'done': board.querySelector('[data-status="done"]')
    };
    
    // Clear all columns
    Object.values(columns).forEach(col => col.innerHTML = '');
    
    // Count notes per column
    const counts = { 'todo': 0, 'in-progress': 0, 'done': 0 };
    
    // Render notes into appropriate columns
    notes.forEach((note, index) => {
        const status = note.status || 'todo';
        counts[status]++;
        const noteEl = createNoteCard(note, index, l2, l3, board);
        columns[status].appendChild(noteEl);
    });
    
    // Update column counts
    board.querySelectorAll('.kanban-column').forEach(col => {
        const status = col.querySelector('.kanban-column-content').dataset.status;
        col.querySelector('.column-count').textContent = counts[status];
    });
    
    // Add empty state to empty columns
    Object.entries(columns).forEach(([status, col]) => {
        if (counts[status] === 0) {
            col.innerHTML = '<div class="notes-empty">Drop notes here</div>';
        }
    });
    
    // Setup drag and drop for columns
    setupKanbanDragDrop(board, l2, l3);
}

function createEditableNote(board, l2, l3, status) {
    const column = board.querySelector(`[data-status="${status}"]`);
    
    // Remove empty state if present
    const emptyState = column.querySelector('.notes-empty');
    if (emptyState) emptyState.remove();
    
    // Create new editable note card
    const noteEl = document.createElement('div');
    noteEl.className = 'note-item editing';
    noteEl.dataset.status = status;
    
    const noteId = Date.now();
    noteEl.dataset.id = noteId;
    
    noteEl.innerHTML = `
        <div class="note-item-header">
            <div class="note-content" contenteditable="true"></div>
            <button class="note-delete-btn">×</button>
        </div>
        <div class="note-timestamp">${new Date().toLocaleString()}</div>
    `;
    
    // Insert at the top of the column
    column.insertBefore(noteEl, column.firstChild);
    
    const contentEl = noteEl.querySelector('.note-content');
    contentEl.focus();
    
    // Handle saving the note
    const saveNote = () => {
        const text = contentEl.textContent.trim();
        if (text) {
            const note = {
                text: text,
                timestamp: new Date().toLocaleString(),
                status: status,
                id: noteId
            };
            const oldNotes = state.projectData[l2][l3].oldNotes || [];
            const convertedNotes = convertNotesToKanban(oldNotes);
            convertedNotes.unshift(note); // Add at beginning
            state.projectData[l2][l3].oldNotes = convertedNotes;
            saveToFile();
        }
        // Re-render the board
        renderKanbanBoard(board, state.projectData[l2][l3].oldNotes || [], l2, l3);
    };
    
    contentEl.onblur = saveNote;
    
    contentEl.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            contentEl.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            // Remove without saving
            noteEl.remove();
            // Re-render to restore empty state if needed
            renderKanbanBoard(board, state.projectData[l2][l3].oldNotes || [], l2, l3);
        }
    };
    
    noteEl.querySelector('.note-delete-btn').onclick = (e) => {
        e.stopPropagation();
        noteEl.remove();
        // Re-render to restore empty state if needed
        renderKanbanBoard(board, state.projectData[l2][l3].oldNotes || [], l2, l3);
    };
}

function createNoteCard(note, index, l2, l3, board) {
    const noteEl = document.createElement('div');
    noteEl.className = 'note-item';
    noteEl.draggable = true;
    noteEl.dataset.index = index;
    noteEl.dataset.id = note.id;
    noteEl.dataset.status = note.status || 'todo';
    
    noteEl.innerHTML = `
        <div class="note-item-header">
            <div class="note-content" contenteditable="true" spellcheck="false">${note.text}</div>
            <button class="note-delete-btn">×</button>
        </div>
        <div class="note-timestamp">${note.timestamp}</div>
    `;
    
    const contentEl = noteEl.querySelector('.note-content');
    let currentText = note.text;
    
    // Prevent drag when editing
    contentEl.onfocus = () => {
        noteEl.draggable = false;
    };
    
    // Handle saving the edited note
    contentEl.onblur = () => {
        const newText = contentEl.textContent.trim();
        if (newText && newText !== currentText) {
            const noteId = parseInt(noteEl.dataset.id);
            const notes = state.projectData[l2][l3].oldNotes;
            const noteToUpdate = notes.find(n => n.id === noteId);
            if (noteToUpdate) {
                noteToUpdate.text = newText;
                currentText = newText;
                saveToFile();
            }
        } else if (!newText) {
            contentEl.textContent = currentText;
        }
        noteEl.draggable = true;
    };
    
    contentEl.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            contentEl.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            contentEl.textContent = currentText;
            contentEl.blur();
        }
    };
    
    noteEl.querySelector('.note-delete-btn').onclick = async (e) => {
        e.stopPropagation();
        if (await showConfirmPopup('Delete note?', e.clientX, e.clientY)) {
            const noteId = parseInt(noteEl.dataset.id);
            state.projectData[l2][l3].oldNotes = state.projectData[l2][l3].oldNotes.filter(n => n.id !== noteId);
            renderKanbanBoard(board, state.projectData[l2][l3].oldNotes, l2, l3);
            saveToFile();
        }
    };
    
    return noteEl;
}

function setupKanbanDragDrop(board, l2, l3) {
    let draggedNote = null;
    let placeholder = null;
    
    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.note-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };
    
    board.querySelectorAll('.note-item').forEach(item => {
        item.ondragstart = (e) => {
            draggedNote = item;
            item.classList.add('dragging');
            
            placeholder = document.createElement('div');
            placeholder.className = 'note-placeholder';
            placeholder.style.height = item.offsetHeight + 'px';
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.id);
            
            setTimeout(() => {
                item.style.display = 'none';
                item.parentNode.insertBefore(placeholder, item.nextSibling);
            }, 0);
        };
        
        item.ondragend = () => {
            item.classList.remove('dragging');
            item.style.display = '';
            
            if (placeholder && placeholder.parentNode) {
                const newColumn = placeholder.parentNode;
                const newStatus = newColumn.dataset.status;
                
                // Remove empty state if present
                const emptyState = newColumn.querySelector('.notes-empty');
                if (emptyState) emptyState.remove();
                
                // Insert the item at placeholder position
                newColumn.insertBefore(item, placeholder);
                placeholder.remove();
                
                // Update note status and reorder
                const noteId = parseInt(item.dataset.id);
                const notes = state.projectData[l2][l3].oldNotes;
                const noteIndex = notes.findIndex(n => n.id === noteId);
                
                if (noteIndex !== -1) {
                    notes[noteIndex].status = newStatus;
                    item.dataset.status = newStatus;
                    
                    // Reorder notes based on DOM order
                    const reorderedNotes = [];
                    board.querySelectorAll('.note-item').forEach(noteEl => {
                        const id = parseInt(noteEl.dataset.id);
                        const note = notes.find(n => n.id === id);
                        if (note) reorderedNotes.push(note);
                    });
                    
                    state.projectData[l2][l3].oldNotes = reorderedNotes;
                    saveToFile();
                }
                
                // Re-render to update counts
                renderKanbanBoard(board, state.projectData[l2][l3].oldNotes, l2, l3);
            }
            
            placeholder = null;
            draggedNote = null;
            
            // Remove drag-over class from all columns
            board.querySelectorAll('.kanban-column-content').forEach(col => {
                col.classList.remove('drag-over');
            });
        };
    });
    
    board.querySelectorAll('.kanban-column-content').forEach(column => {
        column.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            column.classList.add('drag-over');
            
            if (placeholder) {
                const afterElement = getDragAfterElement(column, e.clientY);
                // Remove empty state for drag preview
                const emptyState = column.querySelector('.notes-empty');
                if (emptyState) emptyState.style.display = 'none';
                
                if (afterElement == null) {
                    column.appendChild(placeholder);
                } else {
                    column.insertBefore(placeholder, afterElement);
                }
            }
        };
        
        column.ondragleave = (e) => {
            // Only remove class if actually leaving the column
            if (!column.contains(e.relatedTarget)) {
                column.classList.remove('drag-over');
                const emptyState = column.querySelector('.notes-empty');
                if (emptyState && column.querySelectorAll('.note-item').length === 0) {
                    emptyState.style.display = '';
                }
            }
        };
        
        column.ondrop = (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
        };
    });
}

// Legacy function for backward compatibility
function renderNotesList(container, notes, l2, l3) {
    // Find the parent kanban board and redirect
    const board = container.closest('.notes-section')?.querySelector('.kanban-board');
    if (board) {
        const convertedNotes = convertNotesToKanban(notes);
        renderKanbanBoard(board, convertedNotes, l2, l3);
    }
}



// ==================== SECTION MANAGEMENT ====================
function updateSectionTitle(el, oldT, newT, level, parent) {
    const lines = state.fileContent.split('\n');
    if (level === 2) {
        const idx = lines.findIndex(l => l.startsWith('## ') && !l.startsWith('### ') && l.substring(3).trim() === oldT);
        if (idx !== -1) lines[idx] = `## ${newT}`;

        state.projectData[newT] = state.projectData[oldT]; delete state.projectData[oldT];
        el.dataset.section = newT; el.querySelector('.section-time-display').dataset.section = newT;
        el.querySelectorAll('.section-level-3').forEach(s => { s.dataset.level2 = newT; s.querySelectorAll('[data-level2]').forEach(x => x.dataset.level2 = newT); });
    } else {
        let parentIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('## ') && !lines[i].startsWith('### ') && lines[i].substring(3).trim() === parent) {
                parentIdx = i;
                break;
            }
        }
        
        if (parentIdx !== -1) {
            for (let i = parentIdx + 1; i < lines.length; i++) {
                if (lines[i].startsWith('## ') && !lines[i].startsWith('### ')) break;
                if (lines[i].startsWith('### ') && lines[i].substring(4).trim() === oldT) {
                    lines[i] = `### ${newT}`;
                    break;
                }
            }
        }

        state.projectData[parent][newT] = state.projectData[parent][oldT]; delete state.projectData[parent][oldT];
        el.dataset.level3 = newT; el.querySelectorAll('[data-level3]').forEach(x => x.dataset.level3 = newT);
    }
    state.fileContent = lines.join('\n');
    saveToFile();
}

async function deleteSection(el, title, level, parent, x, y) {
    if (!await showConfirmPopup(level === 2 ? `Delete "${title}" & subsections?` : `Delete "${title}"?`, x, y)) return;
    if (level === 2) delete state.projectData[title]; else delete state.projectData[parent][title];
    
    // Remove from file content
    const lines = state.fileContent.split('\n');
    if (level === 2) {
        // Remove the entire level 2 section and all its subsections
        const startIdx = lines.findIndex(l => l.trim() === `## ${title}`);
        if (startIdx !== -1) {
            let endIdx = startIdx + 1;
            while (endIdx < lines.length && !lines[endIdx].startsWith('## ')) endIdx++;
            lines.splice(startIdx, endIdx - startIdx);
            state.fileContent = lines.join('\n');
        }
    } else {
        // Remove only the level 3 subsection
        const startIdx = lines.findIndex(l => l.trim() === `### ${title}`);
        if (startIdx !== -1) {
            let endIdx = startIdx + 1;
            while (endIdx < lines.length && !lines[endIdx].startsWith('#')) endIdx++;
            lines.splice(startIdx, endIdx - startIdx);
            state.fileContent = lines.join('\n');
        }
    }
    
    el.remove(); saveToFile();
}

function moveSection(el, dir, level) {
    const sib = dir === 'up' ? el.previousElementSibling : el.nextElementSibling;
    if (sib?.classList.contains(`section-level-${level}`)) {
        el.parentNode.insertBefore(dir === 'up' ? el : sib, dir === 'up' ? sib : el);
        updateSectionOrder(level, el);
    }
}

function updateSectionOrder(level, el) {
    if (level === 2) {
        const newData = {};
        document.querySelectorAll('.section-level-2').forEach(s => { if (state.projectData[s.dataset.section]) newData[s.dataset.section] = state.projectData[s.dataset.section]; });
        state.projectData = newData;
    } else {
        const p = el.dataset.level2, pd = state.projectData[p], newS = { totalTime: pd.totalTime, color: pd.color };
        el.closest('.section-level-2').querySelectorAll('.section-level-3').forEach(s => { if (pd[s.dataset.level3]) newS[s.dataset.level3] = pd[s.dataset.level3]; });
        state.projectData[p] = newS;
    }
    saveToFile();
}

// ==================== MARKDOWN ====================
function parseAndRenderMarkdown(md) {
    const lines = md.split('\n');
    elements.projectContent.innerHTML = '';
    state.projectData = {}; state.totalProjectTime = 0; state.dailyWorkTime = {};
    state.timeline = { startDate: null, endDate: null, events: [] };

    let curL2 = null, curL2Name = '', curL3Name = '';
    
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (l.startsWith('Time:') && !curL2Name) state.totalProjectTime = parseInt(l.substring(5)) || 0;
        else if (l.startsWith('DailyWork:')) {
            // Skip DailyWork line header - will be parsed from Daily Work: section below
        }
        else if (l.startsWith('Timeline Start:')) {
            // New human-friendly format
            state.timeline.startDate = l.substring(15).trim();
        }
        else if (l.startsWith('Timeline End:')) {
            state.timeline.endDate = l.substring(13).trim();
        }
        else if (l.startsWith('Daily Work:')) {
            // New human-friendly format - parse following lines
            i++;
            while (i < lines.length && lines[i].trim().startsWith('- ')) {
                const match = lines[i].trim().match(/^-\s*([^:]+):\s*(.+)h$/);
                if (match) {
                    const date = match[1];
                    const hours = parseFloat(match[2]);
                    state.dailyWorkTime[date] = hours * 3600;
                }
                i++;
            }
            i--;
        }
        else if (l.startsWith('Timeline Events:')) {
            // New human-friendly format - parse following lines
            i++;
            while (i < lines.length && lines[i].trim().startsWith('- ')) {
                const match = lines[i].trim().match(/^-\s*([^:]+):\s*(.+)$/);
                if (match) {
                    const date = match[1];
                    const note = match[2];
                    state.timeline.events.push({ date, note, position: null, id: Date.now() });
                }
                i++;
            }
            i--;
        }
        else if (lines[i].startsWith('## ') && !lines[i].startsWith('### ')) {
            curL2Name = lines[i].substring(3).trim();
            state.projectData[curL2Name] = { totalTime: 0 };
            // Look ahead for metadata
            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                if (lines[j].startsWith('Time:')) state.projectData[curL2Name].totalTime = parseInt(lines[j].substring(5)) || 0;
                if (lines[j].startsWith('Color:')) state.projectData[curL2Name].color = lines[j].substring(6).trim();
            }
            curL2 = createSection(2, curL2Name);
            elements.projectContent.appendChild(curL2);
        } else if (lines[i].startsWith('### ') && curL2) {
            curL3Name = lines[i].substring(4).trim();
            if (!state.projectData[curL2Name][curL3Name]) state.projectData[curL2Name][curL3Name] = { notes: '', oldNotes: [], totalTime: 0 };
            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                if (lines[j].startsWith('Time:')) state.projectData[curL2Name][curL3Name].totalTime = parseInt(lines[j].substring(5)) || 0;
                if (lines[j].startsWith('Color:')) state.projectData[curL2Name][curL3Name].color = lines[j].substring(6).trim();
            }
            curL2.querySelector('.section-content-2').insertBefore(createSection(3, curL3Name, curL2Name), curL2.querySelector('.add-subsection-btn'));
        } else if (l.startsWith('**Notes:**') && curL3Name) {
            let notes = []; i++;
            while (i < lines.length && !lines[i].startsWith('#') && !lines[i].startsWith('**Notes:**')) {
                const line = lines[i].trim();
                if (line.startsWith('- [')) {
                    notes.push(line);
                }
                i++;
            }
            i--; 
            state.projectData[curL2Name][curL3Name].oldNotes = notes;
        }
    }
    // Re-render kanban boards to ensure they are populated
    document.querySelectorAll('.kanban-board').forEach(board => {
        const l2 = board.dataset.level2;
        const l3 = board.dataset.level3;
        if (l2 && l3) {
            const notes = state.projectData[l2]?.[l3]?.oldNotes || [];
            const convertedNotes = convertNotesToKanban(notes);
            if (state.projectData[l2]?.[l3]) {
                state.projectData[l2][l3].oldNotes = convertedNotes;
            }
            renderKanbanBoard(board, convertedNotes, l2, l3);
        }
    });
    updateProjectTimeDisplay();
    if (state.hasProject || state.fileContent.trim()) elements.addSectionControls.style.display = 'flex';
}

function updateMarkdownContent() {
    const lines = state.fileContent.split('\n');
    let newContent = '', i = 0, firstSec = false;
    const skip = () => { 
        while (i < lines.length && (
            lines[i].trim() === '' || 
            lines[i].startsWith('Time:') || 
            lines[i].startsWith('Color:') || 
            lines[i].startsWith('Daily Work:') || 
            lines[i].startsWith('Timeline Start:') ||
            lines[i].startsWith('Timeline End:') ||
            lines[i].startsWith('Timeline Events:') ||
            (lines[i].trim().startsWith('- ') && !lines[i].startsWith('## ') && !lines[i].startsWith('### '))
        )) i++; 
    };

    while (i < lines.length) {
        const l = lines[i];
        if (l.startsWith('DailyWork:') || l.startsWith('Timeline Start:') || l.startsWith('Timeline End:') || l.startsWith('Timeline Events:') || l.startsWith('Daily Work:') || l.startsWith('Time:') || l.startsWith('Color:') || (!firstSec && l.trim() === '')) { i++; continue; }
        
        if (i === 0 && l.startsWith('# ')) {
            newContent += `${l}\n\nTime: ${state.totalProjectTime}\n\n`;
            
            // Add DailyWork in human-friendly format
            if (Object.keys(state.dailyWorkTime).length > 0) {
                newContent += `Daily Work:\n`;
                Object.entries(state.dailyWorkTime).sort().reverse().forEach(([date, seconds]) => {
                    const hours = (seconds / 3600).toFixed(1);
                    newContent += `- ${date}: ${hours}h\n`;
                });
                newContent += '\n';
            }
            
            // Add Timeline in human-friendly format
            if (state.timeline.startDate || state.timeline.endDate) {
                newContent += `Timeline Start: ${state.timeline.startDate || 'not set'}\n`;
                newContent += `Timeline End: ${state.timeline.endDate || 'not set'}\n`;
                if (state.timeline.events && state.timeline.events.length > 0) {
                    newContent += `\nTimeline Events:\n`;
                    state.timeline.events.forEach(event => {
                        const date = event.date || new Date().toISOString().split('T')[0];
                        newContent += `- ${date}: ${event.note}\n`;
                    });
                }
                newContent += '\n';
            }
            
            i++; skip(); continue;
        }
        
        if (l.startsWith('## ') && !l.startsWith('### ')) {
            const t = l.substring(3).trim();
            newContent += (firstSec ? '' : '\n') + `${l}\n`; firstSec = true;
            i++; skip();
            if (state.projectData[t]) newContent += `\nTime: ${state.projectData[t].totalTime || 0}\n` + (state.projectData[t].color ? `Color: ${state.projectData[t].color}\n` : '');
            continue;
        }
        
        if (l.startsWith('### ')) {
            const t = l.substring(4).trim();
            newContent += `${l}\n`; i++;
            let l2 = '';
            for (let j = i - 1; j >= 0; j--) if (lines[j].startsWith('## ') && !lines[j].startsWith('### ')) { l2 = lines[j].substring(3).trim(); break; }
            while (i < lines.length && !lines[i].startsWith('#')) i++;
            
            const d = state.projectData[l2]?.[t];
            if (d) {
                newContent += `\nTime: ${d.totalTime || 0}\n` + (d.color ? `Color: ${d.color}\n` : '');
                if (d.notes) newContent += `\n**Notes:**\n${d.notes}\n`;
                if (d.oldNotes?.length) {
                    // Save notes in human-friendly format
                    const formattedNotes = d.oldNotes.map(note => {
                        if (typeof note === 'object' && note.text && note.status && note.timestamp) {
                            return `- [${note.status}] ${note.text} (${note.timestamp})`;
                        }
                        return `- [todo] ${note}`;
                    }).join('\n');
                    newContent += `\n**Notes:**\n${formattedNotes}\n`;
                }
                newContent += '\n';
            }
            continue;
        }
        newContent += `${l}\n`; i++;
    }
    state.fileContent = newContent.trim() + '\n';
}

// ==================== TIMELINE ====================
let pendingEventPos = null;
const getTLContext = () => {
    const s = state.timeline.startDate || elements.timelineStartDate.value, e = state.timeline.endDate || elements.timelineEndDate.value;
    if (!s || !e) return null;
    const start = new Date(s), end = new Date(e);
    return { start, end, dur: end - start };
};

function renderTimelineWorkBlurs() {
    const ctx = getTLContext();
    if (!ctx) return;
    
    elements.timelineSvg.querySelectorAll('.timeline-work-indicator').forEach(e => e.remove());

    const grp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    grp.setAttribute('class', 'timeline-work-indicator');
    
    const hitbox = elements.timelineSvg.querySelector('.timeline-hitbox');
    if (hitbox) elements.timelineSvg.insertBefore(grp, hitbox);
    else elements.timelineSvg.appendChild(grp);

    const dayW = 1000 / Math.ceil(ctx.dur / 86400000);
    Object.entries(state.dailyWorkTime).forEach(([d, s]) => {
        const date = new Date(d);
        if (date >= ctx.start && date <= ctx.end) {
            const h = Math.min(s / 14400, 1) * 30;
            const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            r.setAttribute('x', ((date - ctx.start) / ctx.dur) * 1000 - dayW / 2);
            r.setAttribute('y', 50 - h); r.setAttribute('width', dayW); r.setAttribute('height', h * 2);
            r.setAttribute('fill', '#22c55e'); r.setAttribute('class', 'work-indicator-line');
            grp.appendChild(r);
        }
    });
}

function renderTimeline() {
    const ctx = getTLContext();
    if (!ctx) return;
    elements.timelineLabelStart.textContent = formatDateLabel(ctx.start);
    elements.timelineLabelEnd.textContent = formatDateLabel(ctx.end);
    elements.timelineSvg.querySelectorAll('.timeline-event-star, .timeline-tooltip').forEach(e => e.remove());
    
    renderTimelineWorkBlurs();

    // Current Dot
    const now = new Date(), dot = elements.timelineSvg.querySelector('.timeline-current-dot');
    if (now >= ctx.start && now <= ctx.end) {
        dot.setAttribute('cx', ((now - ctx.start) / ctx.dur) * 1000);
        dot.style.display = 'block';
    } else dot.style.display = 'none';

    // Events
    state.timeline.events.forEach(ev => {
        const pos = ev.date ? ((new Date(ev.date) - ctx.start) / ctx.dur) * 1000 : ev.position;
        if (pos === null) return;
        const star = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        // Simplified star path logic
        let path = '';
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? 10 : 4, a = (Math.PI / 5) * i - Math.PI / 2;
            path += (i ? 'L' : 'M') + (pos + r * Math.cos(a)) + ',' + (50 + r * Math.sin(a));
        }
        star.setAttribute('d', path + 'Z');
        star.setAttribute('class', 'timeline-event-star');
        star.onmouseenter = (e) => {
            const tt = document.createElement('div');
            tt.className = 'timeline-tooltip';
            tt.innerHTML = (ev.date ? `<strong>${formatDateLabel(ev.date)}</strong><br>` : '') + ev.note;
            const r = e.target.getBoundingClientRect();
            tt.style.cssText = `position:fixed;left:${r.left + r.width/2}px;top:${r.top - 50}px;transform:translateX(-50%)`;
            document.body.appendChild(tt);
        };
        star.onmouseleave = () => document.querySelectorAll('.timeline-tooltip').forEach(t => t.remove());
        star.onclick = async (e) => {
            e.stopPropagation();
            if (await showConfirmPopup('Remove event?', e.clientX, e.clientY)) {
                state.timeline.events = state.timeline.events.filter(x => x.id !== ev.id);
                renderTimeline(); saveToFile();
            }
        };
        elements.timelineSvg.appendChild(star);
    });
}

function showTimeline() {
    elements.timelineSection.style.display = 'block';
    if (!state.timeline.startDate) { state.timeline.startDate = elements.timelineStartDate.value = getToday(); saveToFile(); }
    else elements.timelineStartDate.value = state.timeline.startDate;
    if (!state.timeline.endDate) { 
        const d = new Date(); d.setMonth(d.getMonth() + 3); 
        state.timeline.endDate = elements.timelineEndDate.value = d.toISOString().split('T')[0]; saveToFile(); 
    } else elements.timelineEndDate.value = state.timeline.endDate;
    renderTimeline();
}

// ==================== INIT ====================
initTheme();

if (elements.themeToggleBtn) {
    elements.themeToggleBtn.onclick = () => {
        const next = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        document.body.classList.add('no-theme-transition');
        localStorage.setItem(THEME_STORAGE_KEY, next);
        applyTheme(next);
        setTimeout(() => document.body.classList.remove('no-theme-transition'), 80);
    };
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', (e) => {
            if (!localStorage.getItem(THEME_STORAGE_KEY)) applyTheme(e.matches ? 'dark' : 'light');
        });
    }
}

elements.fileUpload.onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    state.currentFile = f; state.fileContent = await f.text(); state.isNewFile = false; state.hasProject = true;
    state.projectName = f.name.replace(/\.(md|markdown)$/, '');
    elements.projectTitle.textContent = state.projectName;
    parseAndRenderMarkdown(state.fileContent);
    elements.downloadBtn.style.display = elements.headerUploadBtn.style.display = 'inline-block';
    elements.centerUploadContainer.style.display = 'none';
    showTimeline(); elements.fileUpload.value = '';
};

elements.downloadBtn.onclick = async (e) => {
    e.preventDefault(); e.stopPropagation(); updateMarkdownContent();
    const name = (state.fileContent.match(/^#\s+(.+)$/m)?.[1]?.trim() || state.projectName || 'project') + '.md';
    if ('showSaveFilePicker' in window) {
        try {
            const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }] });
            const w = await h.createWritable(); await w.write(state.fileContent); await w.close(); return;
        } catch (err) { if (err.name !== 'AbortError') downloadFile(); }
    } else downloadFile();
};

elements.projectTitle.oninput = function() {
    const uploadBtnText = document.getElementById('upload-btn-text');
    const centerUploadText = document.getElementById('center-upload-text');
    const centerUploadLabel = document.getElementById('center-upload-label');
    const text = this.textContent.trim();
    const hasUserContent = text && text !== 'Write name of new project';
    
    if (uploadBtnText) {
        uploadBtnText.textContent = 'Upload';
    }
    if (centerUploadText) {
        centerUploadText.textContent = hasUserContent ? 'Create Project' : 'Upload Project';
    }
    // Toggle between file upload and direct creation
    if (centerUploadLabel) {
        if (hasUserContent) {
            centerUploadLabel.setAttribute('for', '');
            centerUploadLabel.style.cursor = 'pointer';
        } else {
            centerUploadLabel.setAttribute('for', 'file-upload');
        }
    }
};

// Handle center upload button click for project creation
document.getElementById('center-upload-label')?.addEventListener('click', function(e) {
    const projectName = elements.projectTitle.textContent.trim();
    if (projectName && projectName !== 'Write name of new project' && !state.hasProject) {
        e.preventDefault();
        state.projectName = projectName;
        createNewProject();
    }
});

elements.projectTitle.onblur = function() {
    const t = this.textContent.trim();
    if (t && t !== 'Write name of new project') { state.projectName = t; if (!state.hasProject) createNewProject(); }
    else if (!state.hasProject) { this.textContent = 'Write name of new project'; state.projectName = ''; }
};
elements.projectTitle.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };
elements.projectTitle.onfocus = function() { if (this.textContent === 'Write name of new project') this.textContent = ''; };

elements.addLevel2Btn.onclick = () => openSectionModal('level2');
elements.modal.querySelector('.close').onclick = document.getElementById('modal-cancel-btn').onclick = () => closeSectionModal();
window.onclick = (e) => { if (e.target === elements.modal) closeSectionModal(); };
elements.sectionTitleInput.onkeydown = (e) => { if (e.ctrlKey && e.key === 'Enter') document.getElementById('modal-add-btn').click(); };
document.getElementById('modal-add-btn').onclick = () => {
    const t = elements.sectionTitleInput.value.trim();
    if (!t) return alert('Enter title.');
    if (currentModalType === 'level2') addLevel2Section(t);
    else {
        const p = preselectedParentSection || elements.parentSelect.value;
        if (!p) return alert('Select parent.');
        addLevel3Section(t, p);
    }
    closeSectionModal(true);
};

elements.timelineStartDate.onchange = elements.timelineEndDate.onchange = () => {
    state.timeline.startDate = elements.timelineStartDate.value;
    state.timeline.endDate = elements.timelineEndDate.value;
    renderTimeline(); saveToFile();
};
elements.timelineLabelStart.onclick = () => elements.timelineStartDate.showPicker();
elements.timelineLabelEnd.onclick = () => elements.timelineEndDate.showPicker();
elements.timelineSvg.onclick = (e) => {
    if (!elements.timelineStartDate.value || !elements.timelineEndDate.value) return alert('Set dates first.');
    if (e.target.classList.contains('timeline-line') || e.target.classList.contains('timeline-hitbox')) {
        const r = elements.timelineSvg.getBoundingClientRect();
        pendingEventPos = ((e.clientX - r.left) / r.width) * 1000;
        const ctx = getTLContext();
        elements.eventDateInput.value = new Date(ctx.start.getTime() + (pendingEventPos/1000)*ctx.dur).toISOString().split('T')[0];
        elements.timelineEventModal.classList.add('show'); elements.eventDateInput.focus();
    }
};
elements.timelineEventModal.querySelector('.close').onclick = document.getElementById('event-cancel-btn').onclick = () => { elements.timelineEventModal.classList.remove('show'); elements.eventNoteInput.value = ''; };
elements.eventNoteInput.onkeydown = elements.eventDateInput.onkeydown = (e) => { if (e.ctrlKey && e.key === 'Enter') document.getElementById('event-add-btn').click(); };
document.getElementById('event-add-btn').onclick = () => {
    const n = elements.eventNoteInput.value.trim(), d = elements.eventDateInput.value;
    if (!d || !n) return alert('Enter date and note.');
    state.timeline.events.push({ note: n, date: d, id: Date.now() });
    renderTimeline(); saveToFile();
    elements.timelineEventModal.classList.remove('show'); elements.eventNoteInput.value = '';
};

const lc = elements.leaveConfirmModal;
const hideLC = () => lc.classList.remove('show');
lc.querySelector('.close').onclick = document.getElementById('leave-stay-btn').onclick = hideLC;
document.getElementById('leave-download-btn').onclick = () => { downloadFile(); hideLC(); };
document.getElementById('leave-anyway-btn').onclick = () => { hideLC(); location.reload(); };

// Help Modal
const helpModal = document.getElementById('help-modal');
const helpBtn = document.getElementById('help-btn');
const showHelpModal = () => helpModal.classList.add('show');
const hideHelpModal = () => helpModal.classList.remove('show');
helpBtn.onclick = showHelpModal;
helpModal.querySelector('.close').onclick = hideHelpModal;
window.addEventListener('click', (e) => { if (e.target === helpModal) hideHelpModal(); });

// Load Example Project
const loadExampleBtn = document.getElementById('load-example-btn');
loadExampleBtn.onclick = async () => {
    try {
        const response = await fetch('example-project.md');
        if (!response.ok) throw new Error('Failed to load example project');
        const content = await response.text();
        state.fileContent = content;
        state.projectName = 'Example Project';
        state.currentFile = 'example-project.md';
        state.hasProject = true;
        elements.projectTitle.textContent = state.projectName;
        parseAndRenderMarkdown(content);
        showTimeline();
        elements.projectTitle.contentEditable = 'true';
        elements.downloadBtn.style.display = 'inline-block';
        elements.headerUploadBtn.style.display = 'inline-block';
        elements.centerUploadContainer.style.display = 'none';
        hideHelpModal();
    } catch (err) {
        alert('Could not load example project: ' + err.message);
    }
};

window.onbeforeunload = (e) => { if (state.hasProject) { e.preventDefault(); e.returnValue = ''; } };
document.onkeydown = (e) => {
    if (!state.hasProject) return;
    if ((e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') || ((e.ctrlKey || e.metaKey) && e.key === 'F4')) {
        e.preventDefault(); e.stopPropagation(); lc.classList.add('show');
    }
};
