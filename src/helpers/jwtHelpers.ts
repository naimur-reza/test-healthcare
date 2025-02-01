import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import config from '../config';

const createToken = (
  payload: Record<string, unknown>,
  secret: Secret,
  expireTime: string,
): string => {
  const options: SignOptions = {
    algorithm: 'HS256',
    // Cast expiresIn as any to bypass the strict type check
    expiresIn: expireTime as any,
  };
  return jwt.sign(payload, secret as string, options);
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
  return jwt.verify(token, secret as string) as JwtPayload;
};

const createPasswordResetToken = (payload: object) => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: config.jwt.passwordResetTokenExpirationTime as any,
  };
  return jwt.sign(payload, config.jwt.secret as string, options);
};

export const jwtHelpers = {
  createToken,
  verifyToken,
  createPasswordResetToken,
};
