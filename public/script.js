const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "sb_publishable_sh-ADFDD3oHC5Y-YDizzhQ_lW7qU461"; // Remplacez par votre clé Publishable
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorMsg = document.getElementById('auth-error');

      // Tentative de connexion
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        if (errorMsg) errorMsg.textContent = "Erreur : " + error.message;
      } else {
        // Succès : Masquer la connexion et afficher l'application
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('app-section').classList.remove('hidden');
        
        if (errorMsg) errorMsg.textContent = "";
      }
    });
  }
});

// Navigation entre les onglets (Tableau de bord / Nouveau patient)
function showSection(sectionId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(sectionId).classList.remove('hidden');
}

// Déconnexion
async function logout() {
  await supabase.auth.signOut();
  document.getElementById('app-section').classList.add('hidden');
  document.getElementById('login-section').classList.remove('hidden');
}
