import { AuthService } from './../auth.service';
import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Message } from 'src/libs/enums/comma.enum';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext | any): Promise<boolean> {
    console.info('======= @guard(): Guard checking all incoming request for authentication! [AuthGuard] ==========');
    if (context.contextType === 'graphql') {
      const req = context.getArgByIndex(2).req;

      const headerToken = req.headers?.authorization;
      if (!headerToken) throw new BadRequestException(Message.TOKEN_NOT_EXIST);

      const token = headerToken.split(' ')[1],
        authMember = await this.authService.verifyToken(token);
      if (!authMember) throw new BadRequestException(Message.NOT_AUTHENTICATED);

      console.log('Authenticated memberName: ', authMember.memberNick);
      req.body.authMember = authMember;

      return true;
    } else {
      return true;
    }
  }
}

// =======CONTEXT LOGS:
// ExecutionContextHost {
//   args: [
//     undefined,
//     { input: [Object] },
//     { req: [IncomingMessage] },
//     {
//       fieldName: 'login',
//       fieldNodes: [Array],
//       returnType: [GraphQLNonNull],
//       parentType: [GraphQLObjectType],
//       path: [Object],
//       schema: [GraphQLSchema],
//       fragments: [Object: null prototype] {},
//       rootValue: undefined,
//       operation: [Object],
//       variableValues: [Object],
//       cacheControl: [Object]
//     }
//   ],
//   constructorRef: [class MemberResolver],
//   handler: [AsyncFunction: login],
//   contextType: 'graphql'
// }

// @Injectable()
// export class AuthGuard implements CanActivate {
//   constructor() {}
//   async canActivate(context: ExecutionContext | any): Promise<boolean> {
//     const gqlCtx = GqlExecutionContext.create(context);
//     const appContext = gqlCtx.getContext();

//     console.log('=== GraphQL Context Snapshot ===');
// console.log('Context: ', context);
// console.log('GQLCTX: ', gqlCtx);
//     const { req } = context.getArgByIndex(2);
//     console.log(req);

// console.log('=== GraphQL Context Snapshot ===');
// console.log('Keys in context:', Object.keys(appContext));
// console.log('req.headers:', appContext.req?.headers);
// console.log('req:', appContext.req);
// console.log('req.headers:', appContext.req?.headers ? 'exists' : 'missing');
// console.log('req.body:', appContext.req?.body); // usually undefined in GET/POST GraphQL
// console.log('connectionParams:', appContext.connectionParams);
// console.log('Full context:', JSON.stringify(appContext, null, 2)); // careful — can be huge
//     return true;
//   }
// }
