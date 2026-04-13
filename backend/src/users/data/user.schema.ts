import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ROLES } from '../../auth/constants/roles';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  // TODO - Add name field and make it required once all users have a name in the database
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  // Canonical roles are uppercase; legacy values are temporarily accepted for compatibility.
  @Prop({
    required: true,
    enum: [
      ROLES.STUDENT,
      ROLES.TEAM_LEADER,
      ROLES.COORDINATOR,
      ROLES.ADMIN,
      ROLES.ADVISOR,
      'Student',
      'Coordinator',
      'Admin',
      'PROFESSOR',
    ],
  })
  role!: string;

  @Prop()
  teamId?: string;

  @Prop()
  githubAccountId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
