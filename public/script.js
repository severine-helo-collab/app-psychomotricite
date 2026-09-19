// ==========================================
// 1. CONFIGURATION SUPABASE
// ==========================================
// Remplacez ces valeurs par vos identifiants Supabase (Projet -> Settings -> API)
const SUPABASE_URL = 'https://iyxurkbceiirjdigcyak.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales d'état
let currentUser = null;
let isSignUpMode = false;
let patientsData = [];
let rdvData = [];

// ==========================================
// 2. INITIALISATION ET ÉVÉNEMENTS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  initEventListeners();
});

function initEventListeners() {
  // Bascule Mode Connexion / Inscription
  document.getElementById('toggle-auth-mode').addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    const btnSubmit = document.getElementById('btn-auth-submit');
    const subtitle = document.getElementById('auth-subtitle');
    const toggleBtn = document.getElementById('toggle-auth-mode');

    if (isSignUpMode) {
      btnSubmit.textContent = "S'inscrire";
      subtitle.textContent = "Créer un nouveau compte praticien";
      toggleBtn.textContent = "Déjà un compte ? Se connecter";
    } else {
      btnSubmit.textContent = "Se connecter";
      subtitle.textContent = "Connectez-vous à votre espace";
      toggleBtn.textContent = "Pas encore de compte ? S'inscrire";
    }
  });

  // Soumission Authentification
  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (isSignUpMode) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert("Erreur d'inscription : " + error.message);
      else alert("Compte créé avec succès ! Vous pouvez vous connecter.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Erreur de connexion : " + error.message);
      else checkSession();
    }
  });

  // Déconnexion
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    checkSession();
  });

  // Navigation
  document.getElementById('nav-dashboard').addEventListener('click', () => switchTab('dashboard'));
  document.getElementById('nav-patients').addEventListener('click', () => switchTab('patients'));
  document.getElementById('nav-rendezvous').addEventListener('click', () => switchTab('rendezvous'));
  document.getElementById('nav-finance').addEventListener('click', () => switchTab('finance'));

  // Raccourcis cartes tableau de bord
  document.getElementById('card-stat-patients').addEventListener('click', () => switchTab('patients'));
  document.getElementById('card-stat-rdv').addEventListener('click', () => switchTab('rendezvous'));
  document.getElementById('card-stat-finance').addEventListener('click', () => switchTab('finance'));

  // Recherche patient
  document.getElementById('searchPatient').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = patientsData.filter(p => 
      p.nom.toLowerCase().includes(term) || p.prenom.toLowerCase().includes(term)
    );
    renderPatientsTable(filtered);
  });

  // Formulaires Modals
  document.getElementById('add-patient-form').addEventListener('submit', handleAddPatient);
  document.getElementById('edit-patient-form').addEventListener('submit', handleEditPatient);
  document.getElementById('add-rdv-form').addEventListener('submit', handleAddRendezvous);
}

// ==========================================
// 3. GESTION DE LA SESSION & NAVIGATION
// ==========================================
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    await loadAllData();
    switchTab('dashboard');
  } else {
    currentUser = null;
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('app-section').style.display = 'none';
  }
}

function switchTab(tabName) {
  const tabs = ['dashboard', 'patients', 'rendezvous', 'finance'];
  tabs.forEach(tab => {
    document.getElementById(`section-${tab}`).style.display = (tab === tabName) ? 'block' : 'none';
    const navLink = document.getElementById(`nav-${tab}`);
    if (navLink) {
      if (tab === tabName) navLink.classList.add('active');
      else navLink.classList.remove('active');
    }
  });

  if (tabName === 'dashboard') updateDashboard();
}

// ==========================================
// 4. CHARGEMENT DES DONNÉES SUPABASE
// ==========================================
async function loadAllData() {
  await Promise.all([fetchPatients(), fetchRendezvous()]);
  populatePatientSelect();
  updateDashboard();
  renderFinanceTable();
}

async function fetchPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('nom', { ascending: true });

  if (error) console.error("Erreur chargement patients:", error);
  else {
    patientsData = data || [];
    renderPatientsTable(patientsData);
  }
}

async function fetchRendezvous() {
  const { data, error } = await supabase
    .from('rendezvous')
    .select('*, patients(nom, prenom)')
    .order('date_heure', { ascending: false });

  if (error) console.error("Erreur chargement RDV:", error);
  else {
    rdvData = data || [];
    renderRdvTable(rdvData);
  }
}

// ==========================================
// 5. AFFICHAGE ET LOGIQUE DES PATIENTS
// ==========================================
function renderPatientsTable(patients) {
  const tbody = document.getElementById('patients-table-body');
  if (patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Aucun patient trouvé.</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map(p => `
    <tr>
      <td class="fw-bold">${p.nom}</td>
      <td>${p.prenom}</td>
      <td>${p.telephone || '-'}</td>
      <td>${p.email || '-'}</td>
      <td><small class="text-muted">${p.adresse || '-'}</small></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-info me-1" onclick="openPatientDetail('${p.id}')" title="Voir la fiche"><i class="bi bi-eye"></i></button>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditPatientModal('${p.id}')" title="Modifier"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePatient('${p.id}')" title="Supprimer"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

async function handleAddPatient(e) {
  e.preventDefault();
  const newPatient = {
    user_id: currentUser.id,
    nom: document.getElementById('nom').value,
    prenom: document.getElementById('prenom').value,
    date_naissance: document.getElementById('date_naissance').value || null,
    telephone: document.getElementById('telephone').value || null,
    email: document.getElementById('email').value || null,
    adresse: document.getElementById('adresse').value || null
  };

  const { error } = await supabase.from('patients').insert([newPatient]);
  if (error) alert("Erreur lors de l'ajout : " + error.message);
  else {
    bootstrap.Modal.getInstance(document.getElementById('addPatientModal')).hide();
    document.getElementById('add-patient-form').reset();
    await loadAllData();
  }
}

function openEditPatientModal(patientId) {
  const p = patientsData.find(item => item.id === patientId);
  if (!p) return;

  document.getElementById('edit-patient-id').value = p.id;
  document.getElementById('edit-nom').value = p.nom;
  document.getElementById('edit-prenom').value = p.prenom;
  document.getElementById('edit-date-naissance').value = p.date_naissance || '';
  document.getElementById('edit-telephone').value = p.telephone || '';
  document.getElementById('edit-email').value = p.email || '';
  document.getElementById('edit-adresse').value = p.adresse || '';

  new bootstrap.Modal(document.getElementById('editPatientModal')).show();
}

async function handleEditPatient(e) {
  e.preventDefault();
  const id = document.getElementById('edit-patient-id').value;
  const updatedPatient = {
    nom: document.getElementById('edit-nom').value,
    prenom: document.getElementById('edit-prenom').value,
    date_naissance: document.getElementById('edit-date-naissance').value || null,
    telephone: document.getElementById('edit-telephone').value || null,
    email: document.getElementById('edit-email').value || null,
    adresse: document.getElementById('edit-adresse').value || null
  };

  const { error } = await supabase.from('patients').update(updatedPatient).eq('id', id);
  if (error) alert("Erreur de modification : " + error.message);
  else {
    bootstrap.Modal.getInstance(document.getElementById('editPatientModal')).hide();
    await loadAllData();
  }
}

async function deletePatient(id) {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce patient ? Tous ses RDV seront également supprimés.")) {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) alert("Erreur lors de la suppression : " + error.message);
    else await loadAllData();
  }
}

// ==========================================
// 6. FICHE DÉTAILLÉE DU PATIENT (MODAL OEIL)
// ==========================================
function openPatientDetail(patientId) {
  const patient = patientsData.find(p => p.id === patientId);
  if (!patient) return;

  // Information Personnelles
  document.getElementById('detail-patient-nom').textContent = `${patient.nom.toUpperCase()} ${patient.prenom}`;
  document.getElementById('detail-patient-tel').textContent = patient.telephone || 'Non renseigné';
  document.getElementById('detail-patient-email').textContent = patient.email || 'Non renseigné';
  
  if (patient.date_naissance) {
    const dob = new Date(patient.date_naissance);
    document.getElementById('detail-patient-dob').textContent = dob.toLocaleDateString('fr-FR');
    const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    document.getElementById('detail-patient-age').textContent = `${age} ans`;
  } else {
    document.getElementById('detail-patient-dob').textContent = 'Non renseignée';
    document.getElementById('detail-patient-age').textContent = '-';
  }

  // Filtrage des rendez-vous du patient
  const patientRdvs = rdvData.filter(r => r.patient_id === patientId);
  const now = new Date();

  // Bilan Financier individuel
  const nbSeances = patientRdvs.length;
  const totalGenere = patientRdvs.reduce((acc, r) => acc + (parseFloat(r.tarif) || 0), 0);
  const totalPaye = patientRdvs.filter(r => r.statut_paiement === 'Réglé').reduce((acc, r) => acc + (parseFloat(r.tarif) || 0), 0);
  const totalAttente = patientRdvs.filter(r => r.statut_paiement === 'En attente').reduce((acc, r) => acc + (parseFloat(r.tarif) || 0), 0);

  document.getElementById('detail-fin-nb-seances').textContent = nbSeances;
  document.getElementById('detail-fin-total-genere').textContent = `${totalGenere.toFixed(2)} €`;
  document.getElementById('detail-fin-total-paye').textContent = `${totalPaye.toFixed(2)} €`;
  document.getElementById('detail-fin-total-attente').textContent = `${totalAttente.toFixed(2)} €`;

  // Séances à venir vs Historique
  const upcoming = patientRdvs.filter(r => new Date(r.date_heure) >= now).sort((a,b) => new Date(a.date_heure) - new Date(b.date_heure));
  const history = patientRdvs.filter(r => new Date(r.date_heure) < now).sort((a,b) => new Date(b.date_heure) - new Date(a.date_heure));

  // Affichage séances à venir
  const upcomingDiv = document.getElementById('detail-rdv-a-venir');
  if (upcoming.length === 0) {
    upcomingDiv.innerHTML = '<p class="text-muted small">Aucune séance à venir.</p>';
  } else {
    upcomingDiv.innerHTML = upcoming.map(r => `
      <div class="p-2 mb-2 bg-white rounded border border-primary border-start-4 shadow-sm">
        <div class="fw-bold text-dark">${new Date(r.date_heure).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</div>
        <div class="small text-muted">${r.motif} - ${parseFloat(r.tarif).toFixed(2)} €</div>
      </div>
    `).join('');
  }

  // Affichage historique
  const historyDiv = document.getElementById('detail-rdv-historique');
  if (history.length === 0) {
    historyDiv.innerHTML = '<p class="text-muted small">Aucun historique disponible.</p>';
  } else {
    historyDiv.innerHTML = history.map(r => `
      <div class="p-2 mb-2 bg-light rounded border">
        <div class="d-flex justify-content-between">
          <span class="fw-bold small">${new Date(r.date_heure).toLocaleDateString('fr-FR')}</span>
          <span class="badge ${r.statut_paiement === 'Réglé' ? 'bg-success' : 'bg-warning text-dark'}">${r.statut_paiement}</span>
        </div>
        <div class="small text-dark fw-bold mt-1">${r.motif} (${parseFloat(r.tarif).toFixed(2)} €)</div>
        ${r.resume ? `<div class="extra-small text-muted fst-italic mt-1">${r.resume}</div>` : ''}
      </div>
    `).join('');
  }

  new bootstrap.Modal(document.getElementById('patientDetailModal')).show();
}

// ==========================================
// 7. GESTION DES RENDEZ-VOUS & SÉANCES
// ==========================================
function populatePatientSelect() {
  const select = document.getElementById('rdv-patient-select');
  select.innerHTML = '<option value="">-- Sélectionner un patient --</option>' + 
    patientsData.map(p => `<option value="${p.id}">${p.nom.toUpperCase()} ${p.prenom}</option>`).join('');
}

function renderRdvTable(rdvs) {
  const tbody = document.getElementById('rdv-table-body');
  if (rdvs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Aucun rendez-vous.</td></tr>';
    return;
  }

  tbody.innerHTML = rdvs.map(r => {
    const patientName = r.patients ? `${r.patients.nom.toUpperCase()} ${r.patients.prenom}` : 'Patient inconnu';
    const dateFormatted = new Date(r.date_heure).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    const isPaye = r.statut_paiement === 'Réglé';

    return `
      <tr>
        <td class="fw-bold">${patientName}</td>
        <td>${dateFormatted}</td>
        <td>${r.motif}</td>
        <td>${parseFloat(r.tarif).toFixed(2)} €</td>
        <td>
          <span class="badge ${isPaye ? 'bg-success' : 'bg-warning text-dark'}" style="cursor:pointer;" onclick="togglePaymentStatus('${r.id}', '${r.statut_paiement}')">
            ${r.statut_paiement} <i class="bi bi-arrow-repeat ms-1"></i>
          </span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" onclick="deleteRendezvous('${r.id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleAddRendezvous(e) {
  e.preventDefault();
  const newRdv = {
    user_id: currentUser.id,
    patient_id: document.getElementById('rdv-patient-select').value,
    date_heure: document.getElementById('rdv-date').value,
    motif: document.getElementById('rdv-motif').value,
    tarif: parseFloat(document.getElementById('rdv-tarif').value) || 0,
    mode_paiement: document.getElementById('rdv-paiement').value,
    statut_paiement: document.getElementById('rdv-statut-paiement').value,
    resume: document.getElementById('rdv-resume').value || null
  };

  const { error } = await supabase.from('rendezvous').insert([newRdv]);
  if (error) alert("Erreur lors de l'ajout du RDV : " + error.message);
  else {
    bootstrap.Modal.getInstance(document.getElementById('addRendezvousModal')).hide();
    document.getElementById('add-rdv-form').reset();
    await loadAllData();
  }
}

async function togglePaymentStatus(rdvId, currentStatus) {
  const newStatus = currentStatus === 'Réglé' ? 'En attente' : 'Réglé';
  const { error } = await supabase.from('rendezvous').update({ statut_paiement: newStatus }).eq('id', rdvId);
  if (error) alert("Erreur lors du changement de statut : " + error.message);
  else await loadAllData();
}

async function deleteRendezvous(id) {
  if (confirm("Supprimer ce rendez-vous ?")) {
    const { error } = await supabase.from('rendezvous').delete().eq('id', id);
    if (error) alert("Erreur de suppression : " + error.message);
    else await loadAllData();
  }
}

// ==========================================
// 8. TABLEAU DE BORD & COMPTABILITÉ
// ==========================================
function updateDashboard() {
  document.getElementById('stat-patients-count').textContent = patientsData.length;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const rdvToday = rdvData.filter(r => r.date_heure.startsWith(todayStr));
  document.getElementById('stat-rdv-today-count').textContent = rdvToday.length;
  document.getElementById('stat-rdv-count').textContent = rdvData.length;

  // Calcul CA du mois courant
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const caMois = rdvData.filter(r => {
    const d = new Date(r.date_heure);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && r.statut_paiement === 'Réglé';
  }).reduce((acc, r) => acc + (parseFloat(r.tarif) || 0), 0);

  document.getElementById('stat-ca-mois').textContent = `${caMois.toFixed(2)} €`;

  // Prochains RDV sur le tableau de bord
  const upcomingRdvs = rdvData
    .filter(r => new Date(r.date_heure) >= now)
    .sort((a,b) => new Date(a.date_heure) - new Date(b.date_heure))
    .slice(0, 5);

  const dashboardTable = document.getElementById('dashboard-upcoming-rdv-body');
  if (upcomingRdvs.length === 0) {
    dashboardTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Aucun rendez-vous à venir.</td></tr>';
  } else {
    dashboardTable.innerHTML = upcomingRdvs.map(r => {
      const pName = r.patients ? `${r.patients.nom.toUpperCase()} ${r.patients.prenom}` : 'Patient inconnu';
      return `
        <tr>
          <td class="fw-bold">${pName}</td>
          <td>${new Date(r.date_heure).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td>${r.motif}</td>
          <td>${parseFloat(r.tarif).toFixed(2)} €</td>
          <td><span class="badge ${r.statut_paiement === 'Réglé' ? 'bg-success' : 'bg-warning text-dark'}">${r.statut_paiement}</span></td>
        </tr>
      `;
    }).join('');
  }
}

function renderFinanceTable() {
  const tbody = document.getElementById('finance-table-body');
  if (rdvData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Aucune transaction enregistrée.</td></tr>';
    return;
  }

  tbody.innerHTML = rdvData.map(r => {
    const pName = r.patients ? `${r.patients.nom.toUpperCase()} ${r.patients.prenom}` : 'Patient inconnu';
    return `
      <tr>
        <td>${new Date(r.date_heure).toLocaleDateString('fr-FR')}</td>
        <td class="fw-bold">${pName}</td>
        <td>${r.motif}</td>
        <td>${r.mode_paiement || 'Espèces'}</td>
        <td><span class="badge ${r.statut_paiement === 'Réglé' ? 'bg-success' : 'bg-warning text-dark'}">${r.statut_paiement}</span></td>
        <td class="fw-bold ${r.statut_paiement === 'Réglé' ? 'text-success' : 'text-muted'}">${parseFloat(r.tarif).toFixed(2)} €</td>
      </tr>
    `;
  }).join('');

  // Total encaissé global affiché sur la page compta
  const totalEncaisse = rdvData.filter(r => r.statut_paiement === 'Réglé').reduce((acc, r) => acc + (parseFloat(r.tarif) || 0), 0);
  document.getElementById('finance-total-mois').textContent = `${totalEncaisse.toFixed(2)} €`;
}
