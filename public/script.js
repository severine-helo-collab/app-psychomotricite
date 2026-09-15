// On récupère le client Supabase depuis l'objet global window sans re-déclarer var/const
const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "sb_publishable_sh-ADFDD3oHC5Y-YDizzhQ_lW7qU461"; // Mettez votre clé Publishable ici

// Initialisation sécurisée
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('submit', async (e) => {
  if (e.target && e.target.id === 'login-form') {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      // Utilisation du client sécurisé
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        alert("Erreur Supabase : " + error.message);
      } else {
        alert("Connexion réussie !");
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('app-section').classList.remove('hidden');
      }
    } catch (err) {
      alert("Erreur JS : " + err.message);
    }
  }
});
