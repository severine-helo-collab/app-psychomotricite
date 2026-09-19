// Remplace par tes clés Supabase si ce n'est pas déjà fait
const SUPABASE_URL = 'https://TON-PROJET.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let allPatients = [];

// Chargement au démarrage
document.addEventListener('DOMContentLoaded', () => {
  loadPatients();
  loadRendezvous();
  setupNavigation();
  setupForms();
});

// Navigation entre les onglets
function setupNavigation() {
  const navPatients = document.getElementById('nav-patients');
  const navRendezvous = document.getElementById('nav-rendezvous');
  const sectionPatients = document.getElementById('section-patients');
  const sectionRendezvous = document.getElementById('section-rendezvous');

  navPatients.addEventListener('click', (e) => {
    e.preventDefault();
    navPatients.classList.add('active');
    navRendezvous.classList.remove('active');
    sectionPatients.style.display = 'block';
    sectionRendezvous.style.display = 'none';
  });

  navRendezvous.addEventListener('click', (e) => {
    e.preventDefault();
    navRendezvous.classList.add('active');
    navPatients.classList.remove('active');
    sectionRendezvous.style.display = 'block';
    sectionPatients.style.display = 'none';
  });
}

// Configurer la soumission des formulaires
function setupForms() {
  // Formulaire d'ajout de patient
  document.getElementById('add-patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = document.getElementById('nom').value;
    const prenom = document.getElementById('prenom').value;
    const telephone = document.getElementById('telephone').value;
    const email = document.getElementById('email').value;
    const adresse = document.getElementById('adresse').value;

    const { error } = await supabase.from('patients').insert([
      { nom, prenom, telephone, email, adresse }
    ]);

    if (error) {
      alert('Erreur lors de l\'ajout du patient : ' + error.message);
    } else {
      document.getElementById('add-patient-form').reset();
      bootstrap.Modal.getInstance(document.getElementById('addPatientModal')).hide();
      loadPatients();
    }
  });

  // Formulaire de modification de patient
  document.getElementById('edit-patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-patient-id').value;
    const nom = document.getElementById('edit-nom').value;
    const prenom = document.getElementById('edit-prenom').value;
    const telephone = document.getElementById('edit-telephone').value;
    const email = document.getElementById('edit-email').value;
    const adresse = document.getElementById('edit-adresse').value;

    const { error } = await supabase.from('patients').update({
      nom, prenom, telephone, email, adresse
    }).eq('id', id);

    if (error) {
      alert('Erreur lors de la mise à jour : ' + error.message);
    } else {
      bootstrap.Modal.getInstance(document.getElementById('editPatientModal')).hide();
      loadPatients();
    }
  });

  // Formulaire d'ajout de rendez-vous
  document.getElementById('add-rdv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const patient_id = document.getElementById('rdv-patient-select').value;
    const date_heure = document.getElementById('rdv-date').value;
    const motif = document.getElementById('rdv-motif').value;

    const { error } = await supabase.from('rendezvous').insert([
      { patient_id, date_heure, motif, statut: 'Planifié' }
    ]);

    if (error) {
      alert('Erreur lors de la planification : ' + error.message);
    } else {
      document.getElementById('add-rdv-form').reset();
      bootstrap.Modal.getInstance(document.getElementById('addRendezvousModal')).hide();
      loadRendezvous();
    }
  });

  // Recherche dynamique
  document.getElementById('searchPatient').addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const filtered = allPatients.filter(p => 
      p.nom.toLowerCase().includes(search) || 
      p.prenom.toLowerCase().includes(search)
    );
    renderPatients(filtered);
  });
}

// Charger les patients depuis Supabase
async function loadPatients() {
  const { data, error } = await supabase.from('patients').select('*').order('nom');
  if (error) {
    console.error('Erreur chargement patients:', error);
    return;
  }
  allPatients = data;
  renderPatients(allPatients);
  updatePatientSelectOptions(data);
}

// Afficher les patients dans le tableau
function renderPatients(patients) {
  const tbody = document.getElementById('patients-table-body');
  tbody.innerHTML = '';

  patients.forEach(patient => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${patient.nom || ''}</td>
      <td>${patient.prenom || ''}</td>
      <td>${patient.telephone || ''}</td>
      <td>${patient.email || ''}</td>
      <td>${patient.adresse || ''}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditPatientModal('${patient.id}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePatient('${patient.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Pré-remplir le menu déroulant des RDV
function updatePatientSelectOptions(patients) {
  const select = document.getElementById('rdv-patient-select');
  select.innerHTML = '<option value="">Choisir un patient...</option>';
  patients.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.nom} ${p.prenom}</option>`;
  });
}

// Ouvrir la modale d'édition
function openEditPatientModal(id) {
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
}

// Supprimer un patient
async function deletePatient(id) {
  if (confirm('Voulez-vous vraiment supprimer ce patient ?')) {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) {
      alert('Erreur lors de la suppression : ' + error.message);
    } else {
      loadPatients();
    }
  }
}

// Charger les rendez-vous depuis Supabase
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
    const dateFormatted = new Date(rdv.date_heure).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
    const patientName = rdv.patients ? `${rdv.patients.nom} ${rdv.patients.prenom}` : 'Inconnu';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${patientName}</td>
      <td>${dateFormatted}</td>
      <td>${rdv.motif || ''}</td>
      <td><span class="badge bg-info">${rdv.statut || 'Planifié'}</span></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger" onclick="deleteRendezvous('${rdv.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Supprimer un rendez-vous
async function deleteRendezvous(id) {
  if (confirm('Voulez-vous supprimer ce rendez-vous ?')) {
    const { error } = await supabase.from('rendezvous').delete().eq('id', id);
    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      loadRendezvous();
    }
  }
}
