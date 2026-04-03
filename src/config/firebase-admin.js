const { firebase } = require("./env");

function parsePrivateKey(privateKey) {
  if (!privateKey) {
    return "";
  }

  return privateKey.replace(/\\n/g, "\n");
}

const firebaseAdmin = {
  initialized: Boolean(firebase.projectId && firebase.clientEmail && firebase.privateKey),
  config: {
    projectId: firebase.projectId,
    clientEmail: firebase.clientEmail,
    privateKey: parsePrivateKey(firebase.privateKey),
  },
};

async function verifyIdToken(token) {
  return {
    uid: `mock_${token.slice(0, 12)}`,
    email: "user@example.com",
  };
}

module.exports = {
  firebaseAdmin,
  verifyIdToken,
};
