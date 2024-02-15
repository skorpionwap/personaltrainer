const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.setRoleAsClaim = functions.auth.user().onCreate(async (user) => {
  try {
    const userDoc = await admin.firestore().collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
      console.log("Documentul utilizatorului nu există.");
      return null;
    }

    const userData = userDoc.data();
    const userRole = userData.role; // Rolul ales în timpul înregistrării

    const claims = {};
    if (userRole === "trainer") {
      claims.trainer = true;
    } else if (userRole === "client") {
      claims.client = true;
    }

    await admin.auth().setCustomUserClaims(user.uid, claims);
    console.log(`Claim-uri setate pentru utilizatorul ${user.uid} cu rolul ${userRole}`);
  } catch (error) {
    console.error("Eroare la setarea Claim-urilor:", error);
  }
});
