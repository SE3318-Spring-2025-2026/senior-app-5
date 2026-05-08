import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { TeamsSyncService } from './teams-sync.service';
import {
  SprintConfig,
  SprintConfigDocument,
} from '../story-points/schemas/sprint-config.schema';

@Injectable()
export class TeamsCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TeamsCronService.name);

  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(SprintConfig.name)
    private sprintConfigModel: Model<SprintConfigDocument>,
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
   * Marks any SprintConfig whose end date has passed as finalized so further
   * sync runs cannot mutate its issues. Per-student point computation still
   * runs through the manual finalize endpoint where team↔group linkage is
   * supplied by the coordinator.
   */
  private async autoFinalizeOverdueSprints(): Promise<void> {
    const now = new Date();
    const overdue = await this.sprintConfigModel
      .find({ isFinalized: false, endDate: { $lt: now } })
      .exec();

    if (overdue.length === 0) return;

    for (const sprint of overdue) {
      const teams = await this.teamModel
        .find({ groupId: sprint.groupId })
        .select('_id groupId')
        .lean()
        .exec();

      if (teams.length === 0) {
        sprint.isFinalized = true;
        await sprint.save();
        this.logger.warn(
          `Auto-finalized sprint ${sprint.sprintId} but no team had groupId=${sprint.groupId}; per-student points were not computed.`,
        );
        continue;
      }

      for (const team of teams) {
        try {
          await this.teamsSyncService.finalizeSprintSync(
            (team._id as any).toString(),
            sprint.sprintId,
            sprint.groupId,
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

      // finalizeSprintSync flips isFinalized on the first team that wins the
      // race; reload to confirm and otherwise force the lock so subsequent
      // runs are no-ops.
      const fresh = await this.sprintConfigModel.findById(sprint._id).exec();
      if (fresh && !fresh.isFinalized) {
        fresh.isFinalized = true;
        await fresh.save();
      }
    }
  }
}
