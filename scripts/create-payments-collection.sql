-- MongoDB collection for payments (this is a reference - actual creation happens in MongoDB)
-- Collection: payments
-- 
-- Document structure:
-- {
--   _id: ObjectId,
--   reference: String (unique payment reference),
--   eventId: ObjectId (reference to events collection),
--   customerEmail: String,
--   customerName: String,
--   customerPhone: String,
--   seats: Array of Strings,
--   seatType: String,
--   amount: Number (base amount in Naira),
--   processingFee: Number (processing fee in Naira),
--   totalAmount: Number (total amount in Naira),
--   status: String (pending, confirmed, failed),
--   paystackData: Object (response from Paystack),
--   bookingId: ObjectId (reference to bookings collection, set after confirmation),
--   createdAt: Date,
--   updatedAt: Date
-- }
--
-- Indexes:
-- - reference (unique)
-- - eventId
-- - customerEmail
-- - status
-- - createdAt

-- MongoDB commands to create indexes
db.payments.createIndex({ "reference": 1 }, { unique: true })
db.payments.createIndex({ "eventId": 1 })
db.payments.createIndex({ "customerEmail": 1 })
db.payments.createIndex({ "status": 1 })
db.payments.createIndex({ "createdAt": 1 })
