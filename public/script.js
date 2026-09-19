// ==========================================
// 1. CONFIGURATION SUPABASE
// ==========================================
const SUPABASE_URL = 'https://iyxurkbceiirjdigcyak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s';

let supabaseClient;

try {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (err) {
  console.error("Erreur d'initialisation Supabase :", err);
}

// Variables globales
let allPatients = [];
let allRendezvous = [];
let isLoginMode = true;

// Fonctions utilitaires
function calculerAge(dateNaissance) {
  if (!dateNaissance) return 'Non renseigné';
  const aujourdhui = new Date();
  const naissance = new Date(dateNaissance);
  let age = aujourdhui.getFullYear() - naissance.getFullYear();
  const m = aujourdhui.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && aujourdhui.getDate() < naissance.getDate())) {
    age--;
  }
  return isNaN(age) ? 'Non renseigné' : `${age} ans`;
}

// ==========================================
// 2. INITIALISATION AU DÉMARRAGE
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  setupAuth();
  setupNavigation();
  setupForms();

  if (!supabaseClient) return;

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      showApplication();
    }
  } catch (e) {
    console.error("Erreur de session :", e);
  }
});

// ==========================================
// 3. AUTHENTIFICATION
// ==========================================
function setupAuth() {
  const authForm = document.getElementById('auth-form');
  const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
  const authSubtitle = document.getElementById('auth-subtitle');
  const btnAuthSubmit = document.getElementById('btn-auth-submit');
  const btnLogout = document.getElementById('btn-logout');

  if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener('click', () => {
      isLoginMode = !isLoginMode;
      if (isLoginMode) {
        authSubtitle.innerText = 'Connectez-vous à votre espace';
        btnAuthSubmit.innerText = 'Se connecter';
        toggleAuthModeBtn.innerText = "Pas encore de compte ? S'inscrire";
      } else {
        authSubtitle.innerText = 'Créez votre compte praticien';
        btnAuthSubmit.innerText = "S'inscrire";
        toggleAuthModeBtn.innerText = 'Déjà un compte ? Se connecter';
      }
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value.trim();

      btnAuthSubmit.disabled = true;
      btnAuthSubmit.innerText = 'Veuillez patienter...';

      if (isLoginMode) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          alert('Erreur de connexion : ' + error.message);
        } else if (data.session) {
          showApplication();
        }
      } else {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
          alert("Erreur d'inscription : " + error.message);
        } else if (data.session) {
          showApplication();
        } else {
          alert("Compte créé ! Vous pouvez vous connecter.");
          isLoginMode = true;
          authSubtitle.innerText = 'Connectez-vous à votre espace';
          btnAuthSubmit.innerText = 'Se connecter';
          toggleAuthModeBtn.innerText = "Pas encore de compte ? S'inscrire";
        }
      }

      btnAuthSubmit.disabled = false;
      btnAuthSubmit.innerText = isLoginMode ? 'Se connecter' : "S'inscrire";
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (supabaseClient) await supabaseClient.auth.signOut();
      hideApplication();
    });
  }
}

function showApplication() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display = 'block';
  loadPatients();
  loadRendezvous();
}

function hideApplication() {
  document.getElementById('app-section').style.display = 'none';
  document.getElementById('auth-section').style.display = 'block';
  if (document.getElementById('auth-email')) document.getElementById('auth-email').value = '';
  if (document.getElementById('auth-password')) document.getElementById('auth-password').value = '';
}

// ==========================================
// 4. NAVIGATION INTERNE (SIDEBAR / ONGLETS)
// ==========================================
function setupNavigation() {
  const navDashboard = document.getElementById('nav-dashboard');
  const navPatients = document.getElementById('nav-patients');
  const navRendezvous = document.getElementById('nav-rendezvous');
  const navFinance = document.getElementById('nav-finance');

  const sections = {
    dashboard: document.getElementById('section-dashboard'),
    patients: document.getElementById('section-patients'),
    rendezvous: document.getElementById('section-rendezvous'),
    finance: document.getElementById('section-finance')
  };

  function switchSection(activeNav, activeSection) {
    [navDashboard, navPatients, navRendezvous, navFinance].forEach(nav => nav && nav.classList.remove('active'));
    Object.values(sections).forEach(sec => sec && (sec.style.display = 'none'));
    
    if (activeNav) activeNav.classList.add('active');
    if (activeSection) activeSection.style.display = 'block';
  }

  if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchSection(navDashboard, sections.dashboard); });
  if (navPatients) navPatients.addEventListener('click', (e) => { e.preventDefault(); switchSection(navPatients, sections.patients); });
  if (navRendezvous) navRendezvous.addEventListener('click', (e) => { e.preventDefault(); switchSection(navRendezvous, sections.rendezvous); });
  if (navFinance) navFinance.addEventListener('click', (e) => { e.preventDefault(); switchSection(navFinance, sections.finance); });
}

// ==========================================
// 5. FORMULAIRES
// ==========================================
function setupForms() {
  // Ajouter patient
  const addPatientForm = document.getElementById('add-patient-form');
  if (addPatientForm) {
    addPatientForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const patientData = {
        nom: document.getElementById('nom').value,
        prenom: document.getElementById('prenom').value,
        telephone: document.getElementById('telephone').value,
        email: document.getElementById('email').value,
        adresse: document.getElementById('adresse').value,
        date_naissance: document.getElementById('date_naissance')?.value || null
      };

      const { error } = await supabaseClient.from('patients').insert([patientData]);
      if (error) alert("Erreur : " + error.message);
      else {
        addPatientForm.reset();
        bootstrap.Modal.getInstance(document.getElementById('addPatientModal')).hide();
        loadPatients();
      }
    });
  }

  // Modifier patient
  const editPatientForm = document.getElementById('edit-patient-form');
  if (editPatientForm) {
    editPatientForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-patient-id').value;
      const patientData = {
        nom: document.getElementById('edit-nom').value,
        prenom: document.getElementById('edit-prenom').value,
        telephone: document.getElementById('edit-telephone').value,
        email: document.getElementById('edit-email').value,
        adresse: document.getElementById('edit-adresse').value,
        date_naissance: document.getElementById('edit-date-naissance')?.value || null
      };

      const { error } = await supabaseClient.from('patients').update(patientData).eq('id', id);
      if (error) alert("Erreur : " + error.message);
      else {
        bootstrap.Modal.getInstance(document.getElementById('editPatientModal')).hide();
        loadPatients();
      }
    });
  }

  // Ajouter RDV
  const addRdvForm = document.getElementById('add-rdv-form');
  if (addRdvForm) {
    addRdvForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rdvData = {
        patient_id: document.getElementById('rdv-patient-select').value,
        date_heure: document.getElementById('rdv-date').value,
        motif: document.getElementById('rdv-motif').value,
        tarif: parseFloat(document.getElementById('rdv-tarif')?.value || 0),
        mode_paiement: document.getElementById('rdv-paiement')?.value || 'Espèces',
        statut_paiement: document.getElementById('rdv-statut-paiement')?.value || 'Réglé',
        resume: document.getElementById('rdv-resume')?.value || '',
        statut: 'Planifié'
      };

      const { error } = await supabaseClient.from('rendezvous').insert([rdvData]);
      if (error) alert('Erreur : ' + error.message);
      else {
        addRdvForm.reset();
        bootstrap.Modal.getInstance(document.getElementById('addRendezvousModal')).hide();
        loadRendezvous();
      }
    });
  }

  // Recherche patient
  const searchInput = document.getElementById('searchPatient');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const search = e.target.value.toLowerCase();
      const filtered = allPatients.filter(p => 
        (p.nom && p.nom.toLowerCase().includes(search)) || 
        (p.prenom && p.prenom.toLowerCase().includes(search))
      );
      renderPatients(filtered);
    });
  }
}

// ==========================================
// 6. GESTION PATIENTS
// ==========================================
async function loadPatients() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('patients').select('*').order('nom');
  if (error) return console.error(error);
  allPatients = data || [];
  renderPatients(allPatients);
  updatePatientSelectOptions(allPatients);
  updateDashboard();
}

function renderPatients(patients) {
  const tbody = document.getElementById('patients-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  patients.forEach(patient => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${patient.nom || ''}</strong></td>
      <td>${patient.prenom || ''}</td>
      <td>${patient.telephone || '-'}</td>
      <td>${patient.email || '-'}</td>
      <td>${patient.adresse || '-'}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-info me-1" onclick="viewPatientDetails('${patient.id}')" title="Voir la fiche patient"><i class="bi bi-eye"></i></button>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditPatientModal('${patient.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePatient('${patient.id}')"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updatePatientSelectOptions(patients) {
  const select = document.getElementById('rdv-patient-select');
  if (!select) return;
  select.innerHTML = '<option value="">Choisir un patient...</option>';
  patients.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.nom} ${p.prenom}</option>`;
  });
}

// AFFICHAGE DE LA FICHE DETAIL PATIENT (MODAL)
window.viewPatientDetails = function(patientId) {
  const patient = allPatients.find(p => p.id === patientId);
  if (!patient) return;

  // Infos patient
  const elemNom = document.getElementById('detail-patient-nom');
  const elemDob = document.getElementById('detail-patient-dob');
  const elemAge = document.getElementById('detail-patient-age');
  const elemTel = document.getElementById('detail-patient-tel');
  const elemEmail = document.getElementById('detail-patient-email');

  if (elemNom) elemNom.innerText = `${patient.nom || ''} ${patient.prenom || ''}`;
  if (elemDob) elemDob.innerText = patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : 'Non renseignée';
  if (elemAge) elemAge.innerText = calculerAge(patient.date_naissance);
  if (elemTel) elemTel.innerText = patient.telephone || '-';
  if (elemEmail) elemEmail.innerText = patient.email || '-';

  // Séances du patient
  const patientRdvs = allRendezvous.filter(r => r.patient_id === patientId);
  const now = new Date();

  const upcoming = patientRdvs.filter(r => new Date(r.date_heure) >= now).sort((a,b) => new Date(a.date_heure) - new Date(b.date_heure));
  const history = patientRdvs.filter(r => new Date(r.date_heure) < now).sort((a,b) => new Date(b.date_heure) - new Date(a.date_heure));

  // Affichage Séances à venir
  const upcomingContainer = document.getElementById('detail-rdv-a-venir');
  if (upcomingContainer) {
    if (upcoming.length === 0) {
      upcomingContainer.innerHTML = '<p class="text-muted small">Aucune séance programmée.</p>';
    } else {
      upcomingContainer.innerHTML = upcoming.map(r => `
        <div class="card mb-2 border-start border-4 border-primary shadow-sm">
          <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-center">
              <strong><i class="bi bi-clock me-1"></i>${new Date(r.date_heure).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
              <span class="badge ${r.statut_paiement === 'Réglé' ? 'bg-success' : 'bg-warning text-dark'}">${r.statut_paiement || 'En attente'}</span>
            </div>
            <div class="small mt-1"><strong>Motif :</strong> ${r.motif || 'Non précisé'}</div>
            <div class="small"><strong>Montant :</strong> ${r.tarif || 0} € (${r.mode_paiement || 'N/C'})</div>
          </div>
        </div>
      `).join('');
    }
  }

  // Affichage Historique des séances passées
  const historyContainer = document.getElementById('detail-rdv-historique');
  if (historyContainer) {
    if (history.length === 0) {
      historyContainer.innerHTML = '<p class="text-muted small">Aucun historique de séance.</p>';
    } else {
      historyContainer.innerHTML = history.map(r => `
        <div class="card mb-2 border-start border-4 border-success shadow-sm">
          <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-center">
              <strong><i class="bi bi-calendar-check me-1"></i>${new Date(r.date_heure).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
              <span class="badge ${r.statut_paiement === 'Réglé' ? 'bg-success' : 'bg-danger'}">${r.statut_paiement || 'En attente'}</span>
            </div>
            <div class="small mt-1"><strong>Motif :</strong> ${r.motif || 'Non précisé'}</div>
            <div class="small"><strong>Montant :</strong> ${r.tarif || 0} €</div>
            ${r.resume ? `<div class="small text-dark mt-1 p-2 bg-light rounded border"><em><strong>Résumé :</strong> ${r.resume}</em></div>` : ''}
          </div>
        </div>
      `).join('');
    }
  }

  const modalEl = document.getElementById('patientDetailModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
};

window.openEditPatientModal = function(id) {
  const patient = allPatients.find(p => p.id === id);
  if (!patient) return;

  document.getElementById('edit-patient-id').value = patient.id;
  document.getElementById('edit-nom').value = patient.nom || '';
  document.getElementById('edit-prenom').value = patient.prenom || '';
  document.getElementById('edit-telephone').value = patient.telephone || '';
  document.getElementById('edit-email').value = patient.email || '';
  document.getElementById('edit-adresse').value = patient.adresse || '';
  if (document.getElementById('edit-date-naissance')) {
    document.getElementById('edit-date-naissance').value = patient.date_naissance || '';
  }

  const modal = new bootstrap.Modal(document.getElementById('editPatientModal'));
  modal.show();
};

window.deletePatient = async function(id) {
  if (confirm('Supprimer ce patient ?')) {
    const { error } = await supabaseClient.from('patients').delete().eq('id', id);
    if (error) alert('Erreur : ' + error.message);
    else loadPatients();
  }
};

// ==========================================
// 7. GESTION RENDEZ-VOUS & FINANCES
// ==========================================
async function loadRendezvous() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from('rendezvous')
    .select('*, patients(nom, prenom)')
    .order('date_heure', { ascending: false });

  if (error) return console.error(error);
  allRendezvous = data || [];

  renderUpcomingRendezvous(allRendezvous);
  renderRendezvous(allRendezvous);
  renderFinance(allRendezvous);
  updateDashboardStats(allRendezvous);
}

// AFFICHE LES PROCHAINS RDV DANS LE TABLEAU DE BORD (PAGE CENTRALE)
function renderUpcomingRendezvous(rdvList) {
  const tbody = document.getElementById('dashboard-upcoming-rdv-body');
  if (!tbody) return;

  const now = new Date();
  const upcoming = rdvList
    .filter(rdv => new Date(rdv.date_heure) >= now)
    .sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure))
    .slice(0, 8);

  if (upcoming.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Aucun rendez-vous à venir</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  upcoming.forEach(rdv => {
    const dateFormatted = new Date(rdv.date_heure).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const patientName = rdv.patients ? `${rdv.patients.nom} ${rdv.patients.prenom}` : 'Inconnu';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${patientName}</strong></td>
      <td><span class="badge bg-light text-dark border"><i class="bi bi-clock me-1"></i>${dateFormatted}</span></td>
      <td>${rdv.motif || '-'}</td>
      <td><strong>${rdv.tarif || 0} €</strong></td>
      <td><span class="badge ${rdv.statut_paiement === 'Réglé' ? 'bg-success' : 'bg-warning text-dark'}">${rdv.statut_paiement || 'En attente'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRendezvous(rdvList) {
  const tbody = document.getElementById('rdv-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  rdvList.forEach(rdv => {
    const dateFormatted = new Date(rdv.date_heure).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const patientName = rdv.patients ? `${rdv.patients.nom} ${rdv.patients.prenom}` : 'Inconnu';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${patientName}</strong></td>
      <td>${dateFormatted}</td>
      <td>${rdv.motif || '-'}</td>
      <td><strong>${rdv.tarif || 0} €</strong></td>
      <td><span class="badge ${rdv.statut_paiement === 'Réglé' ? 'bg-success' : 'bg-warning text-dark'}">${rdv.statut_paiement || 'En attente'}</span></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger" onclick="deleteRendezvous('${rdv.id}')"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderFinance(rdvList) {
  const tbody = document.getElementById('finance-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  rdvList.forEach(rdv => {
    const dateFormatted = new Date(rdv.date_heure).toLocaleDateString('fr-FR');
    const patientName = rdv.patients ? `${rdv.patients.nom} ${rdv.patients.prenom}` : 'Inconnu';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dateFormatted}</td>
      <td><strong>${patientName}</strong></td>
      <td>${rdv.motif || 'Consultation'}</td>
      <td><span class="badge bg-secondary">${rdv.mode_paiement || 'Espèces'}</span></td>
      <td><span class="badge ${rdv.statut_paiement === 'Réglé' ? 'bg-success' : 'bg-danger'}">${rdv.statut_paiement || 'En attente'}</span></td>
      <td><strong>${rdv.tarif || 0} €</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteRendezvous = async function(id) {
  if (confirm('Supprimer ce rendez-vous ?')) {
    const { error } = await supabaseClient.from('rendezvous').delete().eq('id', id);
    if (error) alert('Erreur : ' + error.message);
    else loadRendezvous();
  }
};

// ==========================================
// 8. DASHBOARD & STATS
// ==========================================
function updateDashboard() {
  const el = document.getElementById('stat-patients-count');
  if (el) el.innerText = allPatients.length;
}

function updateDashboardStats(rdvData) {
  const elRdv = document.getElementById('stat-rdv-count');
  if (elRdv) elRdv.innerText = rdvData.length;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().split('T')[0];

  const rdvToday = rdvData.filter(rdv => rdv.date_heure && rdv.date_heure.startsWith(todayStr));
  const elToday = document.getElementById('stat-rdv-today-count');
  if (elToday) elToday.innerText = rdvToday.length;

  const caMois = rdvData
    .filter(rdv => {
      const d = new Date(rdv.date_heure);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && rdv.statut_paiement === 'Réglé';
    })
    .reduce((sum, rdv) => sum + (parseFloat(rdv.tarif) || 0), 0);

  const elCaMois = document.getElementById('stat-ca-mois');
  if (elCaMois) elCaMois.innerText = caMois.toFixed(2) + ' €';

  const elCaFinance = document.getElementById('finance-total-mois');
  if (elCaFinance) elCaFinance.innerText = caMois.toFixed(2) + ' €';
}
