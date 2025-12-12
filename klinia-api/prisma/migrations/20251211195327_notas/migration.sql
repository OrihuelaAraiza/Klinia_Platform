-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('open', 'closed');

-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'CONFIRMED';

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "subjective" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "analysis" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "diagnosesJson" TEXT NOT NULL,
    "status" "NoteStatus" NOT NULL DEFAULT 'open',
    "closedAt" TIMESTAMP(3),
    "addendaJson" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_patientId_createdAt_idx" ON "Note"("patientId", "createdAt");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
