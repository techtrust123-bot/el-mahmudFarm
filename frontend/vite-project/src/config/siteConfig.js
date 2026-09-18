const normalizeWhatsappNumber = (value) => String(value || '').replace(/[^0-9]/g, '');

export const siteConfig = {
  name: import.meta.env.VITE_APP_NAME || 'CloudFarm',
  support: {
    whatsappNumber: normalizeWhatsappNumber(import.meta.env.VITE_ADMIN_WHATSAPP_NUMBER),
    xUrl: import.meta.env.VITE_CLOUDFARM_X_URL || '',
    instagramUrl: import.meta.env.VITE_CLOUDFARM_INSTAGRAM_URL || '',
    facebookUrl: import.meta.env.VITE_CLOUDFARM_FACEBOOK_URL || '',
    email: import.meta.env.VITE_SUPPORT_EMAIL || '',
  },
};

export const getWhatsappUrl = (message = 'Hello CloudFarm support, I need help with my farm account.') =>
  siteConfig.support.whatsappNumber
    ? `https://wa.me/${siteConfig.support.whatsappNumber}?text=${encodeURIComponent(message)}`
    : '';

export const availableSocialLinks = [
  siteConfig.support.xUrl && { label: 'X', href: siteConfig.support.xUrl },
  siteConfig.support.instagramUrl && { label: 'Instagram', href: siteConfig.support.instagramUrl },
  siteConfig.support.facebookUrl && { label: 'Facebook', href: siteConfig.support.facebookUrl },
].filter(Boolean);
