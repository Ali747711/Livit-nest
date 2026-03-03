import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/libs/dto/user/user';
import { LoginInput, UserInput } from 'src/libs/dto/user/user.input';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private authService: AuthService,
  ) {}

  // public async signup(input: UserInput): Promise<User> {
  //   input.userPassword = await this.authService.hashPassword(input.userPassword);
  //   try {
  //     const result = await this.userModel.create(input);
  //     result.accessToken = await this.authService.createToken(result);
  //     // console.log('User after createToken service: ', result);
  //     return result;
  //   } catch (error) {
  //     console.log('Error, serviceModel: ', error);
  //     throw new BadRequestException('Sign-up process failed!');
  //   }
  // }

  // public async login(input: LoginInput): Promise<User> {
  //   const { email, userPassword } = input;
  //   // console.log(email, userPassword);
  //   const response: User | null = await this.userModel.findOne({ email }).select('+userPassword').exec();
  //   // console.log(response);
  //   if (!response) {
  //     throw new InternalServerErrorException('Internal server error');
  //   } else {
  //     const isMatch = await this.authService.comparePassword(input.userPassword, response.userPassword);
  //     console.log(isMatch);
  //     if (!isMatch) {
  //       throw new InternalServerErrorException('Internal server error');
  //     }
  //     response.accessToken = await this.authService.createToken(response);
  //     return response;
  //   }
  // }
}
