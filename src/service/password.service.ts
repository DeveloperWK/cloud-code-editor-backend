import bcrypt from "bcrypt";

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
export { hashPassword, verifyPassword };
