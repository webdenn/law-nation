import { prisma } from "@/db/db.js";

export class SettingsService {
    async getSettings(key: string) {
        const setting = await prisma.systemSettings.findUnique({
            where: { key },
        });
        return setting?.value || null;
    }

    async updateSettings(key: string, value: any, updatedBy?: string) {
        return await prisma.systemSettings.upsert({
            where: { key },
            update: {
                value,
                updatedBy: updatedBy ?? null,
            },
            create: {
                key,
                value,
                updatedBy: updatedBy ?? null,
            },
        });
    }
}
