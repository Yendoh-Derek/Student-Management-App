ALTER TABLE "User"
ADD COLUMN "refreshTokenHash" TEXT,
ADD COLUMN "refreshTokenExp" TIMESTAMP(3);
