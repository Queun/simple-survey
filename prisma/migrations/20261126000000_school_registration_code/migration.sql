PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE "new_School" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "registrationCode" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Generate a separate registration code for each existing school.
INSERT INTO "new_School" ("id", "name", "code", "stage", "createdAt", "registrationCode")
SELECT "id", "name", "code", "stage", "createdAt", abs(random()) % 900000 + 100000 FROM "School";
UPDATE sqlite_sequence SET seq = MAX(seq, (SELECT seq FROM sqlite_sequence WHERE name = 'School'))
WHERE name = 'new_School' AND EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'School');

DROP TABLE "School";
ALTER TABLE "new_School" RENAME TO "School";
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");

COMMIT;
PRAGMA foreign_keys=ON;
