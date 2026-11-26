ALTER TABLE "Submission" ADD COLUMN "attemptId" TEXT;
CREATE UNIQUE INDEX "Submission_attemptId_key" ON "Submission"("attemptId");
