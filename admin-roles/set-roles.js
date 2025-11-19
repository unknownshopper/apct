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
  
  // Directors
  await setRoleByEmail('director01@pct.com', 'director');
  await setRoleByEmail('director02@pct.com', 'director');
  await setRoleByEmail('director03@pct.com', 'director');
  await setRoleByEmail('jalcz@pct.com', 'director');
  
  
  // Supervisors
  await setRoleByEmail('supervisor01@pct.com', 'supervisor');
  await setRoleByEmail('supervisor02@pct.com', 'supervisor');
  
  // Inspectors
  await setRoleByEmail('inspector01@pct.com', 'inspector');
  await setRoleByEmail('inspector02@pct.com', 'inspector');
  await setRoleByEmail('inspector03@pct.com', 'inspector');
  await setRoleByEmail('inspector04@pct.com', 'inspector');
  await setRoleByEmail('inspector05@pct.com', 'inspector');
  await setRoleByEmail('inspector06@pct.com', 'inspector');

  console.log('Done. Ask users to sign out and sign in again to refresh claims.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
