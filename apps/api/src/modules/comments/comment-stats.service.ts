import { Injectable } from '@nestjs/common';
import { appDateKey, type CommentCategory, type CommentDailyStats, type CommentStatsResponse } from '@acms/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import {
  appDayKeys,
  average,
  checkSeconds,
  classifyComment,
  daysBefore,
  emptyOutcomeCounts,
  percentile95,
  startOfAppDay,
} from './comment-stats.js';

@Injectable()
export class CommentStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(days: number): Promise<CommentStatsResponse> {
    const now = new Date();
    const today = startOfAppDay(now);
    const from = daysBefore(today, days - 1);
    const [totalAllTime, rows] = await this.prisma.$transaction([
      this.prisma.comment.count(),
      this.prisma.comment.findMany({
        where: { createdAt: { gte: from } },
        select: { reason: true, aiScores: true, moderatedAt: true, createdAt: true },
      }),
    ]);

    const daily = new Map<string, CommentDailyStats>(
      appDayKeys(from, days).map((date) => [date, { date, total: 0, ...emptyOutcomeCounts() }]),
    );
    const outcomes = emptyOutcomeCounts();
    const categories = new Map<CommentCategory, number>();
    const latencies: number[] = [];
    let todayCount = 0;

    for (const row of rows) {
      const { outcome, category } = classifyComment(row);
      outcomes[outcome] += 1;
      const day = daily.get(appDateKey(row.createdAt));
      if (day) {
        day.total += 1;
        day[outcome] += 1;
      }
      if (row.createdAt >= today) todayCount += 1;
      if (category) categories.set(category, (categories.get(category) ?? 0) + 1);
      const seconds = checkSeconds(row);
      if (seconds !== null) latencies.push(seconds);
    }

    return {
      days,
      from: from.toISOString(),
      to: now.toISOString(),
      total_all_time: totalAllTime,
      total: rows.length,
      today: todayCount,
      outcomes,
      daily: [...daily.values()],
      categories: [...categories.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((left, right) => right.count - left.count),
      latency: { average_seconds: average(latencies), p95_seconds: percentile95(latencies) },
    };
  }
}
