// ==========================================
// CONFIGURATION SUPABASE
// ==========================================
const SUPABASE_URL = 'https://iyxurkbceiirjdigcyak.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s';

// ✅ Utilisation d'un nom de variable unique (supabaseClient)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ÉTATS
let currentUser = null;
let patients = [];
let rendezvous = [];
let isSignUpMode = false;

// ==========================================
// DÉMARRAGE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  checkAuth();
});

function initEvents() {
  // Mode Auth
  const toggleBtn = document.getElementById('toggle-auth-mode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUpMode = !isSignUpMode;
      document.getElementById('btn-auth-submit').textContent = isSignUpMode ? "S'inscrire" : "Se connecter";
      document.getElementById('toggle-auth-mode').textContent = isSignUpMode ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire";
    });
  }

 // Soumission Auth
const authForm = document.getElementById('auth-form');
if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (isSignUpMode) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) alert("Erreur d'inscription : " + error.message);
      else alert("Inscription réussie ! Vous pouvez vous connecter.");
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        alert("Erreur de connexion : " + error.message);
      } else {
        await checkAuth();
      }
    }
  });
}

  // Déconnexion
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      checkAuth();
    });
  }

  // Navigation
  document.getElementById('nav-dashboard')?.addEventListener('click', () => switchTab('dashboard'));
  document.getElementById('nav-patients')?.addEventListener('click', () => switchTab('patients'));
  document.getElementById('nav-compta')?.addEventListener('click', () => switchTab('compta'));
  document.getElementById('btn-nav-to-patients')?.addEventListener('click', () => switchTab('patients'));

  // Formulaires Modales
  document.getElementById('form-add-patient')?.addEventListener('submit', handleAddPatient);
  document.getElementById('form-add-rdv')?.addEventListener('submit', handleAddRdv);

  // Recherche
  document.getElementById('search-patient-input')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = patients.filter(p => `${p.nom} ${p.prenom}`.toLowerCase().includes(term));
    renderPatientsList(filtered);
  });
}

// ==========================================
// AUTHENTIFICATION & NAVIGATION
// ==========================================
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  const authSection = document.getElementById('auth-section');
  const dashboard = document.getElementById('dashboard');

  if (session) {
    // Utilisateur connecté : masquer la connexion, afficher le tableau de bord
    authSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
  } else {
    // Utilisateur non connecté : afficher la connexion, masquer le tableau de bord
    authSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}

// Vérifier la connexion au chargement de la page
document.addEventListener('DOMContentLoaded', checkAuth);

// ==========================================
// CHARGEMENT ET RENDU DES DONNÉES
// ==========================================
async function loadData() {
  // Récupérer patients
  const { data: pData } = await supabaseClient.from('patients').select('*').order('nom');
  patients = pData || [];

  // Récupérer rendez-vous avec infos patients
  const { data: rData } = await supabaseClient.from('rendezvous').select('*, patients(nom, prenom)').order('date_heure', { ascending: false });
  rendezvous = rData || [];

  renderDashboard();
  renderPatientsList(patients);
  renderCompta();
  updateSelectPatients();
}

function renderDashboard() {
  const tbody = document.getElementById('today-rdv-tbody');
  if (!tbody) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRdvs = rendezvous.filter(r => r.date_heure && r.date_heure.startsWith(todayStr));

  if (todayRdvs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Aucun rendez-vous aujourd\'hui.</td></tr>';
    return;
  }

  tbody.innerHTML = todayRdvs.map(r => `
    <tr>
      <td class="fw-bold">${new Date(r.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
      <td class="cursor-pointer text-primary fw-semibold" onclick="openPatientDetail('${r.patient_id}')">
        ${r.patients ? `${r.patients.nom.toUpperCase()}${r.patients.prenom}` : 'Patient inconnu'}
      </td>
      <td>${r.motif || '-'}</td>
      <td>${parseFloat(r.tarif || 0).toFixed(2)} €</td>
      <td><span class="badge ${r.statut_paiement === 'Réglé' ? 'bg-success' : 'bg-warning text-dark'}">${r.statut_paiement}</span></td>
    </tr>
  `).join('');
}

function renderPatientsList(list) {
  const tbody = document.getElementById('patients-list-tbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">Aucun patient.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td class="fw-bold text-primary cursor-pointer" onclick="openPatientDetail('${p.id}')">
        <i class="bi bi-person me-1"></i>${p.nom.toUpperCase()} ${p.prenom}
      </td>
      <td>${p.telephone || '-'}</td>
      <td>${p.email || '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="openPatientDetail('${p.id}')"><i class="bi bi-eye me-1"></i>Voir Fiche</button>
      </td>
    </tr>
  `).join('');
}

function renderCompta() {
  const tbody = document.getElementById('compta-tbody');
  if (!tbody) return;

  if (rendezvous.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Aucune donnée comptable.</td></tr>';
    return;
  }

  tbody.innerHTML = rendezvous.map(r => `
    <tr>
      <td>${new Date(r.date_heure).toLocaleDateString('fr-FR')}</td>
      <td>${r.patients ? `${r.patients.nom.toUpperCase()}${r.patients.prenom}` : '-'}</td>
      <td>${r.motif || '-'}</td>
      <td class="fw-bold">${parseFloat(r.tarif || 0).toFixed(2)} €</td>
      <td><span class="badge ${r.statut_paiement === 'Réglé' ? 'bg-success' : 'bg-warning text-dark'}">${r.statut_paiement}</span></td>
    </tr>
  `).join('');
}

function updateSelectPatients() {
  const select = document.getElementById('rdv-patient-id');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choisir un patient --</option>' +
    patients.map(p => `<option value="${p.id}">${p.nom.toUpperCase()} ${p.prenom}</option>`).join('');
}

// ==========================================
// FICHE PATIENT DÉTAILLÉE + AJOUT SÉANCE
// ==========================================
function openPatientDetail(patientId) {
  const p = patients.find(item => item.id === patientId);
  if (!p) return;

  const pRdvs = rendezvous.filter(r => r.patient_id === patientId);
  
  // Calcul Âge
  let ageStr = 'Non renseigné';
  if (p.date_naissance) {
    const dob = new Date(p.date_naissance);
    const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    ageStr = `${age} ans (${dob.toLocaleDateString('fr-FR')})`;
  }

  const cumulTarif = pRdvs.reduce((acc, r) => acc + (parseFloat(r.tarif) || 0), 0);

  const html = `
    <div class="modal-header bg-primary text-white">
      <h5 class="modal-title fw-bold"><i class="bi bi-person-vcard me-2"></i>${p.nom.toUpperCase()} ${p.prenom}</h5>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      <div class="row mb-3 bg-light p-3 rounded mx-0">
        <div class="col-md-6">
          <p class="mb-1"><strong>Âge :</strong> ${ageStr}</p>
          <p class="mb-1"><strong>Téléphone :</strong> ${p.telephone || '-'}</p>
        </div>
        <div class="col-md-6">
          <p class="mb-1"><strong>Email :</strong> ${p.email || '-'}</p>
          <p class="mb-1"><strong>Total Facturé :</strong> <span class="badge bg-success fs-6">${cumulTarif.toFixed(2)} €</span></p>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold m-0"><i class="bi bi-journal-text me-1"></i>Historique des Séances (${pRdvs.length})</h6>
        <button class="btn btn-sm btn-success" onclick="quickAddSeance('${p.id}')"><i class="bi bi-plus-circle me-1"></i>Ajouter une Séance</button>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-hover border">
          <thead class="table-light">
            <tr>
              <th>Date</th>
              <th>Motif</th>
              <th>Résumé</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            ${pRdvs.length === 0 ? '<tr><td colspan="4" class="text-center text-muted">Aucune séance enregistrée.</td></tr>' : 
              pRdvs.map(r => `
                <tr>
                  <td class="fw-semibold">${new Date(r.date_heure).toLocaleDateString('fr-FR')}</td>
                  <td>${r.motif || '-'}</td>
                  <td><small>${r.resume || '<span class="text-muted fst-italic">Sans résumé</span>'}</small></td>
                  <td class="fw-bold">${parseFloat(r.tarif || 0).toFixed(2)} €</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('patient-detail-content').innerHTML = html;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('patientDetailModal')).show();
}

function quickAddSeance(patientId) {
  bootstrap.Modal.getInstance(document.getElementById('patientDetailModal'))?.hide();
  document.getElementById('rdv-patient-id').value = patientId;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('addRdvModal')).show();
}

// ==========================================
// ACTIONS DE CRÉATION
// ==========================================
async function handleAddPatient(e) {
  e.preventDefault();
  const newP = {
    user_id: currentUser.id,
    nom: document.getElementById('p-nom').value.trim(),
    prenom: document.getElementById('p-prenom').value.trim(),
    date_naissance: document.getElementById('p-dob').value || null,
    telephone: document.getElementById('p-tel').value.trim() || null,
    email: document.getElementById('p-email').value.trim() || null
  };

  const { error } = await supabaseClient.from('patients').insert([newP]);
  if (error) alert("Erreur : " + error.message);
  else {
    bootstrap.Modal.getInstance(document.getElementById('addPatientModal'))?.hide();
    document.getElementById('form-add-patient').reset();
    await loadData();
  }
}

async function handleAddRdv(e) {
  e.preventDefault();
  const newRdv = {
    user_id: currentUser.id,
    patient_id: document.getElementById('rdv-patient-id').value,
    date_heure: document.getElementById('rdv-date').value,
    motif: document.getElementById('rdv-motif').value.trim(),
    tarif: parseFloat(document.getElementById('rdv-tarif').value) || 0,
    statut_paiement: document.getElementById('rdv-statut').value
  };

  const { error } = await supabaseClient.from('rendezvous').insert([newRdv]);
  if (error) alert("Erreur : " + error.message);
  else {
    bootstrap.Modal.getInstance(document.getElementById('addRdvModal'))?.hide();
    document.getElementById('form-add-rdv').reset();
    await loadData();
  }
}
