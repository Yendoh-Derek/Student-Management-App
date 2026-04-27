import { Injectable } from "@nestjs/common";
import axios from "axios";
import { StudentsService } from "../students/students.service";

type RiskResponse = { risk_level: string; confidence: number };

@Injectable()
export class AnalyticsService {
  constructor(private readonly studentsService: StudentsService) {}

  async getStudentAnalytics(studentId: number) {
    const student = await this.studentsService.findOne(studentId);
    const grades = student.grades.map((grade) => grade.score);

    const payload = {
      grades,
      attendance_rate: student.attendanceRate
    };

    const baseUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
    let risk: RiskResponse = { risk_level: student.riskLevel, confidence: 0.5 };

    try {
      const response = await axios.post<RiskResponse>(
        `${baseUrl}/predict/student-risk`,
        payload,
        { timeout: 3000 }
      );
      risk = response.data;
    } catch (error) {
      // Fall back to stored baseline when AI service is unavailable.
    }

    return {
      studentId: student.id,
      studentName: student.user.name,
      classLevel: student.classLevel,
      averageScore: student.averageScore,
      attendanceRate: student.attendanceRate,
      trend: grades.length > 1 ? grades[grades.length - 1] - grades[0] : 0,
      aiRisk: risk
    };
  }
}
