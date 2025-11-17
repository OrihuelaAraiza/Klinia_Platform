/*
  Warnings:

  - You are about to drop the column `address` on the `KycRecord` table. All the data in the column will be lost.
  - You are about to drop the column `contact` on the `KycRecord` table. All the data in the column will be lost.
  - You are about to drop the column `documents` on the `KycRecord` table. All the data in the column will be lost.
  - You are about to drop the column `face` on the `KycRecord` table. All the data in the column will be lost.
  - You are about to drop the column `identity` on the `KycRecord` table. All the data in the column will be lost.
  - You are about to drop the column `verification` on the `KycRecord` table. All the data in the column will be lost.
  - Added the required column `birthDate` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `certificateFolio` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `curp` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `curpCoincide` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergencyName` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergencyPhone` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `faceConfidence` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `neighborhood` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombreCoincide` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postalCode` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `KycRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `street` to the `KycRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "KycRecord" DROP COLUMN "address",
DROP COLUMN "contact",
DROP COLUMN "documents",
DROP COLUMN "face",
DROP COLUMN "identity",
DROP COLUMN "verification",
ADD COLUMN     "birthDate" TEXT NOT NULL,
ADD COLUMN     "certificateFolio" TEXT NOT NULL,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "curp" TEXT NOT NULL,
ADD COLUMN     "curpCoincide" BOOLEAN NOT NULL,
ADD COLUMN     "emergencyName" TEXT NOT NULL,
ADD COLUMN     "emergencyPhone" TEXT NOT NULL,
ADD COLUMN     "faceConfidence" TEXT NOT NULL,
ADD COLUMN     "faceMatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "neighborhood" TEXT NOT NULL,
ADD COLUMN     "nombreCoincide" BOOLEAN NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "postalCode" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "street" TEXT NOT NULL;
