import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../config';

const createToken = (
  payload: Record<string, unknown>,
  secret: Secret,
  expireTime: string,
): string => {
  return jwt.sign(payload, secret as string, {
    algorithm: 'HS256',
    expiresIn: expireTime,
  });
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
  return jwt.verify(token, secret as string) as JwtPayload;
};

const createPasswordResetToken = (payload: object) => {
  return jwt.sign(payload, config.jwt.secret as string, {
    algorithm: 'HS256',
    expiresIn: config.jwt.passwordResetTokenExpirationTime,
  });
};

export const jwtHelpers = {
  createToken,
  verifyToken,
  createPasswordResetToken,
};
