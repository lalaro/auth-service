const { OAuth2Client } = require("google-auth-library");
const userRepository = process.env.USER_SERVICE_URL || 'http://localhost:8086'; //require("../repositories/userRepository");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// === GOOGLE LOGIN ===
exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Token de Google requerido" });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { name, email, picture } = payload;

    // Buscar o crear usuario
    let user = await userRepository.obtenerPorEmail(email);
    if (!user) {
      user = await userRepository.crear({
        name,
        email,
        picture,
        provider: "google",
        passwordHash: null // No necesita password
      });
    }

    // Crear token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.json({ message: "Autenticación con Google exitosa", token, user });
  } catch (error) {
    console.error("Error en googleAuth:", error);
    res.status(400).json({ message: "Token inválido o expirado", error: error.message });
  }
};

// === REGISTRO NORMAL ===
exports.register = async (req, res) => {
  try {
    console.log("📩 Datos recibidos en /register:", req.body); // 👈 LOG IMPORTANTE

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      console.log("❌ Faltan campos");
      return res.status(400).json({ message: "Nombre, email y contraseña son requeridos" });
    }

    const existingUser = await userRepository.obtenerPorEmail(email);
    if (existingUser) {
      console.log("⚠️ Usuario ya existe:", existingUser.email);
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    console.log("🔑 Hash generado:", passwordHash.substring(0, 10) + "...");

    const newUser = await userRepository.crear({
      name,
      email,
      passwordHash,
      provider: "local"
    });

    console.log("✅ Usuario creado:", newUser);

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    console.log("🎟️ Token generado:", token.substring(0, 20) + "...");

    res.json({ message: "Registro exitoso", token, user: newUser });
  } catch (error) {
    console.error("💥 Error en register:", error);
    res.status(500).json({ message: "Error al registrar usuario", error: error.message });
  }
};


// === LOGIN NORMAL ===
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }

    const user = await userRepository.obtenerPorEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    if (user.provider === "google") {
      return res.status(400).json({ message: "Este usuario debe iniciar sesión con Google" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.json({ message: "Login exitoso", token, user });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error en el login", error: error.message });
  }
};
