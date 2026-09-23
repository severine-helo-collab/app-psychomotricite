
// Configuration Supabase (Remplacez avec vos clés exactes)
const SUPABASE_URL = 'https://iyxurkbceiirjdigcyak.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s';

// Initialisation du client
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Fonction de vérification de l'authentification
async function checkAuth() {
  const authSection = document.getElementById('auth-section');
  const dashboard = document.getElementById('dashboard');

  if (!authSection || !dashboard) {
    console.error("Éléments 'auth-section' ou 'dashboard' introuvables.");
    return;
  }

  // Si Supabase n'est pas prêt, on affiche par sécurité le formulaire de connexion
  if (!supabaseClient) {
    console.error("Le SDK Supabase n'a pas pu être chargé.");
    authSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
    return;
  }

  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Erreur lors de la récupération de la session :", error);
    }

    if (session) {
      // Connecté : cacher la connexion, afficher le tableau de bord
      authSection.classList.add('hidden');
      dashboard.classList.remove('hidden');
    } else {
      // Non connecté : afficher la connexion, cacher le tableau de bord
      authSection.classList.remove('hidden');
      dashboard.classList.add('hidden');
    }
  } catch (err) {
    console.error("Erreur inattendue :", err);
    // Afficher la connexion par défaut en cas d'erreur
    authSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  // Gestionnaire de connexion
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        alert("Erreur de connexion : " + error.message);
      } else {
        checkAuth();
      }
    });
  }
});
