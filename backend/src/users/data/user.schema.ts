import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  // TODO - Add name field and make it required once all users have a name in the database
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  // TODO - Discuss with the blue team about the Role and Actor standardization according to Project Definition Document and API Specification.
  // Once the standardization is done, update the enum values and remove the lowercase check in the advisors controller and service.
  @Prop({
    required: true,
    enum: ['Student', 'Coordinator', 'Admin', 'PROFESSOR'],
  })
  role!: string;

  @Prop()
  teamId?: string;

  @Prop()
  githubAccountId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
