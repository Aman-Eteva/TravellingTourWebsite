CREATE EXTENSION IF NOT EXISTS vector;
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TourCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "destinationId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "duration" INTEGER NOT NULL,
    "minTravelers" INTEGER NOT NULL DEFAULT 1,
    "maxTravelers" INTEGER NOT NULL DEFAULT 12,
    "difficulty" TEXT NOT NULL DEFAULT 'Easy',
    "meetingPoint" TEXT NOT NULL,
    "included" TEXT[],
    "excluded" TEXT[],
    "cancellationPolicy" TEXT NOT NULL,
    "cancellationDays" INTEGER NOT NULL DEFAULT 7,
    "refundPercent" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourImage" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TourImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourAvailability" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "capacity" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TourAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryDay" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "day" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "meals" TEXT NOT NULL,

    CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "sequence" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "availabilityId" UUID NOT NULL,
    "travelDate" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refund" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingTraveler" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "email" TEXT,

    CONSTRAINT "BookingTraveler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" UUID NOT NULL,
    "wishlistId" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New adventure',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RAGDocument" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL_TRAVEL',
    "ownerId" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "model" TEXT,
    "indexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RAGDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RAGChunk" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "embedding" vector,

    CONSTRAINT "RAGChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_name_key" ON "Destination"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TourCategory_name_key" ON "TourCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");

-- CreateIndex
CREATE INDEX "Tour_destinationId_categoryId_status_idx" ON "Tour"("destinationId", "categoryId", "status");

-- CreateIndex
CREATE INDEX "Tour_price_idx" ON "Tour"("price");

-- CreateIndex
CREATE INDEX "TourAvailability_date_idx" ON "TourAvailability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TourAvailability_tourId_date_key" ON "TourAvailability"("tourId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryDay_tourId_day_key" ON "ItineraryDay"("tourId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_sequence_key" ON "Booking"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE INDEX "Booking_userId_status_idx" ON "Booking"("userId", "status");

-- CreateIndex
CREATE INDEX "Booking_travelDate_idx" ON "Booking"("travelDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_tourId_idx" ON "Review"("tourId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_key" ON "Wishlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_wishlistId_tourId_key" ON "WishlistItem"("wishlistId", "tourId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "ChatConversation_userId_idx" ON "ChatConversation"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "RAGDocument_ownerId_status_idx" ON "RAGDocument"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RAGChunk_documentId_position_key" ON "RAGChunk"("documentId", "position");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TourCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourImage" ADD CONSTRAINT "TourImage_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourAvailability" ADD CONSTRAINT "TourAvailability_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "TourAvailability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTraveler" ADD CONSTRAINT "BookingTraveler_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RAGDocument" ADD CONSTRAINT "RAGDocument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RAGChunk" ADD CONSTRAINT "RAGChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RAGDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "TourAvailability" ADD CONSTRAINT "valid_capacity" CHECK (reserved >= 0 AND reserved <= capacity);
ALTER TABLE "Review" ADD CONSTRAINT "valid_rating" CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE "Tour" ADD CONSTRAINT "valid_tour_price" CHECK (price > 0 AND "minTravelers" <= "maxTravelers");
ALTER TABLE "Booking" ADD CONSTRAINT "valid_booking_total" CHECK (total >= 0 AND count > 0);

