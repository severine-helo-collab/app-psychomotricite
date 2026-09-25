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
  "Bilan sensoriel de Dunn": 130,
  "Séance nourrisson": 50,
  "Séance enfant/ado": 50,
  "Séance adultes/personne âgée": 50,
  "Autre": 0
};

// 1. Charger et afficher la liste des patients
window.openPatientsModal = async function() {
  console.log("-> Ouverture / Chargement de la liste des patients...");
  
  // Chercher les conteneurs possibles
  const container = document.getElementById('modal-patients-body') || document.getElementById('upcoming-rdv-list');
  const modal = document.getElementById('modal-patients-list');

  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'block'; // Secours au cas où .hidden ne gère pas le display
  }

  if (!container) {
    console.error("Erreur : Aucun conteneur HTML trouvé ('modal-patients-body' ou 'upcoming-rdv-list')");
    return;
  }

  if (!supabaseClient) {
    console.error("Erreur : supabaseClient n'est pas initialisé.");
    container.innerHTML = '<p style="color:red;">Erreur d'initialisation de Supabase.</p>';
    return;
  }

  container.innerHTML = '<p>Chargement des patients...</p>';

  const { data: patients, error } = await supabaseClient
    .from('patients')
    .select('*')
    .order('nom', { ascending: true });

  if (error) {
    console.error("Erreur Supabase lors du fetch patients :", error);
    container.innerHTML = `<p style="color:red;">Erreur lors de la récupération : ${error.message}</p>`;
    return;
  }

  if (!patients || patients.length === 0) {
    container.innerHTML = '<p>Aucun patient enregistré.</p>';
    return;
  }

  container.innerHTML = patients.map(p => `
    <div class="modal-patient-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
      <div class="modal-patient-name" style="font-weight:bold;">${(p.nom || '').toUpperCase()} ${p.prenom || ''}</div>
      <div class="patient-actions" style="display:flex; gap:8px;">
        <button class="icon-btn" title="Voir la fiche" onclick="viewPatientDetail('${p.id}')">👁️</button>
        <button class="icon-btn" title="Ajouter une séance" onclick="addRdvForPatient('${p.id}')">➕</button>
        <button class="icon-btn danger-icon" title="Supprimer le patient" onclick="deletePatientModal('${p.id}', '${(p.nom || '').toUpperCase()} ${p.prenom || ''}')">❌</button>
      </div>
    </div>
  `).join('');
};

window.closePatientsModal = function() {
  const modal = document.getElementById('modal-patients-list');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
};

// 2. Carte d'une séance
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

// 3. Fiche Patient
window.viewPatientDetail = async function(patientId) {
  const modal = document.getElementById('modal-patient-detail');
  const title = document.getElementById('patient-detail-title');
  const body = document.getElementById('patient-detail-body');
  if (!modal || !body || !supabaseClient) return;

  modal.classList.remove('hidden');
  modal.style.display = 'block';
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

  const { data: rdvs } = await supabaseClient
    .from('rendez_vous')
    .select('*')
    .eq('patient_id', patientId)
    .order('date_heure', { ascending: true });

  if (title) title.textContent = `Fiche de ${patient.prenom} ${(patient.nom || '').toUpperCase()}`;
  const dobStr = patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : 'Non renseignée';

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
      <p><strong>Nom :</strong> ${(patient.nom || '').toUpperCase()}</p>
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
  if (newStatut === 'Annulée') updateData.tarif = 0;

  const { error } = await supabaseClient.from('rendez_vous').update(updateData).eq('id', rdvId);
  if (error) alert("Erreur : " + error.message);
  else window.viewPatientDetail(patientId);
};

// 5. Sauvegarder le compte-rendu
window.saveCompteRendu = async function(rdvId, patientId) {
  const crValue = document.getElementById(`cr-${rdvId}`)?.value.trim() || '';
  const { error } = await supabaseClient.from('rendez_vous').update({ compte_rendu: crValue }).eq('id', rdvId);
  if (error) alert("Erreur : " + error.message);
  else alert("Compte-rendu sauvegardé !");
};

window.closePatientDetailModal = function() {
  const modal = document.getElementById('modal-patient-detail');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
};

window.addRdvForPatient = async function(patientId) {
  window.closePatientsModal();
  hideAllForms();
  await loadPatientsDropdowns();

  const select = document.getElementById('rdv-patient');
  if (select) select.value = patientId;

  const formRdv = document.getElementById('form-new-rdv-container');
  if (formRdv) {
    formRdv.classList.remove('hidden');
    formRdv.style.display = 'block';
  }
};

window.deletePatientModal = async function(patientId, patientName) {
  if (confirm(`Êtes-vous sûre de vouloir supprimer le patient "${patientName}" et tous ses rendez-vous ?`)) {
    const { error } = await supabaseClient.from('patients').delete().eq('id', patientId);
    if (error) alert("Erreur : " + error.message);
    else {
      alert("Patient supprimé.");
      window.openPatientsModal();
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
    (patients || []).map(p => `<option value="${p.id}">${(p.nom || '').toUpperCase()} ${p.prenom || ''}</option>`).join('');

  if (rdvSelect) rdvSelect.innerHTML = optionsHTML;
  if (deleteSelect) deleteSelect.innerHTML = optionsHTML;
}

function hideAllForms() {
  ['form-new-patient-container', 'form-delete-patient-container', 'form-new-rdv-container'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  });
}

function switchNav(view) {
  console.log("-> Changement d'onglet vers :", view);
  const patientsBtn = document.getElementById('nav-patients-btn');
  const comptaBtn = document.getElementById('nav-compta-btn');
  const patientsSection = document.getElementById('view-patients-section');
  const comptaSection = document.getElementById('view-compta-section');

  hideAllForms();

  if (view === 'patients') {
    if (patientsBtn) {
      patientsBtn.textContent = 'Patient';
      patientsBtn.classList.add('active');
    }
    if (comptaBtn) comptaBtn.classList.remove('active');

    if (patientsSection) {
      patientsSection.classList.remove('hidden');
      patientsSection.style.display = 'block';
    }
    if (comptaSection) {
      comptaSection.classList.add('hidden');
      comptaSection.style.display = 'none';
    }

    window.openPatientsModal();
  } else if (view === 'compta') {
    if (comptaBtn) comptaBtn.classList.add('active');
    if (patientsBtn) patientsBtn.classList.remove('active');

    if (comptaSection) {
      comptaSection.classList.remove('hidden');
      comptaSection.style.display = 'block';
    }
    if (patientsSection) {
      patientsSection.classList.add('hidden');
      patientsSection.style.display = 'none';
    }

    window.closePatientsModal();

    const monthInput = document.getElementById('compta-month-select');
    if (monthInput && !monthInput.value) {
      const now = new Date();
      monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    if (monthInput) loadComptaMonth(monthInput.value);
  }
}

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
      const patientNom = r.patients ? `${(r.patients.nom || '').toUpperCase()} ${r.patients.prenom || ''}` : 'Inconnu';

      return `
        <tr>
          <td>${dt}</td>
          <td>${patientNom}</td>
          <td>${r.motif || ''}</td>
          <td>${currentTarif} €</td>
          <td>${r.statut}</td>
          <td><button class="btn-secondary" onclick="viewPatientDetail('${r.patient_id}')">Fiche</button></td>
        </tr>
      `;
    }).join('');
  }

  const elCount = document.getElementById('summary-total-count');
  const elPaid = document.getElementById('summary-paid-amount');
  const elPending = document.getElementById('summary-pending-amount');

  if (elCount) elCount.textContent = rdvs ? rdvs.length : 0;
  if (elPaid) elPaid.textContent = `${totalPaid.toFixed(2)} €`;
  if (elPending) elPending.textContent = `${totalPending.toFixed(2)} €`;

  updateBilanCalculs(totalPaid);
}

function updateBilanCalculs(totalPaid) {
  const CHARGES_FIXES = 486.82;
  const fournituresInput = document.getElementById('input-fournitures');
  const fournitures = fournituresInput ? parseFloat(fournituresInput.value) || 0 : 10;
  const totalChargesExploitation = CHARGES_FIXES + fournitures;

  const urssafSelect = document.getElementById('urssaf-rate-select');
  const urssafRate = urssafSelect ? parseFloat(urssafSelect.value) : 0.176;

  const montantUrssaf = totalPaid * urssafRate;
  const beneficeNet = totalPaid - montantUrssaf - totalChargesExploitation;

  const caEl = document.getElementById('bilan-ca');
  const urssafEl = document.getElementById('bilan-urssaf');
  const chargesEl = document.getElementById('bilan-charges');
  const netEl = document.getElementById('bilan-net');

  if (caEl) caEl.textContent = `${totalPaid.toFixed(2)} €`;
  if (urssafEl) urssafEl.textContent = `- ${montantUrssaf.toFixed(2)} € (${(urssafRate * 100).toFixed(1)}%)`;
  if (chargesEl) chargesEl.textContent = `- ${totalChargesExploitation.toFixed(2)} €`;

  if (netEl) {
    netEl.textContent = `${beneficeNet.toFixed(2)} €`;
    netEl.style.color = beneficeNet >= 0 ? '#28a745' : '#dc3545';
  }
}

async function checkAuth() {
  const authSection = document.getElementById('auth-section');
  const dashboard = document.getElementById('dashboard');

  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    if (authSection) authSection.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');
    switchNav('patients');
  } else {
    if (authSection) authSection.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  // Renommer le bouton de gauche en "Patient"
  const patientsBtn = document.getElementById('nav-patients-btn');
  if (patientsBtn) {
    patientsBtn.textContent = 'Patient';
    patientsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchNav('patients');
    });
  }

  document.getElementById('nav-compta-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchNav('compta');
  });

  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'rdv-motif') {
      const selectedMotif = e.target.value;
      const tarifInput = document.getElementById('rdv-tarif');
      if (tarifInput && TARIFS_MOTIFS[selectedMotif] !== undefined) {
        tarifInput.value = TARIFS_MOTIFS[selectedMotif];
      }
    }
  });

  document.getElementById('btn-open-new-patient')?.addEventListener('click', () => {
    hideAllForms();
    const el = document.getElementById('form-new-patient-container');
    if (el) { el.classList.remove('hidden'); el.style.display = 'block'; }
  });

  document.getElementById('btn-open-delete-patient')?.addEventListener('click', () => {
    hideAllForms();
    loadPatientsDropdowns();
    const el = document.getElementById('form-delete-patient-container');
    if (el) { el.classList.remove('hidden'); el.style.display = 'block'; }
  });

  document.getElementById('btn-open-new-rdv')?.addEventListener('click', () => {
    hideAllForms();
    loadPatientsDropdowns();
    const el = document.getElementById('form-new-rdv-container');
    if (el) { el.classList.remove('hidden'); el.style.display = 'block'; }
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
      window.openPatientsModal();
    }
  });

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

    const { error } = await supabaseClient.from('rendez_vous').insert([{
      patient_id, date_heure, motif, tarif, statut: statutInitial, compte_rendu
    }]);

    if (error) alert("Erreur : " + error.message);
    else {
      alert("Rendez-vous programmé !");
      document.getElementById('rdv-form').reset();
      hideAllForms();
      switchNav('patients');
    }
  });
});
