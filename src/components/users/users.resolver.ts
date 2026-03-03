import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from 'src/libs/dto/user/user';
import { LoginInput, UserInput } from 'src/libs/dto/user/user.input';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';

@Resolver()
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}
  // @UseGuards(AuthGuard)
  // @Mutation(() => User)
  // public async signup(@Args('input') input: UserInput): Promise<User> {
  //   console.log('Mutation: signup');
  //   return await this.usersService.signup(input);
  // }
  // @UseGuards(AuthGuard)
  // @Mutation(() => User)
  // public async login(@Args('input') input: LoginInput): Promise<User> {
  //   console.log('Mutation: login');
  //   return await this.usersService.login(input);
  // }
}
