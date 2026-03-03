import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { shapeIntoMongoObjectId } from 'src/libs/config';
import { Member } from 'src/libs/dto/member/member';
import { P } from 'src/libs/types/common';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  public async hashPassword(userPassword: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(userPassword, salt);
  }

  public async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  public async createToken(user: Member): Promise<string> {
    const payload: P = {};
    Object.keys(user['_doc'] ? user['_doc'] : user).map((ele) => {
      payload[`${ele}`] = user[`${ele}`];
    });

    delete payload.userPassword;
    return await this.jwtService.signAsync(payload);
  }

  public async verifyToken(token: string): Promise<Member> {
    const user = await this.jwtService.verifyAsync(token);
    user._id = shapeIntoMongoObjectId(user._id);
    return user;
  }
}
