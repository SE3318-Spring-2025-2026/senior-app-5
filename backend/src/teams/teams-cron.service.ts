import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { TeamsSyncService } from './teams-sync.service';
import {
  SprintConfigEntry,
  SprintConfigDocument as SprintConfigEntryDocument,
} from '../sprint-configs/schemas/sprint-config.schema';
import {
  Schedule,
  ScheduleDocument,
} from '../advisors/schemas/schedule.schema';

@Injectable()
export class TeamsCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TeamsCronService.name);

  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(SprintConfigEntry.name)
    private sprintConfigModel: Model<SprintConfigEntryDocument>,
    @InjectModel(Schedule.name)
    private scheduleModel: Model<ScheduleDocument>,
    private readonly teamsSyncService: TeamsSyncService,
  ) {}

  /**
   * On boot, kick off a sync in the background so the UI shows fresh data
   * without waiting until the next 02:00 UTC cron tick. We delay slightly so
   * the rest of the app finishes wiring up first, and we never block startup.
   * Disable by setting SKIP_BOOT_SYNC=1.
   */
  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SKIP_BOOT_SYNC === '1') {
      this.logger.log('Boot sync skipped (SKIP_BOOT_SYNC=1).');
      return;
    }
    setTimeout(() => {
      this.dailySync().catch((err) => {
        this.logger.error(`Boot sync failed: ${err.message}`);
      });
    }, 5000);
    this.logger.log('Boot sync scheduled (5s after startup).');
  }

  /** Runs every day at 02:00 UTC */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailySync(): Promise<void> {
    this.logger.log('Daily JIRA/GitHub sync started.');

    const teams = await this.teamModel
      .find({
        jiraDomain: { $exists: true, $ne: '' },
        jiraApiToken: { $exists: true, $ne: '' },
        jiraProjectKey: { $exists: true, $ne: '' },
        jiraEmail: { $exists: true, $ne: '' },
      })
      .select('_id')
      .lean()
      .exec();

    this.logger.log(`Found ${teams.length} teams with JIRA configured.`);

    const results = await Promise.allSettled(
      teams.map((team) =>
        this.teamsSyncService
          .syncStories((team._id as any).toString())
          .catch((err) => {
            this.logger.error(`Sync failed for team ${(team._id as any).toString()}: ${err.message}`);
            throw err;
          }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    this.logger.log(`Daily sync complete. Succeeded: ${succeeded}, Failed: ${failed}.`);

    await this.autoFinalizeOverdueSprints();
  }

  /**
   * Auto-finalizes any sprint whose Schedule.endDatetime has passed. Sprint
   * configs are global, so we run finalize for every team that has JIRA wired
   * up — each team's per-student StoryPointRecords are scoped by its own
   * groupId.
   */
  private async autoFinalizeOverdueSprints(): Promise<void> {
    const now = new Date();

    const candidates = await this.sprintConfigModel
      .find({ isFinalized: false })
      .exec();
    if (candidates.length === 0) return;

    const overdue: typeof candidates = [];
    for (const sprint of candidates) {
      const schedule = await this.scheduleModel
        .findOne({ scheduleId: sprint.sprintId })
        .lean()
        .exec();
      if (schedule && schedule.endDatetime && schedule.endDatetime < now) {
        overdue.push(sprint);
      }
    }

    if (overdue.length === 0) return;

    const teams = await this.teamModel
      .find({
        jiraDomain: { $exists: true, $ne: '' },
        jiraApiToken: { $exists: true, $ne: '' },
        jiraProjectKey: { $exists: true, $ne: '' },
        jiraEmail: { $exists: true, $ne: '' },
        groupId: { $exists: true, $ne: '' },
      })
      .select('_id groupId')
      .lean()
      .exec();

    for (const sprint of overdue) {
      if (teams.length === 0) {
        sprint.isFinalized = true;
        await sprint.save();
        this.logger.warn(
          `Auto-finalized sprint ${sprint.sprintId} but no JIRA-configured team exists; per-student points were not computed.`,
        );
        continue;
      }

      for (const team of teams) {
        try {
          await this.teamsSyncService.finalizeSprintSync(
            (team._id as any).toString(),
            sprint.sprintId,
          );
          this.logger.log(
            `Auto-finalized sprint ${sprint.sprintId} for team ${(team._id as any).toString()}.`,
          );
        } catch (err: any) {
          this.logger.error(
            `Auto-finalize failed for sprint ${sprint.sprintId} team ${(team._id as any).toString()}: ${err.message}`,
          );
        }
      }

      const fresh = await this.sprintConfigModel.findById(sprint._id).exec();
      if (fresh && !fresh.isFinalized) {
        fresh.isFinalized = true;
        await fresh.save();
      }
    }
  }
}
