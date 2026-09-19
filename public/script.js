// ==========================================
// 1. CONFIGURATION SUPABASE
// ==========================================
// Remplacer par vos clés Supabase
const SUPABASE_URL = 'https://TON-PROJET.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let allPatients = [];
let isLoginMode = true; // Permet de basculer entre Connexion et Inscription

// ==========================================
// 2. INITIALISATION AU DÉMARRAGE
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  setupAuth();
  setupNavigation();
  setupForms();

  // Vérifier si un utilisateur est déjà connecté
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    showApplication();
  }
});

// ==========================================
// 3. GESTION DE L'AUTHENTIFICATION
// ==========================================
function setupAuth() {
  const authForm = document.getElementById('auth-form');
  const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
  const authSubtitle = document.getElementById('auth-subtitle');
  const btnAuthSubmit = document.getElementById('btn-auth-submit');
  const btnLogout = document.getElementById('btn-logout');

  // Basculer entre Connexion et Inscription
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

  // Soumission du formulaire (Connexion ou Inscription)
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    btnAuthSubmit.disabled = true;
    btnAuthSubmit.innerText = 'Veuillez patienter...';

    if (isLoginMode) {
      // Connexion
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert('Erreur de connexion : ' + error.message);
      } else {
        showApplication();
      }
    } else {
      // Inscription
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert("Erreur d'inscription : " + error.message);
      } else {
        alert("Inscription réussie ! Vous pouvez maintenant vous connecter.");
        isLoginMode = true;
        authSubtitle.innerText = 'Connectez-vous à votre espace';
        btnAuthSubmit.innerText = 'Se connecter';
        toggleAuthModeBtn.innerText = "Pas encore de compte ? S'inscrire";
      }
    }

    btnAuthSubmit.disabled = false;
    btnAuthSubmit.innerText = isLoginMode ? 'Se connecter' : "S'inscrire";
  });

  // Déconnexion
  btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
    hideApplication();
  });
}

// Afficher l'application (cacher l'auth)
function showApplication() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display = 'block';
  loadPatients();
  loadRendezvous();
  updateDashboard();
}

// Cacher l'application (afficher l'auth)
function hideApplication() {
  document.getElementById('app-section').style.display = 'none';
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
}

// ==========================================
// 4. NAVIGATION INTERNE (Sidebar)
// ==========================================
function setupNavigation() {
  const navDashboard = document.getElementById('nav-dashboard');
  const navPatients = document.getElementById('nav-patients');
  const navRendezvous = document.getElementById('nav-rendezvous');

  const sections = {
    dashboard: document.getElementById('section-dashboard'),
    patients: document.getElementById('section-patients'),
    rendezvous: document.getElementById('section-rendezvous')
  };

  function switchSection(activeNav, activeSection) {
    // Réinitialiser les menus
    [navDashboard, navPatients, navRendezvous].forEach(nav => nav.classList.remove('active'));
    // Cacher toutes les sections
    Object.values(sections).forEach(sec => sec.style.display = 'none');
    
    // Activer la sélection
    activeNav.classList.add('active');
    activeSection.style.display = 'block';
  }

  navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchSection(navDashboard, sections.dashboard); });
  navPatients.addEventListener('click', (e) => { e.preventDefault(); switchSection(navPatients, sections.patients); });
  navRendezvous.addEventListener('click', (e) => { e.preventDefault(); switchSection(navRendezvous, sections.rendezvous); });
}

// ==========================================
// 5. GESTION DES FORMULAIRES
// ==========================================
function setupForms() {
  
  // --- Formulaire : Ajouter un patient ---
  document.getElementById('add-patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientData = {
      nom: document.getElementById('nom').value,
      prenom: document.getElementById('prenom').value,
      telephone: document.getElementById('telephone').value,
      email: document.getElementById('email').value,
      adresse: document.getElementById('adresse').value
    };

    const { error } = await supabase.from('patients').insert([patientData]);

    if (error) {
      alert('Erreur lors de l\'ajout du patient : ' + error.message);
    } else {
      document.getElementById('add-patient-form').reset();
      bootstrap.Modal.getInstance(document.getElementById('addPatientModal')).hide();
      loadPatients();
    }
  });

  // --- Formulaire : Modifier un patient ---
  document.getElementById('edit-patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-patient-id').value;
    const patientData = {
      nom: document.getElementById('edit-nom').value,
      prenom: document.getElementById('edit-prenom').value,
      telephone: document.getElementById('edit-telephone').value,
      email: document.getElementById('edit-email').value,
      adresse: document.getElementById('edit-adresse').value
    };

    const { error } = await supabase.from('patients').update(patientData).eq('id', id);

    if (error) {
      alert('Erreur lors de la mise à jour : ' + error.message);
    } else {
      bootstrap.Modal.getInstance(document.getElementById('editPatientModal')).hide();
      loadPatients();
    }
  });

  // --- Formulaire : Ajouter un RDV ---
  document.getElementById('add-rdv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rdvData = {
      patient_id: document.getElementById('rdv-patient-select').value,
      date_heure: document.getElementById('rdv-date').value,
      motif: document.getElementById('rdv-motif').value,
      statut: 'Planifié'
    };

    const { error } = await supabase.from('rendezvous').insert([rdvData]);

    if (error) {
      alert('Erreur lors de la planification : ' + error.message);
    } else {
      document.getElementById('add-rdv-form').reset();
      bootstrap.Modal.getInstance(document.getElementById('addRendezvousModal')).hide();
      loadRendezvous();
    }
  });

  // --- Recherche dynamique Patients ---
  document.getElementById('searchPatient').addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const filtered = allPatients.filter(p => 
      (p.nom && p.nom.toLowerCase().includes(search)) || 
      (p.prenom && p.prenom.toLowerCase().includes(search))
    );
    renderPatients(filtered);
  });
}

// ==========================================
// 6. FONCTIONS POUR LES PATIENTS
// ==========================================
async function loadPatients() {
  const { data, error } = await supabase.from('patients').select('*').order('nom');
  if (error) {
    console.error('Erreur chargement patients:', error);
    return;
  }
  allPatients = data || [];
  renderPatients(allPatients);
  updatePatientSelectOptions(allPatients);
  updateDashboard();
}

function renderPatients(patients) {
  const tbody = document.getElementById('patients-table-body');
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
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditPatientModal('${patient.id}')" title="Modifier">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePatient('${patient.id}')" title="Supprimer">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updatePatientSelectOptions(patients) {
  const select = document.getElementById('rdv-patient-select');
  select.innerHTML = '<option value="">Choisir un patient...</option>';
  patients.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.nom} ${p.prenom}</option>`;
  });
}

window.openEditPatientModal = function(id) {
  const patient = allPatients.find(p => p.id === id);
  if (!patient) return;

  document.getElementById('edit-patient-id').value = patient.id;
  document.getElementById('edit-nom').value = patient.nom || '';
  document.getElementById('edit-prenom').value = patient.prenom || '';
  document.getElementById('edit-telephone').value = patient.telephone || '';
  document.getElementById('edit-email').value = patient.email || '';
  document.getElementById('edit-adresse').value = patient.adresse || '';

  const modal = new bootstrap.Modal(document.getElementById('editPatientModal'));
  modal.show();
};

window.deletePatient = async function(id) {
  if (confirm('Attention : Voulez-vous vraiment supprimer ce patient ?')) {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) {
      alert('Erreur lors de la suppression : ' + error.message);
    } else {
      loadPatients();
    }
  }
};

// ==========================================
// 7. FONCTIONS POUR LES RENDEZ-VOUS
// ==========================================
async function loadRendezvous() {
  const { data, error } = await supabase
    .from('rendezvous')
    .select('*, patients(nom, prenom)')
    .order('date_heure');

  if (error) {
    console.error('Erreur chargement RDV:', error);
    return;
  }

  const tbody = document.getElementById('rdv-table-body');
  tbody.innerHTML = '';

  data.forEach(rdv => {
    const dateObj = new Date(rdv.date_heure);
    const dateFormatted = dateObj.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    
    const patientName = rdv.patients ? `${rdv.patients.nom} ${rdv.patients.prenom}` : 'Inconnu';
    const statutBadge = rdv.statut === 'Terminé' ? 'bg-success' : 'bg-info text-dark';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${patientName}</strong></td>
      <td>${dateFormatted}</td>
      <td>${rdv.motif || '-'}</td>
      <td><span class="badge ${statutBadge}">${rdv.statut || 'Planifié'}</span></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger" onclick="deleteRendezvous('${rdv.id}')" title="Supprimer">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateDashboardStats(data);
}

window.deleteRendezvous = async function(id) {
  if (confirm('Voulez-vous supprimer ce rendez-vous ?')) {
    const { error } = await supabase.from('rendezvous').delete().eq('id', id);
    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      loadRendezvous();
    }
  }
};

// ==========================================
// 8. FONCTION POUR LE TABLEAU DE BORD
// ==========================================
function updateDashboard() {
  document.getElementById('stat-patients-count').innerText = allPatients.length;
}

function updateDashboardStats(rendezvousData) {
  document.getElementById('stat-rdv-count').innerText = rendezvousData.length;

  // Calculer les RDV d'aujourd'hui
  const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  const rdvToday = rendezvousData.filter(rdv => rdv.date_heure.startsWith(today));
  
  document.getElementById('stat-rdv-today-count').innerText = rdvToday.length;
}
