// ==========================================
// 1. CONFIGURATION SUPABASE
// ==========================================
// Remplacez ces valeurs par celles de votre projet Supabase (Project Settings -> API)
const SUPABASE_URL = 'https://iyxurkbceiirjdigcyak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s';

// Création du client sans conflit de variable
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let allPatients = [];
let isLoginMode = true;

// ==========================================
// 2. INITIALISATION AU DÉMARRAGE
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  setupAuth();
  setupNavigation();
  setupForms();

  // Vérifie si un utilisateur est déjà connecté
  const { data: { session } } = await supabaseClient.auth.getSession();
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

  // Soumission du formulaire
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;

      btnAuthSubmit.disabled = true;
      btnAuthSubmit.innerText = 'Veuillez patienter...';

      if (isLoginMode) {
        // Connexion
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          alert('Erreur de connexion : ' + error.message);
        } else {
          showApplication();
        }
      } else {
        // Inscription
        const { error } = await supabaseClient.auth.signUp({ email, password });
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
  }

  // Déconnexion
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      hideApplication();
    });
  }
}

// Afficher l'application
function showApplication() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display = 'block';
  loadPatients();
  loadRendezvous();
  updateDashboard();
}

// Cacher l'application
function hideApplication() {
  document.getElementById('app-section').style.display = 'none';
  document.getElementById('auth-section').style.display = 'block';
  if (document.getElementById('auth-email')) document.getElementById('auth-email').value = '';
  if (document.getElementById('auth-password')) document.getElementById('auth-password').value = '';
}

// ==========================================
// 4. NAVIGATION INTERNE
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
    [navDashboard, navPatients, navRendezvous].forEach(nav => nav && nav.classList.remove('active'));
    Object.values(sections).forEach(sec => sec && (sec.style.display = 'none'));
    
    if (activeNav) activeNav.classList.add('active');
    if (activeSection) activeSection.style.display = 'block';
  }

  if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchSection(navDashboard, sections.dashboard); });
  if (navPatients) navPatients.addEventListener('click', (e) => { e.preventDefault(); switchSection(navPatients, sections.patients); });
  if (navRendezvous) navRendezvous.addEventListener('click', (e) => { e.preventDefault(); switchSection(navRendezvous, sections.rendezvous); });
}

// ==========================================
// 5. GESTION DES FORMULAIRES
// ==========================================
function setupForms() {
  
  // Ajouter un patient
  const addPatientForm = document.getElementById('add-patient-form');
  if (addPatientForm) {
    addPatientForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const patientData = {
        nom: document.getElementById('nom').value,
        prenom: document.getElementById('prenom').value,
        telephone: document.getElementById('telephone').value,
        email: document.getElementById('email').value,
        adresse: document.getElementById('adresse').value
      };

      const { error } = await supabaseClient.from('patients').insert([patientData]);

      if (error) {
        alert("Erreur lors de l'ajout du patient : " + error.message);
      } else {
        addPatientForm.reset();
        bootstrap.Modal.getInstance(document.getElementById('addPatientModal')).hide();
        loadPatients();
      }
    });
  }

  // Modifier un patient
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
        adresse: document.getElementById('edit-adresse').value
      };

      const { error } = await supabaseClient.from('patients').update(patientData).eq('id', id);

      if (error) {
        alert('Erreur lors de la mise à jour : ' + error.message);
      } else {
        bootstrap.Modal.getInstance(document.getElementById('editPatientModal')).hide();
        loadPatients();
      }
    });
  }

  // Ajouter un Rendez-vous
  const addRdvForm = document.getElementById('add-rdv-form');
  if (addRdvForm) {
    addRdvForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rdvData = {
        patient_id: document.getElementById('rdv-patient-select').value,
        date_heure: document.getElementById('rdv-date').value,
        motif: document.getElementById('rdv-motif').value,
        statut: 'Planifié'
      };

      const { error } = await supabaseClient.from('rendezvous').insert([rdvData]);

      if (error) {
        alert('Erreur lors de la planification : ' + error.message);
      } else {
        addRdvForm.reset();
        bootstrap.Modal.getInstance(document.getElementById('addRendezvousModal')).hide();
        loadRendezvous();
      }
    });
  }

  // Recherche dynamique
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
// 6. GESTION DES PATIENTS
// ==========================================
async function loadPatients() {
  const { data, error } = await supabaseClient.from('patients').select('*').order('nom');
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
  if (!select) return;
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
    const { error } = await supabaseClient.from('patients').delete().eq('id', id);
    if (error) {
      alert('Erreur lors de la suppression : ' + error.message);
    } else {
      loadPatients();
    }
  }
};

// ==========================================
// 7. GESTION DES RENDEZ-VOUS
// ==========================================
async function loadRendezvous() {
  const { data, error } = await supabaseClient
    .from('rendezvous')
    .select('*, patients(nom, prenom)')
    .order('date_heure');

  if (error) {
    console.error('Erreur chargement RDV:', error);
    return;
  }

  const tbody = document.getElementById('rdv-table-body');
  if (!tbody) return;
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
    const { error } = await supabaseClient.from('rendezvous').delete().eq('id', id);
    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      loadRendezvous();
    }
  }
};

// ==========================================
// 8. TABLEAU DE BORD
// ==========================================
function updateDashboard() {
  const el = document.getElementById('stat-patients-count');
  if (el) el.innerText = allPatients.length;
}

function updateDashboardStats(rendezvousData) {
  const elRdv = document.getElementById('stat-rdv-count');
  if (elRdv) elRdv.innerText = rendezvousData.length;

  const today = new Date().toISOString().split('T')[0];
  const rdvToday = rendezvousData.filter(rdv => rdv.date_heure && rdv.date_heure.startsWith(today));
  
  const elToday = document.getElementById('stat-rdv-today-count');
  if (elToday) elToday.innerText = rdvToday.length;
}
