const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.register = async (req, res) => {
  try {
    const { nom, email, mot_de_passe } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const user = await User.create({ nom, email, mot_de_passe });
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    console.log('🔍 Body reçu:', req.body);

    // ✅ Chercher les deux noms de champs
    const { email, mot_de_passe, password } = req.body;
    const motDePasse = mot_de_passe || password; // Accepter les deux

    console.log('📧 Email:', email);
    console.log('🔒 Mot de passe reçu:', motDePasse ? 'OUI' : 'NON');

    if (!email || !motDePasse) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ email });
    console.log('👤 Utilisateur trouvé:', user ? `Oui (${user.email})` : 'Non');

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    console.log('🔐 Hash stocké:', user.mot_de_passe ? 'OUI' : 'NON');

    const isMatch = await user.comparePassword(motDePasse); // ✅ Utiliser motDePasse
    console.log('✅ Comparaison résultat:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    // req.user est défini par le middleware d'authentification
    const user = await User.findById(req.user.id).select('-mot_de_passe');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({
      message: 'Profil récupéré avec succès',
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { nom, email } = req.body;
    const userId = req.user.id;

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email) {
      const emailExists = await User.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      
      if (emailExists) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        ...(nom && { nom }),
        ...(email && { email })
      },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-mot_de_passe');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({
      message: 'Profil mis à jour avec succès',
      user: {
        id: updatedUser._id,
        nom: updatedUser.nom,
        email: updatedUser.email,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
