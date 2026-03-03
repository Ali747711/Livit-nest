import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthMember = createParamDecorator((data: string, context: ExecutionContext | any) => {
  let req: any;
  if (context.contextType === 'graphql') {
    req = context.getArgByIndex(2).req;
    if (req.body.authUser) {
      req.body.authMember.authorization = req.headers?.authorization;
    }
  } else req = context.switchToHttp().getRequest();

  const member = req.body.authMember;
  if (member) return data ? member?.[data] : member;
  else return null;
});
