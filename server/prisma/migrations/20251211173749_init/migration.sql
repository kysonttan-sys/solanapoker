-- CreateTable
CREATE TABLE "SystemState" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "jackpot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tvl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHands" INTEGER NOT NULL DEFAULT 0,
    "activePlayers" INTEGER NOT NULL DEFAULT 0,
    "communityPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "bio" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWinnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHands" INTEGER NOT NULL DEFAULT 0,
    "vipRank" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT,
    "referredBy" TEXT,
    "referralRank" INTEGER NOT NULL DEFAULT 0,
    "hostRank" INTEGER NOT NULL DEFAULT 0,
    "hostEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onChainBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "walletVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastChainSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "chainTxHash" TEXT,
    "chainStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "handId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hand" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "handNumber" INTEGER NOT NULL,
    "winnerIds" TEXT NOT NULL,
    "potAmount" DOUBLE PRECISION NOT NULL,
    "rakeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "communityCards" TEXT NOT NULL,
    "finalBoardState" TEXT,
    "fairnessHash" TEXT NOT NULL,
    "fairnessReveal" TEXT,
    "clientSeed" TEXT,
    "nonce" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RakeDistribution" (
    "id" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "totalRake" DOUBLE PRECISION NOT NULL,
    "hostShare" DOUBLE PRECISION NOT NULL,
    "hostUserId" TEXT,
    "hostTier" INTEGER NOT NULL DEFAULT 0,
    "referrerShare" DOUBLE PRECISION NOT NULL,
    "referrerUserId" TEXT,
    "referrerRank" INTEGER NOT NULL DEFAULT 0,
    "jackpotShare" DOUBLE PRECISION NOT NULL,
    "globalPoolShare" DOUBLE PRECISION NOT NULL,
    "developerShare" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RakeDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buyIn" DOUBLE PRECISION NOT NULL,
    "prizePool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxPlayers" INTEGER NOT NULL DEFAULT 9,
    "minPlayers" INTEGER NOT NULL DEFAULT 6,
    "maxSeats" INTEGER NOT NULL DEFAULT 9,
    "startingChips" INTEGER NOT NULL DEFAULT 10000,
    "smallBlind" INTEGER NOT NULL DEFAULT 50,
    "bigBlind" INTEGER NOT NULL DEFAULT 100,
    "blindLevel" INTEGER NOT NULL DEFAULT 1,
    "handsPerLevel" INTEGER NOT NULL DEFAULT 10,
    "currentHand" INTEGER NOT NULL DEFAULT 0,
    "players" TEXT NOT NULL DEFAULT '[]',
    "registeredCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'REGISTERING',
    "creatorId" TEXT,
    "hostShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3),
    "finishTime" TIMESTAMP(3),
    "winners" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_totalWinnings_idx" ON "User"("totalWinnings");

-- CreateIndex
CREATE INDEX "User_walletVerified_idx" ON "User"("walletVerified");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_chainTxHash_idx" ON "Transaction"("chainTxHash");

-- CreateIndex
CREATE INDEX "Transaction_handId_idx" ON "Transaction"("handId");

-- CreateIndex
CREATE INDEX "Hand_userId_idx" ON "Hand"("userId");

-- CreateIndex
CREATE INDEX "Hand_tableId_idx" ON "Hand"("tableId");

-- CreateIndex
CREATE INDEX "Hand_handNumber_idx" ON "Hand"("handNumber");

-- CreateIndex
CREATE INDEX "Hand_createdAt_idx" ON "Hand"("createdAt");

-- CreateIndex
CREATE INDEX "RakeDistribution_handId_idx" ON "RakeDistribution"("handId");

-- CreateIndex
CREATE INDEX "RakeDistribution_hostUserId_idx" ON "RakeDistribution"("hostUserId");

-- CreateIndex
CREATE INDEX "RakeDistribution_referrerUserId_idx" ON "RakeDistribution"("referrerUserId");

-- CreateIndex
CREATE INDEX "RakeDistribution_createdAt_idx" ON "RakeDistribution"("createdAt");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_creatorId_idx" ON "Tournament"("creatorId");

-- CreateIndex
CREATE INDEX "Tournament_createdAt_idx" ON "Tournament"("createdAt");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_handId_fkey" FOREIGN KEY ("handId") REFERENCES "Hand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hand" ADD CONSTRAINT "Hand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
