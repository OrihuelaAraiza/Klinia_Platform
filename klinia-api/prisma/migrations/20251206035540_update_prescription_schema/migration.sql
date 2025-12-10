/*
  Warnings:

  - You are about to drop the column `description` on the `Prescription` table. All the data in the column will be lost.
  - Added the required column `dose` to the `Prescription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration` to the `Prescription` table without a default value. This is not possible if the table is not empty.
  - The required column `folio` was added to the `Prescription` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `form` to the `Prescription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frequency` to the `Prescription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `route` to the `Prescription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `substance` to the `Prescription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('VIGENTE', 'SUSPENDIDA');

-- AlterTable
ALTER TABLE "Prescription" DROP COLUMN "description",
ADD COLUMN     "dose" TEXT NOT NULL,
ADD COLUMN     "duration" TEXT NOT NULL,
ADD COLUMN     "folio" TEXT NOT NULL,
ADD COLUMN     "form" TEXT NOT NULL,
ADD COLUMN     "frequency" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "route" TEXT NOT NULL,
ADD COLUMN     "status" "PrescriptionStatus" NOT NULL DEFAULT 'VIGENTE',
ADD COLUMN     "substance" TEXT NOT NULL;
