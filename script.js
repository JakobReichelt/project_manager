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
    leaveConfirmModal: el('leave-confirm-modal')
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

const sectionColorPalette = ['#4A90D9', '#D94A4A', '#4AD97A', '#D9A64A', '#9B4AD9', '#4AD9D9', '#D94A9B', '#7AD94A', '#D9784A', '#4A6ED9'];

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

// ==================== COLOR PICKER ====================
let activeColorPicker = null;
function showColorPicker(x, y, colors, current, onSelect) {
    closeColorPicker();
    const popup = document.createElement('div');
    popup.className = 'color-picker-popup';
    const grid = document.createElement('div');
    grid.className = 'color-picker-grid';
    colors.forEach(c => {
        const cell = document.createElement('div');
        cell.className = 'color-picker-cell' + (c.toLowerCase() === current?.toLowerCase() ? ' selected' : '');
        cell.style.backgroundColor = c;
        cell.onclick = (e) => { e.stopPropagation(); onSelect(c); closeColorPicker(); };
        grid.appendChild(cell);
    });
    popup.appendChild(grid);
    document.body.appendChild(popup);
    const rect = popup.getBoundingClientRect();
    popup.style.left = Math.max(10, Math.min(x, window.innerWidth - rect.width - 10)) + 'px';
    popup.style.top = Math.max(10, Math.min(y + 5, window.innerHeight - rect.height - 10)) + 'px';
    activeColorPicker = popup;
    setTimeout(() => document.addEventListener('click', handleColorPickerOutsideClick), 0);
}

function handleColorPickerOutsideClick(e) {
    if (activeColorPicker && !activeColorPicker.contains(e.target)) closeColorPicker();
}

function closeColorPicker() {
    if (activeColorPicker) {
        activeColorPicker.remove();
        activeColorPicker = null;
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
        document.querySelector('.confirm-popup')?.remove();
        const popup = document.createElement('div');
        popup.className = 'confirm-popup';
        popup.innerHTML = `<div class="confirm-popup-message">${msg}</div><div class="confirm-popup-buttons"><button class="confirm-popup-btn confirm-yes">Yes</button><button class="confirm-popup-btn confirm-no">No</button></div>`;
        document.body.appendChild(popup);
        const rect = popup.getBoundingClientRect();
        popup.style.left = Math.max(10, Math.min(x, window.innerWidth - rect.width - 10)) + 'px';
        popup.style.top = Math.max(10, Math.min(y, window.innerHeight - rect.height - 10)) + 'px';
        
        const cleanup = () => { popup.remove(); document.removeEventListener('keydown', handleKey); };
        const handleKey = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); cleanup(); resolve(true); }
            else if (e.key === 'Escape') { e.preventDefault(); cleanup(); resolve(false); }
        };
        document.addEventListener('keydown', handleKey);
        popup.querySelector('.confirm-yes').onclick = () => { cleanup(); resolve(true); };
        popup.querySelector('.confirm-no').onclick = () => { cleanup(); resolve(false); };
        popup.querySelector('.confirm-yes').focus();
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
    const idx = lines.findIndex(l => l === `## ${parent}`);
    if (idx !== -1) {
        let insertIdx = idx + 1;
        while (insertIdx < lines.length && (!lines[insertIdx].startsWith('## ') || lines[insertIdx].startsWith('### '))) insertIdx++;
        
        const pColor = state.projectData[parent]?.color || '';
        const count = Object.keys(state.projectData[parent] || {}).filter(k => !['totalTime', 'color'].includes(k)).length;
        const color = pColor ? generateSimilarColor(pColor, count) : '';
        
        lines.splice(insertIdx, 0, '', `### ${title}`, '', 'Time: 0', color ? `Color: ${color}` : '', '**Notes:**', '', '**Old Notes:**', '');
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
        timeText: isL2 ? formatTimeDisplay(time) : `Total: ${formatTimeDisplay(time)}`,
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
        if (newT && newT !== curTitle) { updateSectionTitle(base.section, curTitle, newT, level, parent); curTitle = newT; }
        else if (!newT) base.titleEl.textContent = curTitle;
    };
    base.titleEl.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); base.titleEl.blur(); } };
    
    base.section.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); deleteSection(base.section, isL2 ? title : title, level, parent, e.clientX, e.clientY); };
    base.section.querySelector('.move-up-btn').onclick = (e) => { e.stopPropagation(); moveSection(base.section, 'up', level); };
    base.section.querySelector('.move-down-btn').onclick = (e) => { e.stopPropagation(); moveSection(base.section, 'down', level); };

    base.colorStripe.onclick = (e) => {
        e.stopPropagation();
        const rect = base.colorStripe.getBoundingClientRect();
        const colors = isL2 ? sectionColorPalette : generateColorVariants(state.projectData[parent]?.color || sectionColorPalette[0]);
        const curColor = (isL2 ? state.projectData[title] : state.projectData[parent]?.[title])?.color || '';
        showColorPicker(rect.right + 5, rect.top, colors, curColor, (c) => {
            if (isL2) { state.projectData[title].color = c; updateSubsectionColors(base.section, c); }
            else { state.projectData[parent][title].color = c; }
            saveToFile();
        });
    };

    if (isL2) {
        const btn = document.createElement('button');
        btn.className = 'add-subsection-btn';
        btn.textContent = '+ Add Subsection';
        btn.onclick = (e) => { e.stopPropagation(); openSubsectionModal(title); };
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
            <div class="total-time-display">Total: ${formatTimeDisplay(data?.totalTime || 0)}</div>
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
        const prog = Math.min((ts - waveStart) / 900000, 1), y = 100 - (prog * 100), t = (ts - waveStart) / 1500, amp = 1.5 + (1 - prog) * 2;
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
            if (sec % 900 === 0) { playPingSound(); pause.click(); }
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
    div.innerHTML = `<div class="notes-header">Notes</div><textarea class="notes-input" placeholder="Add notes... (Ctrl+Enter)"></textarea><div class="notes-list"></div>`;
    const input = div.querySelector('.notes-input');
    const list = div.querySelector('.notes-list');
    
    list.dataset.level2 = l2;
    list.dataset.level3 = l3;

    if (state.projectData[l2]?.[l3]?.notes) {
        input.value = state.projectData[l2][l3].notes;
    }

    input.oninput = () => {
        if (state.projectData[l2]?.[l3]) {
            state.projectData[l2][l3].notes = input.value;
        }
    };

    input.onkeydown = (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const txt = input.value.trim();
            if (!txt) return alert('Enter a note.');
            const note = `[${new Date().toLocaleString()}]\n${txt}`;
            state.projectData[l2][l3].oldNotes = [note, ...(state.projectData[l2][l3].oldNotes || [])];
            state.projectData[l2][l3].notes = '';
            renderNotesList(list, state.projectData[l2][l3].oldNotes, l2, l3);
            saveToFile();
            input.value = '';
        }
    };
    renderNotesList(list, state.projectData[l2]?.[l3]?.oldNotes || [], l2, l3);
    return div;
}

function renderNotesList(container, notes, l2, l3) {
    if (!notes.length) { container.innerHTML = '<div class="notes-empty">No notes yet</div>'; return; }
    container.innerHTML = notes.map((n, i) => `<div class="note-item" draggable="true" data-index="${i}"><div class="note-content">${n.replace(/\[([^\]]+:\d{2}):\d{2}([^\]]*)\]/g, '$1$2')}</div><button class="note-delete-btn">×</button></div>`).join('');
    
    let placeholder = null;

    const getDragAfterElement = (y) => {
        const draggableElements = [...container.querySelectorAll('.note-item:not(.dragging-hidden)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    container.ondragover = (e) => {
        e.preventDefault();
        const drag = container.querySelector('.dragging-hidden');
        if (drag && placeholder) {
            const afterElement = getDragAfterElement(e.clientY);
            if (afterElement == null) {
                container.appendChild(placeholder);
            } else {
                container.insertBefore(placeholder, afterElement);
            }
        }
    };

    container.querySelectorAll('.note-item').forEach((item, i) => {
        item.ondragstart = (e) => {
            placeholder = document.createElement('div');
            placeholder.className = 'note-placeholder';
            placeholder.style.height = item.offsetHeight + 'px';
            
            setTimeout(() => {
                item.classList.add('dragging-hidden');
                item.parentNode.insertBefore(placeholder, item);
            }, 0);
        };

        item.ondragend = () => {
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.insertBefore(item, placeholder);
                placeholder.remove();
            }
            item.classList.remove('dragging-hidden');
            placeholder = null;
            
            state.projectData[l2][l3].oldNotes = Array.from(container.querySelectorAll('.note-content')).map(el => el.textContent);
            saveToFile();
        };

        item.querySelector('.note-delete-btn').onclick = async (e) => {
            e.stopPropagation();
            if (await showConfirmPopup('Delete note?', e.clientX, e.clientY)) {
                state.projectData[l2][l3].oldNotes.splice(i, 1);
                renderNotesList(container, state.projectData[l2][l3].oldNotes, l2, l3);
                saveToFile();
            }
        };
    });
}

function updateNotesInUI() {
    document.querySelectorAll('.notes-list').forEach(l => {
        // This function is now redundant if we render correctly on creation, but useful for full re-renders
        // We can remove it if we trust createNotesSection, but parseAndRenderMarkdown calls it.
        // Let's keep logic inline there or here.
    });
}

// ==================== SECTION MANAGEMENT ====================
function updateSectionTitle(el, oldT, newT, level, parent) {
    if (level === 2) {
        state.projectData[newT] = state.projectData[oldT]; delete state.projectData[oldT];
        el.dataset.section = newT; el.querySelector('.section-time-display').dataset.section = newT;
        el.querySelectorAll('.section-level-3').forEach(s => { s.dataset.level2 = newT; s.querySelectorAll('[data-level2]').forEach(x => x.dataset.level2 = newT); });
    } else {
        state.projectData[parent][newT] = state.projectData[parent][oldT]; delete state.projectData[parent][oldT];
        el.dataset.level3 = newT; el.querySelectorAll('[data-level3]').forEach(x => x.dataset.level3 = newT);
    }
    saveToFile();
}

async function deleteSection(el, title, level, parent, x, y) {
    if (!await showConfirmPopup(level === 2 ? `Delete "${title}" & subsections?` : `Delete "${title}"?`, x, y)) return;
    if (level === 2) delete state.projectData[title]; else delete state.projectData[parent][title];
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
        else if (l.startsWith('DailyWork:')) try { state.dailyWorkTime = JSON.parse(l.substring(10)) || {}; } catch {}
        else if (l.startsWith('Timeline:')) try { state.timeline = { ...state.timeline, ...JSON.parse(l.substring(9)) }; } catch {}
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
            while (i < lines.length && !lines[i].startsWith('#') && !lines[i].startsWith('**Old Notes:**')) notes.push(lines[i++]);
            i--; state.projectData[curL2Name][curL3Name].notes = notes.join('\n').trim();
        } else if (l.startsWith('**Old Notes:**') && curL3Name) {
            let notes = []; i++;
            while (i < lines.length && !lines[i].startsWith('#')) notes.push(lines[i++]);
            i--; state.projectData[curL2Name][curL3Name].oldNotes = notes.join('\n').trim().split('\n---\n').map(n => n.trim()).filter(Boolean);
        }
    }
    // Re-render notes lists to ensure they are populated
    document.querySelectorAll('.notes-list').forEach(l => renderNotesList(l, state.projectData[l.dataset.level2]?.[l.dataset.level3]?.oldNotes || [], l.dataset.level2, l.dataset.level3));
    updateProjectTimeDisplay();
    if (state.hasProject || state.fileContent.trim()) elements.addSectionControls.style.display = 'flex';
}

function updateMarkdownContent() {
    const lines = state.fileContent.split('\n');
    let newContent = '', i = 0, firstSec = false;
    const skip = () => { while (i < lines.length && (lines[i].trim() === '' || lines[i].startsWith('Time:') || lines[i].startsWith('Color:'))) i++; };

    while (i < lines.length) {
        const l = lines[i];
        if (l.startsWith('DailyWork:') || l.startsWith('Timeline:') || l.startsWith('Time:') || l.startsWith('Color:') || (!firstSec && l.trim() === '')) { i++; continue; }
        
        if (i === 0 && l.startsWith('# ')) {
            newContent += `${l}\n\nTime: ${state.totalProjectTime}\n\nDailyWork: ${JSON.stringify(state.dailyWorkTime)}\n\nTimeline: ${JSON.stringify(state.timeline)}\n`;
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
                if (d.oldNotes?.length) newContent += `\n**Old Notes:**\n${d.oldNotes.join('\n---\n')}\n`;
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

function renderTimeline() {
    const ctx = getTLContext();
    if (!ctx) return;
    elements.timelineLabelStart.textContent = formatDateLabel(ctx.start);
    elements.timelineLabelEnd.textContent = formatDateLabel(ctx.end);
    elements.timelineSvg.querySelectorAll('.timeline-event-star, .timeline-tooltip, .timeline-work-indicator').forEach(e => e.remove());
    
    // Work Blurs
    const grp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    grp.setAttribute('class', 'timeline-work-indicator');
    elements.timelineSvg.insertBefore(grp, elements.timelineSvg.querySelector('.timeline-hitbox'));
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

window.onbeforeunload = (e) => { if (state.hasProject) { e.preventDefault(); e.returnValue = ''; } };
document.onkeydown = (e) => {
    if (!state.hasProject) return;
    if ((e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') || ((e.ctrlKey || e.metaKey) && e.key === 'F4')) {
        e.preventDefault(); e.stopPropagation(); lc.classList.add('show');
    }
};
