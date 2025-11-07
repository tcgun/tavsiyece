// Avatar ile ilgili yardımcı fonksiyonlar

/**
 * Kullanıcı için avatar URL'i oluşturur
 * @param {string} name - Kullanıcı adı
 * @param {string} username - Kullanıcı adı (opsiyonel)
 * @returns {string} Avatar URL'i
 */
export const getAvatarUrl = (name, username) => {
  const displayName = name || username || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
};

/**
 * Kullanıcı için avatar URL'i oluşturur (mevcut photoURL varsa onu kullanır)
 * @param {string|null|undefined} photoURL - Mevcut fotoğraf URL'i
 * @param {string} name - Kullanıcı adı
 * @param {string} username - Kullanıcı adı (opsiyonel)
 * @returns {string} Avatar URL'i
 */
export const getAvatarUrlWithFallback = (photoURL, name, username) => {
  if (photoURL) return photoURL;
  return getAvatarUrl(name, username);
};

