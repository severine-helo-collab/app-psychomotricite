const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s";

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// 1. Ouvrir la modale de la liste des patients
window.openPatientsModal = async function() {
  const container = document.getElementById('modal-patients-body');
  const modal = document.getElementById('modal-patients-list');
  if (!container || !modal || !supabaseClient) return;

  modal.classList.remove('hidden');
  container.innerHTML = '<p>Chargement des patients...</p>';

  const { data: patients, error } = await supabaseClient
    .from('patients')
    .select('*')
    .order('nom', { ascending: true });

  if (error) {
    container.innerHTML = `<p style="color:red;">Erreur : ${error.message}</p>`;
    return;
  }

  if (!patients || patients.length === 0) {
    container.innerHTML = '<p>Aucun patient enregistré.</p>';
    return;
  }

  container.innerHTML = patients.map(p => `
    <div class="modal-patient-row">
      <div class="modal-patient-name">${p.nom.toUpperCase()} ${p.prenom}</div>
      <div class="patient-actions">
        <button class="icon-btn" title="Voir la fiche" onclick="viewPatientDetail('${p.id}')">👁️</button>
        <button class="icon-btn" title="Ajouter une séance" onclick="addRdvForPatient('${p.id}')">➕</button>
        <button class="icon-btn danger-icon" title="Supprimer le patient" onclick="deletePatientModal('${p.id}', '${p.nom.toUpperCase()} ${p.prenom}')">❌</button>
      </div>
    </div>
  `).join('');
};

window.closePatientsModal = function() {
  document.getElementById('modal-patients-list')?.classList.add('hidden');
};

// 2. Voir la fiche du patient (avec historique des séances et totalisation)
window.viewPatientDetail = async function(patientId) {
  const modal = document.getElementById('modal-patient-detail');
  const title = document.getElementById('patient-detail-title');
  const body = document.getElementById('patient-detail-body');
  if (!modal || !body || !supabaseClient) return;

  modal.classList.remove('hidden');
  body.innerHTML = '<p>Chargement des informations...</p>';

  // Récupération des infos du patient
  const { data: patient, error: errPatient } = await supabaseClient
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (errPatient || !patient) {
    body.innerHTML = `<p style="color:red;">Erreur lors du chargement de la fiche.</p>`;
    return;
  }

  // Récupération de l'historique des séances du patient
  const { data: rdvs, error: errRdvs } = await supabaseClient
    .from('rendez_vous')
    .select('*')
    .eq('patient_id', patientId)
    .order('date_heure', { ascending: false });

  title.textContent = `Fiche de ${patient.prenom} ${patient.nom.toUpperCase()}`;
  const dobStr = patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : 'Non renseignée';

  // Calcul du nombre de séances et du montant total
  const totalSeances = rdvs ? rdvs.length : 0;
  const montantTotal = rdvs ? rdvs.reduce((sum, r) => sum + (Number(r.tarif) || 0), 0) : 0;

  // HTML pour la liste des séances
  let seancesHTML = '';
  if (errRdvs) {
    seancesHTML = `<p style="color:red;">Erreur lors du chargement des séances.</p>`;
  } else if (!rdvs || rdvs.length === 0) {
    seancesHTML = '<p>Aucune séance enregistrée pour ce patient.</p>';
  } else {
    seancesHTML = rdvs.map(r => {
      const dt = new Date(r.date_heure);
      const dateStr = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const badgeClass = r.statut === 'Réglé' ? 'regle' : (r.statut === 'Annulé' ? 'annule' : 'attente');

      return `
        <div style="background:#f8f9fa; border: 1px solid #e0e0e0; border-radius:6px; padding:10px; margin-bottom:10px;">
          <div style="font-weight:bold; font-size:0.9rem; color:#333; display:flex; justify-between; align-items:center; margin-bottom:4px;">
            <span>📅 ${dateStr} à ${timeStr}</span>
            <span class="badge ${badgeClass}">${r.statut}</span>
          </div>
          <div style="font-size:0.85rem; color:#555; margin-bottom:4px;">
            <strong>Motif :</strong> ${r.motif || 'Non renseigné'} | <strong>Tarif :</strong> ${r.tarif || 0} €
          </div>
          <div style="font-size:0.85rem; color:#444; background:#fff; padding:6px; border-radius:4px; border-left: 3px solid #007bff; margin-top:4px;">
            <strong>Compte-rendu :</strong> ${r.compte_rendu || '<em>Aucun compte-rendu saisi.</em>'}
          </div>
        </div>
      `;
    }).join('');
  }

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.95rem; margin-bottom:1rem;">
      <p><strong>Nom :</strong> ${patient.nom.toUpperCase()}</p>
      <p><strong>Prénom :</strong> ${patient.prenom}</p>
      <p><strong>Date de naissance :</strong> ${dobStr}</p>
      <p><strong>Téléphone :</strong> ${patient.telephone || 'Non renseigné'}</p>
      <p><strong>Email :</strong> ${patient.email || 'Non renseigné'}</p>
    </div>

    <hr style="border:0; border-top:1px solid #ddd; margin: 15px 0;" />

    <h4 style="margin-bottom:10px; color:#2c3e50;">📋 Historique des séances</h4>
    <div style="max-height: 250px; overflow-y: auto; padding-right:5px;">
      ${seancesHTML}
    </div>

    <hr style="border:0; border-top:1px solid #ddd; margin: 15px 0;" />

    <div style="background:#e9ecef; padding: 12px; border-radius: 6px; font-weight:bold; font-size:0.95rem; display:flex; justify-content:space-between; align-items:center;">
      <span>Total séances : <span style="color:#007bff;">${totalSeances}</span></span>
      <span>Montant total : <span style="color:#28a745;">${montantTotal.toFixed(2)} €</span></span>
    </div>
  `;
};

window.closePatientDetailModal = function() {
  document.getElementById('modal-patient-detail')?.classList.add('hidden');
};

// 3. Action ➕ : Ouvrir le formulaire de RDV pré-rempli pour ce patient
window.addRdvForPatient = async function(patientId) {
  window.closePatientsModal();
  hideAllForms();
  await loadPatientsDropdowns();
  
  const select = document.getElementById('rdv-patient');
  if (select) select.value = patientId;

  document.getElementById('form-new-rdv-container')?.classList.remove('hidden');
};

// 4. Action ❌ : Supprimer le patient depuis la modale
window.deletePatientModal = async function(patientId, patientName) {
  if (confirm(`Êtes-vous sûre de vouloir supprimer le patient "${patientName}" et tous ses rendez-vous associés ?`)) {
    const { error } = await supabaseClient.from('patients').delete().eq('id', patientId);
    if (error) {
      alert("Erreur : " + error.message);
    } else {
      alert("Patient supprimé.");
      window.openPatientsModal();
      loadUpcomingRDV();
    }
  }
};

// 5. Remplir les menus déroulants des patients
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

// 6. Chargement des prochains rendez-vous programmés
async function loadUpcomingRDV() {
  const container = document.getElementById('upcoming-rdv-list');
  if (!container || !supabaseClient) return;

  const now = new Date().toISOString();

  const { data: rdvs, error } = await supabaseClient
    .from('rendez_vous')
    .select('id, patient_id, date_heure, motif, tarif, statut, patients(nom, prenom)')
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
      <div class="rdv-item clickable-rdv" onclick="viewPatientDetail('${r.patient_id}')" title="Cliquer pour voir la fiche patient">
        <div class="rdv-title">${dateStr} à ${timeStr} - ${r.patients ? r.patients.nom.toUpperCase() + ' ' + r.patients.prenom : 'Patient inconnu'}</div>
        <div class="rdv-info">
          Motif : ${r.motif} | Tarif : ${r.tarif} € | Statut : <span class="badge ${badgeClass}">${r.statut}</span>
        </div>
      </div>
    `;
  }).join('');
}

// 7. Chargement de la Comptabilité Mensuelle
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

window.togglePayment = async (rdvId, newStatut, yearMonth) => {
  const { error } = await supabaseClient
    .from('rendez_vous')
    .update({ statut: newStatut })
    .eq('id', rdvId);

  if (error) alert("Erreur : " + error.message);
  else loadComptaMonth(yearMonth);
};

function hideAllForms() {
  document.getElementById('form-new-patient-container')?.classList.add('hidden');
  document.getElementById('form-delete-patient-container')?.classList.add('hidden');
  document.getElementById('form-new-rdv-container')?.classList.add('hidden');
}

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

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  document.getElementById('nav-patients-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchNav('patients');
    window.openPatientsModal();
  });

  document.getElementById('nav-compta-btn')?.addEventListener('click', () => switchNav('compta'));

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

  document.querySelectorAll('.cancel-form-btn').forEach(btn => {
    btn.addEventListener('click', hideAllForms);
  });

  document.getElementById('compta-month-select')?.addEventListener('change', (e) => {
    loadComptaMonth(e.target.value);
  });

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
    }
  });

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
        loadUpcomingRDV();
      }
    }
  });

  // Soumission : Nouveau RDV avec enregistrement du compte-rendu
  document.getElementById('rdv-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patient_id = document.getElementById('rdv-patient').value;
    const date_heure = document.getElementById('rdv-datetime').value;
    const motif = document.getElementById('rdv-motif').value.trim();
    const tarif = document.getElementById('rdv-tarif').value;
    const statut = document.getElementById('rdv-statut').value;
    const compte_rendu = document.getElementById('rdv-compte-rendu')?.value.trim() || null;

    const { error } = await supabaseClient.from('rendez_vous').insert([{
      patient_id, date_heure, motif, tarif: parseFloat(tarif), statut, compte_rendu
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
