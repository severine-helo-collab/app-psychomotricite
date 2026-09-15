const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "sb_publishable_sh-ADFDD3oHC5Y-YDizzhQ_lW7qU461"; // Remplacez par votre clé
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Test direct de soumission
document.addEventListener('submit', async (e) => {
  if (e.target && e.target.id === 'login-form') {
    e.preventDefault();
    alert("Soumission détectée !");

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      alert("Erreur Supabase : " + error.message);
    } else {
      alert("Connexion réussie ! Bascule de l'écran...");
      document.getElementById('login-section').classList.add('hidden');
      document.getElementById('app-section').classList.remove('hidden');
    }
  }
});
