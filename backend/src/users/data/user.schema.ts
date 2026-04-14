import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: ['Student', 'Coordinator', 'Admin'] })
  role!: string;

  @Prop()
  teamId?: string;

  @Prop()
  githubAccountId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
