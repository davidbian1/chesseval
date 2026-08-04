-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "pgn" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "humanSide" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);
