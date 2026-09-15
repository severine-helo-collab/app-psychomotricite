const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "sb_publishable_sh-ADFDD3oHC5Y-YDizzhQ_lW7qU461"; // Remplacez par votre clé Publishable Supabase

// Initialisation du client Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorMsg = document.getElementById('auth-error');

      if (errorMsg) errorMsg.textContent = "Connexion en cours...";

      // 1. Authentification
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        if (errorMsg) errorMsg.textContent = "Erreur : " + error.message;
      } else {
        if (errorMsg) errorMsg.textContent = "";

        // 2. Bascule visuelle IMMÉDIATE
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

        // 3. Chargement des patients (séparé pour ne pas tout bloquer en cas d'erreur)
        try {
          await loadPatients();
        } catch (err) {
          console.error("Erreur lors du chargement des patients :", err);
        }
      }
    });
  }
});

// Charger la liste des patients depuis Supabase
async function loadPatients() {
  const patientList = document.getElementById('patient-list');
  if (!patientList) return;

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

// Navigation entre les sections
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
  await supabaseClient.auth.signOut();
  document.getElementById('app-section').style.display = 'none';
  document.getElementById('login-section').style.display = 'block';
}
