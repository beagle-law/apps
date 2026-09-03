-- CreateTable
CREATE TABLE "KnowhowImage" (
    "id" TEXT NOT NULL,
    "knowhowId" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL DEFAULT '',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowhowImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowhowImage_knowhowId_idx" ON "KnowhowImage"("knowhowId");

-- AddForeignKey
ALTER TABLE "KnowhowImage" ADD CONSTRAINT "KnowhowImage_knowhowId_fkey" FOREIGN KEY ("knowhowId") REFERENCES "KnowhowEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
