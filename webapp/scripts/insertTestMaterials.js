// Script to insert test study materials into SQLite database
// Run with: node scripts/insertTestMaterials.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path - adjust as needed
const dbPath = path.join(__dirname, '..', 'database', 'studycoach.db');
const db = new sqlite3.Database(dbPath);

// Test materials to insert
const testMaterials = [
  {
    session_id: 1,
    type: 'flashcard',
    title: 'Alkene Reactions',
    content: JSON.stringify({
      question: 'What is the major product of hydrobromination of 2-methylpropene?',
      answer: '2-bromo-2-methylpropane (Markovnikov addition)',
      difficulty: 'medium'
    })
  },
  {
    session_id: 1,
    type: 'summary',
    title: 'Stereochemistry Principles',
    content: 'Covers chirality, optical activity, and R/S nomenclature. Key concepts include understanding how to assign R and S configurations, recognizing chiral centers, and predicting optical activity of compounds.'
  },
  {
    session_id: 1,
    type: 'flashcard',
    title: 'Elimination vs Substitution',
    content: JSON.stringify({
      question: 'When does E2 elimination occur preferentially over SN2?',
      answer: 'With bulky bases and secondary/tertiary substrates',
      difficulty: 'hard'
    })
  },
  {
    session_id: 1,
    type: 'quiz',
    title: 'Reaction Mechanisms Quiz',
    content: JSON.stringify({
      questions: [
        {
          question: 'Which mechanism involves a carbocation intermediate?',
          options: ['SN1', 'SN2', 'E2', 'None'],
          correct: 0
        },
        {
          question: 'What type of substrate favors SN2 reactions?',
          options: ['Primary', 'Secondary', 'Tertiary', 'All equally'],
          correct: 0
        }
      ]
    })
  },
  {
    session_id: 2,
    type: 'equation',
    title: 'Integration by Parts',
    content: JSON.stringify({
      formula: '∫u dv = uv - ∫v du',
      example: '∫x·e^x dx',
      solution: 'Let u=x, dv=e^x dx, then du=dx, v=e^x...'
    })
  },
  {
    session_id: 2,
    type: 'flashcard',
    title: 'Derivative Rules',
    content: JSON.stringify({
      question: 'What is the derivative of ln(x)?',
      answer: '1/x',
      difficulty: 'easy'
    })
  }
];

// Insert materials
db.serialize(() => {
  const insertStmt = db.prepare(
    `INSERT INTO study_materials (session_id, type, title, content, created_at) 
     VALUES (?, ?, ?, ?, datetime('now'))`
  );

  console.log('Inserting test materials...\n');

  testMaterials.forEach((material, index) => {
    insertStmt.run(
      [material.session_id, material.type, material.title, material.content],
      (err) => {
        if (err) {
          console.error(`Error inserting material ${index + 1}:`, err.message);
        } else {
          console.log(`✓ Inserted: [${material.type}] ${material.title} (Session ${material.session_id})`);
        }
      }
    );
  });

  insertStmt.finalize(() => {
    console.log('\n✓ All test materials inserted successfully!');
    
    // Query and display inserted materials
    db.all(
      `SELECT sm.*, s.title as session_title 
       FROM study_materials sm 
       JOIN sessions s ON sm.session_id = s.id 
       ORDER BY sm.session_id, sm.id`,
      (err, rows) => {
        if (err) {
          console.error('Error querying materials:', err.message);
        } else {
          console.log(`\nTotal materials in database: ${rows.length}\n`);
          console.log('Materials by session:');
          let currentSession = null;
          rows.forEach(row => {
            if (row.session_id !== currentSession) {
              currentSession = row.session_id;
              console.log(`\n  Session ${row.session_id}: ${row.session_title}`);
            }
            console.log(`    - [${row.type}] ${row.title}`);
          });
        }
        db.close();
      }
    );
  });
});