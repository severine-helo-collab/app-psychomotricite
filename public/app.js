// 1. Déclarer l'URL et la Clé Supabase (remplacez avec vos clés Supabase réelles)
const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s";

// Initialisation du client
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.error("Le SDK Supabase n'est pas chargé depuis le CDN.");
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
  } else {
    // Non connecté
    authSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}

// Gestion des évènements au chargement
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

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

      const { data, error } = await supabaseClient.auth.signInWithPassword({
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
});
