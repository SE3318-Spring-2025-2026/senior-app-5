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
}

export const UserSchema = SchemaFactory.createForClass(User);
