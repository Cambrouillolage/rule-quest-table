const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Configuration CORS pour Lovable et développement local
const corsOptions = {
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000',  // Alternative dev port
    'https://lovable.dev',    // Lovable platform
    /\.lovable\.dev$/,        // Tous les sous-domaines Lovable
    process.env.FRONTEND_URL  // URL production personnalisée
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
};

// Configuration base de données PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'boardgames_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Middleware de logging pour debug
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// ==================== ROUTES JEUX ====================

// Récupérer tous les jeux
app.get('/api/games', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, 
             COUNT(q.id) as question_count
      FROM games g
      LEFT JOIN questions q ON g.id = q.game_id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `);
    
    // Transformer les données pour le frontend TypeScript
    const games = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      official_rules: row.official_rules || '',
      custom_rules: row.custom_rules || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      question_count: parseInt(row.question_count) || 0
    }));
    
    res.json(games);
  } catch (error) {
    console.error('Erreur récupération jeux:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: 'Impossible de récupérer les jeux'
    });
  }
});

// Récupérer un jeu spécifique
app.get('/api/games/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'ID invalide',
        message: 'L\'ID du jeu doit être un nombre'
      });
    }
    
    const result = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Jeu non trouvé',
        message: `Aucun jeu trouvé avec l'ID ${id}`
      });
    }
    
    const game = {
      ...result.rows[0],
      official_rules: result.rows[0].official_rules || '',
      custom_rules: result.rows[0].custom_rules || ''
    };
    
    res.json(game);
  } catch (error) {
    console.error('Erreur récupération jeu:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: 'Impossible de récupérer le jeu'
    });
  }
});

// Créer un nouveau jeu
app.post('/api/games', async (req, res) => {
  try {
    const { name, description, official_rules, custom_rules } = req.body;
    
    // Validation des données
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        message: 'Le nom du jeu est requis'
      });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        message: 'La description du jeu est requise'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO games (name, description, official_rules, custom_rules) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        name.trim(), 
        description.trim(), 
        official_rules?.trim() || '', 
        custom_rules?.trim() || ''
      ]
    );
    
    const game = {
      ...result.rows[0],
      official_rules: result.rows[0].official_rules || '',
      custom_rules: result.rows[0].custom_rules || ''
    };
    
    res.status(201).json(game);
  } catch (error) {
    console.error('Erreur création jeu:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: 'Impossible de créer le jeu'
    });
  }
});

// Mettre à jour un jeu
app.put('/api/games/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, official_rules, custom_rules } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'ID invalide',
        message: 'L\'ID du jeu doit être un nombre'
      });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        message: 'Le nom du jeu est requis'
      });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        message: 'La description du jeu est requise'
      });
    }
    
    const result = await pool.query(
      `UPDATE games 
       SET name = $1, description = $2, official_rules = $3, custom_rules = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 RETURNING *`,
      [
        name.trim(), 
        description.trim(), 
        official_rules?.trim() || '', 
        custom_rules?.trim() || '', 
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Jeu non trouvé',
        message: `Aucun jeu trouvé avec l'ID ${id}`
      });
    }
    
    const game = {
      ...result.rows[0],
      official_rules: result.rows[0].official_rules || '',
      custom_rules: result.rows[0].custom_rules || ''
    };
    
    res.json(game);
  } catch (error) {
    console.error('Erreur mise à jour jeu:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: 'Impossible de mettre à jour le jeu'
    });
  }
});

// Supprimer un jeu
app.delete('/api/games/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'ID invalide',
        message: 'L\'ID du jeu doit être un nombre'
      });
    }
    
    const result = await pool.query('DELETE FROM games WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Jeu non trouvé',
        message: `Aucun jeu trouvé avec l'ID ${id}`
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression jeu:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: 'Impossible de supprimer le jeu'
    });
  }
});

// ==================== ROUTE QUESTIONS/IA ====================

// Poser une question sur un jeu
app.post('/api/games/:id/ask', async (req, res) => {
  try {
    const { id } = req.params;
    const { question } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'ID invalide',
        message: 'L\'ID du jeu doit être un nombre'
      });
    }
    
    if (!question || !question.trim()) {
      return res.status(400).json({ 
        error: 'Question manquante',
        message: 'Une question est requise'
      });
    }
    
    // Récupérer les informations du jeu
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Jeu non trouvé',
        message: `Aucun jeu trouvé avec l'ID ${id}`
      });
    }
    
    const game = gameResult.rows[0];
    
    // Construire le contexte pour l'IA
    const context = buildGameContext(game);
    
    // Créer le prompt pour l'IA