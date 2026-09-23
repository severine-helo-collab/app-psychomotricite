const SUPABASE_URL = "https://iyxurkbceiirjdigcyak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHVya2JjZWlpcmpkaWdjeWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDYzODQsImV4cCI6MjEwNDYyMjM4NH0.MGBADlkxP307mbUvU_07OEhN5sfqv9_wSTqIP5AVK-s";

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Table de correspondance Motif -> Tarif
const TARIFS_MOTIFS = {
  "Bilan psychomotricité 1/2": 100,
  "Bilan psychomotricité 2/2": 100,
  "Séance de suivi": 60,
  "Autre": 0
};

// 1. Modale de la liste des patients
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

// 2. Carte d'une séance avec statut modifiable et compte-rendu
function renderSeanceCard(r, indexNumber, patientId) {
  const dt = new Date(r.date_heure);
  const dateStr = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const statuts = ["À venir", "Clôturée", "Annulée", "Reportée"];
  const optionsStatut = statuts.map(s => `<option value="${s}" ${r.statut === s ? 'selected' : ''}>${s}</option>`).join('');

  const displayTarif = r.statut === 'Annulée' ? 0 : (r.tarif || 0);

  return `
    <div style="background:#fff; border: 1px solid #e0e0e0; border-left: 4px solid #007bff; border-radius:6px; padding:12px; margin-bottom:12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-weight:bold; font-size:0.95rem; color:#2c3e50; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span>🔢 Séance n°${indexNumber} — 📅 ${dateStr} à ${timeStr}</span>
        <div>
          <label style="font-size:0.8rem; margin-right:4px;">Statut :</label>
          <select style="padding:3px 6px; font-size:0.8rem; border-radius:4px; border:1px solid #ccc;" onchange="updateSeanceStatut('${r.id}', this.value, '${patientId}')">
            ${optionsStatut}
          </select>
        </div>
      </div>

      <div style="font-size:0.85rem; color:#555; margin-bottom:8px;">
        <strong>Motif :</strong> ${r.motif || 'Non renseigné'} | <strong>Tarif :</strong> ${displayTarif} €
      </div>

      <div style="margin-top:6px;">
        <label style="font-size:0.8rem; font-weight:bold; color:#333; display:block; margin-bottom:4px;">Compte-rendu de la séance :</label>
        <textarea id="cr-${r.id}" rows="2" style="width:100%; font-size:0.85rem; padding:6px; border-radius:4px; border:1px solid #ccc; font-family:inherit;" placeholder="Rédiger le compte-rendu...">${r.compte_rendu || ''}</textarea>
        <button class="btn-secondary" style="font-size:0.75rem; padding:4px 8px; margin-top:4px;" onclick="saveCompteRendu('${r.id}', '${patientId}')">💾 Enregistrer le compte-rendu</button>
      </div>
    </div>
  `;
}

// 3. Voir la fiche patient complète
window.viewPatientDetail = async function(patientId) {
  const modal = document.getElementById('modal-patient-detail');
  const title = document.getElementById('patient-detail-title');
  const body = document.getElementById('patient-detail-body');
  if (!modal || !body || !supabaseClient) return;

  modal.classList.remove('hidden');
  body.innerHTML = '<p>Chargement des informations...</p>';

  const { data: patient, error: errPatient } = await supabaseClient
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (errPatient || !patient) {
    body.innerHTML = `<p style="color:red;">Erreur lors du chargement de la fiche.</p>`;
    return;
  }

  const { data: rdvs, error: errRdvs } = await supabaseClient
    .from('rendez_vous')
    .select('*')
    .eq('patient_id', patientId)
    .order('date_heure', { ascending: true });

  title.textContent = `Fiche de ${patient.prenom} ${patient.nom.toUpperCase()}`;
  const dobStr = patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : 'Non renseignée';

  if (errRdvs) {
    body.innerHTML = `<p style="color:red;">Erreur lors du chargement des séances.</p>`;
    return;
  }

  const now = new Date();
  const rdvsWithNum = (rdvs || []).map((r, idx) => ({ ...r, number: idx + 1 }));

  const seancesPassees = rdvsWithNum.filter(r => new Date(r.date_heure) < now).reverse();
  const seancesAvenir = rdvsWithNum.filter(r => new Date(r.date_heure) >= now);

  const totalSeances = rdvs ? rdvs.length : 0;
  const montantTotal = rdvs ? rdvs.reduce((sum, r) => sum + (r.statut === 'Annulée' ? 0 : (Number(r.tarif) || 0)), 0) : 0;

  let avenirHTML = seancesAvenir.length === 0
    ? '<p style="font-size:0.85rem; color:#777;">Aucune séance à venir.</p>'
    : seancesAvenir.map(r => renderSeanceCard(r, r.number, patientId)).join('');

  let passeesHTML = seancesPassees.length === 0
    ? '<p style="font-size:0.85rem; color:#777;">Aucune séance passée.</p>'
    : seancesPassees.map(r => renderSeanceCard(r, r.number, patientId)).join('');

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.95rem; margin-bottom:1rem;">
      <p><strong>Nom :</strong> ${patient.nom.toUpperCase()}</p>
      <p><strong>Prénom :</strong> ${patient.prenom}</p>
      <p><strong>Date de naissance :</strong> ${dobStr}</p>
      <p><strong>Téléphone :</strong> ${patient.telephone || 'Non renseigné'}</p>
      <p><strong>Email :</strong> ${patient.email || 'Non renseigné'}</p>
    </div>

    <hr style="border:0; border-top:1px solid #ddd; margin: 12px 0;" />

    <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
      <h4 style="margin-bottom:8px; color:#007bff;">🔮 Séances à venir (${seancesAvenir.length})</h4>
      <div style="margin-bottom:15px;">${avenirHTML}</div>

      <h4 style="margin-bottom:8px; color:#2c3e50;">📜 Séances passées (${seancesPassees.length})</h4>
      <div>${passeesHTML}</div>
    </div>

    <hr style="border:0; border-top:1px solid #ddd; margin: 12px 0;" />

    <div style="background:#e9ecef; padding: 12px; border-radius: 6px; font-weight:bold; font-size:0.95rem; display:flex; justify-content:space-between; align-items:center;">
      <span>Total séances : <span style="color:#007bff;">${totalSeances}</span></span>
      <span>Montant total : <span style="color:#28a745;">${montantTotal.toFixed(2)} €</span></span>
    </div>
  `;
};

// 4. Mettre à jour le statut
window.updateSeanceStatut = async function(rdvId, newStatut, patientId) {
  const updateData = { statut: newStatut };
  if (newStatut === 'Annulée') {
    updateData.tarif = 0;
  }

  const { error } = await supabaseClient
    .from('rendez_vous')
    .update(updateData)
    .eq('id', rdvId);

  if (error) {
    alert("Erreur lors de la mise à jour du statut : " + error.message);
  } else {
    window.viewPatientDetail(patientId);
    loadUpcomingRDV();
  }
};

// 5. Enregistrer le compte-rendu
window.saveCompteRendu = async function(rdvId, patientId) {
  const crValue = document.getElementById(`cr-${rdvId}`)?.value.trim() || '';

  const { error } = await supabaseClient
    .from('rendez_vous')
    .update({ compte_rendu: crValue })
    .eq('id', rdvId);

  if (error) {
    alert("Erreur lors de la sauvegarde du compte-rendu : " + error.message);
  } else {
    alert("Compte-rendu sauvegardé !");
  }
};

window.closePatientDetailModal = function() {
  document.getElementById('modal-patient-detail')?.classList.add('hidden');
};

// 6. Action ➕ : Pré-remplir la séance
window.addRdvForPatient = async function(patientId) {
  window.closePatientsModal();
  hideAllForms();
  await loadPatientsDropdowns();

  const select = document.getElementById('rdv-patient');
  if (select) select.value = patientId;

  document.getElementById('form-new-rdv-container')?.classList.remove('hidden');
};

// 7. Supprimer un patient
window.deletePatientModal = async function(patientId, patientName) {
  if (confirm(`Êtes-vous sûre de vouloir supprimer le patient "${patientName}" et tous ses rendez-vous associés ?`)) {
    const { error } = await supabaseClient.from('patients').delete().eq('id', patientId);
    if (error) alert("Erreur : " + error.message);
    else {
      alert("Patient supprimé.");
      window.openPatientsModal();
      loadUpcomingRDV();
    }
  }
};

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

// 8. Chargement des rendez-vous à venir
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
    const displayTarif = r.statut === 'Annulée' ? 0 : (r.tarif || 0);

    return `
      <div class="rdv-item clickable-rdv" onclick="viewPatientDetail('${r.patient_id}')" style="cursor:pointer;" title="Cliquer pour ouvrir la fiche patient">
        <div class="rdv-title">${dateStr} à ${timeStr} — ${r.patients ? r.patients.nom.toUpperCase() + ' ' + r.patients.prenom : 'Patient inconnu'}</div>
        <div class="rdv-info">
          Motif : ${r.motif || 'Non renseigné'} | Tarif : ${displayTarif} € | Statut : <strong>${r.statut}</strong>
        </div>
      </div>
    `;
  }).join('');
}

// 9. Comptabilité Mensuelle
async function loadComptaMonth(yearMonth) {
  const tableBody = document.getElementById('compta-table-body');
  if (!tableBody || !supabaseClient) return;

  const [year, month] = yearMonth.split('-');
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data: rdvs, error } = await supabaseClient
    .from('rendez_vous')
    .select('id, date_heure, motif, tarif, statut, patient_id, patients(nom, prenom)')
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
      const currentTarif = r.statut === 'Annulée' ? 0 : Number(r.tarif || 0);

      if (r.statut === 'Clôturée' || r.statut === 'Réglé') totalPaid += currentTarif;
      if (r.statut === 'À venir') totalPending += currentTarif;

      const dt = new Date(r.date_heure).toLocaleDateString('fr-FR');

      return `
        <tr>
          <td>${dt}</td>
          <td>${r.patients ? r.patients.nom.toUpperCase() + ' ' + r.patients.prenom : 'Inconnu'}</td>
          <td>${r.motif || ''}</td>
          <td>${currentTarif} €</td>
          <td>${r.statut}</td>
          <td><button class="btn-secondary" onclick="viewPatientDetail('${r.patient_id}')">Fiche</button></td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('summary-total-count').textContent = rdvs ? rdvs.length : 0;
  document.getElementById('summary-paid-amount').textContent = `${totalPaid.toFixed(2)} €`;
  document.getElementById('summary-pending-amount').textContent = `${totalPending.toFixed(2)} €`;
}

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

  // Mise à jour automatique du tarif au changement de motif
  document.getElementById('rdv-motif')?.addEventListener('change', (e) => {
    const selectedMotif = e.target.value;
    const tarifInput = document.getElementById('rdv-tarif');
    if (tarifInput && TARIFS_MOTIFS[selectedMotif] !== undefined) {
      tarifInput.value = TARIFS_MOTIFS[selectedMotif];
    }
  });

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

  // Enregistrement de la séance
  document.getElementById('rdv-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patient_id = document.getElementById('rdv-patient').value;
    const date_heure = document.getElementById('rdv-datetime').value;
    const motif = document.getElementById('rdv-motif').value;
    let tarif = parseFloat(document.getElementById('rdv-tarif').value) || 0;
    const compte_rendu = document.getElementById('rdv-compte-rendu')?.value.trim() || null;

    const rdvDate = new Date(date_heure);
    const now = new Date();
    const statutInitial = rdvDate >= now ? "À venir" : "Clôturée";

    if (statutInitial === "Annulée") {
      tarif = 0;
    }

    const { error } = await supabaseClient.from('rendez_vous').insert([{
      patient_id, date_heure, motif, tarif, statut: statutInitial, compte_rendu
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
