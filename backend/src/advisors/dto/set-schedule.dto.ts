import { IsDateString, IsEnum } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { SchedulePhase } from '../schemas/schedule.schema';

export class SetScheduleDto {
  @IsEnum(SchedulePhase)
  phase!: SchedulePhase;

  @IsDateString()
  startDatetime!: string;

  @IsDateString()
  endDatetime!: string;
}

/**
 * For SPRINT phase: enforces Monday start, Friday end exactly 11 days later.
 * Throws BadRequestException if violated. Call this from the service/controller
 * after standard DTO validation passes.
 */
export function validateSprintDateWindow(
  startDatetime: string,
  endDatetime: string,
): void {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  // getDay() is UTC-based; use UTC accessors to avoid timezone surprises
  const startDayUTC = start.getUTCDay(); // 0=Sun, 1=Mon, …, 5=Fri
  const endDayUTC = end.getUTCDay();

  if (startDayUTC !== 1) {
    throw new BadRequestException(
      'Sprint start date must be a Monday (UTC).',
    );
  }
  if (endDayUTC !== 5) {
    throw new BadRequestException(
      'Sprint end date must be a Friday (UTC).',
    );
  }

  // Strip time component before diffing so start/end times don't skew the count.
  const startDate = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDate = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  if (diffDays !== 11) {
    throw new BadRequestException(
      `Sprint must be exactly 11 days (Mon → Fri two weeks later). Got ${diffDays} day(s).`,
    );
  }
}
