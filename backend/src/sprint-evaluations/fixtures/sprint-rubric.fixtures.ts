import { SprintEvaluationType } from '../schemas/sprint-evaluation.schema';

export interface SprintRubricQuestionFixture {
  questionId: string;
  criteriaName: string;
  criteriaWeight: number;
}

export interface SprintRubricFixture {
  groupId?: string;
  sprintId: string;
  evaluationType: SprintEvaluationType;
  deliverableId: string;
  rubricId: string;
  name: string;
  isActive: boolean;
  questions: SprintRubricQuestionFixture[];
}

export const SPRINT_RUBRIC_FIXTURES: SprintRubricFixture[] = [
  {
    groupId: '11111111-1111-1111-1111-111111111111',
    sprintId: '22222222-2222-2222-2222-222222222222',
    evaluationType: SprintEvaluationType.SCRUM,
    deliverableId: '33333333-3333-3333-3333-333333333333',
    rubricId: '44444444-4444-4444-4444-444444444441',
    name: 'Sprint 1 SCRUM Rubric',
    isActive: true,
    questions: [
      {
        questionId: '55555555-5555-5555-5555-555555555551',
        criteriaName: 'Team planning quality',
        criteriaWeight: 0.4,
      },
      {
        questionId: '55555555-5555-5555-5555-555555555552',
        criteriaName: 'Sprint execution quality',
        criteriaWeight: 0.6,
      },
    ],
  },
  {
    sprintId: '22222222-2222-2222-2222-222222222222',
    evaluationType: SprintEvaluationType.CODE_REVIEW,
    deliverableId: '33333333-3333-3333-3333-333333333333',
    rubricId: '44444444-4444-4444-4444-444444444442',
    name: 'Sprint 1 CODE_REVIEW Rubric',
    isActive: true,
    questions: [
      {
        questionId: '55555555-5555-5555-5555-555555555561',
        criteriaName: 'Code readability',
        criteriaWeight: 0.5,
      },
      {
        questionId: '55555555-5555-5555-5555-555555555562',
        criteriaName: 'Test coverage',
        criteriaWeight: 0.5,
      },
    ],
  },
];

export function resolveSprintRubricFixture(input: {
  groupId: string;
  sprintId: string;
  evaluationType: SprintEvaluationType;
}): SprintRubricFixture | undefined {
  return (
    SPRINT_RUBRIC_FIXTURES.find(
      (fixture) =>
        fixture.groupId === input.groupId &&
        fixture.sprintId === input.sprintId &&
        fixture.evaluationType === input.evaluationType &&
        fixture.isActive,
    ) ??
    SPRINT_RUBRIC_FIXTURES.find(
      (fixture) =>
        fixture.sprintId === input.sprintId &&
        fixture.evaluationType === input.evaluationType &&
        fixture.isActive,
    )
  );
}

export function softGradeValue(softGrade: string): number {
  switch (softGrade) {
    case 'A':
      return 100;
    case 'B':
      return 80;
    case 'C':
      return 60;
    case 'D':
      return 50;
    case 'F':
      return 0;
    default:
      return 0;
  }
}