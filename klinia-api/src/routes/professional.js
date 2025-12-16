import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/dbClient.js";
import bcrypt from "bcryptjs";

function getProfessionalId(req) {
    return req.user?.id || null; 
}

const router = Router();

const profileUpdateSchema = z.object({
    description: z.string().trim().nullable().optional(),
    phone: z.string().trim().length(10, "El teléfono debe tener 10 dígitos.").optional(),
    emergencyContactName: z.string().trim().nullable().optional(),
    emergencyContactPhone: z.string().trim().length(10, "El teléfono de emergencia debe tener 10 dígitos.").nullable().optional(),
    email: z.string().email("Email inválido.").optional(),
    currentPassword: z.string().min(1, "Contraseña actual requerida."),
    newPassword: z.string().min(8, "Mínimo 8 caracteres.").optional(),
    phoneIsVerified: z.boolean().optional(),
    profilePictureUrl: z.string().url("URL de foto de perfil inválida.").nullable().optional(),
}).strict(); 

router.put("/profile", async (req, res) => {
    const professionalId = getProfessionalId(req);
    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos.", errors: parsed.error.issues });

    const data = parsed.data; 

    try {
        const record = await prisma.user.findUnique({
            where: { id: professionalId },
            include: { professionalProfile: true, kycRecord: true }, 
        });

        if (!record) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        
        if (!record.kycRecord) {
             return res.status(404).json({ message: "Registro KYC (perfil principal) no encontrado." });
        }
        
        if (!record.passwordHash) {
             return res.status(403).json({ message: "El usuario no tiene una contraseña para validar los cambios." });
        }

        const isPasswordValid = await bcrypt.compare(data.currentPassword, record.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Contraseña actual incorrecta." });
        }

        const userUpdates = {};
        const profileUpdates = {}; 
        const kycUpdates = {};    
        const currentKycPhone = record.kycRecord.phone;
        
        if (data.newPassword) {
            userUpdates.passwordHash = await bcrypt.hash(data.newPassword, 10);
        }

        if (data.email && data.email !== record.email) {
            const duplicateEmail = await prisma.user.findFirst({
                where: { email: data.email.toLowerCase(), NOT: { id: professionalId } },
            });
            if (duplicateEmail) {
                return res.status(409).json({ message: "El nuevo correo electrónico ya está registrado." });
            }
            userUpdates.email = data.email.toLowerCase();
        }
        
        if (data.description !== undefined) {
             profileUpdates.description = data.description;
        }

        if (data.profilePictureUrl !== undefined) {
             profileUpdates.profilePictureUrl = data.profilePictureUrl;
        }

        if (data.emergencyContactName !== undefined) kycUpdates.emergencyName = data.emergencyContactName;
        if (data.emergencyContactPhone !== undefined) kycUpdates.emergencyPhone = data.emergencyContactPhone;

        if (data.phone !== undefined) {
            kycUpdates.phone = data.phone;
            kycUpdates.phoneIsVerified = data.phoneIsVerified || false; 
        }

        if (data.phone === undefined && Object.keys(kycUpdates).length > 0) {
             if (currentKycPhone !== undefined) {
                 kycUpdates.phone = currentKycPhone;
             }
        }
        
        const transactionOperations = [];
        
        if (Object.keys(userUpdates).length > 0) {
            transactionOperations.push(
                prisma.user.update({ where: { id: professionalId }, data: userUpdates })
            );
        }

        if (Object.keys(kycUpdates).length > 0) {
            transactionOperations.push(
                prisma.kycRecord.update({
                    where: { userId: professionalId },
                    data: kycUpdates,
                })
            );
        }
        
        if (Object.keys(profileUpdates).length > 0 || !record.professionalProfile) {
             const profileOp = record.professionalProfile
                 ? prisma.professionalProfile.update({
                     where: { userId: professionalId },
                     data: profileUpdates,
                 })
                 : prisma.professionalProfile.create({
                     data: { userId: professionalId, ...profileUpdates },
                 });
             transactionOperations.push(profileOp);
        }
        
        if (transactionOperations.length === 0) {
            return res.status(200).json({ message: "No se detectaron cambios para guardar." });
        }

        await prisma.$transaction(transactionOperations);
        
        const updatedRecord = await prisma.user.findUnique({
            where: { id: professionalId },
            include: { professionalProfile: true, kycRecord: true }, 
        });


        return res.json({ 
            message: "Perfil actualizado exitosamente.", 
            user: updatedRecord
        });

    } catch (e) {
        console.error("[Professional] Profile Update Fatal Error:", e);
        return res.status(500).json({ message: "Error interno al actualizar el perfil." });
    }
});

export default router;