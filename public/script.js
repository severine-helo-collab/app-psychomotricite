<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cabinet de Psychomotricité - Gestion Patientèle</title>
  <link rel="stylesheet" href="style.css">
  <!-- CDN Supabase JS -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="script.js" defer></script>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px;">

  <div class="container" style="max-width: 1000px; margin: 0 auto;">

    <!-- SECTION CONNEXION -->
    <section id="login-section" style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 400px; margin: 50px auto;">
      <h2 style="margin-top: 0; text-align: center;">Connexion</h2>
      <form id="login-form" style="display: flex; flex-direction: column; gap: 15px;">
        <div>
          <label for="login-email" style="display: block; margin-bottom: 5px; font-weight: bold;">Email :</label>
          <input type="email" id="login-email" required style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div>
          <label for="login-password" style="display: block; margin-bottom: 5px; font-weight: bold;">Mot de passe :</label>
          <input type="password" id="login-password" required style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <button type="submit" style="background: #3498db; color: white; border: none; padding: 10px; border-radius: 4px; font-weight: bold; cursor: pointer;">
          Se connecter
        </button>
      </form>
      <p id="auth-error" style="color: #e74c3c; margin-top: 15px; text-align: center; font-weight: bold;"></p>
    </section>

    <!-- SECTION APPLICATION (TABLEAU DE BORD) -->
    <section id="app-section" class="hidden" style="display: none;">
      <!-- En-tête du tableau de bord -->
      <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <h2 style="margin: 0; color: #2c3e50;">📊 Tableau de bord</h2>
        <button onclick="logout()" style="background-color: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">
          Se déconnecter
        </button>
      </header>

      <!-- Cartes de statistiques rapides -->
      <div style="display: flex; gap: 20px; margin-bottom: 25px;">
        <div style="background: white; border-left: 5px solid #3498db; padding: 15px 20px; border-radius: 6px; flex: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <h4 style="margin: 0; color: #7f8c8d; font-size: 0.9em; text-transform: uppercase;">Total Patients</h4>
          <p id="stat-total-patients" style="font-size: 2em; font-weight: bold; margin: 5px 0 0 0; color: #2c3e50;">0</p>
        </div>
      </div>

      <!-- Disposition du tableau de bord en 2 colonnes -->
      <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <!-- Colonne Gauche : Formulaire de création -->
        <div style="flex: 1; min-width: 300px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <h3 style="margin-top: 0; color: #2c3e50;">➕ Nouveau Patient</h3>
          <form id="patient-form" style="display: flex; flex-direction: column; gap: 15px;">
            <div>
              <label for="patient-nom" style="display: block; margin-bottom: 5px; font-weight: bold;">Nom :</label>
              <input type="text" id="patient-nom" required style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div>
              <label for="patient-prenom" style="display: block; margin-bottom: 5px; font-weight: bold;">Prénom :</label>
              <input type="text" id="patient-prenom" required style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div>
              <label for="patient-dob" style="display: block; margin-bottom: 5px; font-weight: bold;">Date de naissance :</label>
              <input type="date" id="patient-dob" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <button type="submit" style="background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 4px; font-weight: bold; cursor: pointer;">
              Enregistrer le patient
            </button>
          </form>
        </div>

        <!-- Colonne Droite : Patientèle -->
        <div style="flex: 2; min-width: 320px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <h3 style="margin-top: 0; color: #2c3e50;">👥 Liste des Patients</h3>
          <div id="patient-list">
            <p>Chargement des données...</p>
          </div>
        </div>
      </div>
    </section>

  </div>

</body>
</html>
