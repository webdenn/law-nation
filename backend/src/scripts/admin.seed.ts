import "dotenv/config";
import { prisma } from "../db/db.js";
import bcrypt from "bcrypt";

async function main() {
  console.log("Starting database seed...");

  // 1. Create Permissions
  console.log("Creating permissions...");
  const permissions = [
    // User permissions
    { key: "user.read", description: "View users", module: "user" },
    { key: "user.write", description: "Create and edit users", module: "user" },
    { key: "user.delete", description: "Delete users", module: "user" },

    // Article permissions
    { key: "article.read", description: "View articles", module: "article" },
    { key: "article.write", description: "Create and edit articles", module: "article" },
    { key: "article.delete", description: "Delete articles", module: "article" },
    { key: "article.approve", description: "Approve articles", module: "article" },
    { key: "article.assign", description: "Assign articles to editors", module: "article" },

    // Role permissions
    { key: "role.read", description: "View roles", module: "role" },
    { key: "role.write", description: "Create and edit roles", module: "role" },
    { key: "role.delete", description: "Delete roles", module: "role" },

    // Permission permissions
    { key: "permission.read", description: "View permissions", module: "permission" },
    { key: "permission.write", description: "Manage permissions", module: "permission" },

    // Admin permissions
    { key: "admin.read", description: "View admin dashboard", module: "admin" },
    { key: "admin.write", description: "Manage admin settings", module: "admin" },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
  }
  console.log(`Created ${permissions.length} permissions`);

  // 2. Create Roles
  console.log("Creating roles...");
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      description: "Full system access - can manage everything",
    },
  });

  const editorRole = await prisma.role.upsert({
    where: { name: "editor" },
    update: {},
    create: {
      name: "editor",
      description: "Can review and approve articles",
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: {
      name: "user",
      description: "Regular user - can submit articles",
    },
  });

  console.log("Created 3 roles: admin, editor, user");

  // 3. Assign ALL Permissions to Admin Role
  console.log("Assigning permissions to admin role...");
  const allPermissions = await prisma.permission.findMany();

  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }
  console.log(`Admin role has ${allPermissions.length} permissions`);

  // 4. Assign Specific Permissions to Editor Role
  console.log("Assigning permissions to editor role...");
  const editorPermissions = [
    "article.read",
    "article.write",
    "article.approve",
    "user.read",
  ];

  for (const permKey of editorPermissions) {
    const perm = await prisma.permission.findUnique({
      where: { key: permKey },
    });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: editorRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: editorRole.id,
          permissionId: perm.id,
        },
      });
    }
  }
  console.log(`Editor role has ${editorPermissions.length} permissions`);

  // 5. Assign Permissions to User Role
  console.log("Assigning permissions to user role...");
  const userPermissions = ["article.read", "article.write"];

  for (const permKey of userPermissions) {
    const perm = await prisma.permission.findUnique({
      where: { key: permKey },
    });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: userRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: userRole.id,
          permissionId: perm.id,
        },
      });
    }
  }
  console.log(`User role has ${userPermissions.length} permissions`);

  // 6. Create Admin User
  console.log("Creating admin user...");
  const adminPassword = "Admin@123"; // CHANGE THIS IN PRODUCTION!
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@lawnation.com" },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@lawnation.com",
      passwordHash: passwordHash,
      phone: "+1234567890",
      isActive: true,
    },
  });

  console.log("Admin user created");
  console.log(`   Email: admin@lawnation.com`);
  // console.log(`   Password: ${adminPassword}`);

  // 7. Assign Admin Role to Admin User
  console.log("Assigning admin role to admin user...");
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log("Admin user has admin role");
  console.log("Database seeding completed successfully!");
  console.log("Summary:");
  console.log(`   - Permissions: ${allPermissions.length}`);
  console.log(`   - Roles: 3 (admin, editor, user)`);
  console.log(`   - Admin User: admin@lawnation.com`);
  // console.log(`   - Admin Password: ${adminPassword}`);
  console.log("IMPORTANT: Change the admin password after first login");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
