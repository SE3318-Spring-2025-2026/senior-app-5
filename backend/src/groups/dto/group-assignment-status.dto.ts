export class GroupAssignmentStatus {
  groupId!: string;
  status!: 'ASSIGNED';
  advisorId!: string;
  advisorName!: string;
  canSubmitRequest!: boolean;
  blockedReason?: string | null;
  updatedAt!: Date;
}
