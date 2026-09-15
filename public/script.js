// Clés de connexion Supabase
const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "iyxurkbceiirjdigcyak";
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Gestion de la connexion (Email + Mot de passe)
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('auth-error');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorMsg.textContent = "Identifiants incorrects.";
    } else {
      errorMsg.textContent = "";
      checkUser();
    }
  });
}

// Déconnexion
async function logout() {
  await supabase.auth.signOut();
  checkUser();
}

// Vérification de la session utilisateur
async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  const loginSec = document.getElementById('login-section');
  const appSec = document.getElementById('app-section');

  if (session) {
    if (loginSec) loginSec.classList.add('hidden');
    if (appSec) appSec.classList.remove('hidden');
    loadPatients();
  } else {
    if (loginSec) loginSec.classList.remove('hidden');
    if (appSec) appSec.classList.add('hidden');
  }
}

// Fonction pour charger la liste des patients depuis Supabase
async function loadPatients() {
  const patientList = document.getElementById('patient-list');
  if (!patientList) return;

  const { data: patients, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    patientList.innerHTML = "<p>Erreur de chargement des patients.</p>";
    return;
  }

  if (patients.length === 0) {
    patientList.innerHTML = "<p>Aucun patient enregistré pour le moment.</p>";
    return;
  }

  let html = "<ul>";
  patients.forEach(p => {
    html += `<li><strong>${p.nom}</strong> ${p.prenom} - Né(e) le : ${p.date_naissance || 'Non renseignée'}</li>`;
  });
  html += "</ul>";

  patientList.innerHTML = html;
}

// Fonction pour ajouter un nouveau patient
const patientForm = document.getElementById('patient-form');
if (patientForm) {
  patientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = document.getElementById('nom').value;
    const prenom = document.getElementById('prenom').value;
    const date_naissance = document.getElementById('date_naissance').value;

    const { error } = await supabase
      .from('patients')
      .insert([{ nom, prenom, date_naissance }]);

    if (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } else {
      alert("Patient enregistré avec succès !");
      patientForm.reset();
      showSection('dashboard');
      loadPatients();
    }
  });
}

// Lancer la vérification au chargement
checkUser();
