-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BatchTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "batchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BatchTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BatchTransaction" ("batchId", "createdAt", "from", "id", "status", "to", "updatedAt", "value") SELECT "batchId", "createdAt", "from", "id", "status", "to", "updatedAt", "value" FROM "BatchTransaction";
DROP TABLE "BatchTransaction";
ALTER TABLE "new_BatchTransaction" RENAME TO "BatchTransaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
