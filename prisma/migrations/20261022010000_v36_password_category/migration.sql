-- パスワード管理のカテゴリ（自由に追加・名前変更・削除できるようにする）
CREATE TABLE "PasswordCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordCategory_name_key" ON "PasswordCategory"("name");

-- これまでの固定カテゴリ＋「イガワ」
INSERT INTO "PasswordCategory" ("id", "name", "sortOrder") VALUES
    ('pwcat-1', '事務所', 1),
    ('pwcat-2', 'コレカ', 2),
    ('pwcat-3', 'Sherpa', 3),
    ('pwcat-4', 'Beagle', 4),
    ('pwcat-5', 'Samurai', 5),
    ('pwcat-6', 'イガワ', 6)
ON CONFLICT ("name") DO NOTHING;

-- 既存のパスワードに、上記以外のカテゴリ名が使われていても、画面から見えなくならないよう引き継ぐ
INSERT INTO "PasswordCategory" ("id", "name", "sortOrder")
SELECT 'pwcat-x-' || md5(t."category"), t."category", 100
FROM (SELECT DISTINCT "category" FROM "PasswordEntry") t
WHERE t."category" NOT IN (SELECT "name" FROM "PasswordCategory");
