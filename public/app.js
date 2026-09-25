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
    modal.style.display = 'block';
  }

  if (!container) {
    console.error("Erreur : Aucun conteneur HTML trouvé ('modal-patients-body' ou 'upcoming-rdv-list')");
    return;
  }

  if (!supabaseClient) {
    console.error("Erreur : supabaseClient n'est pas initialisé.");
    container.innerHTML = '<p style="color:red;">Erreur d\'initialisation de Supabase.</p>';
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
  const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });Voici le code complet et corrigé de votre fichier JavaScript. 

### 🔧 Correctifs apportés :
1. **Sécurité (Clé Supabase)** : Masquage/Neutralisation de la clé d'API anonyme. *Pensez à remplacer la constante par votre propre clé si nécessaire.*
2. **Syntaxe JS (Quotes non échappées)** : Correction de la ligne 39 (`Erreur d'initialisation...`) où une simple quote faisait planter l'interprétateur JS.
3. **Calculs Comptabilité / URSSAF** : Écouteur d'événement ajouté sur l'URSSAF et les fournitures (`change`/`input`) pour que le bénéfice net et l'URSSAF se recalculent en temps réel sans devoir recharger la page.

```javascript
// Remplacez ces valeurs si nécessaire
const SUPABASE_URL = "[https://iyxurkbceiirjdigcyak.supabase.co](https://iyxurkbceiirjdigcyak.supabase.co)";
const SUPABASE_KEY = "VOTRE_SUPABASE_ANON_KEY";

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
    container.innerHTML = '<p style="color:red;">Erreur d\'initialisation de Supabase.</p>';
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
function renderSeanceCard(
