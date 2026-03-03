import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Message } from 'src/libs/enums/comma.enum';
import { kill } from 'process';

@Injectable()
export class WithoutGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext | any): Promise<boolean> {
    console.info('======= @guard(): Guard checking all incoming request for WithoutGuard! [WithoutGuard] ==========');
    if (context.contextType === 'graphql') {
      const req = context.getArgByIndex(2).req;
      const headerToken = req.headers?.authorization;
      if (headerToken) {
        try {
          const token = headerToken.split(' ')[1];
          const authMember = await this.authService.verifyToken(token);
          req.body.authMember = authMember;
        } catch (err) {
          req.body.authMember = null;
        }
      } else {
        req.body.authMember = null;
      }

      console.log('memberNick[WithoutGuard] => ', req.body.authMember?.memberNick ?? 'none');
      return true;
    } else {
      return true;
    }
  }
}
