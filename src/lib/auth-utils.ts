export type ProfileAccess = {
  pending?: boolean | null;
};

export function isProfileBlocked(profile: ProfileAccess | null | undefined): boolean {
  return profile?.pending === true;
}
