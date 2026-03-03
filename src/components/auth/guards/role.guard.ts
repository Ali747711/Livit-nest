import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { Message } from 'src/libs/enums/comma.enum';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext | any): Promise<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());

    console.info(`======= @guard(): Guard checking all incoming request for role! [RoleGuard]: ${roles} ==========`);
    if (!roles) return true;
    if (context.contextType === 'graphql') {
      const req = context.getArgByIndex(2).req;
      const headerToken = req.headers?.authorization;
      if (!headerToken) throw new BadRequestException(Message.TOKEN_NOT_EXIST);

      const token = headerToken.split(' ')[1],
        authMember = await this.authService.verifyToken(token),
        hasRole = () => roles.includes(authMember.memberType),
        hasPermission: boolean = hasRole();
      // console.log(`Roles: ${roles}\n TYPE: ${authMember.memberType}`);

      if (!authMember || !hasPermission) throw new BadRequestException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);

      console.log('Authenticated memberType: ', authMember.memberType);
      req.body.authMember = authMember;
      return true;
    } else {
      return true;
    }
  }
}
