const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s";

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// 1. Chargement des patients (Ordre alphabétique)
async function loadPatientsList() {
  const container = document.getElementById('patients-list');
  if (!container || !supabaseClient) return;

  const { data: patients, error } = await supabaseClient
    .from('patients')
    .select('*')
    .order('nom', { ascending: true });

  if (error) {
    container.innerHTML = `<p style="color:red;">Erreur : ${error.message}</p>`;
    return;
  }

  if (patients.length === 0) {
    container.innerHTML = '<p>Aucun patient enregistré.</p>';
    return;
  }

  container.innerHTML = patients.map(p => `
    <div class="patient-item">
      <div class="patient-name">${p.nom.toUpperCase()} ${p.prenom}</div>
      <div class="patient-info">
        📅 Né(e) le : ${p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : 'N/C'} | 📞 ${p.telephone || 'N/C'} | ✉️ ${p.email || 'N/C'}
      </div>
    </div>
  `).join('');
}

// 2. Remplir les menus déroulants des patients
async function loadPatientsDropdowns() {
  if (!supabaseClient) return;

  const { data: patients } = await supabaseClient
    .from('patients')
    .select('id, nom, prenom')
    .order('nom', { ascending: true });

  const rdvSelect = document.getElementById('rdv-patient');
  const deleteSelect = document.getElementById('delete-patient-select');

  const optionsHTML = '<option value="">-- Choisir un patient --</option>' +
    (patients || []).map(p => `<option value="${p.id}">${p.nom.toUpperCase()} ${p.prenom}</option>`).join('');

  if (rdvSelect) rdvSelect.innerHTML = optionsHTML;
  if (deleteSelect) deleteSelect.innerHTML = optionsHTML;
}

// 3. Chargement des prochains rendez-vous programmés
async function loadUpcomingRDV() {
  const container = document.getElementById('upcoming-rdv-list');
  if (!container || !supabaseClient) return;

  const now = new Date().toISOString();

  const { data: rdvs, error } = await supabaseClient
    .from('rendez_vous')
    .select('id, date_heure, motif, tarif, statut, patients(nom, prenom)')
    .gte('date_heure', now)
    .order('date_heure', { ascending: true });

  if (error) {
    container.innerHTML = `<p style="color:red;">Erreur : ${error.message}</p>`;
    return;
  }

  if (!rdvs || rdvs.length === 0) {
    container.innerHTML = '<p>Aucun rendez-vous à venir.</p>';
    return;
  }

  container.innerHTML = rdvs.map(r => {
    const dt = new Date(r.date_heure);
    const dateStr = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const badgeClass = r.statut === 'Réglé' ? 'regle' : (r.statut === 'Annulé' ? 'annule' : 'attente');

    return `
      <div class="rdv-item">
        <div class="rdv-title">${dateStr} à ${timeStr} - ${r.patients ? r.patients.nom.toUpperCase() + ' ' + r.patients.prenom : 'Patient inconnu'}</div>
        <div class="rdv-info">
          Motif : ${r.motif} | Tarif : ${r.tarif} € | Statut : <span class="badge ${badgeClass}">${r.statut}</span>
        </div>
      </div>
    `;
  }).join('');
}

// 4. Chargement de la Comptabilité Mensuelle
async function loadComptaMonth(yearMonth) {
  const tableBody = document.getElementById('compta-table-body');
  if (!tableBody || !supabaseClient) return;

  const [year, month] = yearMonth.split('-');
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data: rdvs, error } = await supabaseClient
    .from('rendez_vous')
    .select('id, date_heure, motif, tarif, statut, patients(nom, prenom)')
    .gte('date_heure', startDate)
    .lte('date_heure', endDate)
    .order('date_heure', { ascending: true });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="6" style="color:red;">Erreur : ${error.message}</td></tr>`;
    return;
  }

  let totalPaid = 0;
  let totalPending = 0;

  if (!rdvs || rdvs.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6">Aucun rendez-vous enregistré pour ce mois.</td></tr>';
  } else {
    tableBody.innerHTML = rdvs.map(r => {
      if (r.statut === 'Réglé') totalPaid += Number(r.tarif);
      if (r.statut === 'En attente') totalPending += Number(r.tarif);

      const dt = new Date(r.date_heure).toLocaleDateString('fr-FR');
      const badgeClass = r.statut === 'Réglé' ? 'regle' : (r.statut === 'Annulé' ? 'annule' : 'attente');
      const nextStatut = r.statut === 'Réglé' ? 'En attente' : 'Réglé';

      return `
        <tr>
          <td>${dt}</td>
          <td>${r.patients ? r.patients.nom.toUpperCase() + ' ' + r.patients.prenom : 'Inconnu'}</td>
          <td>${r.motif}</td>
          <td>${r.tarif} €</td>
          <td><span class="badge ${badgeClass}">${r.statut}</span></td>
          <td><button class="btn-secondary" onclick="togglePayment('${r.id}', '${nextStatut}', '${yearMonth}')">Passer en ${nextStatut}</button></td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('summary-total-count').textContent = rdvs ? rdvs.length : 0;
  document.getElementById('summary-paid-amount').textContent = `${totalPaid.toFixed(2)} €`;
  document.getElementById('summary-pending-amount').textContent = `${totalPending.toFixed(2)} €`;
}

// Inverser le statut du règlement depuis le tableau compta
window.togglePayment = async (rdvId, newStatut, yearMonth) => {
  const { error } = await supabaseClient
    .from('rendez_vous')
    .update({ statut: newStatut })
    .eq('id', rdvId);

  if (error) alert("Erreur : " + error.message);
  else loadComptaMonth(yearMonth);
};

// Masquer les formulaires d'actions
function hideAllForms() {
  document.getElementById('form-new-patient-container')?.classList.add('hidden');
  document.getElementById('form-delete-patient-container')?.classList.add('hidden');
  document.getElementById('form-new-rdv-container')?.classList.add('hidden');
}

// Basculer l'affichage (Vue principale vs Comptabilité)
function switchNav(view) {
  const patientsBtn = document.getElementById('nav-patients-btn');
  const comptaBtn = document.getElementById('nav-compta-btn');
  const patientsSection = document.getElementById('view-patients-section');
  const comptaSection = document.getElementById('view-compta-section');

  hideAllForms();

  if (view === 'patients') {
    patientsBtn.classList.add('active');
    comptaBtn.classList.remove('active');
    patientsSection.classList.remove('hidden');
    comptaSection.classList.add('hidden');
    
    // On charge uniquement la liste des prochains rendez-vous
    loadUpcomingRDV();
  } else {
    comptaBtn.classList.add('active');
    patientsBtn.classList.remove('active');
    comptaSection.classList.remove('hidden');
    patientsSection.classList.add('hidden');

    const monthInput = document.getElementById('compta-month-select');
    if (!monthInput.value) {
      const now = new Date();
      monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    loadComptaMonth(monthInput.value);
  }
}

// Vérification de Session
async function checkAuth() {
  const authSection = document.getElementById('auth-section');
  const dashboard = document.getElementById('dashboard');

  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    authSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    switchNav('patients');
  } else {
    authSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}

// Événements
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  // Navigation gauche
  document.getElementById('nav-patients-btn')?.addEventListener('click', () => switchNav('patients'));
  document.getElementById('nav-compta-btn')?.addEventListener('click', () => switchNav('compta'));

  // Boutons du haut
  document.getElementById('btn-open-new-patient')?.addEventListener('click', () => {
    hideAllForms();
    document.getElementById('form-new-patient-container')?.classList.remove('hidden');
  });

  document.getElementById('btn-open-delete-patient')?.addEventListener('click', () => {
    hideAllForms();
    loadPatientsDropdowns();
    document.getElementById('form-delete-patient-container')?.classList.remove('hidden');
  });

  document.getElementById('btn-open-new-rdv')?.addEventListener('click', () => {
    hideAllForms();
    loadPatientsDropdowns();
    document.getElementById('form-new-rdv-container')?.classList.remove('hidden');
  });

  // Boutons Annuler sur les formulaires
  document.querySelectorAll('.cancel-form-btn').forEach(btn => {
    btn.addEventListener('click', hideAllForms);
  });

  // Changement de mois comptabilité
  document.getElementById('compta-month-select')?.addEventListener('change', (e) => {
    loadComptaMonth(e.target.value);
  });

  // Connexion / Déconnexion
  document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert("Erreur : " + error.message);
    else checkAuth();
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    checkAuth();
  });

  // Soumission : Nouveau Patient
  document.getElementById('patient-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = document.getElementById('patient-nom').value.trim();
    const prenom = document.getElementById('patient-prenom').value.trim();
    const dob = document.getElementById('patient-dob').value;
    const tel = document.getElementById('patient-tel').value.trim();
    const emailVal = document.getElementById('patient-email').value.trim();

    const { error } = await supabaseClient.from('patients').insert([{
      nom, prenom, date_naissance: dob, telephone: tel, email: emailVal || null
    }]);

    if (error) alert("Erreur : " + error.message);
    else {
      alert("Patient enregistré !");
      document.getElementById('patient-form').reset();
      hideAllForms();
      loadPatientsList();
    }
  });

  // Soumission : Supprimer Patient
  document.getElementById('delete-patient-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = document.getElementById('delete-patient-select').value;
    if (!patientId) return;

    if (confirm("Êtes-vous sûre de vouloir supprimer ce patient et tous ses RDV ?")) {
      const { error } = await supabaseClient.from('patients').delete().eq('id', patientId);
      if (error) alert("Erreur : " + error.message);
      else {
        alert("Patient supprimé.");
        hideAllForms();
        loadPatientsList();
        loadUpcomingRDV();
      }
    }
  });

  // Soumission : Nouveau RDV
  document.getElementById('rdv-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patient_id = document.getElementById('rdv-patient').value;
    const date_heure = document.getElementById('rdv-datetime').value;
    const motif = document.getElementById('rdv-motif').value.trim();
    const tarif = document.getElementById('rdv-tarif').value;
    const statut = document.getElementById('rdv-statut').value;

    const { error } = await supabaseClient.from('rendez_vous').insert([{
      patient_id, date_heure, motif, tarif: parseFloat(tarif), statut
    }]);

    if (error) alert("Erreur : " + error.message);
    else {
      alert("Rendez-vous programmé !");
      document.getElementById('rdv-form').reset();
      hideAllForms();
      loadUpcomingRDV();
    }
  });
});
