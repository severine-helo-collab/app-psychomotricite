const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s"; 

let supabaseClient;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error("Supabase non chargé");
    return; 
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) showAppScreen();

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || session) showAppScreen();
    else if (event === 'SIGNED_OUT') showLoginScreen();
  });

  // Connexion
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorMsg = document.getElementById('auth-error');

      if (errorMsg) errorMsg.textContent = "Connexion...";

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error && errorMsg) errorMsg.textContent = "Erreur : " + error.message;
    });
  }

  // Ajout Patient
  const patientForm = document.getElementById('patient-form');
  if (patientForm) {
    patientForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nom = document.getElementById('patient-nom').value.trim();
      const prenom = document.getElementById('patient-prenom').value.trim();
      const rawDate = document.getElementById('patient-dob').value;
      
      const { error } = await supabaseClient
        .from('patients')
        .insert([{ nom, prenom, date_naissance: rawDate !== '' ? rawDate : null }]);

      if (error) alert("Erreur : " + error.message);
      else {
        patientForm.reset();
        await loadPatients();
      }
    });
  }

  // Ajout Transaction Comptable
  const comptaForm = document.getElementById('compta-form');
  if (comptaForm) {
    comptaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titre = document.getElementById('compta-titre').value.trim();
      const montant = parseFloat(document.getElementById('compta-montant').value);
      const type = document.getElementById('compta-type').value;
      const rawDate = document.getElementById('compta-date').value;

      const { error } = await supabaseClient
        .from('comptabilite')
        .insert([{ 
          titre, 
          montant, 
          type, 
          date_transaction: rawDate !== '' ? rawDate : new Date().toISOString().split('T')[0]
        }]);

      if (error) alert("Erreur compta : " + error.message);
      else {
        comptaForm.reset();
        await loadCompta();
      }
    });
  }
});

function showAppScreen() {
  document.getElementById('login-section')?.classList.add('hidden');
  document.getElementById('login-section').style.display = 'none';
  
  const app = document.getElementById('app-section');
  if (app) {
    app.classList.remove('hidden');
    app.style.display = 'block';
  }
  loadPatients();
  loadCompta();
}

function showLoginScreen() {
  document.getElementById('app-section')?.classList.add('hidden');
  document.getElementById('app-section').style.display = 'none';
  
  const login = document.getElementById('login-section');
  if (login) {
    login.classList.remove('hidden');
    login.style.display = 'block';
  }
}

// Chargement Patients
async function loadPatients() {
  const list = document.getElementById('patient-list');
  const statTotal = document.getElementById('stat-total-patients');
  if (!list || !supabaseClient) return;

  const { data: patients, error } = await supabaseClient.from('patients').select('*');

  if (error) {
    list.innerHTML = `<p style="color:red;">Erreur : ${error.message}</p>`;
    return;
  }

  if (statTotal) statTotal.textContent = patients ? patients.length : 0;

  if (!patients || patients.length === 0) {
    list.innerHTML = "<p>Aucun patient enregistré.</p>";
    return;
  }

  list.innerHTML = patients.map(p => `
    <div style="border: 1px solid #eee; padding: 10px; margin-bottom: 8px; border-radius: 5px; background: #fafafa;">
      <strong>${p.nom || ''} ${p.prenom || ''}</strong>
      <div style="font-size: 0.85em; color: #666;">📅 ${p.date_naissance || 'Non renseignée'}</div>
    </div>
  `).join('');
}

// Chargement Comptabilité & Calculs Bilan
async function loadCompta() {
  const list = document.getElementById('compta-list');
  const statRecettes = document.getElementById('stat-recettes');
  const statCharges = document.getElementById('stat-charges');
  const statBenefice = document.getElementById('stat-benefice');

  if (!list || !supabaseClient) return;

  const { data: items, error } = await supabaseClient
    .from('comptabilite')
    .select('*')
    .order('date_transaction', { ascending: false });

  if (error) {
    list.innerHTML = `<p style="color:red;">Erreur compta : ${error.message}</p>`;
    return;
  }

  let totalRecettes = 0;
  let totalCharges = 0;

  if (items) {
    items.forEach(item => {
      const val = Number(item.montant);
      if (item.type === 'recette') totalRecettes += val;
      else totalCharges += val;
    });
  }

  const benefice = totalRecettes - totalCharges;

  if (statRecettes) statRecettes.textContent = totalRecettes.toFixed(2) + " €";
  if (statCharges) statCharges.textContent = totalCharges.toFixed(2) + " €";
  if (statBenefice) {
    statBenefice.textContent = benefice.toFixed(2) + " €";
    statBenefice.style.color = benefice >= 0 ? '#27ae60' : '#c0392b';
  }

  if (!items || items.length === 0) {
    list.innerHTML = "<p>Aucune écriture comptable.</p>";
    return;
  }

  list.innerHTML = items.map(i => `
    <div style="border-left: 4px solid ${i.type === 'recette' ? '#2ecc71' : '#e74c3c'}; padding: 8px 12px; margin-bottom: 8px; background: #fafafa; border-radius: 4px; display: flex; justify-content: space-between;">
      <div>
        <strong>${i.titre}</strong>
        <div style="font-size: 0.8em; color: #7f8c8d;">${i.date_transaction} • ${i.type.replace('_', ' ')}</div>
      </div>
      <div style="font-weight: bold; color: ${i.type === 'recette' ? '#27ae60' : '#c0392b'};">
        ${i.type === 'recette' ? '+' : '-'}${Number(i.montant).toFixed(2)} €
      </div>
    </div>
  `).join('');
}

async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  showLoginScreen();
}
