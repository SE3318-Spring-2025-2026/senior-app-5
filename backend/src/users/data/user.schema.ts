import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../auth/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  // TODO - Add name field and make it required once all users have a name in the database
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: Object.values(Role) })
  role!: string;

  @Prop()
  teamId?: string;

  @Prop()
  githubAccountId?: string;

  @Prop()
  githubUsername?: string;

  // SECURITY: stored in plaintext for now. Encrypt at rest before exposing
  // production data — anyone with DB access can act as the user on GitHub.
  @Prop()
  githubAccessToken?: string;

  @Prop()
  githubScopes?: string;

  @Prop()
  githubLinkedAt?: Date;

  @Prop()
  passwordResetTokenHash?: string;

  @Prop()
  passwordResetTokenExpiresAt?: Date;
  
  @Prop()
  refreshTokenHash?: string;

  @Prop()
  refreshTokenExpiresAt?: Date;

}

export const UserSchema = SchemaFactory.createForClass(User);
