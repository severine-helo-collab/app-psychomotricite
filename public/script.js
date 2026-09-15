const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
// N'oubliez pas de remettre votre clé JWT (celle qui commence par eyJ...)
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s"; 

let supabaseClient;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialisation de Supabase une fois le CDN disponible
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error("La bibliothèque Supabase n'est pas chargée.");
    return;
  }

  // 2. Vérification de la session existante au chargement/rafraîchissement
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showAppScreen();
  }

  // 3. Écoute des changements d'état (connexion / déconnexion)
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || session) {
      showAppScreen();
    } else if (event === 'SIGNED_OUT') {
      showLoginScreen();
    }
  });

  // 4. Gestion du formulaire de connexion
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorMsg = document.getElementById('auth-error');

      if (errorMsg) errorMsg.textContent = "Connexion en cours...";

      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        if (errorMsg) errorMsg.textContent = "Erreur : " + error.message;
      } else {
        if (errorMsg) errorMsg.textContent = "";
        showAppScreen();
      }
    });
  }

 // 5. Gestion de la création de patient
  const patientForm = document.getElementById('patient-form');
  if (patientForm) {
    patientForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nomInput = document.getElementById('patient-nom');
      const prenomInput = document.getElementById('patient-prenom');
      const dobInput = document.getElementById('patient-dob');

      const nom = nomInput ? nomInput.value.trim() : '';
      const prenom = prenomInput ? prenomInput.value.trim() : '';
      
      // SI LA DATE EST VIDE, ON ENVOIE null ET NON PAS ""
      const rawDate = dobInput ? dobInput.value : '';
      const dateNaissance = rawDate !== '' ? rawDate : null;

      const { data, error } = await supabaseClient
        .from('patients')
        .insert([{ 
          nom: nom, 
          prenom: prenom, 
          date_naissance: dateNaissance 
        }]);

      if (error) {
        alert("Erreur lors de la création : " + error.message);
      } else {
        alert("Patient créé avec succès !");
        patientForm.reset();
        await loadPatients();
      }
    });
  }

// Fonctions d'affichage des écrans
function showAppScreen() {
  const loginSection = document.getElementById('login-section');
  const appSection = document.getElementById('app-section');

  if (loginSection) {
    loginSection.style.display = 'none';
    loginSection.classList.add('hidden');
  }
  if (appSection) {
    appSection.style.display = 'block';
    appSection.classList.remove('hidden');
  }
  loadPatients();
}

function showLoginScreen() {
  const loginSection = document.getElementById('login-section');
  const appSection = document.getElementById('app-section');

  if (appSection) {
    appSection.style.display = 'none';
    appSection.classList.add('hidden');
  }
  if (loginSection) {
    loginSection.style.display = 'block';
    loginSection.classList.remove('hidden');
  }
}

// Charger la liste des patients depuis Supabase
async function loadPatients() {
  const patientList = document.getElementById('patient-list');
  if (!patientList || !supabaseClient) return;

  patientList.innerHTML = "<p>Chargement des patients...</p>";

  const { data: patients, error } = await supabaseClient
    .from('patients')
    .select('*');

  if (error) {
    patientList.innerHTML = `<p class="error-msg">Impossible de charger les patients : ${error.message}</p>`;
    return;
  }

  if (!patients || patients.length === 0) {
    patientList.innerHTML = "<p>Aucun patient enregistré pour le moment.</p>";
    return;
  }

  patientList.innerHTML = patients.map(p => `
    <div class="patient-card" style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
      <h3>${p.nom || ''} ${p.prenom || ''}</h3>
      <p>Date de naissance : ${p.date_naissance || 'Non renseignée'}</p>
    </div>
  `).join('');
}

// Navigation entre les rubriques
function showSection(sectionId) {
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.style.display = 'none';
    sec.classList.add('hidden');
  });
  
  const target = document.getElementById(sectionId);
  if (target) {
    target.style.display = 'block';
    target.classList.remove('hidden');
  }
}

// Déconnexion
async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  showLoginScreen();
}
