-- Hand-picked related blogs (self-relation, many-to-many).
CREATE TABLE "_RelatedBlogs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RelatedBlogs_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX "_RelatedBlogs_B_index" ON "_RelatedBlogs"("B");
ALTER TABLE "_RelatedBlogs" ADD CONSTRAINT "_RelatedBlogs_A_fkey" FOREIGN KEY ("A") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_RelatedBlogs" ADD CONSTRAINT "_RelatedBlogs_B_fkey" FOREIGN KEY ("B") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
