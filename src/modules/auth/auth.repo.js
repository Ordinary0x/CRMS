async function upsertFromToken(authHeader) {
  return {
    message: "Login placeholder",
    authorizationHeaderReceived: Boolean(authHeader),
  };
}

module.exports = {
  upsertFromToken,
};
