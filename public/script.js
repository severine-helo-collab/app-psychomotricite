// ==========================================
// 1. CONFIGURATION SUPABASE
// ==========================================
const SUPABASE_URL = 'https://iyxurkbceiirjdigcyak.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s';

// Changement du nom de la variable pour éviter le conflit avec le CDN
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) alert("Erreur d'inscription : " + error.message);
      else alert("Compte créé avec succès ! Vous pouvez vous connecter.");
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) alert("Erreur de connexion : " + error.message);
      else checkSession();
    }
  });

  // Déconnexion
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
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
  const { data: { session } } = await supabaseClient.auth.getSession();
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
  const { data, error } = await supabaseClient
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
  const { data, error } = await supabaseClient
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

  const { error } = await supabaseClient.from('patients').insert([newPatient]);
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

  const { error } = await supabaseClient.from('patients').update(updatedPatient).eq('id', id);
  if (error) alert("Erreur de modification : " + error.message);
  else {
    bootstrap.Modal.getInstance(document.getElementById('editPatientModal')).hide();
    await loadAllData();
  }
}

async function deletePatient(id) {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce patient ? Tous ses RDV seront également supprimés.")) {
    const { error } = await supabaseClient.from('patients').delete().eq('id', id);
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

  const now = new Date();

  // Tous les RDV de ce patient (du plus récent au plus ancien)
  const patientRdvs = rdvData
    .filter(r => r.patient_id === patientId)
    .sort((a, b) => new Date(b.date_heure) - new Date(a.date_heure));

  // Calcul de l'âge et formatage de la date de naissance
  let ageStr = 'Âge non renseigné';
  let dobStr = 'Non renseignée';
  if (patient.date_naissance) {
    const dob = new Date(patient.date_naissance);
    dobStr = dob.toLocaleDateString('fr-FR');
    const age = Math.floor((now - dob) / (365.25 * 24 * 60 * 60 * 1000));
    ageStr = `${age} ans`;
  }

  // Recherche du prochain rendez-vous (le premier RDV à venir)
  const upcomingRdvs = patientRdvs
    .filter(r => new Date(r.date_heure) >= now)
    .sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));
  
  const nextRdv = upcomingRdvs.length > 0 ? upcomingRdvs[0] : null;

  // Construction dynamique du HTML de la fiche
  const modalContentHtml = `
    <div class="modal-header bg-primary text-white">
      <h5 class="modal-title fw-bold">
        <i class="bi bi-person-vcard me-2"></i>Fiche Patient : ${patient.nom.toUpperCase()} ${patient.prenom}
      </h5>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fermer"></button>
    </div>
    
    <div class="modal-body p-4">
      <!-- 1. COORDONNÉES ET ÉTAT CIVIL -->
      <div class="card mb-4 border-0 shadow-sm bg-light">
        <div class="card-body">
          <h6 class="text-uppercase text-primary fw-bold mb-3"><i class="bi bi-person-badge me-2"></i>Coordonnées & Informations</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <p class="mb-2"><strong><i class="bi bi-cake2 text-secondary me-2"></i>Âge & Date de naissance :</strong> ${ageStr} (${dobStr})</p>
              <p class="mb-2"><strong><i class="bi bi-telephone text-secondary me-2"></i>Téléphone :</strong> ${patient.telephone || '<span class="text-muted">Non renseigné</span>'}</p>
            </div>
            <div class="col-md-6">
              <p class="mb-2"><strong><i class="bi bi-envelope text-secondary me-2"></i>Email :</strong> ${patient.email || '<span class="text-muted">Non renseigné</span>'}</p>
              <p class="mb-2"><strong><i class="bi bi-geo-alt text-secondary me-2"></i>Adresse :</strong> ${patient.adresse || '<span class="text-muted">Non renseignée</span>'}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. PROCHAIN RENDEZ-VOUS -->
      <div class="card mb-4 border-primary border-2 shadow-sm">
        <div class="card-body bg-primary bg-opacity-10">
          <h6 class="text-uppercase text-primary fw-bold mb-2"><i class="bi bi-calendar-check me-2"></i>Prochain Rendez-vous</h6>
          ${nextRdv ? `
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <span class="fs-5 fw-bold text-dark me-3"><i class="bi bi-clock me-1"></i>${new Date(nextRdv.date_heure).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</span>
                <span class="badge bg-primary fs-6">${nextRdv.motif || 'Consultation'}</span>
              </div>
              <div class="fw-bold fs-5 text-success">${parseFloat(nextRdv.tarif || 0).toFixed(2)} €</div>
            </div>
          ` : `
            <p class="text-muted mb-0 fst-italic">Aucun rendez-vous à venir programmé.</p>
          `}
        </div>
      </div>

      <!-- 3. RÉCAPITULATIF DES SÉANCES -->
      <h6 class="text-uppercase text-muted fw-bold mb-3"><i class="bi bi-journal-text me-2"></i>Historique des Séances (${patientRdvs.length})</h6>

      ${patientRdvs.length === 0 ? `
        <div class="alert alert-secondary text-center py-3">Aucune séance enregistrée pour ce patient.</div>
      ` : `
        <div class="table-responsive">
          <table class="table table-hover align-middle border">
            <thead class="table-dark">
              <tr>
                <th>Date & Heure</th>
                <th>Motif</th>
                <th>Résumé / Bilan</th>
                <th>Montant</th>
                <th>Paiement</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${patientRdvs.map(r => {
                const dateFormatted = new Date(r.date_heure).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
                const isPaye = r.statut_paiement === 'Réglé';
                return `
                  <tr>
                    <td class="fw-bold">${dateFormatted}</td>
                    <td><span class="badge bg-secondary">${r.motif || '-'}</span></td>
                    <td style="min-width: 200px;">
                      <small class="text-wrap">${r.resume || '<span class="text-muted fst-italic">Aucun résumé</span>'}</small>
                    </td>
                    <td class="fw-bold">${parseFloat(r.tarif || 0).toFixed(2)} €</td>
                    <td><small class="text-muted">${r.mode_paiement || 'Espèces'}</small></td>
                    <td>
                      <span class="badge ${isPaye ? 'bg-success' : 'bg-warning text-dark'}">
                        ${r.statut_paiement || 'En attente'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
    </div>
  `;

  // Injection du HTML dans la modale
  const modalEl = document.getElementById('patientDetailModal');
  const modalContentEl = modalEl.querySelector('.modal-content');
  if (modalContentEl) {
    modalContentEl.innerHTML = modalContentHtml;
  }

  // Affichage de la modale
  const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
  bsModal.show();
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

  const { error } = await supabaseClient.from('rendezvous').insert([newRdv]);
  if (error) alert("Erreur lors de l'ajout du RDV : " + error.message);
  else {
    bootstrap.Modal.getInstance(document.getElementById('addRendezvousModal')).hide();
    document.getElementById('add-rdv-form').reset();
    await loadAllData();
  }
}

async function togglePaymentStatus(rdvId, currentStatus) {
  const newStatus = currentStatus === 'Réglé' ? 'En attente' : 'Réglé';
  const { error } = await supabaseClient.from('rendezvous').update({ statut_paiement: newStatus }).eq('id', rdvId);
  if (error) alert("Erreur lors du changement de statut : " + error.message);
  else await loadAllData();
}

async function deleteRendezvous(id) {
  if (confirm("Supprimer ce rendez-vous ?")) {
    const { error } = await supabaseClient.from('rendezvous').delete().eq('id', id);
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
