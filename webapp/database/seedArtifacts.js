const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'studycoach.db');
const db = new sqlite3.Database(dbPath);

// Paths to mock data files
const mockDataPath = path.join(__dirname, '../cognitive-coach/src/assets/data');
const mockFlashcardsPath = path.join(mockDataPath, 'mockFlashcards.json');
const mockMCQPath = path.join(mockDataPath, 'mockMCQ.json');
const mockInsightsPath = path.join(mockDataPath, 'mockInsights.json');

console.log('Seeding study artifacts...\n');

// Helper to run async database operations
const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const getAllAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function seedArtifacts() {
  try {
    // 1. Get all sessions
    console.log('📋 Fetching sessions...');
    const sessions = await getAllAsync('SELECT id, title FROM sessions ORDER BY id');
    
    if (sessions.length === 0) {
      console.error('❌ No sessions found! Run seedUsersAndSessions.js first.');
      process.exit(1);
    }
    
    console.log(`✓ Found ${sessions.length} sessions\n`);

    // 2. Read mock data files
    console.log('📂 Reading mock data files...');
    const mockFlashcards = JSON.parse(fs.readFileSync(mockFlashcardsPath, 'utf8'));
    const mockMCQ = JSON.parse(fs.readFileSync(mockMCQPath, 'utf8'));
    const mockInsights = JSON.parse(fs.readFileSync(mockInsightsPath, 'utf8'));
    console.log('✓ Mock data loaded\n');

    // We'll assign artifacts to the first session (Organic Chemistry Review)
    const targetSession = sessions[0];
    console.log(`📝 Adding artifacts to session: "${targetSession.title}" (ID: ${targetSession.id})\n`);

    let totalArtifacts = 0;

    // 3. Insert Flashcards
    console.log('💳 Inserting flashcards...');
    for (const card of mockFlashcards.cards) {
      const content = JSON.stringify({
        id: card.id,
        front: card.front,
        back: card.back,
        tags: card.tags || [],
        difficulty: card.difficulty,
        source_refs: card.source_refs || [],
        hints: card.hints || []
      });
      
      await runAsync(
        'INSERT INTO study_artifacts (session_id, type, title, content) VALUES (?, ?, ?, ?)',
        [targetSession.id, 'flashcard', card.front.substring(0, 50) + '...', content]
      );
      totalArtifacts++;
    }
    console.log(`✓ Inserted ${mockFlashcards.cards.length} flashcards`);

    // 4. Insert MCQ Questions
    console.log('❓ Inserting MCQ questions...');
    for (const question of mockMCQ.questions) {
      const content = JSON.stringify({
        id: question.id,
        stem: question.stem,
        options: question.options,
        answer_index: question.answer_index,
        rationale: question.rationale,
        bloom_level: question.bloom_level,
        source_refs: question.source_refs || []
      });
      
      await runAsync(
        'INSERT INTO study_artifacts (session_id, type, title, content) VALUES (?, ?, ?, ?)',
        [targetSession.id, 'multiple_choice', question.stem.substring(0, 50) + '...', content]
      );
      totalArtifacts++;
    }
    console.log(`✓ Inserted ${mockMCQ.questions.length} MCQ questions`);

    // 5. Insert Insights
    console.log('💡 Inserting insights...');
    for (const insight of mockInsights.insights) {
      const content = JSON.stringify({
        id: insight.id,
        title: insight.title,
        takeaway: insight.takeaway,
        bullets: insight.bullets || [],
        action_items: insight.action_items || [],
        misconceptions: insight.misconceptions || [],
        confidence: insight.confidence,
        source_refs: insight.source_refs || []
      });
      
      await runAsync(
        'INSERT INTO study_artifacts (session_id, type, title, content) VALUES (?, ?, ?, ?)',
        [targetSession.id, 'insights', insight.title, content]
      );
      totalArtifacts++;
    }
    console.log(`✓ Inserted ${mockInsights.insights.length} insights`);

    // 6. Insert Equations (static data)
    console.log('➗ Inserting equations...');
    const equations = [
      {
        title: 'Markovnikov Addition',
        equation: 'R₂C=CH₂ + HX → R₂CH-CH₂X',
        description: 'In the addition of HX to an alkene, hydrogen adds to the carbon with more hydrogens.'
      },
      {
        title: 'E2 Elimination',
        equation: 'R₃C-CHR-X + Base → R₂C=CR + HX + Base-H⁺',
        description: 'Single-step elimination requiring anti-coplanar geometry between β-hydrogen and leaving group.'
      },
      {
        title: 'Ozonolysis',
        equation: 'R₂C=CR₂ + O₃ → R₂C=O + O=CR₂',
        description: 'Oxidative cleavage of alkenes using ozone to form carbonyl compounds.'
      }
    ];

    for (const eq of equations) {
      const content = JSON.stringify({
        title: eq.title,
        equation: eq.equation,
        description: eq.description
      });
      
      await runAsync(
        'INSERT INTO study_artifacts (session_id, type, title, content) VALUES (?, ?, ?, ?)',
        [targetSession.id, 'equation', eq.title, content]
      );
      totalArtifacts++;
    }
    console.log(`✓ Inserted ${equations.length} equations`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ ARTIFACTS SEED COMPLETE');
    console.log('='.repeat(50));
    console.log(`\nInserted ${totalArtifacts} artifacts into session "${targetSession.title}"`);
    console.log('\nBreakdown:');
    console.log(`  - ${mockFlashcards.cards.length} flashcards`);
    console.log(`  - ${mockMCQ.questions.length} MCQ questions`);
    console.log(`  - ${mockInsights.insights.length} insights`);
    console.log(`  - ${equations.length} equations`);
    console.log('\nReady to test in the frontend!\n');

  } catch (error) {
    console.error('❌ Error seeding artifacts:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

seedArtifacts();