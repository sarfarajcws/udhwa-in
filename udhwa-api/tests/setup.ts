// Unit tests never touch the database; give env.ts the values it validates.
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
process.env.SESSION_SECRET ||= "unit-test-session-secret";
process.env.NODE_ENV ||= "test";
// Integrations under test (values are fake; network calls are stubbed per test).
process.env.GOOGLE_CLIENT_ID ||= "web-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET ||= "test-secret";
process.env.ADMIN_EMAILS ||= "admin@example.com";
process.env.CLOUDINARY_CLOUD_NAME ||= "udhwa-test";
process.env.CLOUDINARY_API_KEY ||= "123456";
process.env.CLOUDINARY_API_SECRET ||= "abcd";
