-- AlterTable
ALTER TABLE "PatientRecord" ADD COLUMN     "professionalInChargeId" TEXT;

-- AddForeignKey
ALTER TABLE "PatientRecord" ADD CONSTRAINT "PatientRecord_professionalInChargeId_fkey" FOREIGN KEY ("professionalInChargeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
