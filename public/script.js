const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s";

let supabaseClient;
let currentSelectedPatientId = null;

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

  // Ajout Séance
  const seanceForm = document.getElementById('seance-form');
  if (seanceForm) {
    seanceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const patient_id = document.getElementById('seance-patient').value;
      const rawDate = document.getElementById('seance-date').value;
      const notes_suivi = document.getElementById('seance-notes').value.trim();
      const montant = parseFloat(document.getElementById('seance-montant').value);
      const mode_paiement = document.getElementById('seance-mode').value;
      const est_paye = document.getElementById('seance-paye').checked;

      if (!patient_id) {
        alert("Veuillez choisir un patient !");
        return;
      }

      const { error } = await supabaseClient
        .from('seances')
        .insert([{ 
          patient_id, 
          notes_suivi, 
          montant, 
          mode_paiement, 
          est_paye,
          date_seance: rawDate !== '' ? rawDate : new Date().toISOString()
        }]);

      if (error) alert("Erreur séance : " + error.message);
      else {
        seanceForm.reset();
        document.getElementById('seance-patient').value = patient_id;
        await loadSeancesForPatient(patient_id);
        await updateFinancialSummary();
      }
    });
  }

  // Changement de patient dans le menu déroulant séances
  const seancePatientSelect = document.getElementById('seance-patient');
  if (seancePatientSelect) {
    seancePatientSelect.addEventListener('change', (e) => {
      const patientId = e.target.value;
      if (patientId) loadSeancesForPatient(patientId);
      else document.getElementById('seance-list').innerHTML = "<p>Sélectionnez un patient pour voir ses séances.</p>";
    });
  }

  // Ajout Charge
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

      if (error) alert("Erreur charge : " + error.message);
      else {
        comptaForm.reset();
        await loadCompta();
        await updateFinancialSummary();
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
  updateFinancialSummary();
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

// Chargement Patients & Alimentation du Select
async function loadPatients() {
  const list = document.getElementById('patient-list');
  const select = document.getElementById('seance-patient');
  const statTotal = document.getElementById('stat-total-patients');
  if (!list || !supabaseClient) return;

  const { data: patients, error } = await supabaseClient
    .from('patients')
    .select('*')
    .order('nom', { ascending: true });

  if (error) {
    list.innerHTML = `<p style="color:red;">Erreur : ${error.message}</p>`;
    return;
  }

  if (statTotal) statTotal.textContent = patients ? patients.length : 0;

  // Remplissage du menu déroulant des séances
  if (select) {
    select.innerHTML = '<option value="">-- Sélectionner un patient --</option>' +
      (patients || []).map(p => `<option value="${p.id}">${p.nom} ${p.prenom}</option>`).join('');
  }

  if (!patients || patients.length === 0) {
    list.innerHTML = "<p>Aucun patient enregistré.</p>";
    return;
  }

  list.innerHTML = patients.map(p => `
    <div onclick="selectPatientForSeances('${p.id}')" style="border: 1px solid #eee; padding: 10px; margin-bottom: 8px; border-radius: 5px; background: #fafafa; cursor: pointer; transition: 0.2s;">
      <strong>👤 ${p.nom || ''} ${p.prenom || ''}</strong>
      <div style="font-size: 0.85em; color: #666;">📅 Née(e) le : ${p.date_naissance || 'Non renseignée'}</div>
    </div>
  `).join('');
}

// Sélection rapide d'un patient
function selectPatientForSeances(patientId) {
  const select = document.getElementById('seance-patient');
  if (select) {
    select.value = patientId;
    loadSeancesForPatient(patientId);
  }
}

// Chargement du suivi des séances pour un patient
async function loadSeancesForPatient(patientId) {
  currentSelectedPatientId = patientId;
  const list = document.getElementById('seance-list');
  if (!list) return;

  list.innerHTML = "<p>Chargement des séances...</p>";

  const { data: seances, error } = await supabaseClient
    .from('seances')
    .select('*')
    .eq('patient_id', patientId)
    .order('date_seance', { ascending: false });

  if (error) {
    list.innerHTML = `<p style="color:red;">Erreur séances : ${error.message}</p>`;
    return;
  }

  if (!seances || seances.length === 0) {
    list.innerHTML = "<p style='color:#7f8c8d;'>Aucune séance enregistrée pour ce patient.</p>";
    return;
  }

  list.innerHTML = seances.map(s => {
    const dateFormatted = new Date(s.date_seance).toLocaleDateString('fr-FR');
    return `
      <div style="border-left: 4px solid ${s.est_paye ? '#2ecc71' : '#e67e22'}; padding: 10px; margin-bottom: 10px; background: #f9f9f9; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px;">
          <span>📅 ${dateFormatted}</span>
          <span style="color: ${s.est_paye ? '#27ae60' : '#d35400'};">
            ${Number(s.montant).toFixed(2)} € (${s.est_paye ? 'Payé - ' + s.mode_paiement : 'En attente'})
          </span>
        </div>
        <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #333; white-space: pre-line;">
          ${s.notes_suivi || '<em>Aucune note saisie</em>'}
        </p>
        ${!s.est_paye ? `
          <button onclick="togglePayment('${s.id}', true)" style="margin-top: 8px; background: #2ecc71; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 0.8em; cursor: pointer;">
            Marquer comme réglé
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Marquer une séance comme réglée
async function togglePayment(seanceId, estPaye) {
  const { error } = await supabaseClient
    .from('seances')
    .update({ est_paye: estPaye })
    .eq('id', seanceId);

  if (error) alert("Erreur : " + error.message);
  else {
    if (currentSelectedPatientId) loadSeancesForPatient(currentSelectedPatientId);
    updateFinancialSummary();
  }
}

// Chargement des charges
async function loadCompta() {
  const list = document.getElementById('compta-list');
  if (!list || !supabaseClient) return;

  const { data: items, error } = await supabaseClient
    .from('comptabilite')
    .select('*')
    .order('date_transaction', { ascending: false });

  if (error) {
    list.innerHTML = `<p style="color:red;">Erreur charges : ${error.message}</p>`;
    return;
  }

  if (!items || items.length === 0) {
    list.innerHTML = "<p style='color:#7f8c8d;'>Aucune charge enregistrée.</p>";
    return;
  }

  list.innerHTML = items.map(i => `
    <div style="border-left: 4px solid #e74c3c; padding: 8px 12px; margin-bottom: 8px; background: #fafafa; border-radius: 4px; display: flex; justify-content: space-between;">
      <div>
        <strong>${i.titre}</strong>
        <div style="font-size: 0.8em; color: #7f8c8d;">${i.date_transaction} • ${i.type.replace('_', ' ')}</div>
      </div>
      <div style="font-weight: bold; color: #c0392b;">
        -${Number(i.montant).toFixed(2)} €
      </div>
    </div>
  `).join('');
}

// Calcul global des recettes, charges et bénéfice
async function updateFinancialSummary() {
  const statRecettes = document.getElementById('stat-recettes');
  const statCharges = document.getElementById('stat-charges');
  const statBenefice = document.getElementById('stat-benefice');

  // Recettes = Séances payées
  const { data: seancesPayees } = await supabaseClient
    .from('seances')
    .select('montant')
    .eq('est_paye', true);

  const totalRecettes = (seancesPayees || []).reduce((acc, curr) => acc + Number(curr.montant), 0);

  // Charges = Table comptabilite
  const { data: charges } = await supabaseClient
    .from('comptabilite')
    .select('montant');

  const totalCharges = (charges || []).reduce((acc, curr) => acc + Number(curr.montant), 0);

  const benefice = totalRecettes - totalCharges;

  if (statRecettes) statRecettes.textContent = totalRecettes.toFixed(2) + " €";
  if (statCharges) statCharges.textContent = totalCharges.toFixed(2) + " €";
  if (statBenefice) {
    statBenefice.textContent = benefice.toFixed(2) + " €";
    statBenefice.style.color = benefice >= 0 ? '#27ae60' : '#c0392b';
  }
}

async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  showLoginScreen();
}
