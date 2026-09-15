const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "sb_publishable_sh-ADFDD3oHC5Y-YDizzhQ_lW7qU461"; // Mettez votre clé Publishable ici

document.addEventListener('submit', async (e) => {
  if (e.target && e.target.id === 'login-form') {
    e.preventDefault();

    // Vérification que la bibliothèque Supabase est bien chargée
    if (!window.supabase) {
      alert("Erreur : Le script Supabase n'est pas encore chargé. Réessayez dans 2 secondes.");
      return;
    }

    // Initialisation au moment du clic
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        alert("Erreur de connexion : " + error.message);
      } else {
        alert("Connexion réussie !");
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('app-section').classList.remove('hidden');
      }
    } catch (err) {
      alert("Erreur réseau ou code : " + err.message);
    }
  }
});
