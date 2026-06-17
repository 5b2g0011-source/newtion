import type { Quiz, Question } from '../types';

/**
 * Parses a quiz string in JSON or TOML format.
 * Automatically detects the format.
 */
export function parseQuiz(content: string): Quiz | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  // 1. Try JSON parsing
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        // Normalize fields
        return {
          title: parsed.title || '未命名測驗',
          description: parsed.description || '',
          questions: Array.isArray(parsed.questions) ? parsed.questions.map(normalizeQuestion) : []
        };
      }
    } catch (e) {
      console.warn('Failed to parse as JSON:', e);
    }
  }

  // 2. Try TOML parsing
  try {
    const quiz = parseTOML(trimmed);
    if (quiz && quiz.questions && quiz.questions.length > 0) {
      return quiz;
    }
  } catch (e) {
    console.warn('Failed to parse as TOML:', e);
  }

  return null;
}

/**
 * Normalizes question object to ensure standard fields are populated correctly.
 */
function normalizeQuestion(q: any, idx: number): Question {
  return {
    id: q.id || `q-${idx + 1}`,
    question: q.question || '未命名問題',
    options: Array.isArray(q.options) ? q.options.map(String) : ['選項一', '選項二'],
    answer: typeof q.answer === 'number' ? q.answer : 0,
    explanation: q.explanation || '',
    attempts: typeof q.attempts === 'number' ? q.attempts : 0,
    errors: typeof q.errors === 'number' ? q.errors : 0
  };
}

/**
 * Custom lightweight TOML parser for Newtion Quiz.
 */
function parseTOML(tomlStr: string): Quiz {
  const lines = tomlStr.split('\n');
  const quiz: Quiz = {
    title: '未命名測驗',
    description: '',
    questions: []
  };

  let currentQuestion: Partial<Question> | null = null;
  let inQuestionsTable = false;

  for (let line of lines) {
    line = line.trim();
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;

    // Check for [[questions]]
    if (line === '[[questions]]') {
      if (currentQuestion && currentQuestion.question && currentQuestion.options) {
        quiz.questions.push({
          id: currentQuestion.id || `q-${quiz.questions.length + 1}`,
          question: currentQuestion.question,
          options: currentQuestion.options,
          answer: typeof currentQuestion.answer === 'number' ? currentQuestion.answer : 0,
          explanation: currentQuestion.explanation || '',
          attempts: typeof currentQuestion.attempts === 'number' ? currentQuestion.attempts : 0,
          errors: typeof currentQuestion.errors === 'number' ? currentQuestion.errors : 0
        });
      }
      currentQuestion = {};
      inQuestionsTable = true;
      continue;
    }

    // Parse key = value
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.substring(0, eqIdx).trim();
      const valStr = line.substring(eqIdx + 1).trim();

      let parsedVal: any;

      if (valStr.startsWith('"') && valStr.endsWith('"')) {
        // String with simple escaping
        parsedVal = valStr.substring(1, valStr.length - 1)
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n');
      } else if (valStr.startsWith('[') && valStr.endsWith(']')) {
        // Array of strings, e.g. ["Opt A", "Opt B"]
        const inner = valStr.substring(1, valStr.length - 1).trim();
        if (inner === '') {
          parsedVal = [];
        } else {
          parsedVal = inner.split(',')
            .map(s => {
              s = s.trim();
              if (s.startsWith('"') && s.endsWith('"')) {
                return s.substring(1, s.length - 1).replace(/\\"/g, '"');
              }
              if (s.startsWith("'") && s.endsWith("'")) {
                return s.substring(1, s.length - 1);
              }
              return s;
            });
        }
      } else {
        // Check if number
        const num = parseInt(valStr, 10);
        parsedVal = isNaN(num) ? valStr : num;
      }

      if (inQuestionsTable && currentQuestion) {
        if (key === 'id') currentQuestion.id = String(parsedVal);
        else if (key === 'question') currentQuestion.question = String(parsedVal);
        else if (key === 'options') currentQuestion.options = Array.isArray(parsedVal) ? parsedVal : [];
        else if (key === 'answer') currentQuestion.answer = typeof parsedVal === 'number' ? parsedVal : 0;
        else if (key === 'explanation') currentQuestion.explanation = String(parsedVal);
        else if (key === 'attempts') currentQuestion.attempts = typeof parsedVal === 'number' ? parsedVal : 0;
        else if (key === 'errors') currentQuestion.errors = typeof parsedVal === 'number' ? parsedVal : 0;
      } else {
        if (key === 'title') quiz.title = String(parsedVal);
        else if (key === 'description') quiz.description = String(parsedVal);
      }
    }
  }

  // Push the final question
  if (currentQuestion && currentQuestion.question && currentQuestion.options) {
    quiz.questions.push({
      id: currentQuestion.id || `q-${quiz.questions.length + 1}`,
      question: currentQuestion.question,
      options: currentQuestion.options,
      answer: typeof currentQuestion.answer === 'number' ? currentQuestion.answer : 0,
      explanation: currentQuestion.explanation || '',
      attempts: typeof currentQuestion.attempts === 'number' ? currentQuestion.attempts : 0,
      errors: typeof currentQuestion.errors === 'number' ? currentQuestion.errors : 0
    });
  }

  return quiz;
}

/**
 * Serializes a Quiz object to a clean TOML string.
 */
export function serializeTOML(quiz: Quiz): string {
  let toml = `# Newtion 選擇題測驗檔 (TOML 格式)\n\n`;
  toml += `title = ${JSON.stringify(quiz.title)}\n`;
  toml += `description = ${JSON.stringify(quiz.description)}\n\n`;

  for (const q of quiz.questions) {
    toml += `[[questions]]\n`;
    toml += `id = ${JSON.stringify(q.id)}\n`;
    toml += `question = ${JSON.stringify(q.question)}\n`;
    const optionsStr = '[' + q.options.map(opt => JSON.stringify(opt)).join(', ') + ']';
    toml += `options = ${optionsStr}\n`;
    toml += `answer = ${q.answer}\n`;
    if (q.explanation) {
      toml += `explanation = ${JSON.stringify(q.explanation)}\n`;
    }
    if (typeof q.attempts === 'number' && q.attempts > 0) {
      toml += `attempts = ${q.attempts}\n`;
    }
    if (typeof q.errors === 'number' && q.errors > 0) {
      toml += `errors = ${q.errors}\n`;
    }
    toml += '\n';
  }

  return toml.trim() + '\n';
}

/**
 * Serializes a Quiz object to a clean JSON string.
 */
export function serializeJSON(quiz: Quiz): string {
  return JSON.stringify(quiz, null, 2);
}
