const { OAuth2Client } = require("google-auth-library");
const userRepository = require("../repositories/userRepository");
const userProfileRepository = require("../repositories/userProfileRepository");
const { signJwt } = require("../utils/authToken");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.authenticateWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Falta el idToken en la solicitud" });
    }

    // Verificar token con Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email_verified) {
      return res.status(401).json({ message: "Token inválido o correo no verificado" });
    }

    const { email, name, sub: googleId, picture } = payload;

    // Buscar si ya existe el usuario
    let user = await userRepository.obtenerPorEmail(email);

    if (!user) {
      // Crear usuario nuevo
      user = await userRepository.crear({
        name,
        email,
        passwordHash: "", // no se usa para login con Google
        role: "user",
        profile: null,
        phoneNumber: null,
      });

      // Crear su perfil básico
      const profile = await userProfileRepository.crear({
        userid: user._id,
        birthdate: null,
        preferences: {},
        dietaryRestrictions: [],
        allergies: [],
      });

      user.profile = profile.toObject();
      await userRepository.actualizar(user._id, { profile: user.profile });
    }

    // Generar JWT propio
    const token = signJwt({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: "Autenticación exitosa con Google",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (err) {
    console.error("Error en Google Auth:", err);
    res.status(401).json({ message: "Token inválido o expirado", error: err.message });
  }
};
