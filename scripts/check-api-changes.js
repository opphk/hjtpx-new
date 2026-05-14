const { generateSwaggerSpec } = require('../src/backend/config/swagger-auto');
const ApiChangeDetector = require('../src/backend/utils/apiChangeDetector');

console.log('🔍 Checking for API changes...');

try {
  const currentSpec = generateSwaggerSpec();
  const detector = new ApiChangeDetector();
  const changes = detector.checkForChanges(currentSpec, true);

  if (changes.breaking.length > 0) {
    console.log('❌ Breaking changes detected!');
    process.exit(1);
  } else {
    console.log('✅ No breaking changes detected.');
    process.exit(0);
  }
} catch (error) {
  console.error('❌ Error checking API changes:', error.message);
  process.exit(1);
}
