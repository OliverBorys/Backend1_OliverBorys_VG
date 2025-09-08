export function ensureGuestFavorites(req) {
  if (!Array.isArray(req.session.guestFavorites))
    req.session.guestFavorites = [];
}
export function ensureGuestCart(req) {
  if (!Array.isArray(req.session.guestCart)) req.session.guestCart = [];
}
