const { signAccessToken, verifyAccessToken } = require("../../lib/jwt");

process.env.JWT_SECRET = "test-secret-at-least-32-characters-long!!";

describe("JWT utilities", () => {
  it("signs and verifies an access token", () => {
    const token = signAccessToken({ sub: "emp-123", role: "EMPLOYEE" });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe("emp-123");
    expect(decoded.role).toBe("EMPLOYEE");
  });

  it("throws on invalid token", () => {
    expect(() => verifyAccessToken("invalid")).toThrow();
  });
});
