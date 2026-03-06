-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_School" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "grades" TEXT NOT NULL DEFAULT '["高一","高二","高三"]',
    "classCount" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_School" ("code", "createdAt", "id", "name") SELECT "code", "createdAt", "id", "name" FROM "School";
DROP TABLE "School";
ALTER TABLE "new_School" RENAME TO "School";
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
