const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s"; // Remplace par ta vraie clé anon Supabase

let supabaseClient;
let currentPatient = null;

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

  // Formulaire Connexion
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) document.getElementById('auth-error').textContent = "Erreur : " + error.message;
  });

  // Création Patient
  document.getElementById('patient-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = document.getElementById('patient-nom').value.trim();
    const prenom = document.getElementById('patient-prenom').value.trim();
    const telephone = document.getElementById('patient-tel').value.trim();
    const rawDate = document.getElementById('patient-dob').value;
    
    const { data, error } = await supabaseClient
      .from('patients')
      .insert([{ nom, prenom, telephone, date_naissance: rawDate !== '' ? rawDate : null }])
      .select();

    if (error) alert("Erreur : " + error.message);
    else {
      document.getElementById('patient-form').reset();
      await loadPatients();
      if (data && data.length > 0) openPatientCard(data[0].id);
    }
  });

  // Enregistrement du Prochain RDV
  document.getElementById('rdv-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentPatient) return;

    const rdvValue = document.getElementById('input-prochain-rdv').value;
    const nextRdv = rdvValue ? new Date(rdvValue).toISOString() : null;

    const { error } = await supabaseClient
      .from('patients')
      .update({ prochain_rdv: nextRdv })
      .eq('id', currentPatient.id);

    if (error) {
      alert("Erreur lors de l'enregistrement du RDV : " + error.message);
    } else {
      currentPatient.prochain_rdv = nextRdv;
      updateRdvDisplay();
      await loadPatients();
      alert("Prochain rendez-vous enregistré !");
    }
  });

  // Enregistrement d'une séance avec résumé / notes
  document.getElementById('seance-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentPatient) return;

    const titre = document.getElementById('seance-titre').value.trim();
    const rawDate = document.getElementById('seance-date').value;
    const notes_suivi = document.getElementById('seance-notes').value.trim();
    const montant = parseFloat(document.getElementById('seance-montant').value);
    const mode_paiement = document.getElementById('seance-mode').value;
    const est_paye = document.getElementById('seance-paye').checked;

    const { error } = await supabaseClient
      .from('seances')
      .insert([{ 
        patient_id: currentPatient.id, 
        titre: titre || 'Séance',
        notes_suivi: notes_suivi, 
        montant: isNaN(montant) ? 45.00 : montant, 
        mode_paiement: mode_paiement, 
        est_paye: est_paye,
        date_seance: rawDate !== '' ? new Date(rawDate).toISOString() : new Date().toISOString()
      }]);

    if (error) {
      alert("Erreur lors de l'enregistrement de la séance : " + error.message);
    } else {
      document.getElementById('seance-notes').value = '';
      await loadSeancesForCurrentPatient();
      await updateFinancialSummary();
    }
  });

  // Ajout Charge Comptabilité
  document.getElementById('compta-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titre = document.getElementById('compta-titre').value.trim();
    const montant = parseFloat(document.getElementById('compta-montant').value);
    const type = document.getElementById('compta-type').value;

    const { error } = await supabaseClient
      .from('comptabilite')
      .insert([{ titre, montant, type, date_transaction: new Date().toISOString().split('T')[0] }]);

    if (error) alert("Erreur : " + error.message);
    else {
      document.getElementById('compta-form').reset();
      await loadCompta();
      await updateFinancialSummary();
    }
  });

  // Suppression Patient
  document.getElementById('btn-delete-patient')?.addEventListener('click', async () => {
    if (!currentPatient) return;
    const confirmation = confirm(`Supprimer définitivement la fiche de ${currentPatient.nom} ${currentPatient.prenom} et tout son historique ?`);
    if (!confirmation) return;

    const { error } = await supabaseClient.from('patients').delete().eq('id', currentPatient.id);
    if (error) alert("Erreur : " + error.message);
    else {
      currentPatient = null;
      document.getElementById('patient-detail-card').classList.add('hidden');
      document.getElementById('empty-state').classList.remove('hidden');
      await loadPatients();
      await updateFinancialSummary();
    }
  });
});

function showAppScreen() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('app-section').classList.remove('hidden');
  loadPatients();
  loadCompta();
  updateFinancialSummary();
}

function showLoginScreen() {
  document.getElementById('app-section').classList.add('hidden');
  document.getElementById('login-section').style.display = 'block';
}

// Charger la liste des patients
async function loadPatients() {
  const list = document.getElementById('patient-list');
  const statTotal = document.getElementById('stat-total-patients');

  const { data: patients, error } = await supabaseClient
    .from('patients')
    .select('*')
    .order('nom', { ascending: true });

  if (error) {
    list.innerHTML = `<p style="color:red;">Erreur : ${error.message}</p>`;
    return;
  }

  if (statTotal) statTotal.textContent = patients ? patients.length : 0;

  if (!patients || patients.length === 0) {
    list.innerHTML = "<p style='color:#7f8c8d;'>Aucun patient.</p>";
    return;
  }

  list.innerHTML = patients.map(p => {
    let rdvTxt = '';
    if (p.prochain_rdv) {
      const d = new Date(p.prochain_rdv);
      rdvTxt = `<div style="font-size:0.75em; color:#2980b9; margin-top: 2px;">📅 RDV : ${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</div>`;
    }

    return `
      <div class="patient-item ${currentPatient && currentPatient.id === p.id ? 'active' : ''}" onclick="openPatientCard('${p.id}')">
        <div>
          <strong>👤 ${p.nom} ${p.prenom}</strong>
          ${p.telephone ? `<div style="font-size:0.8em; color:#555;">📞 ${p.telephone}</div>` : ''}
          ${rdvTxt}
        </div>
        <span>➡️</span>
      </div>
    `;
  }).join('');
}

// Ouvrir la fiche patient (récupération directe en temps réel depuis Supabase)
async function openPatientCard(patientId) {
  const { data: patient, error } = await supabaseClient
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (error || !patient) {
    alert("Impossible de charger la fiche du patient.");
    return;
  }

  currentPatient = patient;

  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('patient-detail-card').classList.remove('hidden');

  document.getElementById('detail-patient-nom').textContent = `👤 ${patient.nom} ${patient.prenom}`;
  
  const dobText = patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : 'Non renseignée';
  const telText = patient.telephone ? `<a href="tel:${patient.telephone}" style="color: #2980b9; text-decoration: none;">📞 ${patient.telephone}</a>` : '📞 Non renseigné';
  
  document.getElementById('detail-patient-info').innerHTML = `
    <span>🎂 Date de naissance : ${dobText}</span>
    <span>${telText}</span>
  `;

  updateRdvDisplay();
  loadSeancesForCurrentPatient();
}

function updateRdvDisplay() {
  const display = document.getElementById('display-prochain-rdv');
  const input = document.getElementById('input-prochain-rdv');

  if (currentPatient && currentPatient.prochain_rdv) {
    const d = new Date(currentPatient.prochain_rdv);
    display.textContent = `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}`;
    
    // Format compatible avec <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
    const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    input.value = localIso;
  } else {
    display.textContent = "Aucun RDV prévu";
    input.value = "";
  }
}

// Charger les séances
async function loadSeancesForCurrentPatient() {
  if (!currentPatient) return;
  const list = document.getElementById('seance-list');
  list.innerHTML = "Chargement...";

  const { data: seances, error } = await supabaseClient
    .from('seances')
    .select('*')
    .eq('patient_id', currentPatient.id)
    .order('date_seance', { ascending: false });

  if (error) {
    list.innerHTML = `<p style="color:red;">Erreur : ${error.message}</p>`;
    return;
  }

  const count = seances ? seances.length + 1 : 1;
  document.getElementById('seance-titre').value = `Séance ${count}`;

  if (!seances || seances.length === 0) {
    list.innerHTML = "<p style='color:#7f8c8d;'>Aucune séance enregistrée pour le moment.</p>";
    return;
  }

  list.innerHTML = seances.map(s => `
    <div class="seance-card ${s.est_paye ? '' : 'impaye'}">
      <div style="display: flex; justify-content: space-between; font-weight: bold;">
        <span>📌 ${s.titre || 'Séance'}</span>
        <span style="font-size: 0.85em; color: #666;">📅 ${new Date(s.date_seance).toLocaleDateString('fr-FR')}</span>
      </div>
      <div style="font-size: 0.9em; margin: 5px 0; color: ${s.est_paye ? '#27ae60' : '#d35400'}; font-weight: bold;">
        ${Number(s.montant).toFixed(2)} € (${s.est_paye ? 'Payé - ' + s.mode_paiement : 'En attente'})
      </div>
      ${s.notes_suivi ? `<div style="background: white; padding: 10px; border-radius: 4px; font-size: 0.9em; margin-top: 8px; border-left: 3px solid #8e44ad; white-space: pre-line;"><strong>Résumé :</strong><br>${s.notes_suivi}</div>` : ''}
      ${!s.est_paye ? `<button onclick="togglePayment('${s.id}', true)" style="margin-top: 8px; background: #2ecc71; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; cursor: pointer;">Marquer comme payé</button>` : ''}
    </div>
  `).join('');
}

async function togglePayment(seanceId, estPaye) {
  await supabaseClient.from('seances').update({ est_paye: estPaye }).eq('id', seanceId);
  await loadSeancesForCurrentPatient();
  await updateFinancialSummary();
}

async function loadCompta() {
  const list = document.getElementById('compta-list');
  const { data: items } = await supabaseClient.from('comptabilite').select('*').order('date_transaction', { ascending: false });

  if (!items || items.length === 0) {
    list.innerHTML = "<p style='color:#7f8c8d;'>Aucune charge.</p>";
    return;
  }

  list.innerHTML = items.map(i => `
    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #eee; font-size: 0.9em;">
      <span>${i.titre}</span>
      <strong style="color: #c0392b;">-${Number(i.montant).toFixed(2)} €</strong>
    </div>
  `).join('');
}

async function updateFinancialSummary() {
  const { data: seances } = await supabaseClient.from('seances').select('montant').eq('est_paye', true);
  const totalRecettes = (seances || []).reduce((acc, curr) => acc + Number(curr.montant), 0);

  const { data: charges } = await supabaseClient.from('comptabilite').select('montant');
  const totalCharges = (charges || []).reduce((acc, curr) => acc + Number(curr.montant), 0);

  const benefice = totalRecettes - totalCharges;

  document.getElementById('stat-recettes').textContent = totalRecettes.toFixed(2) + " €";
  document.getElementById('stat-charges').textContent = totalCharges.toFixed(2) + " €";
  
  const elBen = document.getElementById('stat-benefice');
  elBen.textContent = benefice.toFixed(2) + " €";
  elBen.style.color = benefice >= 0 ? '#27ae60' : '#c0392b';
}

async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  showLoginScreen();
}
