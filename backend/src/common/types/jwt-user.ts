export type JwtUser = {
  userId: number;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
};
