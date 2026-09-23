// 1. Déclarer l'URL et la Clé Supabase
const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s";

// Initialisation du client
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.error("Le SDK Supabase n'est pas chargé depuis le CDN.");
}

// Charger la liste des patients dans le sélecteur du formulaire RDV
async function loadPatientsDropdown() {
  const patientSelect = document.getElementById('rdv-patient');
  if (!patientSelect || !supabaseClient) return;

  const { data: patients, error } = await supabaseClient
    .from('patients')
    .select('id, nom, prenom')
    .order('nom', { ascending: true });

  if (error) {
    console.error("Erreur lors de la récupération des patients :", error.message);
    return;
  }

  // Vider et réinitialiser la liste
  patientSelect.innerHTML = '<option value="">-- Choisir un patient --</option>';

  patients.forEach(patient => {
    const option = document.createElement('option');
    option.value = patient.id;
    option.textContent = `${patient.nom} ${patient.prenom}`;
    patientSelect.appendChild(option);
  });
}

// Fonction d'affichage conditionnel
async function checkAuth() {
  const authSection = document.getElementById('auth-section');
  const dashboard = document.getElementById('dashboard');

  if (!authSection || !dashboard) return;

  if (!supabaseClient) {
    authSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    // Connecté
    authSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    // Charger les patients pour les rendez-vous
    loadPatientsDropdown();
  } else {
    // Non connecté
    authSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}

// Gestion des événements au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  // 1. Connexion
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;

      if (!supabaseClient) {
        alert("Erreur : la connexion à Supabase a échoué.");
        return;
      }

      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert("Erreur de connexion : " + error.message);
      } else {
        checkAuth();
      }
    });
  }

  // 2. Déconnexion
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!supabaseClient) return;

      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        alert("Erreur lors de la déconnexion : " + error.message);
      } else {
        checkAuth();
      }
    });
  }

  // 3. Enregistrement d'un nouveau patient
  const patientForm = document.getElementById('patient-form');
  if (patientForm) {
    patientForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nom = document.getElementById('patient-nom').value.trim();
      const prenom = document.getElementById('patient-prenom').value.trim();
      const dob = document.getElementById('patient-dob').value;
      const tel = document.getElementById('patient-tel').value.trim();
      const email = document.getElementById('patient-email').value.trim();

      const { data, error } = await supabaseClient
        .from('patients')
        .insert([
          { nom: nom, prenom: prenom, date_naissance: dob, telephone: tel, email: email }
        ]);

      if (error) {
        alert("Erreur lors de l'enregistrement du patient : " + error.message);
      } else {
        alert("Patient enregistré avec succès !");
        patientForm.reset();
        // Mettre à jour la liste déroulante des patients dans RDV
        loadPatientsDropdown();
      }
    });
  }

  // 4. Enregistrement d'un rendez-vous
  const rdvForm = document.getElementById('rdv-form');
  if (rdvForm) {
    rdvForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const patientId = document.getElementById('rdv-patient').value;
      const datetime = document.getElementById('rdv-datetime').value;
      const motif = document.getElementById('rdv-motif').value.trim();
      const tarif = document.getElementById('rdv-tarif').value;
      const statut = document.getElementById('rdv-statut').value;

      if (!patientId) {
        alert("Veuillez sélectionner un patient.");
        return;
      }

      const { data, error } = await supabaseClient
        .from('rendez_vous')
        .insert([
          { 
            patient_id: patientId, 
            date_heure: datetime, 
            motif: motif, 
            tarif: parseFloat(tarif), 
            statut: statut 
          }
        ]);

      if (error) {
        alert("Erreur lors de l'enregistrement du RDV : " + error.message);
      } else {
        alert("Rendez-vous programmé avec succès !");
        rdvForm.reset();
      }
    });
  }
});
