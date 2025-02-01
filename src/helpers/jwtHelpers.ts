import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import config from '../config';

const createToken = (
  payload: Record<string, unknown>,
  secret: Secret,
  expireTime: string,
): string => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: expireTime,
  };
  // Cast secret as string to ensure it matches the expected type
  return jwt.sign(payload, secret as string, options);
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
  return jwt.verify(token, secret as string) as JwtPayload;
};

const createPasswordResetToken = (payload: object) => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: config.jwt.passwordResetTokenExpirationTime,
  };
  return jwt.sign(payload, config.jwt.secret as string, options);
};

export const jwtHelpers = {
  createToken,
  verifyToken,
  createPasswordResetToken,
};
