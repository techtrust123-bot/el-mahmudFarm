import { useContext, useMemo } from 'react';
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShield,
  FiUser,
} from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import { AuthContext } from '../context/AuthContext';
import cloudFarmLogo from '../assets/CloudFarm_logo.png';

const formatDate = (value) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const titleCase = (value) => {
  if (!value) return 'Not provided';
  return String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getInitials = (name) => {
  const initials = String(name || 'User')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return initials || 'U';
};

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      <Icon size={17} />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

const ProfilePage = () => {
  const { userData } = useContext(AuthContext);

  const profile = userData || {};
  const displayName = profile.name || 'CloudFarm User';
  const isVerified = Boolean(profile.isAccountVerified);
  const subscriptionLabel = profile.subscriptionStatus === 'trial'
    ? 'Free trial'
    : titleCase(profile.subscriptionPlan || profile.subscriptionType || 'No active plan');
  const subscriptionEnd = profile.subscriptionEnd ? formatDate(profile.subscriptionEnd) : 'Not available';
  const memberSince = formatDate(profile.createdAt || profile.hireDate);
  const permissionCount = Array.isArray(profile.permissions) ? profile.permissions.length : 0;

  const statusTone = useMemo(() => {
    if (profile.subscriptionStatus === 'active' || profile.subscriptionStatus === 'trial') {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    }
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  }, [profile.subscriptionStatus]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Account center</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Your CloudFarm identity, contact details, and access status.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FiActivity size={16} />
            Live account data
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold ring-1 ring-white/25">
                {getInitials(displayName)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold">{displayName}</h2>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-emerald-50">
                      <FiCheckCircle size={13} /> {isVerified ? 'Verified' : 'Not verified'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-emerald-100">{profile.email || 'Email not provided'}</p>
                <p className="mt-2 text-sm capitalize text-emerald-200">{titleCase(profile.role || profile.userType)}</p>
              </div>
            </div>
            <img src={cloudFarmLogo} alt="CloudFarm logo" className="hidden h-20 w-20 rounded-2xl bg-white/10 object-contain p-2 sm:block" />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal details</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Information linked to your CloudFarm account.</p>
              </div>
              <FiUser className="text-emerald-600 dark:text-emerald-400" size={22} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem icon={FiMail} label="Email address" value={profile.email || 'Not provided'} />
              <DetailItem icon={FiPhone} label="Phone number" value={profile.phone || profile.contact || 'Not provided'} />
              <DetailItem icon={FiMapPin} label="Address" value={profile.address || 'Not provided'} />
              <DetailItem icon={FiMapPin} label="Location" value={[profile.city, profile.country].filter(Boolean).join(', ') || 'Not provided'} />
              <DetailItem icon={FiCalendar} label="Member since" value={memberSince} />
              <DetailItem icon={FiShield} label="Account status" value={isVerified ? 'Verified account' : 'Verification required'} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Subscription</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your current access plan.</p>
              </div>
              <FiClock className="text-emerald-600 dark:text-emerald-400" size={22} />
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Current plan</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{subscriptionLabel}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusTone}`}>
                  {titleCase(profile.subscriptionStatus || 'inactive')}
                </span>
              </div>
              <div className="mt-5 space-y-3 border-t border-gray-200 pt-4 text-sm dark:border-gray-700">
                <div className="flex justify-between gap-4"><span className="text-gray-500 dark:text-gray-400">Billing cycle</span><span className="font-medium text-gray-900 dark:text-white">{titleCase(profile.billingCycle || 'Not applicable')}</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500 dark:text-gray-400">Access ends</span><span className="font-medium text-gray-900 dark:text-white">{subscriptionEnd}</span></div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Farm and access</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your workspace identity and assigned permissions.</p>
            </div>
            <FiEdit3 className="text-gray-400" size={20} title="Managed in Settings" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem icon={FiActivity} label="Farm name" value={profile.farmName || 'Not provided'} />
            <DetailItem icon={FiShield} label="Account type" value={titleCase(profile.userType || profile.role)} />
            <DetailItem icon={FiShield} label="Permissions" value={`${permissionCount} assigned`} />
            <DetailItem icon={FiCalendar} label="Farm ID" value={profile.farmId || 'Not available'} />
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <FiEdit3 size={13} /> Profile editing is managed through Settings and existing account controls.
          </p>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
