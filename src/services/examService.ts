import axios from 'axios';
import pool from '../config/db';

export interface CreateExamData {
  exam_type: string;
  user_id: string;
}

export interface ExamResponse {
  id: string;
  exam_type: string;
  taken_at: Date | null;
  user_id: string;
  questions: ExamQuestion[];
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_text: string;
  created_by_ai: boolean;
}

export interface UserExamData {
  exam_id: string;
  user_id: string;
}

export interface UserExamResponse {
  id: string;
  exam_id: string;
  user_id: string;
  started_at: Date | null;
  completed_at: Date | null;
  exam: {
    id: string;
    exam_type: string;
    questions: ExamQuestion[];
  };
}

export interface SubmitAnswerData {
  user_exam_id: string;
  question_id: string;
  answer_text: string;
}

export interface AnswerResponse {
  id: string;
  user_exam_id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean | null;
}

export class ExamService {
  // Default IELTS questions fallback
  static getDefaultQuestions(examType: string): string[] {
    const task1Instruction = 'You will be presented with a graph, table, chart or diagram and asked to describe, summarise or explain the information in your own words. You may be asked to describe and present data, describe the stages of a process, how something works or describe an object, plan or design.';
    
    const task1Questions = [
      `${task1Instruction}\n\nThe chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.`,
      `${task1Instruction}\n\nThe graph below shows the consumption of fish and some different kinds of meat in a European country between 1979 and 2004. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.`,
      `${task1Instruction}\n\nThe diagrams below show the development of the village of Ryemouth between 1995 and present. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.`,
      `${task1Instruction}\n\nThe table below shows the proportion of different categories of families living in poverty in Australia in 1999. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.`,
      `${task1Instruction}\n\nThe pie charts below show the comparison of different kinds of energy production in France in 1995 and 2005. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.`,
    ];
    
    const defaultQuestions: { [key: string]: string[] } = {
      'Task 1': task1Questions,
      'Task 2': [
        'Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?',
        'Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime. Discuss both views and give your opinion.',
        'Some people say that the best way to improve public health is by increasing the number of sports facilities. Others, however, say that this would have little effect on public health and that other measures are required. Discuss both views and give your own opinion.',
        'Some people believe that it is best to accept a bad situation, such as an unsatisfactory job or shortage of money. Others argue that it is better to try and improve such situations. Discuss both views and give your own opinion.',
        'Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think that the true function of a university should be to give access to knowledge for its own sake. Discuss both views and give your own opinion.',
      ],
      'task1': task1Questions,
      'task2': [
        'Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?',
        'Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime. Discuss both views and give your opinion.',
        'Some people say that the best way to improve public health is by increasing the number of sports facilities. Others, however, say that this would have little effect on public health and that other measures are required. Discuss both views and give your own opinion.',
        'Some people believe that it is best to accept a bad situation, such as an unsatisfactory job or shortage of money. Others argue that it is better to try and improve such situations. Discuss both views and give your own opinion.',
        'Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think that the true function of a university should be to give access to knowledge for its own sake. Discuss both views and give your own opinion.',
      ],
    };

    return defaultQuestions[examType] || defaultQuestions['Task 1'];
  }

  // Generate IELTS writing questions using Serper API search results
  static async generateIELTSQuestions(
    examType: string,
    numberOfQuestions: number = 5
  ): Promise<string[]> {
    const defaultQuestions = this.getDefaultQuestions(examType).slice(
      0,
      numberOfQuestions
    );

    const serperApiKey =
      process.env.SERPER_API_KEY 
      // process.env.SEPER_API_KEY || // Common typo fallback
      // process.env.OPENAI_API_KEY; // Last resort legacy env var

    if (!serperApiKey) {
      console.warn('Serper API key not configured. Using default questions.');
      return defaultQuestions;
    }

    const serperEndpoint =
      process.env.SERPER_API_URL || 'https://google.serper.dev/search';

    const requestBody = {
      q: `IELTS Writing ${examType} task question ideas for exam practice`,
      num: Math.max(numberOfQuestions, 5),
    };

    const task1Instruction = 'You will be presented with a graph, table, chart or diagram and asked to describe, summarise or explain the information in your own words. You may be asked to describe and present data, describe the stages of a process, how something works or describe an object, plan or design.';

    const normalizeQuestion = (text: string): string | null => {
      if (!text) {
        return null;
      }
      const cleaned = text.replace(/\s+/g, ' ').trim();
      if (!cleaned) {
        return null;
      }

      // For Task 1, prepend the instruction format
      if (examType.toLowerCase().includes('task 1') || examType.toLowerCase().includes('task1')) {
        return `${task1Instruction}\n\n${cleaned}`;
      }

      // For Task 2, ensure it reads like a prompt
      if (!/[?.]$/.test(cleaned)) {
        return `${cleaned}. Write an essay discussing this topic.`;
      }
      return cleaned;
    };

    const addCandidates = (source: unknown, collector: string[], seen: Set<string>) => {
      if (!source || typeof source !== 'object') return;
      const { title, snippet } = source as { title?: string; snippet?: string };
      const candidates = [title, snippet];
      for (const candidate of candidates) {
        const normalized = candidate && normalizeQuestion(candidate);
        if (normalized && !seen.has(normalized)) {
          collector.push(normalized);
          seen.add(normalized);
        }
      }
    };

    try {
      const response = await axios.post(serperEndpoint, requestBody, {
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        maxBodyLength: Infinity,
      });

      const data = response.data || {};
      const questions: string[] = [];
      const seen = new Set<string>();

      addCandidates((data as any).answerBox, questions, seen);
      addCandidates((data as any).knowledgeGraph, questions, seen);

      if (Array.isArray((data as any).organic)) {
        for (const result of (data as any).organic) {
          if (questions.length >= numberOfQuestions * 2) break;
          addCandidates(result, questions, seen);
        }
      }

      const trimmedQuestions = questions
        .filter(Boolean)
        .slice(0, numberOfQuestions);

      if (trimmedQuestions.length === 0) {
        throw new Error('Serper returned no usable snippets.');
      }

      return trimmedQuestions;
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unknown Serper API error';
      console.error('Serper API error:', message);
      return defaultQuestions;
    }
  }

  // Create exam with auto-generated questions
  static async createExam(data: CreateExamData): Promise<ExamResponse & { ai_generated?: boolean }> {
    const { exam_type, user_id } = data;

    // Create exam
    const examResult = await pool.query(
      `INSERT INTO exams (exam_type, user_id, taken_at) 
       VALUES ($1, $2, NOW()) 
       RETURNING id, exam_type, taken_at, user_id`,
      [exam_type, user_id]
    );

    const exam = examResult.rows[0];

    // Generate questions using Serper (with fallback to defaults)
    let questionTexts: string[];
    let aiGenerated = true;
    
    try {
      questionTexts = await this.generateIELTSQuestions(exam_type, 5);
      // Check if we got default questions (if OpenAI failed, it returns defaults)
      const defaultQuestions = this.getDefaultQuestions(exam_type);
      if (questionTexts.every((q, i) => q === defaultQuestions[i])) {
        aiGenerated = false;
      }
    } catch (error) {
      // If even the fallback fails, use defaults
      questionTexts = this.getDefaultQuestions(exam_type).slice(0, 5);
      aiGenerated = false;
    }

    // Insert questions into database
    const questions: ExamQuestion[] = [];
    for (const questionText of questionTexts) {
      const questionResult = await pool.query(
        `INSERT INTO exam_questions (exam_id, question_text, created_by_ai) 
         VALUES ($1, $2, $3) 
         RETURNING id, exam_id, question_text, created_by_ai`,
        [exam.id, questionText, aiGenerated]
      );
      questions.push(questionResult.rows[0]);
    }

    return {
      id: exam.id,
      exam_type: exam.exam_type,
      taken_at: exam.taken_at,
      user_id: exam.user_id,
      questions,
      ai_generated: aiGenerated,
    };
  }

  // Get exam by ID with questions
  static async getExamById(examId: string): Promise<ExamResponse | null> {
    const examResult = await pool.query(
      'SELECT id, exam_type, taken_at, user_id FROM exams WHERE id = $1',
      [examId]
    );

    if (examResult.rows.length === 0) {
      return null;
    }

    const exam = examResult.rows[0];

    // Get questions for this exam
    const questionsResult = await pool.query(
      'SELECT id, exam_id, question_text, created_by_ai FROM exam_questions WHERE exam_id = $1 ORDER BY id',
      [examId]
    );

    return {
      id: exam.id,
      exam_type: exam.exam_type,
      taken_at: exam.taken_at,
      user_id: exam.user_id,
      questions: questionsResult.rows,
    };
  }

  // Get all exams
  static async getAllExams(): Promise<ExamResponse[]> {
    const examsResult = await pool.query(
      'SELECT id, exam_type, taken_at, user_id FROM exams ORDER BY taken_at DESC'
    );

    const exams = examsResult.rows;
    const examsWithQuestions: ExamResponse[] = [];

    for (const exam of exams) {
      const questionsResult = await pool.query(
        'SELECT id, exam_id, question_text, created_by_ai FROM exam_questions WHERE exam_id = $1 ORDER BY id',
        [exam.id]
      );

      examsWithQuestions.push({
        id: exam.id,
        exam_type: exam.exam_type,
        taken_at: exam.taken_at,
        user_id: exam.user_id,
        questions: questionsResult.rows,
      });
    }

    return examsWithQuestions;
  }

  // User starts an exam (creates user_exam entry)
  static async startExam(data: UserExamData): Promise<UserExamResponse> {
    const { exam_id, user_id } = data;

    // Check if exam exists
    const exam = await this.getExamById(exam_id);
    if (!exam) {
      throw new Error('Exam not found');
    }

    // Check if user already started this exam
    const existingUserExam = await pool.query(
      'SELECT id FROM user_exams WHERE exam_id = $1 AND user_id = $2',
      [exam_id, user_id]
    );

    if (existingUserExam.rows.length > 0) {
      // Return existing user exam
      const userExamResult = await pool.query(
        `SELECT id, exam_id, user_id, started_at, completed_at 
         FROM user_exams WHERE id = $1`,
        [existingUserExam.rows[0].id]
      );

      return {
        ...userExamResult.rows[0],
        exam: {
          id: exam.id,
          exam_type: exam.exam_type,
          questions: exam.questions,
        },
      };
    }

    // Create new user_exam entry
    const userExamResult = await pool.query(
      `INSERT INTO user_exams (exam_id, user_id, started_at) 
       VALUES ($1, $2, NOW()) 
       RETURNING id, exam_id, user_id, started_at, completed_at`,
      [exam_id, user_id]
    );

    return {
      ...userExamResult.rows[0],
      exam: {
        id: exam.id,
        exam_type: exam.exam_type,
        questions: exam.questions,
      },
    };
  }

  // Submit answer for a question
  static async submitAnswer(
    data: SubmitAnswerData
  ): Promise<AnswerResponse> {
    const { user_exam_id, question_id, answer_text } = data;

    // Check if answer already exists
    const existingAnswer = await pool.query(
      'SELECT id FROM exam_answers WHERE user_exam_id = $1 AND question_id = $2',
      [user_exam_id, question_id]
    );

    if (existingAnswer.rows.length > 0) {
      // Update existing answer
      const result = await pool.query(
        `UPDATE exam_answers 
         SET answer_text = $1 
         WHERE id = $2 
         RETURNING id, user_exam_id, question_id, answer_text, is_correct`,
        [answer_text, existingAnswer.rows[0].id]
      );
      return result.rows[0];
    } else {
      // Create new answer
      const result = await pool.query(
        `INSERT INTO exam_answers (user_exam_id, question_id, answer_text, is_correct) 
         VALUES ($1, $2, $3, NULL) 
         RETURNING id, user_exam_id, question_id, answer_text, is_correct`,
        [user_exam_id, question_id, answer_text]
      );
      return result.rows[0];
    }
  }

  // Complete exam (mark as completed)
  static async completeExam(userExamId: string): Promise<void> {
    await pool.query(
      `UPDATE user_exams 
       SET completed_at = NOW() 
       WHERE id = $1`,
      [userExamId]
    );
  }

  // Get user's exam with answers
  static async getUserExam(userExamId: string): Promise<any> {
    const userExamResult = await pool.query(
      `SELECT ue.id, ue.exam_id, ue.user_id, ue.started_at, ue.completed_at,
              e.id as exam_id_full, e.exam_type, e.taken_at
       FROM user_exams ue
       JOIN exams e ON ue.exam_id = e.id
       WHERE ue.id = $1`,
      [userExamId]
    );

    if (userExamResult.rows.length === 0) {
      throw new Error('User exam not found');
    }

    const userExam = userExamResult.rows[0];

    // Get questions with answers
    const questionsWithAnswers = await pool.query(
      `SELECT 
        q.id as question_id,
        q.question_text,
        q.created_by_ai,
        a.id as answer_id,
        a.answer_text,
        a.is_correct
       FROM exam_questions q
       LEFT JOIN exam_answers a ON q.id = a.question_id AND a.user_exam_id = $1
       WHERE q.exam_id = $2
       ORDER BY q.id`,
      [userExamId, userExam.exam_id]
    );

    return {
      id: userExam.id,
      exam_id: userExam.exam_id,
      user_id: userExam.user_id,
      started_at: userExam.started_at,
      completed_at: userExam.completed_at,
      exam: {
        id: userExam.exam_id_full,
        exam_type: userExam.exam_type,
        taken_at: userExam.taken_at,
      },
      questions: questionsWithAnswers.rows,
    };
  }

  // Get all user's exams
  static async getUserExams(userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        ue.id,
        ue.exam_id,
        ue.user_id,
        ue.started_at,
        ue.completed_at,
        e.exam_type,
        e.taken_at
       FROM user_exams ue
       JOIN exams e ON ue.exam_id = e.id
       WHERE ue.user_id = $1
       ORDER BY ue.started_at DESC`,
      [userId]
    );

    return result.rows;
  }
}

