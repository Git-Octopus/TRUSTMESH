const User = require('../models/User');

/**
 * List all authorized verifiers.
 * GET /api/verifiers
 */
exports.getVerifiers = async (req, res, next) => {
  try {
    const verifiers = await User.find({
      role: { $in: ['verifier', 'admin'] },
    })
      .select('walletAddress name email role createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: verifiers.length,
      verifiers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register or authorize a verifier off-chain (Admin only).
 * POST /api/verifiers
 */
exports.addVerifier = async (req, res, next) => {
  try {
    const { walletAddress, name, email } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Ethereum walletAddress (0x...) is required.',
      });
    }

    const normalizedAddress = walletAddress.toLowerCase().trim();

    let user = await User.findOne({ walletAddress: normalizedAddress });
    if (!user) {
      user = new User({
        walletAddress: normalizedAddress,
        name: name || 'Authorized Verifier',
        email: email || '',
        role: 'verifier',
      });
    } else {
      user.role = 'verifier';
      if (name) user.name = name;
      if (email) user.email = email;
    }

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Verifier registered and authorized successfully.',
      verifier: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
