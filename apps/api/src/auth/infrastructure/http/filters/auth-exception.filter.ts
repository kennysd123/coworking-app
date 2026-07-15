import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { EmailAlreadyExistsException } from '../../../../users/domain/exceptions/email-already-exists.exception';
import { WeakPasswordException } from '../../../../users/domain/exceptions/weak-password.exception';
import { InvalidCredentialsException } from '../../../domain/exceptions/invalid-credentials.exception';
import { AdminRoleNotAllowedException } from '../../../domain/exceptions/admin-role-not-allowed.exception';

@Catch(
  EmailAlreadyExistsException,
  WeakPasswordException,
  InvalidCredentialsException,
  AdminRoleNotAllowedException,
)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | EmailAlreadyExistsException
      | WeakPasswordException
      | InvalidCredentialsException
      | AdminRoleNotAllowedException,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let error: string;

    if (exception instanceof EmailAlreadyExistsException) {
      status = 409;
      error = 'Conflict';
    } else if (exception instanceof InvalidCredentialsException) {
      status = 401;
      error = 'Unauthorized';
    } else {
      // WeakPasswordException | AdminRoleNotAllowedException
      status = 400;
      error = 'Bad Request';
    }

    response.status(status).json({ statusCode: status, message: exception.message, error });
  }
}
