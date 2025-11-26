import { Request, Response } from 'express';
import { ExamService } from '../services/examService';

export class ExamController {
  // Create new exam with auto-generated questions
  static async createExam(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { exam_type } = req.body;

      if (!exam_type) {
        res.status(400).json({ error: 'Exam type is required' });
        return;
      }

      const exam = await ExamService.createExam({
        exam_type,
        user_id: req.user.id,
      });

      const message = exam.ai_generated === false
        ? 'Exam created successfully with default questions (AI generator unavailable)'
        : 'Exam created successfully with auto-generated questions';

      res.status(201).json({
        message,
        data: exam,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get exam by ID
  static async getExam(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const exam = await ExamService.getExamById(id);

      if (!exam) {
        res.status(404).json({ error: 'Exam not found' });
        return;
      }

      res.status(200).json({
        message: 'Exam retrieved successfully',
        data: exam,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all exams
  static async getAllExams(req: Request, res: Response): Promise<void> {
    try {
      const exams = await ExamService.getAllExams();

      res.status(200).json({
        message: 'Exams retrieved successfully',
        data: exams,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // User starts an exam
  static async startExam(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { exam_id } = req.body;

      if (!exam_id) {
        res.status(400).json({ error: 'Exam ID is required' });
        return;
      }

      const userExam = await ExamService.startExam({
        exam_id,
        user_id: req.user.id,
      });

      res.status(200).json({
        message: 'Exam started successfully',
        data: userExam,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
          return;
        }
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Submit answer for a question
  static async submitAnswer(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { user_exam_id, question_id, answer_text } = req.body;

      if (!user_exam_id || !question_id || !answer_text) {
        res.status(400).json({
          error: 'user_exam_id, question_id, and answer_text are required',
        });
        return;
      }

      const answer = await ExamService.submitAnswer({
        user_exam_id,
        question_id,
        answer_text,
      });

      res.status(200).json({
        message: 'Answer submitted successfully',
        data: answer,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Complete exam
  static async completeExam(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { user_exam_id } = req.body;

      if (!user_exam_id) {
        res.status(400).json({ error: 'user_exam_id is required' });
        return;
      }

      await ExamService.completeExam(user_exam_id);

      res.status(200).json({
        message: 'Exam completed successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get user's exam with answers
  static async getUserExam(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const userExam = await ExamService.getUserExam(id);

      // Verify the exam belongs to the user
      if (userExam.user_id !== req.user.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.status(200).json({
        message: 'User exam retrieved successfully',
        data: userExam,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
          return;
        }
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all user's exams
  static async getUserExams(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userExams = await ExamService.getUserExams(req.user.id);

      res.status(200).json({
        message: 'User exams retrieved successfully',
        data: userExams,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

