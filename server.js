const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du dossier "public"
app.use(express.static(path.join(__dirname, 'public')));

// Initialisation de la table dans Supabase
async function initDb() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                motif VARCHAR(255),
                suivi VARCHAR(50) DEFAULT 'Hebdomadaire',
                statut VARCHAR(50) DEFAULT 'Actif',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table "patients" vérifiée / créée avec succès dans Supabase.');
    } catch (err) {
        console.error('Erreur lors de la création de la table :', err);
    }
}

initDb();

// ROUTE : Récupérer tous les patients
app.get('/api/patients', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM patients ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de la récupération des patients" });
    }
});

// ROUTE : Ajouter un patient
app.post('/api/patients', async (req, res) => {
    const { nom, prenom, motif, suivi } = req.body;

    if (!nom || !prenom) {
        return res.status(400).json({ error: "Le nom et le prénom sont obligatoires." });
    }

    try {
        const queryText = `
            INSERT INTO patients (nom, prenom, motif, suivi, statut) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *
        `;
        const values = [
            nom.toUpperCase(), 
            prenom, 
            motif || 'Non renseigné', 
            suivi || 'Hebdomadaire', 
            'Actif'
        ];

        const result = await db.query(queryText, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de l'enregistrement du patient" });
    }
});

// ROUTE : Modifier un patient
app.put('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    const { nom, prenom, motif, suivi, statut } = req.body;

    try {
        const queryText = `
            UPDATE patients 
            SET nom = $1, prenom = $2, motif = $3, suivi = $4, statut = $5 
            WHERE id = $6 
            RETURNING *
        `;
        const values = [
            nom.toUpperCase(), 
            prenom, 
            motif || 'Non renseigné', 
            suivi || 'Hebdomadaire', 
            statut || 'Actif',
            id
        ];

        const result = await db.query(queryText, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Patient introuvable." });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de la modification du patient" });
    }
});

// ROUTE : Supprimer un patient
app.delete('/api/patients/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query('DELETE FROM patients WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Patient introuvable." });
        }
        res.json({ message: "Patient supprimé avec succès." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de la suppression du patient" });
    }
});

// Redirection automatique vers l'interface HTML sur la racine /
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});