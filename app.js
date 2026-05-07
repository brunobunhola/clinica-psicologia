/* ================================================
   Vanessa Samara Psicologa — Application Logic
   ================================================ */

// ========== DATA STORE ==========
const DEFAULT_USER = { username: 'admin', password: 'admin', name: 'Admin' };

function getUsers() {
    const users = localStorage.getItem('psiclinic_users');
    if (!users) {
        return [DEFAULT_USER];
    }
    return JSON.parse(users);
}

function saveUsers(users) {
    localStorage.setItem('psiclinic_users', JSON.stringify(users));
}

// ========== CLINIC SETTINGS ==========
function getClinicSettings() {
    const settings = localStorage.getItem('psiclinic_settings');
    if (!settings) {
        return { name: 'Vanessa Samara Psicologa' };
    }
    return JSON.parse(settings);
}

function saveClinicSettingsData(settings) {
    localStorage.setItem('psiclinic_settings', JSON.stringify(settings));
    updateClinicBranding();
}

function updateClinicBranding() {
    const settings = getClinicSettings();
    const brandTexts = document.querySelectorAll('.brand-name, .sidebar-brand-text, title');
    brandTexts.forEach(el => {
        if (el.tagName === 'TITLE') {
            document.title = `${settings.name} - Gestão de Pacientes`;
        } else {
            el.textContent = settings.name;
        }
    });
    // Also update welcome message if exists
    const welcomeH3 = document.querySelector('.welcome-card h3');
    if (welcomeH3) welcomeH3.textContent = `Bem-vindo ao ${settings.name}`;
}

function getPatients() {
    const data = localStorage.getItem('psiclinic_patients');
    return data ? JSON.parse(data) : [];
}

function savePatients(patients) {
    localStorage.setItem('psiclinic_patients', JSON.stringify(patients));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ========== TAGS DATA STORE ==========
const TAG_COLORS = [
    '#7c3aed','#2563eb','#059669','#d97706','#dc2626',
    '#db2777','#0891b2','#65a30d','#ea580c','#9333ea',
    '#0f766e','#b45309','#be123c','#1d4ed8','#15803d'
];
let selectedTagColor = TAG_COLORS[0];
let currentPatientTags = []; // tag IDs for the patient being edited

function getTags() {
    const data = localStorage.getItem('psiclinic_tags');
    return data ? JSON.parse(data) : [];
}

function saveTags(tags) {
    localStorage.setItem('psiclinic_tags', JSON.stringify(tags));
}

function renderTagBadge(tag, removable = false, onRemove = null) {
    const hex = tag.color || '#7c3aed';
    // Derive a lighter bg from the hex
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const bg = `rgba(${r},${g},${b},0.15)`;
    const removeBtn = removable
        ? `<button type="button" class="tag-remove-btn" onclick="${onRemove}" title="Remover">×</button>`
        : '';
    return `<span class="tag-badge" style="background:${bg};color:${hex};border-color:${hex}40">${escapeHtml(tag.name)}${removeBtn}</span>`;
}

// ========== STATE ==========
let currentUser = null;
let editingPatientId = null;

// ========== DOM ELEMENTS ==========
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const pageTitle = document.getElementById('page-title');
const searchInput = document.getElementById('search-input');
const patientForm = document.getElementById('patient-form');

// ========== AUTH ==========
loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        currentUser = user;
        sessionStorage.setItem('psiclinic_session', JSON.stringify(user));
        loginError.classList.add('hidden');
        loginScreen.classList.remove('active');
        appScreen.classList.add('active');
        document.getElementById('logged-user').textContent = user.name;
        navigateTo('dashboard');
    } else {
        loginError.textContent = 'Usuário ou senha inválidos. Tente novamente.';
        loginError.classList.remove('hidden');
        shakeElement(loginError);
    }
});

logoutBtn.addEventListener('click', function () {
    currentUser = null;
    sessionStorage.removeItem('psiclinic_session');
    appScreen.classList.remove('active');
    loginScreen.classList.add('active');
    loginForm.reset();
    loginError.classList.add('hidden');
});

// Auto-login from session
(function checkSession() {
    const session = sessionStorage.getItem('psiclinic_session');
    if (session) {
        currentUser = JSON.parse(session);
        loginScreen.classList.remove('active');
        appScreen.classList.add('active');
        document.getElementById('logged-user').textContent = currentUser.name;
        navigateTo('dashboard');
    }
})();

// ========== NAVIGATION ==========
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target page
    const targetPage = document.getElementById('page-' + page);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'patients': 'Pacientes',
        'register': 'Novo Paciente',
        'view-patient': 'Detalhes do Paciente',
        'agenda': 'Agenda',
        'anamnese': 'Anamnese',
        'reports': 'Relatórios',
        'finance': 'Financeiro',
        'settings': 'Configurações'
    };
    pageTitle.textContent = titles[page] || 'Vanessa Samara Psicologa';

    // Trigger page-specific updates
    if (page === 'dashboard') updateDashboard();
    if (page === 'patients') renderPatientsTable();
    if (page === 'register' && !editingPatientId) {
        patientForm.reset();
        currentPatientTags = [];
        renderTagsSelected();
    }
    if (page === 'agenda') renderAgenda();
    if (page === 'anamnese') renderAnamnesePage();
    if (page === 'reports') renderReports();
    if (page === 'finance') renderFinance();
    if (page === 'settings') renderSettings();

    // Close sidebar on mobile
    sidebar.classList.remove('open');
}

// Nav button clicks
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        editingPatientId = null;
        navigateTo(item.dataset.page);
    });
});

// Mobile menu toggle
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Close sidebar on click outside (mobile)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// ========== DASHBOARD ==========
function updateDashboard() {
    const patients = getPatients();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const total = patients.length;
    const active = patients.filter(p => p.status === 'active').length;
    const inactive = patients.filter(p => p.status === 'inactive').length;
    const newThisMonth = patients.filter(p => {
        const reg = new Date(p.registeredAt);
        return reg.getMonth() === currentMonth && reg.getFullYear() === currentYear;
    }).length;

    animateCounter('stat-total', total);
    animateCounter('stat-new', newThisMonth);
    animateCounter('stat-active', active);
    animateCounter('stat-inactive', inactive);

    // Recent patients
    const recentList = document.getElementById('recent-patients-list');
    const recent = [...patients].sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)).slice(0, 5);

    if (recent.length === 0) {
        recentList.innerHTML = '<div class="empty-state-small"><p>Nenhum paciente cadastrado ainda.</p></div>';
    } else {
        recentList.innerHTML = recent.map(p => `
            <div class="recent-patient-item" onclick="viewPatient('${p.id}')">
                <div class="rpi-info">
                    <div class="rpi-avatar">${getInitials(p.name)}</div>
                    <div>
                        <div class="rpi-name">${escapeHtml(p.name)}</div>
                        <div class="rpi-date">${formatDate(p.registeredAt)}</div>
                    </div>
                </div>
                <span class="rpi-status ${p.status}">${p.status === 'active' ? 'Ativo' : 'Inativo'}</span>
            </div>
        `).join('');
    }
}

function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const duration = 500;
    const start = performance.now();

    function step(timestamp) {
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(current + (target - current) * eased);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ========== PATIENTS TABLE ==========
function renderPatientsTable(filter = '') {
    let patients = getPatients();
    const allTags = getTags();

    if (filter) {
        const f = filter.toLowerCase();
        patients = patients.filter(p => {
            const tagNames = (p.tags || []).map(tid => {
                const t = allTags.find(x => x.id === tid);
                return t ? t.name.toLowerCase() : '';
            }).join(' ');
            return p.name.toLowerCase().includes(f) ||
                p.cpf.includes(f) ||
                (p.email && p.email.toLowerCase().includes(f)) ||
                (p.phone && p.phone.includes(f)) ||
                tagNames.includes(f);
        });
    }

    const tbody = document.getElementById('patients-tbody');
    const emptyState = document.getElementById('patients-empty');
    const tableContainer = document.getElementById('patients-table-container');

    if (patients.length === 0) {
        tableContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        tableContainer.classList.remove('hidden');
        emptyState.classList.add('hidden');

        // Sort by registration date (newest first)
        patients.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

        tbody.innerHTML = patients.map(p => {
            const patientTags = (p.tags || []).map(tid => allTags.find(x => x.id === tid)).filter(Boolean);
            const tagsHtml = patientTags.length
                ? `<div class="table-tags">${patientTags.map(t => renderTagBadge(t)).join('')}</div>`
                : '\u2014';
            return `
            <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.cpf)}</td>
                <td>${escapeHtml(p.phone)}</td>
                <td>${tagsHtml}</td>
                <td><span class="status-badge ${p.status}">${p.status === 'active' ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon" onclick="viewPatient('${p.id}')" title="Ver detalhes">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="editPatient('${p.id}')" title="Editar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon danger" onclick="confirmDeletePatient('${p.id}')" title="Excluir">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }
}

// ========== SEARCH ==========
searchInput.addEventListener('input', function () {
    const query = this.value.trim();
    // Only filter if on patients page
    const patientsPage = document.getElementById('page-patients');
    if (patientsPage.classList.contains('active')) {
        renderPatientsTable(query);
    } else {
        // Navigate to patients page with filter
        navigateTo('patients');
        renderPatientsTable(query);
    }
});

// ========== PATIENT FORM ==========
// CPF mask
document.getElementById('patient-cpf').addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    this.value = v;
});

// Phone mask
document.getElementById('patient-phone').addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6) v = v.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/, '($1) $2');
    this.value = v;
});

// CEP mask
document.getElementById('patient-cep').addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) v = v.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    this.value = v;
});

patientForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const patient = {
        id: editingPatientId || generateId(),
        name: document.getElementById('patient-name').value.trim(),
        cpf: document.getElementById('patient-cpf').value.trim(),
        birth: document.getElementById('patient-birth').value,
        gender: document.getElementById('patient-gender').value,
        phone: document.getElementById('patient-phone').value.trim(),
        email: document.getElementById('patient-email').value.trim(),
        convenio: document.getElementById('patient-convenio').value,
        convenioOutros: document.getElementById('patient-convenio').value === 'outros'
            ? document.getElementById('patient-convenio-outros').value.trim()
            : '',
        address: document.getElementById('patient-address').value.trim(),
        city: document.getElementById('patient-city').value.trim(),
        state: document.getElementById('patient-state').value,
        cep: document.getElementById('patient-cep').value.trim(),
        notes: document.getElementById('patient-notes').value.trim(),
        tags: currentPatientTags.slice(),
        status: 'active',
        registeredAt: editingPatientId ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const patients = getPatients();

    if (editingPatientId) {
        const index = patients.findIndex(p => p.id === editingPatientId);
        if (index !== -1) {
            patient.registeredAt = patients[index].registeredAt;
            patient.status = patients[index].status;
            patients[index] = patient;
        }
        showToast('Paciente atualizado com sucesso!');
    } else {
        patients.push(patient);
        showToast('Paciente cadastrado com sucesso!');
    }

    savePatients(patients);
    editingPatientId = null;
    currentPatientTags = [];
    renderTagsSelected();
    patientForm.reset();
    navigateTo('patients');
});

// ========== PATIENT ACTIONS ==========
function viewPatient(id) {
    const patients = getPatients();
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    const container = document.getElementById('patient-view-container');
    const genderMap = {
        'feminino': 'Feminino',
        'masculino': 'Masculino',
        'outro': 'Outro',
        'prefiro-nao-dizer': 'Prefiro não dizer'
    };

    const allTags = getTags();
    const patientTags = (patient.tags || []).map(tid => allTags.find(x => x.id === tid)).filter(Boolean);
    const tagsViewHtml = patientTags.length
        ? `<div class="pv-tags">${patientTags.map(t => renderTagBadge(t)).join('')}</div>`
        : '';

    container.innerHTML = `
        <div class="patient-view-header">
            <div class="pv-avatar">${getInitials(patient.name)}</div>
            <div class="pv-info">
                <h2>${escapeHtml(patient.name)}</h2>
                <p>Cadastrado em ${formatDate(patient.registeredAt)}</p>
                ${tagsViewHtml}
            </div>
            <div class="pv-actions">
                <button class="btn btn-ghost btn-sm" onclick="togglePatientStatus('${patient.id}')">
                    ${patient.status === 'active' ? 'Desativar' : 'Ativar'}
                </button>
                <button class="btn btn-ghost btn-sm" onclick="viewPatientReport('${patient.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Relatório
                </button>
                <button class="btn btn-primary btn-sm" onclick="editPatient('${patient.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Editar
                </button>
            </div>
        </div>
        <div class="patient-detail-grid">
            <div class="detail-card">
                <h4>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Dados Pessoais
                </h4>
                <div class="detail-row">
                    <span class="detail-label">Nome</span>
                    <span class="detail-value">${escapeHtml(patient.name)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">CPF</span>
                    <span class="detail-value">${escapeHtml(patient.cpf)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Data de Nascimento</span>
                    <span class="detail-value">${patient.birth ? formatDateBR(patient.birth) : '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Gênero</span>
                    <span class="detail-value">${genderMap[patient.gender] || '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Convênio</span>
                    <span class="detail-value">${getConvenioLabel(patient) ? '<span class="convenio-badge">' + escapeHtml(getConvenioLabel(patient)) + '</span>' : '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value"><span class="status-badge ${patient.status}">${patient.status === 'active' ? 'Ativo' : 'Inativo'}</span></span>
                </div>
            </div>
            <div class="detail-card">
                <h4>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
                    </svg>
                    Contato
                </h4>
                <div class="detail-row">
                    <span class="detail-label">Telefone</span>
                    <span class="detail-value">${escapeHtml(patient.phone)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">E-mail</span>
                    <span class="detail-value">${patient.email || '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Endereço</span>
                    <span class="detail-value">${patient.address || '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cidade</span>
                    <span class="detail-value">${patient.city || '—'}${patient.state ? ' - ' + patient.state : ''}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">CEP</span>
                    <span class="detail-value">${patient.cep || '—'}</span>
                </div>
            </div>
            ${patient.notes ? `
            <div class="detail-card full-width">
                <h4>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                    </svg>
                    Observações
                </h4>
                <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(patient.notes)}</p>
            </div>
            ` : ''}
            
            <div class="detail-card full-width">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                    <h4>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        Anamnese
                    </h4>
                    <button class="btn btn-sm btn-ghost" onclick="viewPatientAnamnese('${patient.id}')">Editar Completa</button>
                </div>
                <div id="ana-preview-content">
                    ${patient.anamnese ? `
                        <div class="ana-preview-item">
                            <strong>Queixa Principal:</strong>
                            <p>${escapeHtml(patient.anamnese.queixa || 'Não informada')}</p>
                        </div>
                    ` : '<p class="text-muted">Nenhuma anamnese registrada.</p>'}
                </div>
            </div>
        </div>
    `;

    navigateTo('view-patient');
    pageTitle.textContent = 'Detalhes do Paciente';
}

function editPatient(id) {
    const patients = getPatients();
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    editingPatientId = id;

    document.getElementById('patient-name').value = patient.name || '';
    document.getElementById('patient-cpf').value = patient.cpf || '';
    document.getElementById('patient-birth').value = patient.birth || '';
    document.getElementById('patient-gender').value = patient.gender || '';
    document.getElementById('patient-phone').value = patient.phone || '';
    document.getElementById('patient-email').value = patient.email || '';
    document.getElementById('patient-convenio').value = patient.convenio || '';
    toggleConvenioOutros(patient.convenio || '');
    document.getElementById('patient-convenio-outros').value = patient.convenioOutros || '';
    document.getElementById('patient-address').value = patient.address || '';
    document.getElementById('patient-city').value = patient.city || '';
    document.getElementById('patient-state').value = patient.state || '';
    document.getElementById('patient-cep').value = patient.cep || '';
    document.getElementById('patient-notes').value = patient.notes || '';
    currentPatientTags = (patient.tags || []).slice();
    renderTagsSelected();

    navigateTo('register');
    pageTitle.textContent = 'Editar Paciente';
    document.getElementById('save-patient-btn').innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
        </svg>
        Atualizar Paciente
    `;
}

function confirmDeletePatient(id) {
    const modal = document.getElementById('confirm-modal');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    document.getElementById('modal-title').textContent = 'Excluir Paciente';
    document.getElementById('modal-message').textContent = 'Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.';

    modal.classList.remove('hidden');

    function onConfirm() {
        deletePatient(id);
        modal.classList.add('hidden');
        cleanup();
    }

    function onCancel() {
        modal.classList.add('hidden');
        cleanup();
    }

    function cleanup() {
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
    }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
}

function deletePatient(id) {
    let patients = getPatients();
    patients = patients.filter(p => p.id !== id);
    savePatients(patients);
    renderPatientsTable();
    showToast('Paciente excluído com sucesso!');
}

function togglePatientStatus(id) {
    const patients = getPatients();
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    patient.status = patient.status === 'active' ? 'inactive' : 'active';
    patient.updatedAt = new Date().toISOString();
    savePatients(patients);
    viewPatient(id);
    showToast(`Paciente ${patient.status === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
}

// ========== TAG MANAGER UI ==========

function openTagManager() {
    document.getElementById('tag-manager-modal').classList.remove('hidden');
    renderColorPalette();
    renderTagManagerList();
    // Reset create form
    document.getElementById('new-tag-name').value = '';
    updateTagColorPreview();
}

function closeTagManager() {
    document.getElementById('tag-manager-modal').classList.add('hidden');
    // Refresh picker if open
    renderTagsPickerList();
}

function renderColorPalette() {
    const palette = document.getElementById('color-palette');
    palette.innerHTML = TAG_COLORS.map(c => `
        <button type="button" class="color-swatch${c === selectedTagColor ? ' selected' : ''}" 
            style="background:${c}" onclick="selectTagColor('${c}')" title="${c}"></button>
    `).join('');
}

function selectTagColor(color) {
    selectedTagColor = color;
    renderColorPalette();
    updateTagColorPreview();
}

function updateTagColorPreview() {
    const name = document.getElementById('new-tag-name').value || 'Prévia';
    const preview = document.getElementById('tag-color-preview');
    const tag = { name, color: selectedTagColor };
    preview.innerHTML = renderTagBadge(tag);
}

function createTag() {
    const name = document.getElementById('new-tag-name').value.trim();
    if (!name) { showToast('Digite um nome para a tag!', true); return; }
    const tags = getTags();
    if (tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        showToast('Já existe uma tag com esse nome!', true); return;
    }
    tags.push({ id: generateId(), name, color: selectedTagColor });
    saveTags(tags);
    document.getElementById('new-tag-name').value = '';
    renderTagManagerList();
    showToast('Tag criada com sucesso!');
}

function deleteTag(id) {
    let tags = getTags().filter(t => t.id !== id);
    saveTags(tags);
    // Remove from all patients
    const patients = getPatients();
    patients.forEach(p => { p.tags = (p.tags || []).filter(tid => tid !== id); });
    savePatients(patients);
    // Remove from current editing
    currentPatientTags = currentPatientTags.filter(tid => tid !== id);
    renderTagsSelected();
    renderTagManagerList();
    showToast('Tag removida!');
}

function renderTagManagerList() {
    const tags = getTags();
    const list = document.getElementById('tag-manager-list');
    if (!tags.length) {
        list.innerHTML = '<p class="no-tags-msg">Nenhuma tag criada ainda.</p>';
        return;
    }
    list.innerHTML = tags.map(t => `
        <div class="tag-manager-item">
            ${renderTagBadge(t)}
            <button type="button" class="btn-icon danger" onclick="deleteTag('${t.id}')" title="Excluir tag">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        </div>
    `).join('');
}

// --- Tags Picker (in patient form) ---
function toggleTagsPicker() {
    const picker = document.getElementById('tags-picker');
    const isHidden = picker.classList.contains('hidden');
    if (isHidden) {
        renderTagsPickerList();
        picker.classList.remove('hidden');
    } else {
        picker.classList.add('hidden');
    }
}

function renderTagsPickerList() {
    const tags = getTags();
    const list = document.getElementById('tags-picker-list');
    if (!tags.length) {
        list.innerHTML = '<p class="no-tags-msg" style="padding:0.75rem">Nenhuma tag. Clique em "Gerenciar Tags" para criar.</p>';
        return;
    }
    list.innerHTML = tags.map(t => {
        const selected = currentPatientTags.includes(t.id);
        return `<div class="picker-tag-item${selected ? ' selected' : ''}" onclick="togglePatientTag('${t.id}')">
            ${renderTagBadge(t)}
            ${selected ? '<span class="picker-check">✓</span>' : ''}
        </div>`;
    }).join('');
}

function togglePatientTag(tagId) {
    const idx = currentPatientTags.indexOf(tagId);
    if (idx === -1) currentPatientTags.push(tagId);
    else currentPatientTags.splice(idx, 1);
    renderTagsSelected();
    renderTagsPickerList();
}

function removePatientTag(tagId) {
    currentPatientTags = currentPatientTags.filter(id => id !== tagId);
    renderTagsSelected();
    renderTagsPickerList();
}

function renderTagsSelected() {
    const allTags = getTags();
    const container = document.getElementById('tags-selected');
    if (!container) return;
    const selected = currentPatientTags.map(id => allTags.find(t => t.id === id)).filter(Boolean);
    if (!selected.length) {
        container.innerHTML = '<span class="no-tags-placeholder">Nenhuma tag selecionada</span>';
        return;
    }
    container.innerHTML = selected.map(t =>
        renderTagBadge(t, true, `removePatientTag('${t.id}')`)
    ).join('');
}

// Close picker when clicking outside
document.addEventListener('click', (e) => {
    const picker = document.getElementById('tags-picker');
    const btn = document.getElementById('tags-picker-btn');
    if (picker && !picker.classList.contains('hidden')) {
        if (!picker.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            picker.classList.add('hidden');
        }
    }
});

// Update preview while typing tag name
document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'new-tag-name') updateTagColorPreview();
});

// Close tag manager on overlay click
document.getElementById('tag-manager-modal').addEventListener('click', function(e) {
    if (e.target === this) closeTagManager();
});



// ========== UTILITIES ==========
function toggleConvenioOutros(value) {
    const group = document.getElementById('convenio-outros-group');
    if (group) {
        group.style.display = value === 'outros' ? '' : 'none';
        if (value !== 'outros') {
            document.getElementById('patient-convenio-outros').value = '';
        }
    }
}

const CONVENIO_LABELS = {
    'cliklife': 'ClikLife',
    'hapvida': 'Hapvida',
    'unimed': 'Unimed',
    'particular': 'Particular',
    'outros': 'Outros'
};

function getConvenioLabel(patient) {
    if (!patient.convenio) return '';
    if (patient.convenio === 'outros') return patient.convenioOutros || 'Outros';
    return CONVENIO_LABELS[patient.convenio] || patient.convenio;
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).filter((_, i, arr) => i === 0 || i === arr.length - 1).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateBR(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toast.classList.remove('hidden', 'error', 'hiding');
    if (isError) toast.classList.add('error');

    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // trigger reflow
    el.style.animation = 'shake 0.4s ease';
}

// Shake animation (injected via JS)
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
    }
`;
document.head.appendChild(shakeStyle);

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', (e) => {
    // Ctrl+K = Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    // Escape = Close modal
    if (e.key === 'Escape') {
        document.getElementById('confirm-modal').classList.add('hidden');
        sidebar.classList.remove('open');
    }
});

// Close modal on overlay click
document.getElementById('confirm-modal').addEventListener('click', function (e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});

// ========== AGENDA MODULE ==========
// Escape key also closes appointment modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('appointment-modal').classList.add('hidden');
    }
});

// --- Data ---
function getAppointments() {
    const data = localStorage.getItem('psiclinic_appointments');
    return data ? JSON.parse(data) : [];
}
function saveAppointments(appts) {
    localStorage.setItem('psiclinic_appointments', JSON.stringify(appts));
}

// --- State ---
let agendaCurrentDate = new Date();
let agendaView = 'day'; // 'day' | 'week' | 'month'
let editingApptId = null;

// --- Helpers ---
function toYMD(date) {
    return date.toISOString().slice(0, 10);
}
function startOfWeek(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
}
const DAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const APPT_STATUS_LABELS = {
    scheduled: 'Agendado',
    completed: 'Realizado',
    absent: 'Faltou',
    cancelled: 'Cancelado'
};
const APPT_TYPE_LABELS = {
    consulta: 'Consulta',
    retorno: 'Retorno',
    avaliacao: 'Avaliação',
    outro: 'Outro'
};

// --- Main render dispatcher ---
function renderAgenda() {
    updateAgendaPeriodTitle();
    document.querySelectorAll('.agenda-view-panel').forEach(p => p.classList.remove('active'));
    if (agendaView === 'day') {
        document.getElementById('agenda-day-view').classList.add('active');
        renderDayView();
    } else if (agendaView === 'week') {
        document.getElementById('agenda-week-view').classList.add('active');
        renderWeekView();
    } else {
        document.getElementById('agenda-month-view').classList.add('active');
        renderMonthView();
    }
}

function updateAgendaPeriodTitle() {
    const el = document.getElementById('agenda-period-title');
    if (agendaView === 'day') {
        el.textContent = `${DAYS_PT[agendaCurrentDate.getDay()]}, ${agendaCurrentDate.getDate()} de ${MONTHS_PT[agendaCurrentDate.getMonth()]} ${agendaCurrentDate.getFullYear()}`;
    } else if (agendaView === 'week') {
        const start = startOfWeek(agendaCurrentDate);
        const end = new Date(start); end.setDate(end.getDate() + 6);
        el.textContent = `${start.getDate()} – ${end.getDate()} de ${MONTHS_PT[start.getMonth()]} ${start.getFullYear()}`;
    } else {
        el.textContent = `${MONTHS_PT[agendaCurrentDate.getMonth()]} ${agendaCurrentDate.getFullYear()}`;
    }
}

// --- Day View ---
function renderDayView() {
    const ymd = toYMD(agendaCurrentDate);
    const appts = getAppointments().filter(a => a.date === ymd).sort((a, b) => a.time.localeCompare(b.time));
    const timeline = document.getElementById('day-timeline');
    const label = document.getElementById('day-view-date-label');

    const isToday = ymd === toYMD(new Date());
    label.innerHTML = `
        <span class="day-view-day${isToday ? ' today' : ''}">${agendaCurrentDate.getDate()}</span>
        <span class="day-view-weekday">${DAYS_PT[agendaCurrentDate.getDay()]}</span>
        ${isToday ? '<span class="today-badge">Hoje</span>' : ''}
    `;

    // Hours 7–21
    const hours = [];
    for (let h = 7; h <= 21; h++) {
        const hStr = String(h).padStart(2, '0') + ':00';
        const hAppts = appts.filter(a => a.time >= hStr && a.time < String(h + 1).padStart(2, '0') + ':00');
        hours.push(`
            <div class="timeline-row">
                <div class="timeline-hour">${hStr}</div>
                <div class="timeline-slot">
                    ${hAppts.map(a => apptCard(a)).join('')}
                </div>
            </div>
        `);
    }
    // Appts outside 7-21
    const otherAppts = appts.filter(a => a.time < '07:00' || a.time >= '22:00');
    if (otherAppts.length) hours.push(`<div class="timeline-row"><div class="timeline-hour">Outros</div><div class="timeline-slot">${otherAppts.map(a => apptCard(a)).join('')}</div></div>`);

    if (appts.length === 0) {
        timeline.innerHTML = `<div class="agenda-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg><p>Nenhuma consulta neste dia.</p><button class="btn btn-primary btn-sm" onclick="openApptModal()">+ Agendar</button></div>`;
    } else {
        timeline.innerHTML = hours.join('');
    }
}

// --- Week View ---
function renderWeekView() {
    const start = startOfWeek(agendaCurrentDate);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    const allAppts = getAppointments();
    const todayYMD = toYMD(new Date());
    const grid = document.getElementById('week-grid');

    grid.innerHTML = days.map(day => {
        const ymd = toYMD(day);
        const dayAppts = allAppts.filter(a => a.date === ymd).sort((a, b) => a.time.localeCompare(b.time));
        const isToday = ymd === todayYMD;
        return `
            <div class="week-col${isToday ? ' week-col-today' : ''}">
                <div class="week-col-header">
                    <span class="week-col-day">${DAYS_PT[day.getDay()].slice(0, 3)}</span>
                    <span class="week-col-num${isToday ? ' today' : ''}" onclick="agendaCurrentDate=new Date('${ymd}');agendaView='day';document.querySelectorAll('.agenda-view-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='day'));renderAgenda()">${day.getDate()}</span>
                </div>
                <div class="week-col-events">
                    ${dayAppts.length ? dayAppts.map(a => apptCardCompact(a)).join('') : '<div class="week-empty-slot" onclick="agendaCurrentDate=new Date(\''+ymd+'\');openApptModal()">+</div>'}
                </div>
            </div>
        `;
    }).join('');
}

// --- Month View ---
function renderMonthView() {
    const year = agendaCurrentDate.getFullYear();
    const month = agendaCurrentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const allAppts = getAppointments();
    const todayYMD = toYMD(new Date());
    const grid = document.getElementById('month-grid');

    let cells = '';
    // Padding
    for (let i = 0; i < startPad; i++) cells += '<div class="month-cell month-cell-empty"></div>';
    // Days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const ymd = toYMD(date);
        const dayAppts = allAppts.filter(a => a.date === ymd);
        const isToday = ymd === todayYMD;
        const hasAbsent = dayAppts.some(a => a.status === 'absent');
        const hasCompleted = dayAppts.some(a => a.status === 'completed');
        cells += `
            <div class="month-cell${isToday ? ' month-cell-today' : ''}" onclick="agendaCurrentDate=new Date('${ymd}');agendaView='day';document.querySelectorAll('.agenda-view-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='day'));renderAgenda()">
                <span class="month-day-num">${d}</span>
                ${dayAppts.length ? `<div class="month-appt-dots">
                    ${dayAppts.slice(0, 3).map(a => `<span class="month-dot month-dot-${a.status}"></span>`).join('')}
                    ${dayAppts.length > 3 ? `<span class="month-more">+${dayAppts.length - 3}</span>` : ''}
                </div>
                <div class="month-appt-count">${dayAppts.length} consulta${dayAppts.length !== 1 ? 's' : ''}</div>` : ''}
            </div>
        `;
    }
    grid.innerHTML = cells;
}

// --- Appointment Card HTML ---
const PAGAMENTO_LABELS = {
    pendente: 'Pendente',
    pago: 'Pago',
    cortesia: 'Cortesia',
    convenio: 'Convênio'
};

function payBadge(a) {
    if (!a.valor && !a.pagamento) return '';
    const label = PAGAMENTO_LABELS[a.pagamento] || a.pagamento || 'Pendente';
    const cls = a.pagamento === 'pago' ? 'pay-pago' : a.pagamento === 'cortesia' ? 'pay-cortesia' : a.pagamento === 'convenio' ? 'pay-convenio' : 'pay-pendente';
    const valor = a.valor ? ` · R$ ${parseFloat(a.valor).toFixed(2).replace('.', ',')}` : '';
    return `<span class="pay-badge ${cls}">${label}${valor}</span>`;
}

function apptCard(a) {
    const statusClass = `appt-${a.status}`;
    return `
        <div class="appt-card ${statusClass}" onclick="openApptModal('${a.id}')">
            <div class="appt-card-top">
                <span class="appt-time">${a.time}</span>
                <span class="appt-status-badge appt-status-${a.status}">${APPT_STATUS_LABELS[a.status] || a.status}</span>
            </div>
            <div class="appt-patient">${escapeHtml(a.patientName)}</div>
            <div class="appt-meta">${APPT_TYPE_LABELS[a.type] || a.type} · ${a.duration} min</div>
            ${payBadge(a)}
            <div class="appt-presence-btns">
                <button class="appt-presence-btn ${a.status === 'completed' ? 'active-green' : ''}" onclick="event.stopPropagation();quickStatus('${a.id}','completed')" title="Presente">✓ Presente</button>
                <button class="appt-presence-btn absent ${a.status === 'absent' ? 'active-red' : ''}" onclick="event.stopPropagation();quickStatus('${a.id}','absent')" title="Faltou">✕ Faltou</button>
            </div>
        </div>
    `;
}

function apptCardCompact(a) {
    return `
        <div class="appt-card-compact appt-${a.status}" onclick="openApptModal('${a.id}')">
            <span class="appt-time">${a.time}</span>
            <span class="appt-name-short">${escapeHtml(a.patientName.split(' ')[0])}</span>
            <span class="appt-dot-mini appt-dot-${a.status}"></span>
        </div>
    `;
}

// --- Quick status change ---
function quickStatus(id, status) {
    const appts = getAppointments();
    const idx = appts.findIndex(a => a.id === id);
    if (idx === -1) return;
    appts[idx].status = appts[idx].status === status ? 'scheduled' : status;
    appts[idx].updatedAt = new Date().toISOString();
    saveAppointments(appts);
    renderAgenda();
    showToast(status === 'completed' ? 'Presença confirmada!' : 'Falta registrada!');
}

// --- Modal ---
function openApptModal(id = null) {
    editingApptId = id;
    const modal = document.getElementById('appointment-modal');
    const form = document.getElementById('appointment-form');
    const title = document.getElementById('appt-modal-title');
    const deleteBtn = document.getElementById('appt-delete-btn');

    // Populate patient select
    const patientSel = document.getElementById('appt-patient');
    patientSel.innerHTML = '<option value="">Selecione um paciente</option>' +
        getPatients().filter(p => p.status === 'active').map(p =>
            `<option value="${p.id}">${escapeHtml(p.name)}</option>`
        ).join('');

    if (id) {
        const appt = getAppointments().find(a => a.id === id);
        if (!appt) return;
        title.textContent = 'Editar Consulta';
        deleteBtn.classList.remove('hidden');
        patientSel.value = appt.patientId;
        document.getElementById('appt-type').value = appt.type;
        document.getElementById('appt-date').value = appt.date;
        document.getElementById('appt-time').value = appt.time;
        document.getElementById('appt-duration').value = appt.duration;
        document.getElementById('appt-status').value = appt.status;
        document.getElementById('appt-notes').value = appt.notes || '';
        document.getElementById('appt-valor').value = appt.valor || '';
        document.getElementById('appt-pagamento').value = appt.pagamento || 'pendente';
    } else {
        title.textContent = 'Nova Consulta';
        deleteBtn.classList.add('hidden');
        form.reset();
        // Pre-fill date with current agenda date
        document.getElementById('appt-date').value = toYMD(agendaCurrentDate);
        document.getElementById('appt-status').value = 'scheduled';
        document.getElementById('appt-duration').value = '50';
        document.getElementById('appt-valor').value = '';
        document.getElementById('appt-pagamento').value = 'pendente';
    }

    modal.classList.remove('hidden');
}

function closeApptModal() {
    document.getElementById('appointment-modal').classList.add('hidden');
    editingApptId = null;
}

// Save appointment
document.getElementById('appt-save-btn').addEventListener('click', () => {
    const patientId = document.getElementById('appt-patient').value;
    const date = document.getElementById('appt-date').value;
    const time = document.getElementById('appt-time').value;

    if (!patientId || !date || !time) {
        showToast('Preencha Paciente, Data e Horário!', true);
        return;
    }

    const patient = getPatients().find(p => p.id === patientId);
    const appts = getAppointments();
    const now = new Date().toISOString();

    const appt = {
        id: editingApptId || generateId(),
        patientId,
        patientName: patient ? patient.name : '',
        type: document.getElementById('appt-type').value,
        date,
        time,
        duration: parseInt(document.getElementById('appt-duration').value),
        status: document.getElementById('appt-status').value,
        notes: document.getElementById('appt-notes').value.trim(),
        valor: parseFloat(document.getElementById('appt-valor').value) || 0,
        pagamento: document.getElementById('appt-pagamento').value || 'pendente',
        createdAt: editingApptId ? undefined : now,
        updatedAt: now
    };

    if (editingApptId) {
        const idx = appts.findIndex(a => a.id === editingApptId);
        if (idx !== -1) { appt.createdAt = appts[idx].createdAt; appts[idx] = appt; }
        showToast('Consulta atualizada!');
    } else {
        appts.push(appt);
        showToast('Consulta agendada com sucesso!');
    }

    saveAppointments(appts);
    // Navigate agenda to that date
    agendaCurrentDate = new Date(date + 'T12:00:00');
    closeApptModal();
    renderAgenda();
});

// Delete appointment
document.getElementById('appt-delete-btn').addEventListener('click', () => {
    if (!editingApptId) return;
    let appts = getAppointments().filter(a => a.id !== editingApptId);
    saveAppointments(appts);
    closeApptModal();
    renderAgenda();
    showToast('Consulta removida.');
});

document.getElementById('appt-modal-cancel').addEventListener('click', closeApptModal);
document.getElementById('appt-modal-close').addEventListener('click', closeApptModal);
document.getElementById('appointment-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('appointment-modal')) closeApptModal();
});
document.getElementById('agenda-new-btn').addEventListener('click', () => openApptModal());

// --- Navigation controls ---
document.getElementById('agenda-prev').addEventListener('click', () => {
    if (agendaView === 'day') agendaCurrentDate.setDate(agendaCurrentDate.getDate() - 1);
    else if (agendaView === 'week') agendaCurrentDate.setDate(agendaCurrentDate.getDate() - 7);
    else { agendaCurrentDate.setMonth(agendaCurrentDate.getMonth() - 1); }
    agendaCurrentDate = new Date(agendaCurrentDate);
    renderAgenda();
});
document.getElementById('agenda-next').addEventListener('click', () => {
    if (agendaView === 'day') agendaCurrentDate.setDate(agendaCurrentDate.getDate() + 1);
    else if (agendaView === 'week') agendaCurrentDate.setDate(agendaCurrentDate.getDate() + 7);
    else { agendaCurrentDate.setMonth(agendaCurrentDate.getMonth() + 1); }
    agendaCurrentDate = new Date(agendaCurrentDate);
    renderAgenda();
});
document.getElementById('agenda-today').addEventListener('click', () => {
    agendaCurrentDate = new Date();
    renderAgenda();
});

// --- View tabs ---
document.querySelectorAll('.agenda-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.agenda-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        agendaView = btn.dataset.view;
        renderAgenda();
    });
});

// ========== REPORTS MODULE ==========
const RPT_STATUS_COLORS = {
    scheduled: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
    completed:  { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80' },
    absent:     { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
    cancelled:  { bg: 'rgba(239,68,68,0.12)',  color: '#f87171' }
};

function renderReports() {
    const appts      = getAppointments();
    const patients   = getPatients();

    const filterName     = (document.getElementById('rpt-patient')?.value || '').toLowerCase().trim();
    const filterConvenio = document.getElementById('rpt-convenio')?.value || '';
    const filterStatus   = document.getElementById('rpt-status')?.value   || '';
    const filterFrom     = document.getElementById('rpt-date-from')?.value || '';
    const filterTo       = document.getElementById('rpt-date-to')?.value   || '';
    const filterPag      = document.getElementById('rpt-pagamento')?.value || '';

    // Build enriched session list
    let sessions = appts.map(a => {
        const pat = patients.find(p => p.id === a.patientId);
        return { ...a, patient: pat || null };
    });

    // Apply filters
    if (filterName)     sessions = sessions.filter(s => s.patientName.toLowerCase().includes(filterName));
    if (filterConvenio) sessions = sessions.filter(s => s.patient && s.patient.convenio === filterConvenio);
    if (filterStatus)   sessions = sessions.filter(s => s.status === filterStatus);
    if (filterFrom)     sessions = sessions.filter(s => s.date >= filterFrom);
    if (filterTo)       sessions = sessions.filter(s => s.date <= filterTo);
    if (filterPag)      sessions = sessions.filter(s => (s.pagamento || 'pendente') === filterPag);

    // Sort by date desc
    sessions.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    // ---- Summary stats (sessions) ----
    const total     = sessions.length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const absent    = sessions.filter(s => s.status === 'absent').length;
    const cancelled = sessions.filter(s => s.status === 'cancelled').length;
    const scheduled = sessions.filter(s => s.status === 'scheduled').length;

    // ---- Financial summary ----
    const fmt = v => 'R$\u00a0' + v.toFixed(2).replace('.', ',');
    const receitaTotal = sessions.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
    const receitaPago  = sessions.filter(s => s.pagamento === 'pago').reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
    const receitaPend  = sessions.filter(s => !s.pagamento || s.pagamento === 'pendente').reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);

    const statsEl = document.getElementById('report-stats');
    statsEl.innerHTML = [
        { label: 'Total de Sess\u00f5es', value: total,          color: 'purple', money: false },
        { label: 'Realizadas',           value: completed,      color: 'green',  money: false },
        { label: 'Faltas',               value: absent,         color: 'amber',  money: false },
        { label: 'Canceladas',           value: cancelled,      color: 'red',    money: false },
        { label: 'Agendadas',            value: scheduled,      color: 'blue',   money: false },
        { label: 'Receita Total',        value: fmt(receitaTotal), color: 'teal', money: true },
        { label: 'Pago',                 value: fmt(receitaPago),  color: 'green', money: true },
        { label: 'Pendente',             value: fmt(receitaPend),  color: 'amber', money: true }
    ].map(s => `
        <div class="rpt-stat-card rpt-stat-${s.color}">
            <span class="rpt-stat-value${s.money ? ' rpt-money' : ''}">${s.value}</span>
            <span class="rpt-stat-label">${s.label}</span>
        </div>
    `).join('');

    // ---- Table ----
    const tbody   = document.getElementById('report-tbody');
    const empty   = document.getElementById('report-empty');
    const tblWrap = document.getElementById('report-table-container');
    const countEl = document.getElementById('report-count');

    countEl.textContent = `${total} registro${total !== 1 ? 's' : ''}`;

    if (total === 0) {
        tblWrap.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    tblWrap.classList.remove('hidden');
    empty.classList.add('hidden');

    tbody.innerHTML = sessions.map(s => {
        const convenioLabel = s.patient ? getConvenioLabel(s.patient) : '\u2014';
        const sc  = RPT_STATUS_COLORS[s.status] || {};
        const statusBadge = `<span style="display:inline-flex;padding:0.2rem 0.6rem;border-radius:999px;font-size:0.75rem;font-weight:600;background:${sc.bg||'rgba(100,100,100,0.1)'};color:${sc.color||'#aaa'}">${APPT_STATUS_LABELS[s.status] || s.status}</span>`;
        const pagLabel = PAGAMENTO_LABELS[s.pagamento] || 'Pendente';
        const pagCls   = s.pagamento === 'pago' ? 'pay-pago' : s.pagamento === 'cortesia' ? 'pay-cortesia' : s.pagamento === 'convenio' ? 'pay-convenio' : 'pay-pendente';
        const pagBadge = `<span class="pay-badge ${pagCls}">${pagLabel}</span>`;
        const valorFmt = s.valor ? fmt(parseFloat(s.valor)) : '\u2014';
        return `
        <tr>
            <td><strong>${escapeHtml(s.patientName)}</strong></td>
            <td>${convenioLabel ? `<span class="convenio-badge">${escapeHtml(convenioLabel)}</span>` : '\u2014'}</td>
            <td>${formatDateBR(s.date)}</td>
            <td>${s.time}</td>
            <td>${APPT_TYPE_LABELS[s.type] || s.type}</td>
            <td>${s.duration} min</td>
            <td style="font-weight:600">${valorFmt}</td>
            <td>${pagBadge}</td>
            <td>${statusBadge}</td>
        </tr>`;
    }).join('');
}

function clearReportFilters() {
    ['rpt-patient','rpt-convenio','rpt-status','rpt-date-from','rpt-date-to','rpt-pagamento'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    renderReports();
}

// Shortcut from patient detail view → reports pre-filtered by patient name
function viewPatientReport(patientId) {
    const patients = getPatients();
    const patient  = patients.find(p => p.id === patientId);
    if (!patient) return;
    navigateTo('reports');
    const nameEl = document.getElementById('rpt-patient');
    if (nameEl) { nameEl.value = patient.name; }
    renderReports();
}

function printReport() {
    window.print();
}

// ========== FINANCE MODULE ==========
function renderFinance() {
    const appts = getAppointments();
    const fmt = v => 'R$\u00a0' + (v || 0).toFixed(2).replace('.', ',');

    // Financial totals
    const totalEarnings = appts.reduce((acc, a) => acc + (parseFloat(a.valor) || 0), 0);
    const paidEarnings = appts.filter(a => a.pagamento === 'pago').reduce((acc, a) => acc + (parseFloat(a.valor) || 0), 0);
    const pendingEarnings = appts.filter(a => !a.pagamento || a.pagamento === 'pendente').reduce((acc, a) => acc + (parseFloat(a.valor) || 0), 0);

    const summaryEl = document.getElementById('finance-summary');
    summaryEl.innerHTML = `
        <div class="finance-stat-item">
            <span class="finance-stat-label">Receita Total</span>
            <span class="finance-stat-value">${fmt(totalEarnings)}</span>
        </div>
        <div class="finance-stat-item green">
            <span class="finance-stat-label">Total Recebido</span>
            <span class="finance-stat-value">${fmt(paidEarnings)}</span>
        </div>
        <div class="finance-stat-item amber">
            <span class="finance-stat-label">Pendente</span>
            <span class="finance-stat-value">${fmt(pendingEarnings)}</span>
        </div>
    `;

    // Recent transactions table
    const tbody = document.getElementById('finance-tbody');
    // Sort all by date desc
    const sorted = [...appts].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const recent = sorted.slice(0, 20); // Show last 20

    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted)">Nenhuma transação encontrada</td></tr>';
        return;
    }

    tbody.innerHTML = recent.map(a => {
        const pagLabel = PAGAMENTO_LABELS[a.pagamento] || 'Pendente';
        const isPaid = a.pagamento === 'pago';
        const pagCls = isPaid ? 'pay-pago' : a.pagamento === 'cortesia' ? 'pay-cortesia' : a.pagamento === 'convenio' ? 'pay-convenio' : 'pay-pendente';
        
        const actionBtn = !isPaid 
            ? `<button class="btn btn-primary btn-xs" onclick="markAsPaid('${a.id}')" title="Marcar como pago">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20,6 9,17 4,12"/>
                </svg>
                Receber
               </button>` 
            : '<span class="text-muted" style="font-size:0.75rem">Confirmado</span>';

        return `
            <tr>
                <td>${formatDateBR(a.date)}</td>
                <td><strong>${escapeHtml(a.patientName)}</strong></td>
                <td style="font-weight:600">${fmt(parseFloat(a.valor))}</td>
                <td><span class="pay-badge ${pagCls}">${pagLabel}</span></td>
                <td style="text-align:right">${actionBtn}</td>
            </tr>
        `;
    }).join('');
}

function markAsPaid(apptId) {
    const appts = getAppointments();
    const idx = appts.findIndex(a => a.id === apptId);
    if (idx === -1) return;

    appts[idx].pagamento = 'pago';
    appts[idx].updatedAt = new Date().toISOString();
    saveAppointments(appts);
    renderFinance();
    showToast('Pagamento recebido com sucesso!');
}

// ========== SETTINGS MODULE ==========
function renderSettings() {
    const settings = getClinicSettings();
    document.getElementById('cfg-clinic-name').value = settings.name;
    renderUsersList();
}

function saveClinicSettings() {
    const name = document.getElementById('cfg-clinic-name').value.trim();
    if (!name) return showToast('O nome da clínica não pode ser vazio!', true);
    
    saveClinicSettingsData({ name });
    showToast('Configurações da clínica salvas!');
}

function renderUsersList() {
    const users = getUsers();
    const tbody = document.getElementById('users-tbody');
    
    tbody.innerHTML = users.map(u => `
        <tr>
            <td><strong>${escapeHtml(u.name)}</strong></td>
            <td>${escapeHtml(u.username)}</td>
            <td style="text-align:right">
                ${u.username !== 'admin' ? `
                <button class="btn btn-icon danger" onclick="deleteUser('${u.username}')" title="Excluir Usuário">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>` : '<span class="text-muted" style="font-size:0.75rem">Sistema</span>'}
            </td>
        </tr>
    `).join('');
}

function openAddUserModal() {
    document.getElementById('user-form').reset();
    document.getElementById('user-modal').classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

function saveUser() {
    const name = document.getElementById('usr-name').value.trim();
    const username = document.getElementById('usr-username').value.trim();
    const password = document.getElementById('usr-password').value.trim();

    if (!name || !username || !password) {
        return showToast('Preencha todos os campos!', true);
    }

    const users = getUsers();
    if (users.find(u => u.username === username)) {
        return showToast('Este nome de usuário já existe!', true);
    }

    users.push({ name, username, password });
    saveUsers(users);
    renderUsersList();
    closeUserModal();
    showToast('Usuário criado com sucesso!');
}

function deleteUser(username) {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) return;
    
    let users = getUsers();
    users = users.filter(u => u.username !== username);
    saveUsers(users);
    renderUsersList();
    showToast('Usuário excluído!');
}

// ========== ANAMNESE MODULE ==========
function renderAnamnesePage() {
    const patients = getPatients().filter(p => p.status === 'active');
    const select = document.getElementById('ana-patient-select');
    const currentVal = select.value;
    
    select.innerHTML = '<option value="">Selecione um paciente...</option>' +
        patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    
    if (currentVal) select.value = currentVal;
}

function loadAnamneseForPatient(patientId) {
    const container = document.getElementById('anamnese-form-container');
    const emptyState = document.getElementById('anamnese-no-patient');
    const form = document.getElementById('anamnese-form');

    if (!patientId) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');
    emptyState.classList.add('hidden');
    form.reset();

    const patient = getPatients().find(p => p.id === patientId);
    if (patient && patient.anamnese) {
        const a = patient.anamnese;
        document.getElementById('ana-queixa').value = a.queixa || '';
        document.getElementById('ana-familia').value = a.familia || '';
        document.getElementById('ana-doencas-fam').value = a.doencasFam || '';
        document.getElementById('ana-tratamentos').value = a.tratamentos || '';
        document.getElementById('ana-medicacoes').value = a.medicacoes || '';
        document.getElementById('ana-social').value = a.social || '';
        document.getElementById('ana-obs').value = a.obs || '';
    }
}

function saveAnamnese() {
    const patientId = document.getElementById('ana-patient-select').value;
    if (!patientId) return;

    const anamnese = {
        queixa: document.getElementById('ana-queixa').value.trim(),
        familia: document.getElementById('ana-familia').value.trim(),
        doencasFam: document.getElementById('ana-doencas-fam').value.trim(),
        tratamentos: document.getElementById('ana-tratamentos').value.trim(),
        medicacoes: document.getElementById('ana-medicacoes').value.trim(),
        social: document.getElementById('ana-social').value.trim(),
        obs: document.getElementById('ana-obs').value.trim(),
        updatedAt: new Date().toISOString()
    };

    const patients = getPatients();
    const idx = patients.findIndex(p => p.id === patientId);
    if (idx !== -1) {
        patients[idx].anamnese = anamnese;
        savePatients(patients);
        showToast('Anamnese salva com sucesso!');
    }
}

function viewPatientAnamnese(patientId) {
    navigateTo('anamnese');
    document.getElementById('ana-patient-select').value = patientId;
    loadAnamneseForPatient(patientId);
}

function printAnamnese() {
    const patientId = document.getElementById('ana-patient-select').value;
    if (!patientId) return;
    window.print();
}

// Initialize branding
document.addEventListener('DOMContentLoaded', updateClinicBranding);



