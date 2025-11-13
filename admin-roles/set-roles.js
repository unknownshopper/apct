const admin = require('firebase-admin');

function requireServiceAccount() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
    process.exit(1);
  }
}

async function setRoleByEmail(email, claim) {
  const user = await admin.auth().getUserByEmail(email);
  // Use single role field. If you prefer arrays, switch to { roles: [claim] } and update rules.
  const customClaims = { role: claim };
  await admin.auth().setCustomUserClaims(user.uid, customClaims);
  console.log(`OK ${email} =>`, customClaims);
}

async function main() {
  requireServiceAccount();
  admin.initializeApp();

  // Map emails to roles
  await setRoleByEmail('the@unknownshoppers.com', 'admin');
  await setRoleByEmail('inspector@pct.com', 'inspector');
  await setRoleByEmail('director@pct.com', 'director');

  console.log('Done. Ask users to sign out and sign in again to refresh claims.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
