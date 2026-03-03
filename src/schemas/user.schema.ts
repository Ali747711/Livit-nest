import { Schema } from 'mongoose';
import { UserRole } from 'src/libs/enums/user.enum';

const UserSchema = new Schema(
  {
    name: {
      type: String,
      min: 3,
      max: 50,
    },
    email: {
      type: String,
      required: true,
    },
    userPassword: {
      type: String,
    },
    phone: Number,
    role: {
      type: String,
      enum: UserRole,
      default: UserRole.ADMIN,
    },
  },
  { timestamps: true },
);

export default UserSchema;
