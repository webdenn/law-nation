-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('PENDING_ADMIN_REVIEW', 'ASSIGNED_TO_EDITOR', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "authorPhone" TEXT,
    "authorOrganization" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "keywords" TEXT,
    "coAuthors" TEXT,
    "remarksToEditor" TEXT,
    "originalPdfUrl" TEXT NOT NULL,
    "currentPdfUrl" TEXT NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'PENDING_ADMIN_REVIEW',
    "assignedEditorId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleRevision" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Article_status_idx" ON "Article"("status");

-- CreateIndex
CREATE INDEX "Article_assignedEditorId_idx" ON "Article"("assignedEditorId");

-- CreateIndex
CREATE INDEX "Article_authorEmail_idx" ON "Article"("authorEmail");

-- CreateIndex
CREATE INDEX "ArticleRevision_articleId_idx" ON "ArticleRevision"("articleId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_assignedEditorId_fkey" FOREIGN KEY ("assignedEditorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRevision" ADD CONSTRAINT "ArticleRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
