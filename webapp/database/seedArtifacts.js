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
    db.run(sql, params, function (err) {
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
    console.log('Fetching sessions...');
    const sessions = await getAllAsync('SELECT id, title FROM sessions ORDER BY id');

    if (sessions.length === 0) {
      console.error('No sessions found! Run seedUsersAndSessions.js first.');
      process.exit(1);
    }

    console.log(`Found ${sessions.length} sessions\n`);

    // 2. Read mock data files
    console.log('Reading mock data files...');
    const mockFlashcards = JSON.parse(fs.readFileSync(mockFlashcardsPath, 'utf8'));
    const mockMCQ = JSON.parse(fs.readFileSync(mockMCQPath, 'utf8'));
    const mockInsights = JSON.parse(fs.readFileSync(mockInsightsPath, 'utf8'));
    console.log('Mock data loaded\n');

    const sessionCount = sessions.length;
    let totalArtifacts = 0;
    let totalFlashcards = 0;
    let totalMCQ = 0;
    let totalInsights = 0;
    let totalEquations = 0;

    // 3. Insert Flashcards (round-robin across sessions)
    console.log('Inserting flashcards across sessions...');
    for (let i = 0; i < mockFlashcards.cards.length; i++) {
      const card = mockFlashcards.cards[i];
      const target = sessions[i % sessionCount];
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
        [target.id, 'flashcard', (card.front || '').substring(0, 50) + '...', content]
      );
      totalArtifacts++;
      totalFlashcards++;
    }
    console.log(`Inserted ${totalFlashcards} flashcards.`);

    // 4. Insert MCQ Questions (round-robin across sessions)
    console.log('Inserting MCQ questions across sessions...');
    for (let i = 0; i < mockMCQ.questions.length; i++) {
      const question = mockMCQ.questions[i];
      const target = sessions[i % sessionCount];
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
        [target.id, 'multiple_choice', (question.stem || '').substring(0, 50) + '...', content]
      );
      totalArtifacts++;
      totalMCQ++;
    }
    console.log(`Inserted ${totalMCQ} MCQ questions.`);

    // 5. Insert Insights (max 3 per session)
    console.log('Inserting insights (max 3 per session)...');
    let insightIdx = 0;
    for (const session of sessions) {
      let insertedForSession = 0;
      while (insertedForSession < 3 && insightIdx < mockInsights.insights.length) {
        const insight = mockInsights.insights[insightIdx++];
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
          [session.id, 'insights', insight.title, content]
        );
        insertedForSession++;
        totalArtifacts++;
        totalInsights++;
      }
    }
    console.log(`Inserted ${totalInsights} insights across ${sessions.length} session(s).`);

    // 6. Insert Equations (static data, round-robin)
    console.log('Inserting equations across sessions...');
    const equations = [
      {
        title: 'Markovnikov Addition',
        equation: 'R2C=CH2 + HX -> R2CH-CH2X',
        description: 'In the addition of HX to an alkene, hydrogen adds to the carbon with more hydrogens.'
      },
      {
        title: 'E2 Elimination',
        equation: 'R3C-CHR-X + Base -> R2C=CR + HX + Base-H',
        description: 'Single-step elimination requiring anti-coplanar geometry between beta-hydrogen and leaving group.'
      },
      {
        title: 'Ozonolysis',
        equation: 'R2C=CR2 + O3 -> R2C=O + O=CR2',
        description: 'Oxidative cleavage of alkenes using ozone to form carbonyl compounds.'
      }
    ];

    for (let i = 0; i < equations.length; i++) {
      const eq = equations[i];
      const target = sessions[i % sessionCount];
      const content = JSON.stringify({
        title: eq.title,
        equation: eq.equation,
        description: eq.description
      });

      await runAsync(
        'INSERT INTO study_artifacts (session_id, type, title, content) VALUES (?, ?, ?, ?)',
        [target.id, 'equation', eq.title, content]
      );
      totalArtifacts++;
      totalEquations++;
    }
    console.log(`Inserted ${totalEquations} equations.`);

    console.log('\n' + '='.repeat(50));
    console.log('ARTIFACTS SEED COMPLETE');
    console.log('='.repeat(50));
    console.log(`\nInserted ${totalArtifacts} artifacts across ${sessions.length} session(s).`);
    console.log('\nBreakdown:');
    console.log(`  - ${totalFlashcards} flashcards`);
    console.log(`  - ${totalMCQ} MCQ questions`);
    console.log(`  - ${totalInsights} insights (max 3 per session)`);
    console.log(`  - ${totalEquations} equations`);
    console.log('\nReady to test in the frontend!\n');

  } catch (error) {
    console.error('Error seeding artifacts:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

seedArtifacts();

