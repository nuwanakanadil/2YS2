// middleware/requireRole.js
module.exports = function requireRole(...allowed) {
  // flatten in case someone passes an array
  const flatAllowed = allowed.flat ? allowed.flat() : [].concat(...allowed);
  const allowedSet = new Set(
    flatAllowed.map(r => String(r).toUpperCase().trim())
  );

  return (req, res, next) => {
    // read from either req.userRole (your convention) or req.user.role (fallback)
    const raw = req.userRole ?? req.user?.role ?? null;
    if (!raw) {
      return res.status(401).json({ message: 'Unauthorized: no role on token' });
    }

    const userRoles = Array.isArray(raw) ? raw : [raw];
    const userSet = new Set(
      userRoles.map(r => String(r).toUpperCase().trim())
    );

    // Super-role shortcut: ADMIN passes all checks
    if (userSet.has('ADMIN')) return next();

    // Pass if any of the user's roles is allowed
    for (const r of userSet) {
      if (allowedSet.has(r)) return next();
    }

    return res.status(403).json({ message: `Forbidden: role=${[...userSet].join(',')}` });
  };
};
