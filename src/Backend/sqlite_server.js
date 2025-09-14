const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const OpenAI = require('openai');
const path = require('path');
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

// Configuration SQLite - fichier local
const dbPath = path.join(__dirname, 'boardgames.db');
const db = new sqlite3.Database(dbPath);

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

// ==================== INITIALISATION BASE DE DONNÉES ====================

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Créer la table games
      db.run(`
        CREATE TABLE IF NOT EXISTS games (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          official_rules TEXT DEFAULT '',
          custom_rules TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Créer la table questions
      db.run(`
        CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id INTEGER,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          context_used TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
        )
      `);

      // Insérer des données d'exemple si la table est vide
      db.get("SELECT COUNT(*) as count FROM games", (err, row) => {
        if (err) {
          console.error('Erreur lors de la vérification:', err);
          reject(err);
          return;
        }

        if (row.count === 0) {
          console.log('Insertion des jeux d\'exemple...');
          
          const sampleGames = [
            {
              name: 'Monopoly',
              description: 'Jeu de société classique d\'achat et de vente de propriétés',
              official_rules: `RÈGLES DE BASE:
- Chaque joueur commence avec 1500€
- Lancez les dés et déplacez-vous sur le plateau
- Achetez des propriétés non possédées sur lesquelles vous tombez
- Payez un loyer si vous tombez sur une propriété d'un autre joueur
- Construisez des maisons et hôtels pour augmenter les loyers
- Le but est d'être le dernier joueur non ruiné`,
              custom_rules: `VARIANTES MAISON:
- Argent gratuit sur le parking: tous les impôts vont sur la case parking gratuit
- Vente aux enchères accélérées: si un joueur refuse d'acheter, vente aux enchères immédiate`
            },
            {
              name: 'Scrabble',
              description: 'Jeu de formation de mots avec des lettres à points',
              official_rules: `RÈGLES OFFICIELLES:
- Chaque joueur pioche 7 lettres
- Formez des mots sur le plateau pour marquer des points
- Le premier mot doit passer par la case étoile centrale
- Les mots doivent être dans le dictionnaire officiel
- Cases multiplicatrices: mot compte double/triple, lettre compte double/triple`,
              custom_rules: `RÈGLES FAMILIALES:
- Noms propres autorisés
- Aide permise pour les enfants de moins de 12 ans`
            }
          ];

          sampleGames.forEach(game => {
            db.run(
              "INSERT INTO games (name, description, official_rules, custom_rules) VALUES (?, ?, ?, ?)",
              [game.name, game.description, game.official_rules, game.custom_rules]
            );
          });
        }
        
        resolve();
      });
    });
  });
}

// ==================== FONCTIONS UTILITAIRES ====================

function runAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ==================== ROUTES JEUX ====================

// Récupérer tous les jeux
app.get('/api/games', async (req, res) => {
  try {
    const games = await allAsync(`
      SELECT g.*, 
             COUNT(q.id) as question_count
      FROM games g
      LEFT JOIN questions q ON g.id = q.game_id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `);
    
    // Transformer les données pour le frontend TypeScript
    const formattedGames = games.map(game => ({
      id: game.id,
      name: game.name,
      description: game.description,
      official_rules: game.official_rules || '',
      custom_rules: game.custom_rules || '',
      created_at: game.created_at,
      updated_at: game.updated_at,
      question_count: game.question_count || 0
    }));
    
    res.json(formattedGames);
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
    
    const game = await getAsync('SELECT * FROM games WHERE id = ?', [id]);
    
    if (!game) {
      return res.status(404).json({ 
        error: 'Jeu non trouvé',
        message: `Aucun jeu trouvé avec l'ID ${id}`
      });
    }
    
    const formattedGame = {
      ...game,
      official_rules: game.official_rules || '',
      custom_rules: game.custom_rules || ''
    };
    
    res.json(formattedGame);
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
    
    const result = await runAsync(
      `INSERT INTO games (name, description, official_rules, custom_rules) 
       VALUES (?, ?, ?, ?)`,
      [
        name.trim(), 
        description.trim(), 
        official_rules?.trim() || '', 
        custom_rules?.trim() || ''
      ]
    );
    
    // Récupérer le jeu créé
    const newGame = await getAsync('SELECT * FROM games WHERE id = ?', [result.id]);
    
    const formattedGame = {
      ...newGame,
      official_rules: newGame.official_rules || '',
      custom_rules: newGame.custom_rules || ''
    };
    
    res.status(201).json(formattedGame);
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
    
    const result = await runAsync(
      `UPDATE games 
       SET name = ?, description = ?, official_rules = ?, custom_rules = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        name.trim(), 
        description.trim(), 
        official_rules?.trim() || '', 
        custom_rules?.trim() || '', 
        id
      ]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        error: 'Jeu non trouvé',
        message: `Aucun jeu trouvé avec l'ID ${id}`
      });
    }
    
    // Récupérer le jeu mis à jour
    const updatedGame = await getAsync('SELECT * FROM games WHERE id = ?', [id]);
    
    const formattedGame = {
      ...updatedGame,
      official_rules: updatedGame.official_rules || '',
      custom_rules: updatedGame.custom_rules || ''
    };
    
    res.json(formattedGame);
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
    
    const result = await runAsync('DELETE FROM games WHERE id = ?', [id]);
    
    if (result.changes === 0) {
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
    const game = await getAsync('SELECT * FROM games WHERE id = ?', [id]);
    
    if (!game) {
      return res.status(404).json({ 
        error: 'Jeu non trouvé',
        message: `Aucun jeu trouvé avec l'ID ${id}`
      });
    }
    
    // Construire le contexte pour l'IA
    const context = buildGameContext(game);
    
    // Créer le prompt pour l'IA
    const prompt = `Tu es un expert en jeux de société spécialisé dans "${game.name}". Réponds précisément à la question suivante en te basant UNIQUEMENT sur les règles fournies.

CONTEXTE DU JEU:
${context}

QUESTION: ${question.trim()}

INSTRUCTIONS:
- Réponds uniquement en te basant sur les règles fournies ci-dessus
- Si l'information n'est pas dans les règles, dis clairement "Cette information n'est pas précisée dans les règles fournies"
- Sois précis, concis et pédagogique
- Structure ta réponse avec des paragraphes si nécessaire
- N'invente aucune règle qui ne serait pas mentionnée`;

    // Appel à OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: [
        {
          role: "system",
          content: `Tu es un assistant IA spécialisé dans les jeux de société. Tu réponds précisément aux questions en te basant strictement sur les règles fournies.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3
    });
    
    const answer = completion.choices[0].message.content;
    
    if (!answer) {
      return res.status(500).json({
        error: 'Erreur IA',
        message: 'Aucune réponse générée par l\'IA'
      });
    }
    
    // Sauvegarder la question/réponse
    await runAsync(
      'INSERT INTO questions (game_id, question, answer, context_used) VALUES (?, ?, ?, ?)',
      [id, question.trim(), answer, context]
    );
    
    res.json({
      question: question.trim(),
      answer: answer,
      game_name: game.name,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erreur traitement question:', error);
    
    if (error.code === 'insufficient_quota') {
      res.status(429).json({ 
        error: 'Quota OpenAI dépassé',
        message: 'Limite de l\'API OpenAI atteinte. Veuillez réessayer plus tard.'
      });
    } else if (error.code === 'invalid_api_key') {
      res.status(401).json({
        error: 'Clé API invalide',
        message: 'Problème de configuration de l\'API OpenAI'
      });
    } else {
      res.status(500).json({ 
        error: 'Erreur serveur',
        message: 'Erreur lors du traitement de la question'
      });
    }
  }
});

// Récupérer l'historique des questions pour un jeu
app.get('/api/games/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'ID invalide',
        message: 'L\'ID du jeu doit être un nombre'
      });
    }
    
    const questions = await allAsync(
      `SELECT id, question, answer, created_at 
       FROM questions 
       WHERE game_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [id, limit]
    );
    
    const formattedQuestions = questions.map(q => ({
      id: q.id,
      game_id: parseInt(id),
      question: q.question,
      answer: q.answer,
      created_at: q.created_at
    }));
    
    res.json(formattedQuestions);
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: 'Impossible de récupérer l\'historique'
    });
  }
});

// ==================== FONCTIONS UTILITAIRES ====================

function buildGameContext(game) {
  let context = `JEU: ${game.name}\n`;
  context += `DESCRIPTION: ${game.description}\n\n`;
  
  if (game.official_rules && game.official_rules.trim()) {
    context += `RÈGLES OFFICIELLES:\n${game.official_rules.trim()}\n\n`;
  }
  
  if (game.custom_rules && game.custom_rules.trim()) {
    context += `RÈGLES PERSONNALISÉES/VARIANTES:\n${game.custom_rules.trim()}\n\n`;
  }
  
  if (!game.official_rules?.trim() && !game.custom_rules?.trim()) {
    context += `ATTENTION: Aucune règle spécifique n'a été fournie pour ce jeu.\n`;
  }
  
  return context;
}

// ==================== ROUTES DE SERVICE ====================

// Route de santé (health check)
app.get('/api/health', async (req, res) => {
  try {
    // Test de la base de données
    await getAsync('SELECT 1');
    
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected (SQLite)',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Route de test
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API fonctionnelle avec SQLite',
    env: process.env.NODE_ENV || 'development',
    cors_enabled: true,
    openai_configured: !!process.env.OPENAI_API_KEY,
    database: 'SQLite (local file)'
  });
});

// Middleware de gestion d'erreur globale
app.use((error, req, res, next) => {
  console.error('Erreur non gérée:', error);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur inattendue s\'est produite'
  });
});

// ==================== DÉMARRAGE ====================

// Initialiser la base de données puis démarrer le serveur
initDatabase()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`🚀 Serveur démarré sur le port ${port}`);
      console.log(`📋 API disponible sur http://localhost:${port}/api`);
      console.log(`🏥 Health check: http://localhost:${port}/api/health`);
      console.log(`💾 Base de données: SQLite (${dbPath})`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  ATTENTION: OPENAI_API_KEY non configurée');
      }
    });

    // Gestion des erreurs de démarrage
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Le port ${port} est déjà utilisé`);
      } else {
        console.error('❌ Erreur de démarrage du serveur:', error);
      }
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  });

// Fermeture propre
process.on('SIGINT', () => {
  console.log('\nArrêt du serveur...');
  db.close((err) => {
    if (err) {
      console.error('Erreur lors de la fermeture de la base de données:', err);
    } else {
      console.log('Base de données fermée.');
    }
    process.exit(0);
  });
});

module.exports = app;