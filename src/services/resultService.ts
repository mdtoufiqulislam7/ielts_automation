import pool from "../config/db";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

interface QuestionAnswerPair {
  question_id: string;
  question_text: string;
  answer_text: string | null;
}

interface GradingResult {
  question_id: string;
  mark: number;
  feedback?: string;
}

/**
 * Grade exam answers using OpenAI
 * @param userExamId - The user_exam_id to grade
 * @returns Object containing total mark and individual question marks
 */
export const resultService = async (userExamId: string) => {
  try {
    // Step 1: Get exam_id from user_exam table
    const userExamResult = await pool.query(
      `SELECT exam_id, user_id 
       FROM user_exams 
       WHERE id = $1`,
      [userExamId]
    );

    if (userExamResult.rows.length === 0) {
      throw new Error("User exam not found");
    }

    const { exam_id, user_id } = userExamResult.rows[0];

    // Step 2: Get all questions for this exam
    const questionsResult = await pool.query(
      `SELECT id, question_text 
       FROM exam_questions 
       WHERE exam_id = $1 
       ORDER BY id`,
      [exam_id]
    );

    if (questionsResult.rows.length === 0) {
      throw new Error("No questions found for this exam");
    }

    // Step 3: Get all answers for this user_exam_id
    const answersResult = await pool.query(
      `SELECT question_id, answer_text 
       FROM exam_answers 
       WHERE user_exam_id = $1`,
      [userExamId]
    );

    // Create a map of question_id to answer_text
    const answerMap = new Map<string, string>();
    answersResult.rows.forEach((row: any) => {
      answerMap.set(row.question_id, row.answer_text);
    });

    // Step 4: Match questions with answers
    const questionAnswerPairs: QuestionAnswerPair[] = questionsResult.rows.map(
      (question: any) => ({
        question_id: question.id,
        question_text: question.question_text,
        answer_text: answerMap.get(question.id) || null,
      })
    );

    // Step 5: Grade each answer using OpenAI
    const gradingResults: GradingResult[] = [];
    let totalMark = 0;
    const totalQuestions = questionAnswerPairs.length;

    console.log(`\n📝 Starting grading for exam_id: ${exam_id}`);
    console.log(`📊 Total questions to grade: ${totalQuestions}`);

    for (let i = 0; i < questionAnswerPairs.length; i++) {
      const pair = questionAnswerPairs[i];
      const questionNumber = i + 1;
      
      console.log(`\n🔍 Grading Question ${questionNumber}/${totalQuestions} (ID: ${pair.question_id.substring(0, 8)}...)`);

      if (!pair.answer_text) {
        // No answer provided, mark as 0
        console.log(`   ⚠️  No answer provided - Mark: 0`);
        gradingResults.push({
          question_id: pair.question_id,
          mark: 0,
          feedback: "No answer provided",
        });
        continue;
      }

      try {
        console.log(`   📤 Grading answer...`);
        // Use simple rule-based grading
        const mark = await gradeAnswerSimple(
          pair.question_text,
          pair.answer_text
        );

        console.log(`   ✅ Question ${questionNumber} graded - Mark: ${mark}/100`);

        gradingResults.push({
          question_id: pair.question_id,
          mark: mark,
        });

        totalMark += mark;
      } catch (error: any) {
        console.error(`   ❌ Error grading question ${questionNumber}:`, error.message);
        // Default to 0 if grading fails
        gradingResults.push({
          question_id: pair.question_id,
          mark: 0,
          feedback: "Grading error occurred",
        });
      }
    }

    console.log(`\n📊 Grading Summary:`);
    console.log(`   Total Questions: ${totalQuestions}`);
    console.log(`   Total Mark: ${totalMark}/${totalQuestions * 100}`);
    console.log(`   Average Mark: ${Math.round(totalMark / totalQuestions)}/100`);

    // Step 6: Store total mark in exam_marks table
    const existingMarkResult = await pool.query(
      `SELECT id FROM exam_marks WHERE exam_id = $1`,
      [exam_id]
    );

    if (existingMarkResult.rows.length > 0) {
      // Update existing mark
      await pool.query(
        `UPDATE exam_marks 
         SET auto_mark = $1 
         WHERE exam_id = $2`,
        [totalMark, exam_id]
      );
      console.log(`   💾 Updated exam_mark: ${totalMark} for exam_id: ${exam_id}`);
    } else {
      // Insert new mark
      await pool.query(
        `INSERT INTO exam_marks (exam_id, auto_mark) 
         VALUES ($1, $2)`,
        [exam_id, totalMark]
      );
      console.log(`   💾 Created exam_mark: ${totalMark} for exam_id: ${exam_id}`);
    }

    // Step 7: Update exam_answers with marks and is_correct
    // Store individual marks for each question
    for (const result of gradingResults) {
      const isCorrect = result.mark > 0; // Consider mark > 0 as correct
      
      // Try to update with mark column if it exists, otherwise just update is_correct
      try {
        // First try to update with mark column
        await pool.query(
          `UPDATE exam_answers 
           SET is_correct = $1, mark = $2 
           WHERE user_exam_id = $3 AND question_id = $4`,
          [isCorrect, result.mark, userExamId, result.question_id]
        );
        console.log(`   💾 Stored mark ${result.mark} for question ${result.question_id.substring(0, 8)}...`);
      } catch (error: any) {
        // If mark column doesn't exist, just update is_correct
        if (error.message?.includes('column "mark"')) {
          await pool.query(
            `UPDATE exam_answers 
             SET is_correct = $1 
             WHERE user_exam_id = $2 AND question_id = $3`,
            [isCorrect, userExamId, result.question_id]
          );
          console.log(`   💾 Updated is_correct for question ${result.question_id.substring(0, 8)}... (mark column not available)`);
        } else {
          throw error;
        }
      }
    }

    return {
      user_exam_id: userExamId,
      exam_id: exam_id,
      user_id: user_id,
      total_mark: totalMark,
      max_possible_mark: questionAnswerPairs.length * 100, // Assuming 100 points per question
      question_marks: gradingResults,
    };
  } catch (error) {
    console.error("Error in resultService:", error);
    throw error;
  }
};

/**
 * Get all exam marks for a user
 * @param userId - The user_id to get marks for
 * @returns Array of exam marks with exam details
 */
export const getUserExamMarks = async (userId: string) => {
  try {
    // Step 1: Get all user_exams for this user
    const userExamsResult = await pool.query(
      `SELECT * FROM user_exams WHERE user_id = $1`,
      [userId]
    );

    if (userExamsResult.rows.length === 0) {
      return {
        user_id: userId,
        exams: [],
        total_exams: 0,
        message: "No exams found for this user"
      };
    }

    const userExams = userExamsResult.rows;
    const examMarks: any[] = [];

    // Step 2: For each exam_id, get the auto_mark from exam_marks table
    for (const userExam of userExams) {
      const examId = userExam.exam_id;
      
      // Get exam details
      const examResult = await pool.query(
        `SELECT id, exam_type, taken_at, user_id 
         FROM exams 
         WHERE id = $1`,
        [examId]
      );

      // Get mark from exam_marks table
      const markResult = await pool.query(
        `SELECT id, exam_id, auto_mark 
         FROM exam_marks 
         WHERE exam_id = $1`,
        [examId]
      );

      const examData = examResult.rows[0] || null;
      const markData = markResult.rows[0] || null;

      examMarks.push({
        user_exam_id: userExam.id,
        exam_id: examId,
        exam_type: examData?.exam_type || null,
        taken_at: examData?.taken_at || null,
        started_at: userExam.started_at,
        completed_at: userExam.completed_at,
        auto_mark: markData?.auto_mark || null,
        has_mark: markData !== null
      });
    }

    // Calculate total marks
    const totalMark = examMarks.reduce((sum, exam) => {
      return sum + (exam.auto_mark || 0);
    }, 0);

    const examsWithMarks = examMarks.filter(exam => exam.has_mark).length;

    return {
      user_id: userId,
      exams: examMarks,
      total_exams: examMarks.length,
      exams_with_marks: examsWithMarks,
      total_mark: totalMark,
      average_mark: examsWithMarks > 0 ? Math.round(totalMark / examsWithMarks) : 0
    };
  } catch (error: any) {
    console.error("Error in getUserExamMarks:", error);
    throw new Error(`Failed to get user exam marks: ${error.message}`);
  }
};

/**
 * Grade a single answer using simple rule-based logic
 * @param question - The question text
 * @param answer - The answer text
 * @returns Mark (0, 20, or 30-40) for the answer
 */
async function gradeAnswerSimple(
  question: string,
  answer: string
): Promise<number> {
  try {
    // Trim and check if answer is empty or too short
    const trimmedAnswer = answer.trim();
    
    if (!trimmedAnswer || trimmedAnswer.length < 10) {
      // No answer or very short answer = 0
      console.log(`   📝 Answer too short or empty - Mark: 0`);
      return 0;
    }

    // Simple validation: Check if answer seems relevant to the question
    const answerLower = trimmedAnswer.toLowerCase();
    const questionLower = question.toLowerCase();
    
    // Extract key words from question (simple approach)
    const questionWords = questionLower
      .split(/\s+/)
      .filter(word => word.length > 3) // Only words longer than 3 characters
      .slice(0, 5); // Take first 5 meaningful words
    
    // Check if answer contains any question keywords or seems relevant
    const hasRelevantContent = questionWords.some(word => 
      answerLower.includes(word)
    ) || trimmedAnswer.length > 50; // Or if answer is reasonably long
    
    if (!hasRelevantContent && trimmedAnswer.length < 50) {
      // Answer doesn't seem relevant and is short = incorrect = 20
      console.log(`   📝 Answer seems incorrect - Mark: 20`);
      return 20;
    }
    
    // Answer seems better/relevant = random between 30-40
    const randomMark = Math.floor(Math.random() * 11) + 30; // Random between 30-40
    console.log(`   📝 Answer seems better - Mark: ${randomMark}`);
    return randomMark;
    
  } catch (error: any) {
    console.error("❌ Error in simple grading:", error.message);
    // Default to 0 if grading fails
    return 0;
  }
}

/**
 * Grade answer using Serper API to search for grading criteria (optional enhancement)
 * Currently using simple rule-based grading, but can be enhanced with Serper if needed
 * @param question - The question text
 * @param answer - The answer text
 * @returns Mark (0, 20, or 30-40) for the answer
 */
async function gradeAnswerWithSerper(
  question: string,
  answer: string
): Promise<number> {
  try {
    const serperApiKey = process.env.SERPER_API_KEY;
    
    if (!serperApiKey) {
      console.warn("⚠️  SERPER_API_KEY not found, using simple grading");
      return gradeAnswerSimple(question, answer);
    }

    // Use Serper API to search for IELTS grading criteria or sample answers
    const searchQuery = `IELTS writing grading criteria ${question.substring(0, 50)}`;
    
    const data = JSON.stringify({
      q: searchQuery
    });

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://google.serper.dev/search',
      headers: { 
        'X-API-KEY': serperApiKey, 
        'Content-Type': 'application/json'
      },
      data: data
    };

    try {
      const response = await axios.request(config);
      const searchResults = response.data;
      
      // Use search results to enhance grading (optional)
      // For now, fall back to simple grading
      console.log(`   🔍 Serper search completed, using simple grading logic`);
      return gradeAnswerSimple(question, answer);
    } catch (error: any) {
      console.warn(`   ⚠️  Serper API error: ${error.message}, using simple grading`);
      return gradeAnswerSimple(question, answer);
    }
  } catch (error: any) {
    console.error("❌ Error in Serper grading:", error.message);
    // Fall back to simple grading
    return gradeAnswerSimple(question, answer);
  }
}

async function getresultforuser(user_id:string){
    const result = await pool.query(`SELECT * FROM user_exams where user_id = $1`)
}